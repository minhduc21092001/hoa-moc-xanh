import './content-defaults.js';
import './content-core.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

async function loadContent() {
  const response = await fetch('./noi-dung.md', {cache:'no-store'});
  if (!response.ok) throw new Error(`Không đọc được noi-dung.md (HTTP ${response.status}).`);
  const content = window.WeddingMarkdown.create(await response.text());
  window.weddingContent = content;
  const sections={
    'hien-thi.album':[$('[data-text="nhan.album-anh"]')?.closest('h2'),$('[data-gallery]')?.parentElement?.parentElement],
    'hien-thi.xac-nhan':[$('[data-landing-screenshot-id="invite-rsvp"]')],
    'hien-thi.ban-do':[$('[data-landing-screenshot-id="invite-map"]')],
    'hien-thi.dress-code':[$('[data-dress-code]')],
    'hien-thi.lich-trinh':[$('[data-timeline]')?.parentElement],
    'hien-thi.so-luu-but':[$('[data-landing-screenshot-id="invite-guestbook"]')],
    'hien-thi.hop-qua':[$('[data-open-gift]')?.parentElement],
  };
  for(const [key,elements] of Object.entries(sections))elements.filter(Boolean).forEach(el=>el.hidden=!content.enabled(key));
  $$('[data-text]').forEach(el => el.textContent = content.text(el.dataset.text));
  for (const attribute of ['placeholder','aria-label','title']) {
    $$(`[data-attr-${attribute}]`).forEach(el => el.setAttribute(attribute,content.text(el.getAttribute(`data-attr-${attribute}`))));
  }
  $$('[data-media]').forEach(el => {
    const media = content.media(el.dataset.media);
    el.src = media.src;
    if (el.tagName === 'IMG') el.alt = media.alt;
  });
  $$('[data-href]').forEach(el => {const url=content.url(el.dataset.href);el.hidden=!url;if(url)el.href=url;else el.removeAttribute('href');});
  $$('[data-src]').forEach(el => {
    const key=el.dataset.src;
    if(key==='lien-ket.ban-do'&&!content.enabled('hien-thi.ban-do')){el.src='about:blank';return;}
    const url=key==='lien-ket.ban-do' ? content.url('lien-ket.chi-duong') : content.url(key);
    el.hidden=!url;
    el.src=url ? (key==='lien-ket.ban-do' ? `./api/google-maps-embed?url=${encodeURIComponent(url)}` : url) : 'about:blank';
    el.title=content.text('tiec-cuoi.dia-diem');
  });

  const gallery = $('[data-gallery]'), cardTemplate = gallery.firstElementChild.cloneNode(true);
  const thumbs = $('[data-thumbnails]'), thumbTemplate = thumbs.firstElementChild.cloneNode(true);
  gallery.replaceChildren(); thumbs.replaceChildren();
  content.album.forEach((photo,i) => {
    const card=cardTemplate.cloneNode(true), image=card.querySelector('img');
    image.src=photo.src;image.alt=photo.alt;image.style.objectPosition=photo.position;
    card.dataset.photo=String(i);card.classList.remove('ring-2','ring-white/30');gallery.append(card);
    const thumb=thumbTemplate.cloneNode(true);
    thumb.removeAttribute('data-attr-aria-label');thumb.removeAttribute('aria-current');thumb.dataset.thumbnail=String(i);
    thumb.setAttribute('aria-label',content.text('ui.xem-anh',{so:i+1}));
    thumb.querySelector('img').src=photo.src;thumb.querySelector('img').alt=photo.alt;thumbs.append(thumb);
  });
  gallery.parentElement.parentElement.hidden = content.album.length === 0;
  if (content.album.length) {
    $('[data-lightbox-image]').src=content.album[0].src;
    $('[data-lightbox-image]').alt=content.album[0].alt;
  } else $('[data-lightbox-image]').removeAttribute('src');

  const timeline=$('[data-timeline]'), eventTemplate=timeline.querySelector('li').cloneNode(true);
  timeline.replaceChildren();
  content.rows('Lịch trình',2).forEach(([time,label]) => {
    const item=eventTemplate.cloneNode(true), spans=[...item.children];
    spans[0].textContent=time;spans[2].textContent=label;timeline.append(item);
  });
  const events=[...timeline.children];
  events.forEach((li,i)=>{const line=li.children[1].firstElementChild;line.style.top=i===0?'50%':'';line.style.bottom=i===events.length-1?'50%':'';});

  const wishes=$('[data-wishes]');
  window.weddingWishTemplate=wishes.firstElementChild.cloneNode(true);
  wishes.replaceChildren();
  function addWish(name,date,message) {
    const card=window.weddingWishTemplate.cloneNode(true);
    card.querySelector('.font-semibold').textContent=name;
    card.querySelector('.text-xs').textContent=date;
    card.querySelector('p').textContent=message;wishes.append(card);
  }
  content.rows('Lời chúc ban đầu',3).forEach(row=>addWish(...row));
  wishes.hidden=!wishes.children.length;

  const weekdayRow=$('[data-calendar-grid]'), daysGrid=weekdayRow.nextElementSibling;
  const weekdayTemplate=weekdayRow.firstElementChild.cloneNode(true);
  const normalDay=daysGrid.querySelector('span').parentElement.cloneNode(true);
  const selectedDay=[...daysGrid.children].find(el=>el.querySelector('svg')).cloneNode(true);
  const weekdays=content.text('ui.ngay-tuan').split(',').map(s=>s.trim());
  if(weekdays.length!==7)throw new Error('ui.ngay-tuan cần đủ 7 ngày.');
  weekdayRow.replaceChildren();daysGrid.replaceChildren();
  weekdays.forEach(name=>{const el=weekdayTemplate.cloneNode(true);el.textContent=name;weekdayRow.append(el);});
  const date=content.dates['tiec-cuoi'], offset=(new Date(Date.UTC(date.year,date.month-1,1)).getUTCDay()+6)%7;
  for(let i=0;i<offset;i++){const el=normalDay.cloneNode(true);el.replaceChildren();daysGrid.append(el);}
  const total=new Date(Date.UTC(date.year,date.month,0)).getUTCDate();
  for(let day=1;day<=total;day++){
    const el=(day===date.day?selectedDay:normalDay).cloneNode(true), span=el.querySelector('span');
    span.textContent=String(day);span.removeAttribute('data-text');daysGrid.append(el);
  }

  const dress=$('[data-dress-code]').lastElementChild, colorTemplate=dress.firstElementChild.cloneNode(true);
  dress.replaceChildren();
  content.rows('Màu trang phục',1).forEach(([color])=>{
    if(!CSS.supports('color',color))throw new Error('Màu trang phục không hợp lệ: '+color);
    const dot=colorTemplate.cloneNode(true);dot.style.backgroundColor=color;dot.style.border='1px solid #30530f30';dress.append(dot);
  });

  const countdown=$('[data-countdown]');
  if(content.start.getTime()<=Date.now())countdown.remove();
  else {
    countdown.querySelector('h2').textContent=content.text('ui.dem-nguoc');
    const output=countdown.querySelector('p');output.setAttribute('aria-live','off');
    const update=()=>{
      const seconds=Math.max(0,Math.floor((content.start-Date.now())/1000));
      output.textContent=`${Math.floor(seconds/86400)} ${content.text('ui.ngay')} · ${Math.floor(seconds%86400/3600)} ${content.text('ui.gio')} · ${Math.floor(seconds%3600/60)} ${content.text('ui.phut')} · ${seconds%60} ${content.text('ui.giay')}`;
      if(seconds===0){clearInterval(timer);countdown.remove();}
    };let timer=setInterval(update,1000);update();
  }

  await import('./local.js');
  document.documentElement.removeAttribute('data-content-loading');
  window.dispatchEvent(new Event('wedding-content-ready'));
}
loadContent().catch(error=>{
  console.error(error);
  document.documentElement.removeAttribute('data-content-loading');
  document.body.replaceChildren();
  const box=document.createElement('main');box.className='content-error';
  const title=document.createElement('h1');title.textContent='Cần kiểm tra file nội dung';
  const detail=document.createElement('p');detail.textContent=error.message;
  const help=document.createElement('p');help.textContent='Sửa noi-dung.md, lưu file rồi tải lại trang. Chạy website bằng start.cmd hoặc node server.cjs.';
  box.append(title,detail,help);document.body.append(box);
});

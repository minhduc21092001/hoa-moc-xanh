(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const content=window.weddingContent,t=(key,vars)=>content.text(key,vars),audio=$('#music');
const musicButton=document.createElement('button');musicButton.id='music-toggle';musicButton.hidden=true;musicButton.textContent=t('ui.nut-nhac');document.body.append(musicButton);
const musicEnabled=t('nhac.hien-thi')==='true';
function musicState(){musicButton.setAttribute('aria-label',t(audio.paused?'ui.phat-nhac':'ui.dung-nhac'));musicButton.classList.toggle('playing',!audio.paused);}
audio.addEventListener('play',musicState);audio.addEventListener('pause',musicState);musicState();
musicButton.onclick=()=>audio.paused?audio.play().catch(()=>toast(t('ui.loi-phat-nhac'))):audio.pause();
const cover=$('#cover'),openLink=$('[data-open-invitation]');
const envelope=cover.querySelector('[data-landing-screenshot-id="invite-envelope"]');
const ambient=envelope.firstElementChild,cardStage=envelope.lastElementChild;
const card=cardStage.firstElementChild,seal=card.firstElementChild;
cardStage.classList.add('envelope-card-stage');seal.classList.add('envelope-seal');
let opening=false,finished=false,openingTimers=[];
function revealInvitation(){
 if(finished)return;finished=true;openingTimers.forEach(clearTimeout);openingTimers=[];
 cover.hidden=true;cover.dataset.openState='done';$('#invitation').hidden=false;musicButton.hidden=!musicEnabled;
 openLink.setAttribute('aria-busy','false');window.scrollTo({top:0,left:0,behavior:'instant'});
 history.replaceState(null,'',location.pathname+'?open=1');
}
function openingChime(){
 if(!musicEnabled)return;
 try{
  const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
  const context=new Context(),now=context.currentTime;context.resume().catch(()=>{});
  function note(frequency,start,peak,duration){
   const oscillator=context.createOscillator(),gain=context.createGain();oscillator.connect(gain);gain.connect(context.destination);
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(0,now);
   gain.gain.linearRampToValueAtTime(peak,start+.01);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
   oscillator.start(start);oscillator.stop(start+duration);
  }
  [523.25,659.25,783.99,1046.5].forEach((frequency,i)=>note(frequency,now+.1*i,.035-.005*i,1.8));
  [1567.98,2093].forEach((frequency,i)=>note(frequency,now+.35+.1*i,.015,1.2));
  const bass=context.createOscillator(),bassGain=context.createGain(),filter=context.createBiquadFilter();
  bass.connect(filter);filter.connect(bassGain);bassGain.connect(context.destination);bass.type='sine';bass.frequency.setValueAtTime(261.63,now);
  filter.type='lowpass';filter.frequency.value=400;bassGain.gain.setValueAtTime(0,now);bassGain.gain.linearRampToValueAtTime(.025,now+.4);
  bassGain.gain.setValueAtTime(.02,now+1);bassGain.gain.exponentialRampToValueAtTime(.001,now+2.5);bass.start(now);bass.stop(now+2.5);
  setTimeout(()=>[783.99,987.77,1174.66,1567.98].forEach((frequency,i)=>note(frequency,context.currentTime+.06*i,.025,.6)),1200);
  setTimeout(()=>context.close().catch(()=>{}),3200);
 }catch{/* Sound availability never blocks opening the invitation. */}
}
function burstLeaves(){
 const layer=document.createElement('div');layer.className='opening-particles';layer.setAttribute('aria-hidden','true');
 const leaf=ambient.querySelector('svg'),colors=[...new Set([...ambient.children].map(el=>el.style.color))];
 for(let i=0;i<32;i++){
  const angle=2*Math.PI*i/32+(Math.random()-.5)*.4,radius=25+60*Math.random(),particle=document.createElement('div');
  particle.className='opening-particle';particle.style.color=colors[Math.floor(Math.random()*colors.length)];
  particle.style.fontSize=`${10+16*Math.random()}px`;particle.style.textShadow=`0 0 10px ${particle.style.color}`;
  particle.style.setProperty('--dx',`${Math.cos(angle)*radius*5}px`);particle.style.setProperty('--dy',`${Math.sin(angle)*radius*5}px`);
  particle.style.setProperty('--rot-start',`${(Math.random()-.5)*30}deg`);particle.style.setProperty('--rot-end',`${(Math.random()-.5)*360}deg`);
  particle.style.animationDelay=`${.15*Math.random()}s`;particle.append(leaf.cloneNode(true));layer.append(particle);
 }
 envelope.append(layer);
}
function flyCornerFlowers(){
 const backdrop=card.querySelector('.overflow-hidden');
 for(const source of [...backdrop.children].filter(el=>el.tagName==='IMG')){
  // Keep the corner's positioning, rotation and opacity on the wrapper.
  // A separate image can grow outside the clipped card, as in the reference.
  const wrapper=document.createElement('div');
  wrapper.className=source.className.replace(/\bobject-contain\b/g,'').replace(/\s+/g,' ').trim();
  wrapper.classList.add('envelope-flying-flower');wrapper.setAttribute('aria-hidden','true');
  const image=document.createElement('img');image.src=source.getAttribute('src');image.alt='';
  image.className='pointer-events-none block h-auto max-h-full w-full object-contain';
  image.style.animation='corner-flower-forward 1.2s ease-in forwards';
  wrapper.append(image);card.append(wrapper);
 }
}
function openInvitation(){
 if(opening||finished)return;opening=true;cover.dataset.openState='opening';openLink.setAttribute('aria-busy','true');
 if(musicEnabled){if(audio.readyState<2)audio.load();audio.play().catch(()=>{});}openingChime();
 const ring=document.createElement('div');ring.className='envelope-seal-ring';ring.setAttribute('aria-hidden','true');
 ring.style.borderColor=openLink.style.backgroundColor;card.append(ring);
 const glow=document.createElement('div');glow.className='envelope-opening-glow';glow.setAttribute('aria-hidden','true');
 card.querySelector('.overflow-hidden').append(glow);
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){revealInvitation();return;}
 flyCornerFlowers();
 openingTimers.push(setTimeout(()=>{burstLeaves();cover.dataset.openState='away';},500));
 openingTimers.push(setTimeout(revealInvitation,1300));
 // Recover if a background tab or interrupted animation delays normal completion.
 openingTimers.push(setTimeout(revealInvitation,2600));
}
openLink.onclick=e=>{
 if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;
 const target=new URL(content.url('lien-ket.mo-thiep'),location.href);
 if(target.origin===location.origin&&target.pathname===location.pathname){e.preventDefault();openInvitation();}
};
openLink.onkeydown=e=>{if(e.key===' '||e.key==='Spacebar'){e.preventDefault();openLink.click();}};
if(new URLSearchParams(location.search).get('open')==='1')revealInvitation();
function toast(message){let el=$('#local-toast');if(!el){el=document.createElement('div');el.id='local-toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4500);}
const photos=$$('[data-gallery] img'),lightbox=$('[data-lightbox]'),lightImage=$('[data-lightbox-image]'),carousel=$('[data-gallery]'),counter=$('[data-gallery-counter] span'),lightCounter=$('[data-lightbox-counter]');
let current=0;
function slide(index){
 if(!photos.length)return;current=(index+photos.length)%photos.length;
 photos.forEach((img,i)=>{let d=(i-current+photos.length)%photos.length;if(d>photos.length/2)d-=photos.length;const n=Math.abs(d),card=img.parentElement;card.style.transform=`translateX(${d*60}%) translateZ(${-n*150}px) rotateY(${d*45}deg) scale(${n===0?1:n===1?.85:.7})`;card.style.opacity=n===0?'1':n===1?'.75':n===2?'.5':'.3';card.style.zIndex=100-n;card.classList.toggle('ring-2',n===0);card.classList.toggle('ring-white/30',n===0);});
 counter.textContent=`${current+1} / ${photos.length}`;lightCounter.textContent=counter.textContent;lightImage.src=photos[current].src;lightImage.alt=photos[current].alt;
 $$('[data-thumbnail]').forEach((b,i)=>{b.style.opacity=i===current?'1':'.6';b.style.outline=i===current?'2px solid #30530f':'none';b.setAttribute('aria-current',String(i===current));});
}
$('[data-attr-aria-label="nhan.previous-photo"]').onclick=()=>slide(current-1);
$('[data-attr-aria-label="nhan.next-photo"]').onclick=()=>slide(current+1);
$('[data-attr-aria-label="nhan.previous-image"]').onclick=()=>slide(current-1);
$('[data-attr-aria-label="nhan.next-image"]').onclick=()=>slide(current+1);
photos.forEach((image,i)=>{const card=image.parentElement;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',t('ui.xem-anh',{so:i+1}));const show=()=>{slide(i);lightbox.showModal();};image.onclick=show;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}};});
$$('[data-thumbnail]').forEach((b,i)=>b.onclick=()=>slide(i));
document.addEventListener('keydown',e=>{if(lightbox.open){if(e.key==='ArrowRight')slide(current+1);if(e.key==='ArrowLeft')slide(current-1);}});
for(const el of [carousel,lightImage]){let x=0;el.addEventListener('touchstart',e=>x=e.changedTouches[0].clientX,{passive:true});el.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-x;if(Math.abs(dx)>40)slide(current+(dx<0?1:-1));},{passive:true});}
slide(0);
const giftDialog=$('[data-gift-dialog]');$('[data-open-gift]').onclick=()=>giftDialog.showModal();giftDialog.querySelector('button').setAttribute('aria-label',t('ui.dong'));giftDialog.querySelector('button').onclick=()=>giftDialog.close();giftDialog.setAttribute('aria-label',t('nhan.hop-qua-mung'));lightbox.setAttribute('aria-label',t('nhan.album-anh'));
giftDialog.querySelectorAll('button').forEach(b=>{if(b.querySelector('[data-text="nhan.luu-qr"]'))b.onclick=()=>{const a=document.createElement('a');a.href=b.parentElement.querySelector('img').src;a.download=t('ui.ten-file-qr');a.click();};});
const form=$('[data-landing-screenshot-id="invite-guestbook"] form'),wishes=$('[data-wishes]'),nameInput=form.querySelector('input'),messageInput=form.querySelector('textarea');
nameInput.setAttribute('aria-label',t('ui.ten'));messageInput.setAttribute('aria-label',t('ui.loi-chuc'));
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];}};
function addWish(w){const card=window.weddingWishTemplate.cloneNode(true);card.querySelector('.font-semibold').textContent=w.name;card.querySelector('.text-xs').textContent=w.date;card.querySelector('p').textContent=w.message;wishes.prepend(card);wishes.hidden=false;}
read('hoa-moc-wishes-v1').forEach(addWish);
form.onsubmit=e=>{e.preventDefault();if(!nameInput.value.trim()||!messageInput.value.trim())return;const wish={name:nameInput.value.trim(),message:messageInput.value.trim(),date:new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})};try{localStorage.setItem('hoa-moc-wishes-v1',JSON.stringify([...read('hoa-moc-wishes-v1'),wish]));addWish(wish);form.reset();toast(t('ui.loi-chuc-thanh-cong'));}catch{toast(t('ui.loi-chuc-loi'));}};
const suggestions=content.rows('Gợi ý lời chúc',1).map(row=>row[0]);let suggestion=0;
const wand=form.querySelector('button[type="button"]');wand.title=t('ui.goi-y');wand.disabled=!suggestions.length;wand.onclick=()=>{messageInput.value=suggestions[suggestion++%suggestions.length];messageInput.focus();};
const rsvp=document.createElement('dialog');rsvp.className='local-rsvp';rsvp.setAttribute('aria-labelledby','rsvp-title');
rsvp.innerHTML='<button type="button" class="rsvp-close" data-label="ui.dong">×</button><h2 id="rsvp-title" data-label="ui.rsvp.tieu-de"></h2><p data-label="ui.rsvp.mo-ta"></p><form><label><span data-label="ui.ten"></span><input name="name" required maxlength="200" autocomplete="name"></label><fieldset><legend data-label="ui.rsvp.cau-hoi"></legend><label><input type="radio" name="attendance" value="yes" required><span data-label="ui.rsvp.co"></span></label><label><input type="radio" name="attendance" value="no"><span data-label="ui.rsvp.khong"></span></label></fieldset><label id="party-size" hidden><span data-label="ui.rsvp.so-nguoi"></span><input type="number" name="count" min="1" max="50" value="1"></label><button class="rsvp-submit" data-label="ui.rsvp.gui"></button><small data-label="ui.rsvp.ghi-chu"></small></form>';
rsvp.querySelectorAll('[data-label]').forEach(el=>{if(el.classList.contains('rsvp-close'))el.setAttribute('aria-label',t(el.dataset.label));else el.textContent=t(el.dataset.label);});
document.body.append(rsvp);rsvp.querySelector('.rsvp-close').onclick=()=>rsvp.close();$('[data-open-rsvp]').onclick=()=>rsvp.showModal();
rsvp.querySelectorAll('[name="attendance"]').forEach(r=>r.onchange=()=>$('#party-size').hidden=rsvp.querySelector('[name="attendance"]:checked').value!=='yes');
rsvp.querySelector('form').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));if(!data.name.trim())return;try{localStorage.setItem('hoa-moc-rsvp-v1',JSON.stringify([...read('hoa-moc-rsvp-v1'),{...data,date:new Date().toISOString()}]));rsvp.close();toast(t('ui.rsvp.thanh-cong'));}catch{toast(t('ui.rsvp.loi'));}};
if(t('chat.hien-thi')==='true'&&content.url('lien-ket.chat')){
 const chat=document.createElement('div');chat.id='local-chat';chat.innerHTML='<a target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 32 32" width="36" height="36" fill="white"><path d="M16 3C8.8 3 3 8.4 3 15c0 3.8 1.9 7.2 5 9.4V29l4.4-2.4c1.1.3 2.4.4 3.6.4 7.2 0 13-5.4 13-12S23.2 3 16 3zm1.3 16-3.3-3.5L7.5 19 14.7 11l3.5 3.5 6.3-3.5z"/></svg></a><button>×</button>';
 chat.querySelector('a').href=content.url('lien-ket.chat');chat.querySelector('a').setAttribute('aria-label',t('ui.chat'));chat.querySelector('button').setAttribute('aria-label',t('ui.an-chat'));document.body.append(chat);chat.querySelector('button').onclick=()=>chat.remove();
}
})();

(function (root, factory) {
  const defaults = typeof module !== 'undefined' && module.exports ? require('./content-defaults.js') : root.WeddingContentDefaults;
  const api = factory(defaults || {fields:{},tables:{},aliases:{}});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WeddingMarkdown = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaults) {
  'use strict';
  function parse(markdown) {
    const fields = Object.create(null), tables = Object.create(null), aliases = Object.create(null);
    // Accept older binding comments; current files use plain Vietnamese headings.
    const normalized = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
      .replace(/^###\s+(.+?)\s*\n\s*<!--\s*Trường dữ liệu:\s*([\w.-]+)\s*-->\s*$/gm, (_, label, key) => {
        const name=label.trim().normalize('NFC');
        if(Object.hasOwn(aliases,name))throw new Error(`Tiêu đề bị trùng: ${name}`);
        aliases[name]=key;return `### ${key}`;
      });
    const lines = normalized.replace(/<!--[\s\S]*?-->/g, '').split('\n');
    let section = '', key = '', body = [];
    function flush() {
      if (!key) return;
      if (Object.hasOwn(fields, key)) throw new Error(`Khóa bị trùng: ${key}`);
      fields[key] = body.join('\n').trim(); key = ''; body = [];
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fieldHeading = /^###\s+(.+?)\s*$/.exec(line);
      const sectionHeading = /^##\s+(.+?)\s*$/.exec(line);
      if (fieldHeading) {
        flush();
        const label=fieldHeading[1].trim().normalize('NFC');
        key=defaults.aliases[label]||label;
        if(label!==key)aliases[label]=key;
        continue;
      }
      if (sectionHeading) { flush(); section = sectionHeading[1]; continue; }
      if (key) { body.push(line); continue; }
      if (/^\s*\|/.test(line)) {
        const cells = line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(s => s.trim().replace(/\\\|/g, '|').replace(/<br\s*\/?\s*>/gi, '\n'));
        if (cells.every(s => /^:?-+:?$/.test(s))) continue;
        (tables[section] ||= []).push(cells);
      }
    }
    flush();
    for (const name of Object.keys(tables)) tables[name].shift();
    return { fields, tables, aliases };
  }
  function dateParts(value, name) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) throw new Error(`${name}: dùng định dạng YYYY-MM-DD.`);
    const [, y, m, d] = match.map(Number), date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw new Error(`${name}: ngày không hợp lệ.`);
    return { year: y, month: m, day: d, weekday: date.getUTCDay(), date };
  }
  function time(value, name) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) throw new Error(`${name}: dùng định dạng HH:MM.`);
    return value;
  }
  function create(markdown) {
    const { fields, tables, aliases } = parse(markdown);
    for(const [key,value] of Object.entries(defaults.fields))if(!Object.hasOwn(fields,key))fields[key]=value;
    for(const [name,rows] of Object.entries(defaults.tables))if(!Object.hasOwn(tables,name))tables[name]=rows;
    for(const [name,key] of Object.entries(defaults.aliases))if(!Object.hasOwn(aliases,name))aliases[name]=key;
    Object.assign(aliases,{
      'Ngày tiệc cưới viết đầy đủ':'tiec-cuoi.ngay-dai',
      'Ngày lễ cưới viết đầy đủ':'le-cuoi.ngay-dai',
      'Số thứ tự ảnh':'so',
    });
    function text(key, variables = {}, trail = []) {
      key=aliases[key.trim().normalize('NFC')]||key;
      if (Object.hasOwn(variables, key)) return String(variables[key]);
      if (!Object.hasOwn(fields, key)) throw new Error(`Thiếu mục "${key}" trong noi-dung.md.`);
      if (trail.includes(key)) throw new Error(`Tham chiếu vòng: ${[...trail, key].join(' → ')}`);
      return fields[key].replace(/\{\{([^{}]+)\}\}/g, (_, name) => text(name.trim(), variables, [...trail, key]));
    }
    const weekdays = text('ui.thu-day-du').split(',').map(s => s.trim());
    if (weekdays.length !== 7) throw new Error('ui.thu-day-du cần đủ 7 thứ.');
    const dates = {};
    for (const key of ['le-cuoi', 'tiec-cuoi']) {
      const d = dateParts(text(`${key}.ngay`), `${key}.ngay`); dates[key] = d;
      time(text(`${key}.gio`), `${key}.gio`);
      Object.assign(fields, {
        [`${key}.thu`]: weekdays[d.weekday],
        [`${key}.ngay-so`]: String(d.day),
        [`${key}.thang-nhan`]: `${text('ui.thang').toUpperCase()} ${String(d.month).padStart(2, '0')}`,
        [`${key}.nam`]: String(d.year),
        [`${key}.ngay-dai`]: `${d.day} ${text('ui.thang').toLowerCase()} ${d.month}, ${d.year}`,
      });
    }
    fields['lich.tieu-de'] = `${text('ui.thang')} ${dates['tiec-cuoi'].month} / ${dates['tiec-cuoi'].year}`;
    const address = text('tiec-cuoi.dia-diem');
    const start = new Date(`${text('tiec-cuoi.ngay')}T${text('tiec-cuoi.gio')}:00+07:00`);
    time(text('tiec-cuoi.ket-thuc'), 'tiec-cuoi.ket-thuc');
    let end = new Date(`${text('tiec-cuoi.ngay')}T${text('tiec-cuoi.ket-thuc')}:00+07:00`);
    if (end <= start) end = new Date(end.getTime() + 86400000);
    const compact = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const params = new URLSearchParams({ action:'TEMPLATE', text:`${text('chu-re.ho-ten')} & ${text('co-dau.ho-ten')}`, dates:`${compact(start)}/${compact(end)}`, ctz:'Asia/Ho_Chi_Minh', details:text('loi-moi'), location:address });
    const auto = {
      'lien-ket.ban-do':`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`,
      'lien-ket.chi-duong':`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
      'lien-ket.lich':`https://www.google.com/calendar/render?${params}`,
    };
    function safeUrl(value) {
      if (!value || /[\u0000-\u001f]/.test(value) || /^(?:javascript|data|vbscript):/i.test(value)) throw new Error('Đường dẫn không hợp lệ: '+value);
      const url = new URL(value, 'http://localhost/');
      if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) throw new Error('Không hỗ trợ đường dẫn: '+value);
      return value;
    }
    function url(key) { const value = text(key); return value ? safeUrl(value === 'tu-dong' ? auto[key] || '' : value) : ''; }
    function enabled(key) {
      const value=text(key).trim().toLowerCase();
      if(value!=='true'&&value!=='false')throw new Error(`${key}: chỉ dùng true hoặc false.`);
      return value==='true';
    }
    function media(key) {
      const value = text(key), match = /^!\[([^\]]*)\]\(([^\n]+)\)$/.exec(value);
      if (!match) throw new Error(`${key}: dùng ![mô tả](./asset/ten-file).`);
      return { alt:match[1], src:safeUrl(match[2].trim()) };
    }
    function rows(section, columns) {
      return (tables[section] || []).map((row, i) => {
        if (columns && row.length !== columns) throw new Error(`Bảng "${section}", dòng ${i+1}: cần ${columns} cột.`);
        return row.map(cell => cell.replace(/\{\{([^{}]+)\}\}/g, (_, key) => text(key.trim())));
      });
    }
    const album = rows('Album ảnh',3).map(([src, alt, position]) => {
      safeUrl(src);
      if (position && !/^\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(position)) throw new Error('Vị trí ảnh dùng dạng 50% 50%.');
      return {src, alt, position:position || '50% 50%'};
    });
    return { text, url, media, rows, dates, album, safeUrl, enabled, fields, start };
  }
  return { parse, create, dateParts };
});

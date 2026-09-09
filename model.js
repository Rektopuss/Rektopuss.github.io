/* Shared, framework-free data model. Amounts are stored as integer cents. */
(function (root) {
  'use strict';
  const MAX_CENTS = 10000000000;
  const MAX_DONATIONS = 5000;
  function cents(value) {
    if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Ievadi derīgu summu.');
    const input = String(value).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(input)) throw new Error('Summai jābūt pozitīvam skaitlim ar ne vairāk kā divām zīmēm aiz komata.');
    const result = Math.round(Number(input) * 100);
    if (!Number.isSafeInteger(result) || result <= 0 || result > MAX_CENTS) throw new Error('Summai jābūt no 0,01 līdz 100 000 000.');
    return result;
  }
  function integer(value, label) {
    if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_CENTS) throw new Error(label + ' jābūt pozitīvai summai veselos centos.');
    return value;
  }
  function nonNegativeInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_CENTS) throw new Error(label + ' jābūt nenegatīvai summai veselos centos.');
    return value;
  }
  function date(value) {
    if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Date.parse(value))) throw new Error('Norādi derīgu ziedojuma datumu.');
    return new Date(value).toISOString();
  }
  function currency(value) {
    const code = String(value || 'EUR').toUpperCase();
    if (!['EUR', 'USD', 'GBP', 'CAD', 'AUD'].includes(code)) throw new Error('Atbalstītās valūtas: EUR, USD, GBP, CAD un AUD. Pirms importēšanas konvertē summas.');
    return code;
  }
  function cleanText(value, max, fallback) { return String(value == null ? fallback || '' : value).trim().slice(0, max); }
  function validateState(input) {
    if (!input || !input.settings || !Array.isArray(input.donations)) throw new Error('Importa failā jābūt paneļa iestatījumiem un ziedojumu sarakstam.');
    if (input.donations.length > MAX_DONATIONS) throw new Error('Vienā reizē var importēt ne vairāk kā 5000 ziedojumu.');
    const s = input.settings;
    if (!Array.isArray(s.milestones) || s.milestones.length > 8) throw new Error('Izmanto ne vairāk kā astoņus starpmērķus.');
    const settings = {
      title: cleanText(s.title, 70, 'Nākamā nodaļa') || 'Nākamā nodaļa',
      subtitle: cleanText(s.subtitle, 160),
      currency: currency(s.currency),
      goalCents: integer(s.goalCents, 'Mērķis'),
      startDate: date(s.startDate),
      milestones: s.milestones.map(m => ({ label: cleanText(m.label, 70, 'Starpmērķis') || 'Starpmērķis', amountCents: nonNegativeInteger(m.amountCents, 'Starpmērķis') })).sort((a, b) => a.amountCents - b.amountCents)
    };
    const ids = new Set();
    const donations = input.donations.map((d, i) => {
      if (!d || typeof d !== 'object') throw new Error('Nederīgs ziedojums rindā ' + (i + 1) + '.');
      if (d.currency && currency(d.currency) !== settings.currency) throw new Error('Dažādas valūtas netiek atbalstītas. Vispirms konvertē visas summas uz ' + settings.currency + '.');
      const id = cleanText(d.id, 120, 'import-' + i) || 'import-' + i;
      if (ids.has(id)) throw new Error('Atkārtots ziedojuma ID: ' + id);
      ids.add(id);
      return { id, name: cleanText(d.name, 60, 'Anonīms') || 'Anonīms', message: cleanText(d.message, 280), amountCents: integer(d.amountCents, 'Ziedojuma summa'), createdAt: date(d.createdAt) };
    }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return { version: 1, source: input.source === 'demo' ? 'demo' : 'custom', settings, donations };
  }
  function stats(state) {
    const donations = state.donations.filter(d => Date.parse(d.createdAt) >= Date.parse(state.settings.startDate));
    const people = new Map();
    for (const d of donations) {
      const key = d.name.toLocaleLowerCase();
      const p = people.get(key) || { name: d.name, amountCents: 0, count: 0 };
      p.amountCents += d.amountCents; p.count++; people.set(key, p);
    }
    return { donations, total: donations.reduce((sum, d) => sum + d.amountCents, 0), people: people.size, count: donations.length, leaders: [...people.values()].sort((a, b) => b.amountCents - a.amountCents || a.name.localeCompare(b.name)) };
  }
  function demo() {
    const now = Date.now();
    const donors = [
      ['pixelpilot', 15000, 'Par vēliem vakariem un labu noskaņu. Turpini!', 4],
      ['lunar.exe', 7500, 'Vēl viens solis tuvāk sapņu aprīkojumam 🌙', 18],
      ['moss', 2500, 'Labākais interneta stūrītis.', 43],
      ['neoncat', 5000, '12 stundu tiešraide notiks!', 82],
      ['pixelpilot', 25000, 'Lai izdodas.', 180],
      ['sleepy_sam', 1000, 'Kafijas fondam ☕', 320],
      ['lunar.exe', 22500, '', 900],
      ['ghostmode', 18000, 'Neliels atbalsts.', 1400],
      ['neoncat', 22500, 'Drīz būs kopienas uzlabojums.', 2300],
      ['moss', 5500, '', 3000]
    ];
    return validateState({ source: 'demo', settings: { title: 'Veidojam nākamo nodaļu.', subtitle: 'Labāks aprīkojums un lielākas tiešraides — pateicoties jums.', currency: 'EUR', goalCents: 200000, startDate: new Date(now - 7 * 86400000).toISOString(), milestones: [{ label: 'Jauns mikrofons', amountCents: 50000 }, { label: 'Kopienas spēļu vakars', amountCents: 100000 }, { label: '12 stundu maratons', amountCents: 150000 }, { label: 'Sapņu aprīkojums', amountCents: 200000 }] }, donations: donors.map(([name, amountCents, message, minutes], i) => ({ id: 'demo-' + i, name, amountCents, message, createdAt: new Date(now - minutes * 60000).toISOString() })) });
  }
  // RFC 4180-style parsing: quoted commas, escaped quotes, and multiline fields.
  function parseCSV(text) {
    const rows = []; let row = [], field = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (quoted && text[i + 1] === '"') { field += '"'; i++; }
        else if (!quoted && field !== '') throw new Error('Nederīgs CSV pēdiņu lietojums.');
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) { row.push(field); field = ''; }
      else if ((ch === '\n' || ch === '\r') && !quoted) { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(field); if (row.some(x => x.trim())) rows.push(row); row = []; field = ''; }
      else field += ch;
    }
    if (quoted) throw new Error('CSV failā ir neaizvērtas pēdiņas.');
    row.push(field); if (row.some(x => x.trim())) rows.push(row);
    return rows;
  }
  function importData(text, current) {
    text = text.trim().replace(/^\uFEFF/, '');
    if (!text) throw new Error('Vispirms izvēlies failu vai ielīmē ziedojumu datus.');
    let data;
    if (text.startsWith('{') || text.startsWith('[')) data = JSON.parse(text);
    else {
      const rows = parseCSV(text); const headers = rows.shift().map(x => x.trim());
      if (!['name', 'amount', 'createdAt'].every(h => headers.includes(h))) throw new Error('CSV failam vajag name, amount un createdAt kolonnas. Neobligātas: id, message un currency.');
      data = rows.map((values, i) => {
        if (values.length !== headers.length) throw new Error('CSV rindā ' + (i + 2) + ' ir nepareizs kolonnu skaits.');
        return Object.fromEntries(headers.map((key, j) => [key, values[j]]));
      });
    }
    if (!Array.isArray(data)) return validateState({ ...data, source: 'custom' });
    return validateState({ settings: current.settings, source: 'custom', donations: data.map((d, i) => ({ ...d, id: d.id || 'import-' + i, amountCents: d.amountCents === undefined ? cents(d.amount) : d.amountCents })) });
  }
  root.DonoModel = { cents, validateState, stats, demo, importData, MAX_DONATIONS };
})(typeof window !== 'undefined' ? window : globalThis);

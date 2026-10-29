// Run with Node's test runner and jsdom available (NODE_PATH can point to a temporary install).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, CookieJar } = require('jsdom');

const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'assets/js/analytics.js'), 'utf8');
const policies = fs.readFileSync(path.join(root, 'assets/js/privacy-content.js'), 'utf8');
const consentKey = 'rektopuss_consent';
const disableKey = 'ga-disable-G-7VD1EYD8FM';

function fixture({ url = 'https://rektopussmedia.com/', choice, blocked = false, off = false, jar, storage, referrer = '' } = {}) {
  const dom = new JSDOM(`<html><head></head><body>
    <nav class="privacy-links"><button data-privacy-policy="privacy" hidden>Privacy</button>
    <button data-privacy-policy="cookies" hidden>Cookies</button>
    <button data-privacy-settings hidden>Settings</button></nav>
    <input value="Keep my draft"></body></html>`, {
    url, ...(referrer ? { referrer } : {}), runScripts: 'outside-only', cookieJar: jar || new CookieJar()
  });
  const { window } = dom;
  const { document } = window;
  if (storage) Object.defineProperty(window, 'localStorage', { value: {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  } });
  const script = document.createElement('script');
  script.src = new URL('/assets/js/analytics.js', url).href;
  if (off) script.dataset.analytics = 'off';
  Object.defineProperty(document, 'currentScript', { value: script });
  Object.defineProperty(document, 'readyState', { value: 'complete' });
  // jsdom has no modal-dialog implementation; emulate only that browser API.
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    window.setTimeout(() => this.dispatchEvent(new window.Event('close')), 0);
  };
  const intervals = [];
  window.setInterval = callback => { intervals.push(callback); return intervals.length; };
  if (choice !== undefined) document.cookie = consentKey + '=' + encodeURIComponent(JSON.stringify(choice)) + '; Path=/';
  if (blocked) Object.defineProperty(document, 'cookie', { get() { throw new Error('Blocked'); }, set() { throw new Error('Blocked'); } });
  window.eval(policies);
  window.eval(code);
  const click = selector => { const element = document.querySelector(selector); assert.ok(element, selector); element.click(); };
  const scripts = () => [...document.querySelectorAll('script[src*="googletagmanager.com"]')];
  const read = () => JSON.parse(decodeURIComponent(document.cookie.split('; ').find(item => item.startsWith(consentKey + '=')).split('=').slice(1).join('=')));
  return { dom, window, document, click, scripts, read, tick: () => intervals.forEach(callback => callback()) };
}
const currentChoice = analytics => ({ version: 1, analytics, savedAt: Date.now() - 1000 });

test('new visit stays untracked; opening policies is not consent', () => {
  const f = fixture();
  assert.equal(f.scripts().length, 0);
  assert.equal(f.window.dataLayer, undefined);
  assert.equal(f.window[disableKey], true);
  assert.equal(f.document.cookie, '');
  assert.equal(f.document.querySelector('.privacy-consent').hidden, false);
  f.click('[data-privacy-policy="privacy"]');
  assert.equal(f.document.querySelector('.privacy-policy').open, true);
  assert.match(f.document.querySelector('.privacy-policy-content').textContent, /SIA REKTOPUSS/);
  assert.equal(f.scripts().length, 0);
  assert.equal(f.document.cookie, '');
  f.dom.window.close();
});

test('reject persists, never loads Google, and leaves the page usable', () => {
  const f = fixture();
  f.click('[data-privacy-reject]');
  assert.equal(f.read().analytics, false);
  assert.equal(f.scripts().length, 0);
  assert.equal(f.document.querySelector('.privacy-consent').hidden, true);
  assert.equal(f.document.querySelector('input').value, 'Keep my draft');
  f.click('[data-privacy-settings]');
  assert.equal(f.document.querySelector('.privacy-consent').hidden, false);
  f.dom.window.close();
});

test('accept loads once, with advertising disabled and limited cookie lifetime', () => {
  const f = fixture({ url: 'https://www.rektopussmedia.com/asv/?email=private@example.com#private' });
  f.click('[data-privacy-accept]');
  assert.equal(f.scripts().length, 1);
  assert.equal(f.read().analytics, true);
  assert.equal(f.window[disableKey], false);
  const config = f.window.dataLayer.find(args => args[0] === 'config')[2];
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.cookie_expires, 180 * 86400);
  assert.equal(config.cookie_update, false);
  assert.equal(config.page_location, 'https://rektopussmedia.com/asv/');
  assert.equal(f.window.dataLayer[0][2].ad_storage, 'denied');
  f.click('[data-privacy-settings]');
  f.click('[data-privacy-accept]');
  assert.equal(f.scripts().length, 1);
  f.dom.window.close();
});

test('withdrawal disables loaded analytics, clears only tracking cookies, and preserves form drafts', () => {
  const f = fixture();
  f.click('[data-privacy-accept]');
  f.document.cookie = '_ga=old-id; Domain=rektopussmedia.com; Path=/';
  f.document.cookie = '_ga_7VD1EYD8FM=session; Path=/';
  f.document.cookie = 'unrelated=keep; Path=/';
  f.click('[data-privacy-settings]');
  f.click('[data-privacy-reject]');
  assert.equal(f.window[disableKey], true);
  assert.equal(f.read().analytics, false);
  assert.doesNotMatch(f.document.cookie, /(?:^|; )_ga/);
  assert.match(f.document.cookie, /unrelated=keep/);
  assert.equal(f.document.querySelector('input').value, 'Keep my draft');
  // A Google download completing after withdrawal must not leave tracking cookies behind.
  f.document.cookie = '_ga=late-id; Domain=rektopussmedia.com; Path=/';
  f.scripts()[0].onload();
  assert.doesNotMatch(f.document.cookie, /(?:^|; )_ga/);
  f.dom.window.close();
});

test('saved choices are respected; expired, malformed and old-version choices fail closed', () => {
  const variants = [
    { choice: currentChoice(true), load: 1, hidden: true },
    { choice: currentChoice(false), load: 0, hidden: true },
    { choice: { ...currentChoice(true), version: 0 }, load: 0, hidden: false },
    { choice: { ...currentChoice(true), savedAt: Date.now() - 181 * 86400000 }, load: 0, hidden: false },
    { choice: { ...currentChoice(true), savedAt: Date.now() + 86400000 }, load: 0, hidden: false },
    { choice: { ...currentChoice(true), analytics: 'true' }, load: 0, hidden: false },
    { choice: 'bad-data', load: 0, hidden: false }
  ];
  for (const v of variants) {
    const f = fixture(v);
    assert.equal(f.scripts().length, v.load);
    assert.equal(f.document.querySelector('.privacy-consent').hidden, v.hidden);
    f.dom.window.close();
  }
});

test('www/apex and other tabs share choices and observe withdrawal', () => {
  const jar = new CookieJar();
  const first = fixture({ jar, url: 'https://rektopussmedia.com/bonusi/' });
  first.click('[data-privacy-accept]');
  const second = fixture({ jar, url: 'https://www.rektopussmedia.com/asv/' });
  assert.equal(second.scripts().length, 1);
  second.click('[data-privacy-settings]');
  second.click('[data-privacy-reject]');
  first.tick();
  assert.equal(first.window[disableKey], true);
  assert.equal(first.read().analytics, false);
  first.dom.window.close(); second.dom.window.close();
});

test('blocked cookies do not break controls or imply consent on a future visit', () => {
  const f = fixture({ blocked: true });
  assert.equal(f.scripts().length, 0);
  f.click('[data-privacy-reject]');
  assert.equal(f.document.querySelector('.privacy-consent').hidden, true);
  assert.match(f.document.querySelector('[role="status"]').textContent, /tikai uz šo/);
  f.tick();
  assert.equal(f.scripts().length, 0);
  f.dom.window.close();
});

test('local previews and pages without pre-existing analytics stay untracked even after opt-in', () => {
  for (const options of [{ url: 'http://localhost:3211/' }, { off: true }]) {
    const f = fixture(options);
    f.click('[data-privacy-settings]');
    f.click('[data-privacy-accept]');
    assert.equal(f.scripts().length, 0);
    assert.equal(f.window[disableKey], true);
    f.dom.window.close();
  }
});

test('local acceptance and rejection survive refresh even when cookies are blocked', () => {
  for (const url of ['http://localhost:3211/', 'file:///C:/site/index.html']) {
    for (const analytics of [true, false]) {
      const storage = new Map();
      const first = fixture({ url, blocked: true, storage });
      first.click(analytics ? '[data-privacy-accept]' : '[data-privacy-reject]');
      assert.equal(JSON.parse(storage.get(consentKey)).analytics, analytics);
      assert.doesNotMatch(first.document.querySelector('[role="status"]').textContent, /tikai uz šo/);
      first.dom.window.close();
      const refreshed = fixture({ url, blocked: true, storage });
      assert.equal(refreshed.document.querySelector('.privacy-consent').hidden, true);
      assert.equal(refreshed.scripts().length, 0);
      refreshed.click('[data-privacy-settings]');
      assert.match(refreshed.document.querySelector('[data-privacy-current]').textContent,
        analytics ? /analītika atļauta/ : /tikai nepieciešamās/);
      refreshed.dom.window.close();
    }
  }
});

test('local storage choices expire and cannot enable live Analytics', () => {
  const storage = new Map([[consentKey, JSON.stringify({
    ...currentChoice(true), savedAt: Date.now() - 181 * 86400000
  })]]);
  const expired = fixture({ url: 'http://localhost:3211/', storage });
  assert.equal(expired.document.querySelector('.privacy-consent').hidden, false);
  expired.dom.window.close();
  storage.set(consentKey, JSON.stringify(currentChoice(true)));
  const production = fixture({ storage });
  assert.equal(production.document.querySelector('.privacy-consent').hidden, false);
  assert.equal(production.scripts().length, 0);
  production.dom.window.close();
});

test('policy switching and settings stay in-place and expose both notice bodies', async () => {
  const f = fixture();
  f.click('[data-privacy-policy="cookies"]');
  assert.match(f.document.querySelector('#privacy-policy-title').textContent, /Sīkdatņu/);
  assert.match(f.document.querySelector('.privacy-policy-content').textContent, /_ga_7VD1EYD8FM/);
  f.click('.privacy-policy [data-privacy-policy="privacy"]');
  assert.match(f.document.querySelector('#privacy-policy-title').textContent, /Privātuma/);
  assert.match(f.document.querySelector('.privacy-policy-content').textContent, /2027\. gada 31\. decembrim/);
  f.window.RektopussPrivacy.openPolicy('cookies');
  f.click('.privacy-policy [data-privacy-settings]');
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(f.document.querySelector('.privacy-policy').open, false);
  assert.equal(f.document.querySelector('.privacy-consent').hidden, false);
  assert.equal(f.document.activeElement.id, 'privacy-consent-title');
  assert.equal(f.window.location.href, 'https://rektopussmedia.com/');
  f.dom.window.close();
});

test('every HTML page has correctly ordered shared assets, UTF-8 controls and no direct Google Ads script', () => {
  const pages = fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith('.html') && !file.startsWith('.git'));
  assert.equal(pages.length, 14);
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    assert.ok(doc.querySelector('.privacy-links [data-privacy-policy="privacy"]'), file);
    assert.ok(doc.querySelector('.privacy-links [data-privacy-policy="cookies"]'), file);
    assert.match(doc.querySelector('.privacy-links').textContent, /Sīkdatņu iestatījumi/);
    assert.ok(html.indexOf('privacy-content.js') < html.indexOf('assets/js/analytics.js'), file);
    for (const element of doc.querySelectorAll('script[src*="assets/js/"],link[href*="assets/css/privacy.css"]')) {
      const local = element.getAttribute('src') || element.getAttribute('href');
      assert.ok(fs.existsSync(path.resolve(root, path.dirname(file), local)), file + ': ' + local);
    }
    assert.doesNotMatch(html, /googleadservices\.com/);
    assert.doesNotMatch(html, /href="[^\"]*(?:privatums|sikdatnes)\//);
    dom.window.close();
  }
});

test('all tracked documents send their descriptive title, content group and canonical URL', () => {
  const files = fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith('.html') && !file.startsWith('.git'));
  const reports = new Map();
  let count = 0;
  for (const file of files) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'));
    const doc = dom.window.document;
    const tag = doc.querySelector('script[src$="assets/js/analytics.js"]');
    if (tag.dataset.analytics === 'off') { dom.window.close(); continue; }
    count++;
    const f = fixture({ url: 'https://www.rektopussmedia.com/' + file.replaceAll('\\', '/'), choice: currentChoice(true) });
    assert.equal(f.scripts().length, 1, file);
    const config = f.window.dataLayer.find(args => args[0] === 'config')[2];
    assert.equal(config.page_title, doc.title.trim(), file);
    assert.equal(config.page_location, doc.querySelector('link[rel="canonical"]').href, file);
    assert.ok(config.content_group, file);
    assert.ok(config.page_title.length < 100, file);
    reports.set(config.page_location, config.page_title);
    f.dom.window.close(); dom.window.close();
  }
  assert.equal(count, 11);
  assert.equal(reports.size, 10, 'Only the donations alias shares a reporting identity');
  assert.match(reports.get('https://rektopussmedia.com/turnirs/'), /Rezultāti/);
  assert.match(reports.get('https://rektopussmedia.com/turnirs/schedule.html'), /Spēļu grafiks/);
  assert.match(reports.get('https://rektopussmedia.com/3x3/'), /Pieteikšanās/);
  assert.match(reports.get('https://rektopussmedia.com/watchmewin/'), /Pāreja uz partnera lapu/);
});

test('directory, index.html, www and campaign aliases do not split page reports', () => {
  for (const pathname of ['/asv', '/asv/', '/asv/index.html', '/donations', '/donations/', '/donations/index.html']) {
    const f = fixture({ url: 'https://www.rektopussmedia.com' + pathname, choice: currentChoice(true) });
    const config = f.window.dataLayer.find(args => args[0] === 'config')[2];
    assert.equal(config.page_location, 'https://rektopussmedia.com/asv/');
    assert.equal(config.content_group, 'Ziedojumi');
    f.dom.window.close();
  }
});

test('internal referral paths are useful while private query/hash data stay excluded', () => {
  const f = fixture({
    url: 'https://rektopussmedia.com/asv/?email=private@example.com#donor-data',
    referrer: 'https://www.rektopussmedia.com/bonusi/index.html?email=private@example.com#private',
    choice: currentChoice(true)
  });
  const config = f.window.dataLayer.find(args => args[0] === 'config')[2];
  assert.equal(config.page_referrer, 'https://rektopussmedia.com/bonusi/');
  assert.doesNotMatch(JSON.stringify(config), /private|donor-data/);
  f.dom.window.close();
  const external = fixture({ referrer: 'https://example.com/private-path?email=private@example.com', choice: currentChoice(true) });
  assert.equal(external.window.dataLayer.find(args => args[0] === 'config')[2].page_referrer, 'https://example.com/');
  external.dom.window.close();
});

test('standard campaign labels survive URL cleanup without fragmenting page paths', () => {
  const f = fixture({
    url: 'https://rektopussmedia.com/asv/?utm_source=Telegram&utm_medium=Social&utm_campaign=ASV2027&utm_content=main_card&utm_id=trip2&utm_term=florida&email=private@example.com#private',
    choice: currentChoice(true)
  });
  const config = f.window.dataLayer.find(args => args[0] === 'config')[2];
  assert.equal(config.page_location, 'https://rektopussmedia.com/asv/');
  assert.equal(config.campaign_source, 'telegram');
  assert.equal(config.campaign_medium, 'social');
  assert.equal(config.campaign_name, 'ASV2027');
  assert.equal(config.campaign_content, 'main_card');
  assert.equal(config.campaign_id, 'trip2');
  assert.equal(config.campaign_term, 'florida');
  assert.doesNotMatch(JSON.stringify(config), /private@example/);
  f.dom.window.close();
});

test('production test mode and utility pages cannot inflate visitor reports', () => {
  for (const pathname of ['/asv/?test=1', '/donations/?test', '/donations/overlay/', '/turnirs/admin.html', '/upene/', '/unknown/']) {
    const f = fixture({ url: 'https://rektopussmedia.com' + pathname, choice: currentChoice(true) });
    assert.equal(f.scripts().length, 0, pathname);
    f.dom.window.close();
  }
});

function addTrackedButton(f, action = 'donate') {
  const button = f.document.createElement('button');
  button.type = 'button';
  button.dataset.analyticsAction = action;
  button.innerHTML = '<span>Private user text: private@example.com</span>';
  f.document.body.appendChild(button);
  return button;
}
function buttonEvents(f) {
  return (f.window.dataLayer || []).filter(args => args[0] === 'event' && args[1] === 'button_click');
}

test('a dynamically rendered button sends one clear event with page context and no DOM text', () => {
  const f = fixture({ url: 'https://www.rektopussmedia.com/donations/index.html?email=private@example.com', choice: currentChoice(true) });
  const button = addTrackedButton(f);
  button.querySelector('span').click();
  assert.equal(buttonEvents(f).length, 1);
  const payload = buttonEvents(f)[0][2];
  assert.equal(payload.button_id, 'donate');
  assert.equal(payload.button_label, 'Atvērt ziedošanu Streamlabs');
  assert.equal(payload.page_location, 'https://rektopussmedia.com/asv/');
  assert.equal(payload.page_title, 'ASV TRIPS v2 — Ziedojumi | Rektopuss Media');
  assert.equal(payload.content_group, 'Ziedojumi');
  assert.doesNotMatch(JSON.stringify(payload), /private@example|Private user text/);
  f.dom.window.close();
});

test('button clicks before acceptance, after rejection and after withdrawal are dropped, never queued', () => {
  const f = fixture();
  const button = addTrackedButton(f, 'open_bonuses');
  button.click();
  assert.equal(f.window.dataLayer, undefined);
  f.click('[data-privacy-reject]'); button.click();
  assert.equal(buttonEvents(f).length, 0);
  f.click('[data-privacy-accept]');
  assert.equal(buttonEvents(f).length, 0, 'No replay of clicks made without consent');
  button.click();
  assert.equal(buttonEvents(f).length, 1);
  f.click('[data-privacy-reject]'); button.click();
  assert.equal(buttonEvents(f).length, 1);
  f.dom.window.close();
});

test('click handler rechecks consent immediately and preserves navigation behaviour', () => {
  const f = fixture({ choice: currentChoice(true) });
  const button = addTrackedButton(f, 'open_usa_campaign');
  const event = new f.window.MouseEvent('click', { bubbles: true, cancelable: true });
  button.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(buttonEvents(f).length, 1);
  f.document.cookie = consentKey + '=; Max-Age=0; Path=/';
  button.click();
  assert.equal(buttonEvents(f).length, 1);
  f.dom.window.close();
});

test('privacy controls, disabled controls and unknown action IDs are excluded', () => {
  const f = fixture({ choice: currentChoice(true) });
  addTrackedButton(f, 'unapproved_action').click();
  const disabled = addTrackedButton(f);
  disabled.setAttribute('aria-disabled', 'true'); disabled.click();
  const settings = f.document.querySelector('[data-privacy-settings]');
  settings.dataset.analyticsAction = 'donate'; settings.click();
  assert.equal(buttonEvents(f).length, 0);
  f.dom.window.close();
});

test('preview and disabled pages do not send button events', () => {
  for (const options of [{ url: 'http://localhost:3211/' }, { url: 'https://rektopussmedia.com/asv/?test=1' }, { off: true }]) {
    const f = fixture({ ...options, choice: currentChoice(true) });
    addTrackedButton(f).click();
    assert.equal(buttonEvents(f).length, 0);
    assert.equal(f.scripts().length, 0);
    f.dom.window.close();
  }
});

test('every annotated action has an approved readable label', () => {
  const files = ['index.html','bonusi/index.html','smm/index.html','smm/paldies/index.html','watchmewin/index.html','giveaway/index.html','turnirs/schedule.html','base.js'];
  const actions = new Set(files.flatMap(file => [...fs.readFileSync(path.join(root, file), 'utf8').matchAll(/data-analytics-action="([a-z_]+)"/g)].map(match => match[1])));
  assert.ok(actions.size > 25);
  const f = fixture({ choice: currentChoice(true) });
  for (const action of actions) {
    const previous = buttonEvents(f).length;
    addTrackedButton(f, action).click();
    assert.equal(buttonEvents(f).length, previous + 1, action);
    assert.ok(buttonEvents(f).at(-1)[2].button_label.length > 0, action);
  }
  f.dom.window.close();
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '../upene/index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '../upene/age-gate.js'), 'utf8');
const key = 'upene-age-confirmation';
const day = 24 * 60 * 60 * 1000;
const now = 1800000000000;

function visit(saved, blocked = false) {
  const dom = new JSDOM(html, { url: 'https://rektopussmedia.com/upene/', runScripts: 'outside-only' });
  const { window } = dom;
  const doc = window.document;
  window.Date.now = () => now;
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  if (saved !== undefined) window.localStorage.setItem(key, saved);
  if (blocked) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Blocked'); } });
  let confirmations = 0;
  doc.addEventListener('upene:age-confirmed', () => { confirmations++; });
  window.eval(script);
  return { dom, window, doc, confirmations: () => confirmations };
}

test('yes saves a 24-hour confirmation and reveals the content, notice and map event', () => {
  const v = visit();
  assert.equal(v.doc.getElementById('age-gate').open, true);
  assert.equal(v.doc.getElementById('age-content').hidden, true);
  const escape = new v.window.Event('cancel', { cancelable: true });
  v.doc.getElementById('age-gate').dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true);
  v.doc.getElementById('age-yes').click();
  assert.deepEqual(JSON.parse(v.window.localStorage.getItem(key)), { version: 1, confirmedAt: now });
  assert.equal(v.doc.getElementById('age-gate').open, false);
  assert.equal(v.doc.getElementById('age-content').hidden, false);
  assert.equal(v.doc.getElementById('age-notice').hidden, false);
  assert.equal(v.doc.activeElement.id, 'page-title');
  assert.equal(v.confirmations(), 1);
  v.dom.window.close();
});

test('returning within 24 hours skips the prompt without extending the saved time', () => {
  const saved = JSON.stringify({ version: 1, confirmedAt: now - day + 1 });
  const v = visit(saved);
  assert.equal(v.doc.getElementById('age-gate').open, false);
  assert.equal(v.doc.getElementById('age-content').hidden, false);
  assert.equal(v.doc.getElementById('age-notice').hidden, false);
  assert.equal(v.window.localStorage.getItem(key), saved);
  assert.equal(v.confirmations(), 1);
  v.dom.window.close();
});

test('expired, malformed, future and unsupported confirmations require a fresh answer', () => {
  for (const saved of [
    JSON.stringify({ version: 1, confirmedAt: now - day }),
    JSON.stringify({ version: 1, confirmedAt: now - day - 1 }),
    JSON.stringify({ version: 1, confirmedAt: now + 1 }),
    JSON.stringify({ version: 2, confirmedAt: now }),
    JSON.stringify({ version: 1, confirmedAt: String(now) }),
    JSON.stringify({ version: 1 }), 'null', '{invalid'
  ]) {
    const v = visit(saved);
    assert.equal(v.doc.getElementById('age-gate').open, true, saved);
    assert.equal(v.doc.getElementById('age-content').hidden, true, saved);
    assert.equal(v.confirmations(), 0, saved);
    v.dom.window.close();
  }
});

test('no keeps the content hidden and never saves a confirmation', () => {
  const v = visit();
  v.doc.getElementById('age-no').click();
  assert.equal(v.window.localStorage.getItem(key), null);
  assert.equal(v.doc.getElementById('age-content').hidden, true);
  assert.equal(v.doc.getElementById('age-actions').hidden, true);
  assert.equal(v.confirmations(), 0);
  v.dom.window.close();
});

test('blocked storage still allows yes for the current visit', () => {
  const v = visit(undefined, true);
  assert.equal(v.doc.getElementById('age-gate').open, true);
  v.doc.getElementById('age-yes').click();
  assert.equal(v.doc.getElementById('age-content').hidden, false);
  assert.equal(v.doc.getElementById('age-notice').hidden, false);
  assert.equal(v.confirmations(), 1);
  v.dom.window.close();
});

test('fresh and saved age confirmations never grant analytics consent', () => {
  for (const saved of [undefined, JSON.stringify({ version: 1, confirmedAt: now - 1000 })]) {
    const v = visit(saved);
    Object.defineProperty(v.doc, 'currentScript', {
      value: v.doc.querySelector('script[src$="assets/js/analytics.js"]')
    });
    Object.defineProperty(v.doc, 'readyState', { value: 'complete' });
    v.window.eval(fs.readFileSync(path.join(__dirname, '../assets/js/privacy-content.js'), 'utf8'));
    v.window.eval(fs.readFileSync(path.join(__dirname, '../assets/js/analytics.js'), 'utf8'));
    if (saved === undefined) v.doc.getElementById('age-yes').click();
    assert.equal(v.doc.getElementById('age-content').hidden, false);
    assert.equal(v.doc.querySelector('.privacy-consent').hidden, false);
    assert.equal(v.window.dataLayer, undefined);
    assert.equal(v.doc.cookie, '');
    assert.equal(v.doc.querySelectorAll('script[src*="googletagmanager.com"]').length, 0);
    v.doc.querySelector('[data-privacy-accept]').click();
    assert.equal(v.doc.querySelectorAll('script[src*="googletagmanager.com"]').length, 1);
    assert.equal(v.window.dataLayer.find(args => args[0] === 'config')[2].page_location, 'https://rektopussmedia.com/upene/');
    v.dom.window.close();
  }
});

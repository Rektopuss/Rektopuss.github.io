const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const flush = () => new Promise(resolve => setImmediate(resolve));

function snapshot(total, id = 'first') {
  return {
    settings: { title: 'ASV TRIPS v2', currency: 'EUR', goalCents: 100000, startDate: '2020-01-01T00:00:00Z', milestones: [] },
    donations: total ? [{ id, name: 'Supporter', amountCents: total, message: 'Paldies!', createdAt: new Date().toISOString() }] : []
  };
}

function dashboard({ overlay = false } = {}) {
  const dom = new JSDOM('<body' + (overlay ? ' data-view="overlay"' : '') + '><div id="app"></div></body>', {
    url: 'https://rektopussmedia.com/asv/', runScripts: 'outside-only'
  });
  const w = dom.window;
  const timers = new Map(), intervals = [];
  let nextTimer = 0, resolveInitial, rejectInitial, current;
  const initial = new Promise((resolve, reject) => { resolveInitial = resolve; rejectInitial = reject; });
  w.setTimeout = (callback, ms) => { const id = ++nextTimer; timers.set(id, { callback, ms }); return id; };
  w.clearTimeout = id => timers.delete(id);
  w.setInterval = (callback, ms) => { intervals.push({ callback, ms }); return intervals.length; };
  w.clearInterval = () => {};
  w.matchMedia = () => ({ matches: true });
  w.ResizeObserver = class { observe() {} disconnect() {} };
  w.requestAnimationFrame = () => 0;
  w.cancelAnimationFrame = () => {};
  w.DONO_CONFIG = { apiBaseUrl: 'https://api.example.com', apiTransport: 'poll', donateUrl: 'https://streamlabs.com/example/tip' };
  let calls = 0;
  w.fetch = async () => { calls++; return calls === 1 ? initial : { ok: true, json: async () => current }; };
  Object.defineProperty(w.document, 'currentScript', { value: { src: 'https://rektopussmedia.com/base.js' } });
  for (const file of ['model.js', 'donations/campaign-goals.js']) w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  w.DonationSecrets = { render() {} };
  w.eval(fs.readFileSync(path.join(root, 'base.js'), 'utf8'));
  return {
    dom, w, timers,
    alert: () => w.document.getElementById('donation-alert'),
    load: async data => { current = data; resolveInitial({ ok: true, json: async () => data }); await flush(); },
    fail: async () => { rejectInitial(new Error('Offline')); await flush(); },
    poll: async data => { current = data; await intervals.find(timer => timer.ms === 15000).callback(); await flush(); },
    advance: ms => {
      const entry = [...timers].find(([, timer]) => timer.ms === ms);
      assert.ok(entry, 'Expected timer: ' + ms);
      timers.delete(entry[0]); entry[1].callback();
    }
  };
}

test('initial notice waits for real data, shows progress within the current step and fades once', async () => {
  const f = dashboard();
  assert.equal(f.alert().classList.contains('visible'), false);
  await f.load(snapshot(50000));
  assert.equal(f.alert().classList.contains('is-progress'), true);
  assert.equal(f.alert().classList.contains('visible'), true);
  assert.match(f.alert().querySelector('img').src, /assets\/images\/donations\/secret-placeholder\.jpg$/);
  assert.ok(fs.existsSync(path.join(root, 'assets/images/donations/secret-placeholder.jpg')));
  assert.match(f.alert().textContent, /2\. solis/);
  const progress = f.alert().querySelector('progress');
  assert.equal(progress.value, 10000);
  assert.equal(progress.max, 40000);
  assert.match(f.alert().querySelector('p').textContent, /300/);
  f.advance(3600);
  assert.equal(f.alert().classList.contains('visible'), false);
  f.advance(400);
  await f.poll(snapshot(50000));
  assert.equal(f.alert().classList.contains('visible'), false);
  assert.equal([...f.timers.values()].some(timer => timer.ms === 3600), false);
  f.dom.window.close();
});

test('a shortened final step uses the remaining milestone distance', async () => {
  const f = dashboard();
  await f.load(snapshot(90000));
  assert.match(f.alert().textContent, /3\. solis/);
  assert.equal(f.alert().querySelector('progress').value, 10000);
  assert.equal(f.alert().querySelector('progress').max, 20000);
  f.dom.window.close();
});

test('zero and completed campaigns have accurate messages', async () => {
  const zero = dashboard();
  await zero.load(snapshot(0));
  assert.equal(zero.alert().querySelector('progress').value, 0);
  assert.equal(zero.alert().querySelector('progress').max, 40000);
  zero.dom.window.close();
  const done = dashboard();
  await done.load(snapshot(100000));
  assert.match(done.alert().textContent, /Brauciena mērķis sasniegts/);
  assert.match(done.alert().querySelector('img').src, /florida-placeholder\.jpg$/);
  assert.equal(done.alert().querySelector('progress'), null);
  done.dom.window.close();
});

test('donation notifications queue after the initial notice and retain their normal duration', async () => {
  const f = dashboard();
  const data = snapshot(50000);
  await f.load(data);
  await f.poll({ ...data, donations: [...data.donations, { ...data.donations[0], id: 'second', name: 'New supporter', amountCents: 1000 }] });
  assert.equal(f.alert().classList.contains('is-progress'), true);
  f.advance(3600); f.advance(400);
  assert.equal(f.alert().classList.contains('is-progress'), false);
  assert.match(f.alert().textContent, /SAŅEMTS JAUNS ZIEDOJUMS/);
  assert.match(f.alert().textContent, /New supporter/);
  f.advance(4200);
  assert.equal(f.alert().classList.contains('visible'), false);
  f.dom.window.close();
});

test('failed live data and OBS overlays do not display an initial progress notice', async () => {
  const failed = dashboard();
  await failed.fail();
  assert.equal(failed.alert().classList.contains('visible'), false);
  failed.dom.window.close();
  const overlay = dashboard({ overlay: true });
  await overlay.load(snapshot(50000));
  assert.equal(overlay.alert().classList.contains('visible'), false);
  overlay.dom.window.close();
});

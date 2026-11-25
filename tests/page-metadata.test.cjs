// Run with Node's test runner and jsdom available, as with privacy.test.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');

test('every page has a descriptive branded title, matching share titles and a valid local favicon', () => {
  const files = fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith('.html') && !file.startsWith('.git'));
  assert.equal(files.length, 14);
  for (const file of files) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'));
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('title').length, 1, file);
    assert.ok(doc.title.trim().length > 10 && doc.title.length < 100, file);
    assert.match(doc.title, /\| Rektopuss Media$/, file);
    assert.equal(doc.querySelector('meta[property="og:title"]').content, doc.title, file);
    assert.equal(doc.querySelector('meta[name="twitter:title"]').content, doc.title, file);
    const icons = [...doc.querySelectorAll('link')].filter(link => link.rel.split(/\s+/).includes('icon'));
    assert.equal(icons.length, 1, file);
    assert.equal(icons[0].type, 'image/x-icon', file);
    const target = path.resolve(root, path.dirname(file), icons[0].getAttribute('href'));
    assert.equal(target, path.join(root, 'assets/icons/rektopuss.ico'), file);
    assert.ok(fs.existsSync(target), file);
    dom.window.close();
  }
});

test('the shared ICO contains valid image frames within the file', () => {
  const icon = fs.readFileSync(path.join(root, 'assets/icons/rektopuss.ico'));
  assert.equal(icon.readUInt16LE(0), 0);
  assert.equal(icon.readUInt16LE(2), 1);
  const frames = icon.readUInt16LE(4);
  assert.ok(frames > 0);
  for (let i = 0; i < frames; i++) {
    const entry = 6 + 16 * i;
    const length = icon.readUInt32LE(entry + 8);
    const offset = icon.readUInt32LE(entry + 12);
    assert.ok(length > 0);
    assert.ok(offset >= 6 + frames * 16);
    assert.ok(offset + length <= icon.length);
  }
});

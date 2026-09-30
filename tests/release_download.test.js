const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function load(releases, unavailable = false) {
  const source = fs.readFileSync(path.join(__dirname, '../assets/site.js'), 'utf8');
  const start = source.indexOf('  async function loadRelease(){');
  const end = source.indexOf('  loadRelease();', start);
  const nodes = Object.fromEntries(['releaseDownload', 'releaseSize', 'downloadCount'].map(id => [id, {
    textContent: '', classList: {remove() {}}, removeAttribute() {}, setAttribute() {}
  }]));
  const checksum = {textContent: ''};
  const cfg = {download: {url: 'https://example.com/v1.1.0.zip', sizeBytes: 81011064, sha256: 'a'.repeat(64)}, github: {owner: 'owner', repo: 'repo'}};
  const context = vm.createContext({cfg, winVersion: 'v1.1.0', document: {
    getElementById: id => nodes[id], querySelector: () => checksum
  }, fetch: async () => ({ok: !unavailable, json: async () => releases}), console: {warn() {}}});
  await vm.runInContext(source.slice(start, end) + '\nloadRelease()', context);
  return {nodes, checksum, cfg};
}

test('stale release data and API failures preserve the verified download and checksum', async () => {
  for (const unavailable of [false, true]) {
    const {nodes, checksum, cfg} = await load([{tag_name: 'v1.0.0', assets: [{name: 'old.zip', browser_download_url: 'old'}]}], unavailable);
    assert.equal(nodes.releaseDownload.href, cfg.download.url);
    assert.equal(checksum.textContent, cfg.download.sha256);
    assert.equal(nodes.releaseSize.textContent, '77.3 MB');
  }
});

test('matching published Windows asset updates metadata without selecting checksum files', async () => {
  const {nodes, checksum} = await load([{tag_name: 'v1.1.0', assets: [
    {name: 'SHA256SUMS.txt', browser_download_url: 'checksum-file', download_count: 10},
    {name: 'SeventhLantern_v1.1.0_Windows.zip', state: 'uploaded', browser_download_url: 'archive', size: 81011064, digest: 'sha256:' + 'b'.repeat(64), download_count: 3}
  ]}]);
  assert.equal(nodes.releaseDownload.href, 'archive');
  assert.equal(nodes.downloadCount.textContent, '3');
  assert.equal(checksum.textContent, 'b'.repeat(64));
});

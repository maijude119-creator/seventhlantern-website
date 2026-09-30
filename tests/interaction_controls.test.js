const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(repo, 'game/index.html'), 'utf8');
const game = fs.readFileSync(path.join(repo, 'game/game.js'), 'utf8');

test('help explains how to switch between nearby interaction targets', () => {
  assert.match(html, /<kbd>↑<\/kbd><kbd>↓<\/kbd><span>多个交互目标间切换；收灯时也可用 W \/ S<\/span>/);
});

test('documented alternate keys match the live interaction input rules', () => {
  assert.match(game, /pressed\.has\("arrowup"\)\|\|\(!lampIsFocused\(\)&&pressed\.has\("w"\)\)/);
  assert.match(game, /pressed\.has\("arrowdown"\)\|\|\(!lampIsFocused\(\)&&pressed\.has\("s"\)\)/);
});

test('multi-target prompt shows selection controls, selected target, and total count', () => {
  const start = game.indexOf('function drawInteractionPaperPrompt(target)');
  const end = game.indexOf('\nfunction drawUIV2()', start);
  const prompt = game.slice(start, end);
  assert.match(prompt, /收灯时 W \/ S/);
  assert.match(prompt, /current\+1.*list\.length/);
  assert.match(prompt, /E 确认/);
});

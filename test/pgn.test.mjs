// Parser tests: node test/pgn.test.mjs  (or npm test)
import assert from 'node:assert/strict';
import { parsePgn, formatMoves } from '../src/pgn.js';
import { EXAMPLE_WHITE, EXAMPLE_BLACK } from '../src/examples.js';

const sans = (l) => l.moves.map((m) => m.san).join(' ');
let n = 0;
function t(name, fn) { fn(); n++; console.log('ok -', name); }

t('examples parse without errors', () => {
  const w = parsePgn(EXAMPLE_WHITE, 'white');
  const b = parsePgn(EXAMPLE_BLACK, 'black');
  assert.deepEqual(w.errors, []);
  assert.deepEqual(b.errors, []);
  assert.equal(w.lines.length, 5); // Ruy 2 + QG 3
  assert.equal(b.lines.length, 6); // Najdorf 3 + Caro 3
});

t('variations, comments, NAGs, move numbers', () => {
  const pgn = `[Event "Test"]
1. e4 {best by test} e5!? 2. Nf3 $1 Nc6 (2... d6 3. d4 (3. Bc4 Be7) exd4) 3... ; eol comment
3. Bb5 a6 1-0`;
  const { lines, errors } = parsePgn(pgn, 'white');
  assert.deepEqual(errors, []);
  assert.deepEqual(lines.map(sans), [
    'e4 e5 Nf3 Nc6 Bb5 a6',
    'e4 e5 Nf3 d6 d4 exd4',
    'e4 e5 Nf3 d6 Bc4 Be7',
  ]);
  assert.equal(lines[0].label, 'Test · line 1/3');
});

t('multiple games, no headers, castling with zeros, checks', () => {
  const pgn = `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. 0-0 Nf6 5. d3 O-O *
1. d4 d5 *
1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;
  const { lines, errors } = parsePgn(pgn, 'white');
  assert.deepEqual(errors, []);
  assert.equal(lines.length, 3);
  assert.equal(lines[0].moves[6].san, 'O-O');
  assert.equal(lines[2].moves.at(-1).san, 'Qxf7#');
});

t('illegal move reported, other lines kept', () => {
  const { lines, errors } = parsePgn('1. e4 e5 2. Ke3 *\n\n1. d4 *', 'black');
  assert.equal(lines.length, 1);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Ke3/);
});

t('duplicate lines removed', () => {
  const { lines } = parsePgn('1. e4 e5 *\n1. e4 e5 *', 'white');
  assert.equal(lines.length, 1);
});

t('FEN start position', () => {
  const pgn = `[FEN "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"]
[SetUp "1"]
2. Nf3 Nc6 *`;
  const { lines, errors } = parsePgn(pgn, 'white');
  assert.deepEqual(errors, []);
  assert.equal(sans(lines[0]), 'Nf3 Nc6');
  assert.equal(formatMoves(lines[0].moves, lines[0].startFen), '2. Nf3 Nc6');
});

t('formatMoves', () => {
  assert.equal(formatMoves(['e4', 'e5', 'Nf3']), '1. e4 e5 2. Nf3');
});

console.log(`\n${n} tests passed`);

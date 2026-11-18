import { Chessground } from 'chessground';
import { Chess } from 'chess.js';
import { parsePgn, formatMoves } from './pgn.js';
import { EXAMPLES } from './examples.js';

// ---------- storage ----------
// entries: [{ id, name, color: 'white'|'black', enabled, pgn }]
const KEY = 'openingTrainer.entries';
const OLD_W = 'openingTrainer.whitePgn';
const OLD_B = 'openingTrainer.blackPgn';

const newId = () => Math.random().toString(36).slice(2, 10);
const exampleEntries = () => EXAMPLES.map((e) => ({ id: newId(), enabled: true, ...e }));

function loadEntries() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
    // migrate the old two-box format
    const w = localStorage.getItem(OLD_W);
    const b = localStorage.getItem(OLD_B);
    if (w !== null || b !== null) {
      const list = [];
      if (w && w.trim()) list.push({ id: newId(), name: 'White repertoire', color: 'white', enabled: true, pgn: w });
      if (b && b.trim()) list.push({ id: newId(), name: 'Black repertoire', color: 'black', enabled: true, pgn: b });
      return list;
    }
  } catch (e) { /* fall through */ }
  return exampleEntries();
}

let entries = loadEntries();
let saveTimer = null;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
    localStorage.removeItem(OLD_W);
    localStorage.removeItem(OLD_B);
    return true;
  } catch (e) { return false; }
}
function scheduleSave() {
  $('save-status').textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    $('save-status').textContent = persist() ? 'All changes saved' : 'Could not save (storage unavailable)';
  }, 400);
}

function entryLines(entry) {
  const { lines, errors } = parsePgn(entry.pgn, entry.color);
  const name = entry.name.trim() || 'Untitled';
  lines.forEach((l, i) => {
    l.label = lines.length > 1 ? `${name} · line ${i + 1}/${lines.length}` : name;
    l.entryId = entry.id;
  });
  return { lines, errors };
}

function allLines() {
  return entries.filter((e) => e.enabled).flatMap((e) => entryLines(e).lines);
}

// ---------- view switching ----------
const $ = (id) => document.getElementById(id);
const views = ['home', 'setup', 'train'];
function show(view) {
  for (const v of views) $(`view-${v}`).hidden = v !== view;
  document.body.dataset.view = view;
  if (view === 'home') renderHome();
  if (view === 'setup') renderSetup();
  if (view === 'train') startTraining();
}

// ---------- home ----------
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
function renderHome() {
  const active = entries.filter((e) => e.enabled);
  const n = allLines().length;
  $('home-count').textContent = `${plural(n, 'line')} from ${plural(active.length, 'active PGN')}`;
  $('btn-train').disabled = n === 0;
}

// ---------- setup ----------
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const c of children) node.append(c);
  return node;
}

function summaryText(entry) {
  const { lines, errors } = entryLines(entry);
  return { count: plural(lines.length, 'line'), errors };
}

function renderSummary(entry, box) {
  const { count, errors } = summaryText(entry);
  box.replaceChildren(
    el('span', { className: 'summary-count', textContent: count }),
    ...errors.map((e) => el('div', { className: 'summary-error', textContent: e })),
  );
}

function renderEntry(entry) {
  const card = el('section', { className: 'entry' + (entry.enabled ? '' : ' off') });
  card.dataset.id = entry.id;

  const check = el('input', { type: 'checkbox', checked: entry.enabled, className: 'entry-check', title: 'Include in training' });
  check.addEventListener('change', () => {
    entry.enabled = check.checked;
    card.classList.toggle('off', !entry.enabled);
    scheduleSave();
  });

  const name = el('input', { type: 'text', value: entry.name, className: 'entry-name', placeholder: 'Name', spellcheck: false });
  name.addEventListener('input', () => { entry.name = name.value; scheduleSave(); });

  const seg = el('div', { className: 'seg', role: 'group', title: 'Side you play' });
  for (const c of ['white', 'black']) {
    const b = el('button', { type: 'button', textContent: c === 'white' ? 'White' : 'Black' });
    b.dataset.color = c;
    b.classList.toggle('on', entry.color === c);
    b.addEventListener('click', () => {
      entry.color = c;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.color === c));
      renderSummary(entry, summary);
      scheduleSave();
    });
    seg.append(b);
  }

  const del = el('button', { type: 'button', className: 'icon-btn', title: 'Delete', innerHTML:
    '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>' });
  del.addEventListener('click', () => {
    const label = entry.name.trim() || 'this PGN';
    if (entry.pgn.trim() && !confirm(`Delete "${label}"?`)) return;
    entries = entries.filter((e) => e !== entry);
    card.remove();
    renderEmpty();
    scheduleSave();
  });

  const text = el('textarea', { value: entry.pgn, spellcheck: false, placeholder: '1. e4 e5 2. Nf3 Nc6 3. Bb5 (3. Bc4 Bc5) a6 *' });
  const summary = el('div', { className: 'summary' });
  text.addEventListener('input', () => { entry.pgn = text.value; renderSummary(entry, summary); scheduleSave(); });
  renderSummary(entry, summary);

  card.append(
    el('div', { className: 'entry-head' }, [check, name, seg, del]),
    el('div', { className: 'entry-body' }, [text, summary]),
  );
  return card;
}

function renderEmpty() {
  $('entries-empty').hidden = entries.length > 0;
}

function renderSetup() {
  $('entries').replaceChildren(...entries.map(renderEntry));
  renderEmpty();
  $('save-status').textContent = '';
}

function exportText() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parts = [`Opening Trainer export - ${date}`, `${plural(entries.length, 'PGN')}`, ''];
  for (const e of entries) {
    parts.push(
      `=== ${e.name.trim() || 'Untitled'} ===`,
      `Side: ${e.color === 'white' ? 'White' : 'Black'}`,
      `Active: ${e.enabled ? 'Yes' : 'No'}`,
      '',
      e.pgn.trim(),
      '',
      '',
    );
  }
  return { text: parts.join('\r\n').replace(/\r?\n/g, '\r\n'), filename: `opening-trainer-${date}.txt` };
}

function downloadExport() {
  const { text, filename } = exportText();
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function addEntry() {
  const entry = { id: newId(), name: '', color: 'white', enabled: true, pgn: '' };
  entries.push(entry);
  const card = renderEntry(entry);
  $('entries').append(card);
  renderEmpty();
  card.querySelector('.entry-name').focus();
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  scheduleSave();
}

// ---------- training ----------
let cg = null;
let chess = null;
let line = null;
let ply = 0;
let mistakes = 0;
let lastLineKey = null;
let busy = false;
let timers = [];

const lineKey = (l) => l.color + '|' + l.moves.map((m) => m.san).join(' ');
function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
function clearTimers() { timers.forEach(clearTimeout); timers = []; }

function dests() {
  const map = new Map();
  for (const m of chess.moves({ verbose: true })) {
    if (!map.has(m.from)) map.set(m.from, []);
    map.get(m.from).push(m.to);
  }
  return map;
}
const turnColor = () => (chess.turn() === 'w' ? 'white' : 'black');

function ensureBoard() {
  if (cg) return;
  cg = Chessground($('board'), {
    coordinates: true,
    animation: { enabled: true, duration: 200 },
    highlight: { lastMove: true, check: true },
    premovable: { enabled: false },
    draggable: { showGhost: true },
    movable: { free: false, showDests: true, events: { after: onUserMove } },
    drawable: { enabled: true },
  });
}

function syncBoard(lastMove) {
  const userTurn = ply < line.moves.length && turnColor() === line.color && !busy;
  cg.set({
    fen: chess.fen(),
    orientation: line.color,
    turnColor: turnColor(),
    check: chess.inCheck(),
    lastMove,
    movable: { color: userTurn ? line.color : undefined, dests: userTurn ? dests() : new Map() },
  });
}

function pickLine() {
  const lines = allLines();
  if (!lines.length) return null;
  let pool = lines;
  if (lines.length > 1 && lastLineKey) {
    pool = lines.filter((l) => lineKey(l) !== lastLineKey);
    if (!pool.length) pool = lines;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function startTraining(specific) {
  clearTimers();
  ensureBoard();
  line = specific || pickLine();
  if (!line) { show('home'); return; }
  lastLineKey = lineKey(line);
  chess = new Chess(line.startFen);
  ply = 0;
  mistakes = 0;
  busy = false;
  cg.setAutoShapes([]);
  hideX();
  $('complete').hidden = true;
  $('train-name').textContent = line.label;
  $('train-side').textContent = `You play ${line.color === 'white' ? 'White' : 'Black'}`;
  $('train-side').dataset.color = line.color;
  renderProgress();
  syncBoard(undefined);
  cg.redrawAll();
  advance();
}

function renderProgress() {
  const played = line.moves.slice(0, ply);
  $('train-moves').textContent = played.length ? formatMoves(played, line.startFen) : '—';
  const userMoves = line.moves.filter((_, i) => isUserPly(i)).length;
  const done = line.moves.slice(0, ply).filter((_, i) => isUserPly(i)).length;
  $('train-progress-bar').style.width = userMoves ? `${(100 * done) / userMoves}%` : '100%';
  $('train-mistakes').textContent = mistakes ? `${mistakes} mistake${mistakes === 1 ? '' : 's'}` : '';
  let status = '';
  if (ply >= line.moves.length) status = 'Line complete';
  else if (isUserPly(ply)) status = 'Your move';
  else status = 'Opponent is moving…';
  $('train-status').textContent = status;
}

function isUserPly(i) {
  // whose move is ply i, given the starting side to move
  const startWhite = !line.startFen || line.startFen.split(/\s+/)[1] !== 'b';
  const white = (i % 2 === 0) === startWhite;
  return (white ? 'white' : 'black') === line.color;
}

// Called whenever it may be the trainer's turn.
function advance() {
  renderProgress();
  if (ply >= line.moves.length) { finish(); return; }
  if (isUserPly(ply)) { syncBoard(lastMoveOf(ply - 1)); return; }
  busy = true;
  syncBoard(lastMoveOf(ply - 1));
  later(() => {
    const m = line.moves[ply];
    chess.move(m.san);
    ply++;
    busy = false;
    syncBoard([m.from, m.to]);
    advance();
  }, ply === 0 ? 450 : 350);
}

function lastMoveOf(i) {
  if (i < 0) return undefined;
  const m = line.moves[i];
  return [m.from, m.to];
}

function onUserMove(orig, dest) {
  if (!line || busy || ply >= line.moves.length) return;
  const expected = line.moves[ply];
  // castling: chessground may report king-to-rook; chess.js dests use king-to-target
  const rookSq = expected.san.startsWith('O-O')
    ? (expected.san.startsWith('O-O-O') ? 'a' : 'h') + expected.from[1]
    : null;
  const ok = expected.from === orig && (expected.to === dest || dest === rookSq);
  if (ok) {
    chess.move(expected.san); // includes the correct promotion piece
    ply++;
    cg.setAutoShapes([]);
    syncBoard([orig, dest]);
    advance();
    return;
  }
  // wrong move
  mistakes++;
  busy = true;
  showX(dest);
  renderProgress();
  later(() => {
    busy = false;
    hideX();
    syncBoard(lastMoveOf(ply - 1));
  }, 650);
}

function squarePos(sq) {
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1], 10) - 1;
  const white = line.color === 'white';
  return { left: (white ? f : 7 - f) * 12.5, top: (white ? 7 - r : r) * 12.5 };
}
function showX(sq) {
  const x = $('wrong-x');
  const p = squarePos(sq);
  x.style.left = p.left + '%';
  x.style.top = p.top + '%';
  x.hidden = false;
  x.classList.remove('flash');
  void x.offsetWidth; // restart animation
  x.classList.add('flash');
  const board = $('board-shell');
  board.classList.remove('shake');
  void board.offsetWidth;
  board.classList.add('shake');
}
function hideX() { $('wrong-x').hidden = true; }

function hint() {
  if (!line || ply >= line.moves.length || !isUserPly(ply)) return;
  const m = line.moves[ply];
  cg.setAutoShapes([{ orig: m.from, dest: m.to, brush: 'green' }]);
}

function finish() {
  syncBoard(lastMoveOf(ply - 1));
  $('complete-moves').textContent = formatMoves(line.moves, line.startFen);
  $('complete-sub').textContent = mistakes === 0
    ? 'Perfect — no mistakes.'
    : `${mistakes} mistake${mistakes === 1 ? '' : 's'} along the way.`;
  later(() => { $('complete').hidden = false; $('btn-next').focus(); }, 250);
}

// ---------- wiring ----------
window.addEventListener('DOMContentLoaded', () => {
  $('btn-train').addEventListener('click', () => show('train'));
  $('btn-setup').addEventListener('click', () => show('setup'));
  document.querySelectorAll('[data-home]').forEach((b) =>
    b.addEventListener('click', () => { clearTimers(); show('home'); }));
  $('btn-add').addEventListener('click', addEntry);
  $('btn-export').addEventListener('click', downloadExport);
  $('btn-examples').addEventListener('click', () => {
    entries.push(...exampleEntries());
    renderSetup();
    scheduleSave();
  });
  $('btn-next').addEventListener('click', () => startTraining());
  $('btn-skip').addEventListener('click', () => startTraining());
  $('btn-restart').addEventListener('click', () => startTraining(line));
  $('btn-hint').addEventListener('click', hint);
  document.addEventListener('keydown', (e) => {
    if (document.body.dataset.view !== 'train') return;
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.key === 'n' || (e.key === 'Enter' && !$('complete').hidden)) { e.preventDefault(); startTraining(); }
    if (e.key === 'h') hint();
    if (e.key === 'r') startTraining(line);
  });
  window.addEventListener('resize', () => cg && cg.redrawAll());
  show('home');
});

// small hook for automated testing
window.__trainer = {
  get line() { return line; },
  get ply() { return ply; },
  get fen() { return chess && chess.fen(); },
  get busy() { return busy; },
  move: (o, d) => onUserMove(o, d),
  start: (l) => startTraining(l),
  allLines,
  parsePgn,
  get entries() { return entries; },
  exportText,
};

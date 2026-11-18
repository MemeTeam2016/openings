// PGN -> list of lines. Every mainline and every (nested) variation becomes one
// line of SAN moves. Moves are validated with chess.js.
import { Chess } from 'chess.js';

const RESULT = /^(1-0|0-1|1\/2-1\/2|\*)$/;

function tokenize(text) {
  const tokens = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '{') { // brace comment
      const end = text.indexOf('}', i + 1);
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (c === ';') { // rest-of-line comment
      const end = text.indexOf('\n', i);
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (c === '%' && (i === 0 || text[i - 1] === '\n')) { // escape line
      const end = text.indexOf('\n', i);
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (c === '[') { // header tag
      const end = text.indexOf(']', i + 1);
      const body = text.slice(i + 1, end === -1 ? n : end);
      const m = body.match(/^\s*(\w+)\s+"((?:[^"\\]|\\.)*)"/);
      if (m) tokens.push({ t: 'tag', k: m[1], v: m[2].replace(/\\(.)/g, '$1') });
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (c === '(' || c === ')') { tokens.push({ t: c }); i++; continue; }
    // plain symbol
    let j = i;
    while (j < n && !/[\s{}();[\]]/.test(text[j])) j++;
    if (j === i) { i++; continue; }
    tokens.push({ t: 'sym', v: text.slice(i, j) });
    i = j;
  }
  return tokens;
}

// Clean a symbol into a SAN move, or return null if it isn't one.
function cleanSan(sym) {
  if (RESULT.test(sym)) return null;
  if (/^\d+$/.test(sym)) return null; // bare move number
  let s = sym.replace(/^\d+\.+/, ''); // "12.e4" or "12...e5"
  if (!s) return null;
  if (/^\$\d+$/.test(s)) return null; // NAG
  s = s.replace(/[!?]+$/, '').replace(/[+#]+$/, '').replace(/[!?]+$/, '');
  s = s.replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O');
  if (s === '--' || s === 'Z0') return null; // null move: unsupported
  if (!s) return null;
  return s;
}

// Split tokens into games. A new game starts at a tag after moves, or after a result.
function splitGames(tokens) {
  const games = [];
  let cur = { tags: {}, tokens: [] };
  let seenMoves = false;
  const flush = () => {
    if (cur.tokens.length || Object.keys(cur.tags).length) games.push(cur);
    cur = { tags: {}, tokens: [] };
    seenMoves = false;
  };
  let depth = 0;
  for (const tok of tokens) {
    if (tok.t === 'tag') {
      if (seenMoves) flush();
      cur.tags[tok.k] = tok.v;
      continue;
    }
    if (tok.t === '(') depth++;
    if (tok.t === ')') depth = Math.max(0, depth - 1);
    if (tok.t === 'sym' && depth === 0 && RESULT.test(tok.v)) { flush(); continue; }
    cur.tokens.push(tok);
    if (tok.t === 'sym') seenMoves = true;
  }
  flush();
  return games;
}

// Build a tree: seq = [{ san, vars: [seq, ...] }]
function buildTree(tokens) {
  let pos = 0;
  function parseSeq() {
    const seq = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.t === ')') { pos++; return seq; }
      if (tok.t === '(') {
        pos++;
        const v = parseSeq();
        if (seq.length && v.length) seq[seq.length - 1].vars.push(v);
        continue;
      }
      pos++;
      const san = cleanSan(tok.v);
      if (san) seq.push({ san, vars: [] });
    }
    return seq;
  }
  const all = [];
  while (pos < tokens.length) {
    all.push(...parseSeq()); // tolerate stray ')'
  }
  return all;
}

function expand(seq) {
  const results = [];
  const main = [];
  for (const node of seq) {
    for (const v of node.vars) {
      for (const l of expand(v)) results.push(main.concat(l));
    }
    main.push(node.san);
  }
  results.unshift(main);
  return results;
}

function gameName(tags, idx) {
  const ok = (v) => v && v !== '?' && v.trim() !== '';
  if (ok(tags.Opening)) return tags.Opening + (ok(tags.Variation) ? ': ' + tags.Variation : '');
  if (ok(tags.Event)) return tags.Event;
  if (ok(tags.White) && ok(tags.Black)) return `${tags.White} – ${tags.Black}`;
  return `Game ${idx + 1}`;
}

/**
 * @param {string} text PGN text (may contain several games)
 * @param {'white'|'black'} color side the user trains
 * @returns {{ lines: Array, errors: string[] }}
 */
export function parsePgn(text, color) {
  const errors = [];
  const lines = [];
  const seen = new Set();
  const games = splitGames(tokenize(text || ''));
  games.forEach((g, gi) => {
    const name = gameName(g.tags, gi);
    const startFen = g.tags.FEN && g.tags.FEN.trim() ? g.tags.FEN.trim() : undefined;
    const variants = expand(buildTree(g.tokens)).filter((l) => l.length);
    variants.forEach((sans, vi) => {
      let chess;
      try { chess = new Chess(startFen); } catch (e) {
        errors.push(`${name}: invalid FEN`); return;
      }
      const moves = [];
      for (let k = 0; k < sans.length; k++) {
        let mv = null;
        try { mv = chess.move(sans[k]); } catch (e) { mv = null; }
        if (!mv) {
          errors.push(`${name}${variants.length > 1 ? ` (line ${vi + 1})` : ''}: illegal move "${sans[k]}" at ply ${k + 1}`);
          return;
        }
        moves.push({ san: mv.san, from: mv.from, to: mv.to, promotion: mv.promotion });
      }
      const key = (startFen || '') + '|' + moves.map((m) => m.san).join(' ');
      if (seen.has(key)) return;
      seen.add(key);
      lines.push({ name, color, startFen, moves, variation: vi });
    });
  });
  // number variations per game name for display
  const counts = {};
  for (const l of lines) counts[l.name] = (counts[l.name] || 0) + 1;
  const idx = {};
  for (const l of lines) {
    idx[l.name] = (idx[l.name] || 0) + 1;
    l.label = counts[l.name] > 1 ? `${l.name} · line ${idx[l.name]}/${counts[l.name]}` : l.name;
  }
  return { lines, errors };
}

/** Format a list of SAN moves with move numbers, e.g. "1. e4 e5 2. Nf3". */
export function formatMoves(moves, startFen) {
  let ply = 0;
  let moveNo = 1;
  if (startFen) {
    const parts = startFen.split(/\s+/);
    if (parts[1] === 'b') ply = 1;
    moveNo = parseInt(parts[5], 10) || 1;
  }
  const out = [];
  moves.forEach((m, i) => {
    const white = (ply + i) % 2 === 0;
    if (white) out.push(`${moveNo}.`);
    else if (i === 0) out.push(`${moveNo}...`);
    out.push(m.san || m);
    if (!white) moveNo++;
  });
  return out.join(' ');
}

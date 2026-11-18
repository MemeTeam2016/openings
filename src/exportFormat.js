// Plain-text export/import format:
//
//   Opening Trainer export - 2026-11-17
//   2 PGNs
//
//   === Ruy Lopez ===
//   Side: White
//   Active: Yes
//
//   1. e4 e5 2. Nf3 Nc6 3. Bb5 *
//
//   === Caro-Kann ===
//   ...
//
// Anything before the first "=== name ===" line is ignored.

const HEADER = /^===\s?(.*?)\s?===\s*$/;

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** @returns {{ text: string, filename: string }} */
export function formatExport(entries, date = new Date()) {
  const day = localDate(date);
  const parts = [`Opening Trainer export - ${day}`, `${entries.length} PGN${entries.length === 1 ? '' : 's'}`, ''];
  for (const e of entries) {
    parts.push(
      `=== ${(e.name || '').trim() || 'Untitled'} ===`,
      `Side: ${e.color === 'black' ? 'Black' : 'White'}`,
      `Active: ${e.enabled ? 'Yes' : 'No'}`,
      '',
      (e.pgn || '').trim(),
      '',
      '',
    );
  }
  return { text: parts.join('\n').replace(/\n/g, '\r\n'), filename: `opening-trainer-${day}.txt` };
}

/** Parse an export file into entries (without ids). */
export function parseExport(text) {
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
  const entries = [];
  let cur = null;
  let inMeta = false;
  const finish = () => {
    if (!cur) return;
    cur.pgn = cur.pgnLines.join('\n').trim();
    delete cur.pgnLines;
    entries.push(cur);
  };
  for (const line of lines) {
    const h = line.match(HEADER);
    if (h) {
      finish();
      cur = { name: h[1].trim(), color: 'white', enabled: true, pgnLines: [] };
      inMeta = true;
      continue;
    }
    if (!cur) continue;
    if (inMeta) {
      const side = line.match(/^\s*side\s*:\s*(white|black)\s*$/i);
      const active = line.match(/^\s*active\s*:\s*(yes|no|true|false|on|off)\s*$/i);
      if (side) { cur.color = side[1].toLowerCase(); continue; }
      if (active) { cur.enabled = /^(yes|true|on)$/i.test(active[1]); continue; }
      if (!line.trim()) continue;
      inMeta = false;
    }
    cur.pgnLines.push(line);
  }
  finish();
  return entries;
}

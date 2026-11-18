# Opening Trainer

A small, local-only chess opening trainer. Paste your repertoire as PGN, then drill
random lines on a Lichess-style board. Works fully offline: no server, no CDN, no account.

## Start it

**Online:** <https://memeteam2016.github.io/openings/> (GitHub Pages, works on any computer).

**Locally**, pick one:

- **Double-click `Open Trainer.cmd`**, or open **`index.html`** directly in your browser.
  The app is already built, so this is all you need.
- `npm run serve`, then go to <http://localhost:5174> (optional tiny local server, no dependencies).

Your PGNs are saved in the browser's `localStorage`, so they stay between launches,
but they belong to that browser and that address. Opening `index.html` from disk and
opening `http://localhost:5174` count as two separate stores. Use one of them consistently,
and keep a copy of your PGNs somewhere safe if they matter to you.

## Use it

- **Set up**: a list of named PGNs. Each one has:
  - a **checkbox**, so only ticked PGNs are used in training;
  - a **name** you can edit, which is shown while training;
  - a **White / Black** toggle for the side you play;
  - **×** to delete it.

  **Export** (top right) downloads a `.txt` file with every PGN's name, side, active state
  and moves, which is handy as a backup or for moving to another computer. **Import** reads
  that file back in and adds its PGNs to your list, skipping any you already have with the
  same name, side and moves.
  **+ Add PGN** at the bottom adds a new one, and **Add examples** adds the sample openings
  again. Changes save automatically. Paste standard PGN. Several games in one PGN are fine,
  and every mainline and every (nested) variation becomes its own line. Headers,
  `{comments}`, `; comments`, NAGs (`$1`, `!?`), move numbers (`12.` / `12...`), results and
  `0-0` castling are all handled. A `[FEN "..."]` header starts the game from that position.
  The line count under each PGN updates as you type, and lines with illegal moves are listed
  in red and skipped. On first launch you get four example PGNs. If you used the earlier
  two-box version, your White and Black boxes are converted into two entries automatically.
- **Train**: picks a random line from all ticked PGNs. You play that side, and the
  board is flipped for Black lines. The trainer plays the other side's moves automatically.
  A wrong move flashes a red **X** and is taken back. At the end of the line you get a summary
  and **Next line**.
  - Keys: **H** shows a hint arrow, **R** restarts the line, **N** (or **Enter** on the
    completion card) goes to the next line.

## Develop / rebuild

Requires Node.js (16+ works).

```bash
npm install      # chessground, chess.js, esbuild (from the official npm registry)
npm test         # PGN parser tests
npm run build    # writes dist/app.js, dist/app.css and copies src/index.html -> index.html
```

To update the online version, rebuild, then commit and push. The built `dist/` folder is
committed, and GitHub Pages serves the `main` branch root:

```bash
npm run build && git add -A && git commit -m "Update" && git push
```

Saved PGNs live in each browser, so the online site and your local copy each keep their own.

Layout:

| Path | What |
|---|---|
| `index.html`, `dist/` | Built app (open this) |
| `src/main.js` | UI and training logic |
| `src/pgn.js` | PGN parser: games, then variations, then validated lines |
| `src/examples.js` | Sample openings |
| `src/style.css` | Styles (imports the chessground board and piece CSS) |
| `build.mjs`, `serve.mjs` | Build script and optional local server |
| `test/pgn.test.mjs` | Parser tests |

## Credits and licenses

This app bundles the following open-source software into `dist/`:

- **[chessground](https://github.com/lichess-org/chessground)** 9.2.1, the Lichess board UI,
  © Thibault Duplessis and contributors, **GPL-3.0-or-later**. Its assets include the
  Lichess "brown" board theme.
  License: [`licenses/chessground-GPL-3.0.txt`](licenses/chessground-GPL-3.0.txt)
- **cburnett piece set** (shipped in chessground's `chessground.cburnett.css`), by
  Colin M.L. Burnett, licensed **GPLv2+** (as used by Lichess; see
  [lichess-org/lila COPYING.md](https://github.com/lichess-org/lila/blob/master/COPYING.md)).
- **[chess.js](https://github.com/jhlywa/chess.js)** 1.4.0, move generation and validation,
  © Jeff Hlywa, **BSD-2-Clause**.
  License: [`licenses/chess.js-BSD-2-Clause.txt`](licenses/chess.js-BSD-2-Clause.txt)
- **[esbuild](https://github.com/evanw/esbuild)** (MIT), used only at build time. It is not
  included in the built app.

Because the built bundle contains GPL-3.0 code, this app as a whole is distributed under
**GPL-3.0-or-later**.

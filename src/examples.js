// Default PGN entries shown on first launch.
export const EXAMPLES = [
  {
    name: 'Ruy Lopez',
    color: 'white',
    pgn: `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 {Morphy Defence}
    (3... Nf6 {Berlin} 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5)
4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 *`,
  },
  {
    name: "Queen's Gambit",
    color: 'white',
    pgn: `1. d4 d5 2. c4 e6 $1
    (2... dxc4 {Accepted} 3. e3 Nf6 4. Bxc4 e6 5. Nf3)
    (2... c6 {Slav} 3. Nf3 Nf6 4. Nc3 dxc4 5. a4)
3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 *`,
  },
  {
    name: 'Sicilian Najdorf',
    color: 'black',
    pgn: `1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6
6. Be3 (6. Bg5 e6 7. f4 Be7) (6. Be2 e5 7. Nb3 Be7) 6... e5 7. Nb3 Be6 8. f3 Be7 *`,
  },
  {
    name: 'Caro-Kann',
    color: 'black',
    pgn: `; Main line: the Advance Variation
1. e4 c6 2. d4 d5 3. e5
    (3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 {Classical})
    (3. exd5 cxd5 4. Bd3 Nc6 {Exchange})
3... Bf5 4. Nf3 e6 5. Be2 c5 *`,
  },
];

// Kept for the parser tests.
export const EXAMPLE_WHITE = EXAMPLES.filter((e) => e.color === 'white').map((e) => `[Event "${e.name}"]\n\n${e.pgn}`).join('\n\n');
export const EXAMPLE_BLACK = EXAMPLES.filter((e) => e.color === 'black').map((e) => `[Event "${e.name}"]\n\n${e.pgn}`).join('\n\n');

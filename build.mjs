// Builds the app into ./dist and copies index.html to the project root.
// Output is a classic (non-module) script so index.html works from file://.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  outfile: 'dist/app.js',
  legalComments: 'eof',
});

await build({
  entryPoints: ['src/style.css'],
  bundle: true,
  minify: true,
  outfile: 'dist/app.css',
  loader: { '.svg': 'dataurl', '.png': 'dataurl' },
});

copyFileSync('src/index.html', 'index.html');
console.log('Built dist/app.js, dist/app.css and index.html');

/**
 * build.mjs — Minifies all JS source files using Terser.
 * Run: node build.mjs
 *
 * This script is used during Docker multi-stage builds and Vercel deployments
 * to obfuscate the source code before it is served to end users.
 */

import { minify } from 'terser';
import { readFileSync, writeFileSync } from 'fs';

const JS_FILES = [
  'js/analytics.js',
  'js/app.js',
  'js/auth.js',
  'js/config.js',
  'js/contacts.js',
  'js/kanban.js',
  'js/modal.js',
  'js/settings.js',
  'js/store.js',
  // config.example.js intentionally excluded (it's just a template)
];

const TERSER_OPTIONS = {
  compress: {
    drop_console: false, // keep console logs so errors are still visible
    passes: 2,
  },
  mangle: {
    toplevel: false, // keep top-level names safe for globals used across files
  },
  format: {
    comments: false, // strip all comments
  },
};

let success = 0;
let failed = 0;

for (const file of JS_FILES) {
  try {
    const source = readFileSync(file, 'utf8');
    const result = await minify(source, TERSER_OPTIONS);
    writeFileSync(file, result.code, 'utf8');
    const saved = (((source.length - result.code.length) / source.length) * 100).toFixed(1);
    console.log(`✓  ${file.padEnd(25)} ${source.length.toLocaleString()} → ${result.code.length.toLocaleString()} bytes  (${saved}% smaller)`);
    success++;
  } catch (err) {
    console.error(`✗  ${file}  — ERROR: ${err.message}`);
    failed++;
  }
}

console.log(`\n${success} file(s) minified${failed ? `, ${failed} failed` : ''}.\n`);
if (failed > 0) process.exit(1);

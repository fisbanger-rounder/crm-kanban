/**
 * build.mjs — Minifies all JS source files using Terser.
 * Run: node build.mjs
 *
 * This script is used during Docker multi-stage builds and Vercel deployments
 * to obfuscate the source code before it is served to end users.
 *
 * Credential Injection:
 *   If the environment variables SUPABASE_URL and SUPABASE_ANON_KEY are set,
 *   this script generates js/config.js from them at build time.
 *   This means credentials are never stored in git — only in Vercel env vars.
 *
 *   To set up in Vercel:
 *     1. Go to Vercel → Project → Settings → Environment Variables
 *     2. Add: SUPABASE_URL = https://xxxx.supabase.co
 *     3. Add: SUPABASE_ANON_KEY = your-anon-key
 */

import { minify } from 'terser';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ── Step 1: Inject credentials from env vars (if available) ──────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseAnonKey) {
  const configSource = `const SUPABASE_CONFIG = { url: "${supabaseUrl}", anonKey: "${supabaseAnonKey}" };`;
  writeFileSync('js/config.js', configSource, 'utf8');
  console.log('✓  js/config.js generated from environment variables.\n');
} else if (!existsSync('js/config.js')) {
  console.error('✗  js/config.js not found and no SUPABASE_URL / SUPABASE_ANON_KEY env vars set.');
  console.error('   → For local dev: copy js/config.example.js to js/config.js and fill in your credentials.');
  console.error('   → For Vercel: set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables.\n');
  process.exit(1);
} else {
  console.log('ℹ  Using existing js/config.js (local dev mode — env vars not set).\n');
}

// ── Step 2: Minify all JS files ───────────────────────────────────────────────
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

#!/usr/bin/env node
// Muse Atlas data validator. Node built-ins only; run: node scripts/validate.mjs
// Exits 1 on any error. Warnings are printed but don't fail.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const DATA = join(SITE, 'data');
const IMG_DIR = join(SITE, 'assets', 'img');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// ---------- vocabularies ----------
const NODE_TYPES = ['person', 'work', 'place', 'event', 'movement'];
const KINDS = ['architecture', 'painting', 'sculpture', 'engineering', 'urbanism', 'mosaic', 'literature', 'patronage', 'history'];
const RELS = {
  // rel: [allowed from types, allowed to types]
  created: [['person'], ['work']],
  commissioned: [['person'], ['work']],
  relocated: [['person'], ['work']],
  located_in: [['work', 'place', 'event'], ['place', 'work']],
  born_in: [['person'], ['place']],
  died_in: [['person'], ['place']],
  buried_in: [['person'], ['place', 'work']],
  depicts: [['work'], ['person', 'event', 'work', 'place']],
  patron_of: [['person'], ['person']],
  rival_of: [['person'], ['person']],
  relative_of: [['person'], ['person']],
  influenced: [['person', 'work', 'event'], ['person', 'work', 'event']],
  part_of: [['work', 'place'], ['work', 'place']],
  restored: [['person'], ['work']],
  stolen_from: [['work', 'event'], ['place', 'work']],
  involved_in: [['person', 'work', 'place'], ['event']],
};
const SYMMETRIC = new Set(['rival_of', 'relative_of']);

const KEY_ORDER = {
  node: ['id', 'type', 'label_uk', 'label_en', 'years', 'country', 'kind', 'coords', 'image', 'core', 'articles', 'summary_uk', 'summary_en', 'wiki'],
  years: ['start', 'end', 'approx'],
  wiki: ['uk', 'en'],
  edge: ['from', 'rel', 'to', 'years', 'article'],
  article: ['id', 'date', 'title_uk', 'title_en', 'country', 'kind', 'subjects'],
  image: ['file', 'node', 'source', 'author', 'license', 'caption_uk', 'caption_en'],
};
const REQUIRED = {
  node: ['id', 'type', 'label_uk'],
  edge: ['from', 'rel', 'to'],
  article: ['id', 'date', 'title_uk'],
  image: ['file', 'node', 'source', 'author', 'license'],
};

// ---------- privacy patterns ----------
// Built from parts so this file doesn't trip the same checks itself.
const PRIVATE_PATTERNS = [
  [new RegExp('claude\\.ai/(?:code/)?(?:artifact|chat|project|cowork|session)'), 'private claude.ai link'],
  [new RegExp('trig' + '_[A-Za-z0-9]{8,}'), 'routine trigger id'],
  [new RegExp(['sk', 'ant', ''].join('-')), 'Anthropic token'],
  [new RegExp('gh' + 'p_[A-Za-z0-9]{20,}'), 'GitHub token'],
  [new RegExp('github' + '_pat_'), 'GitHub token'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'email address'],
];
// Second-person words: encyclopaedic text never addresses the reader.
const SECOND_PERSON = new RegExp(
  '(?<!\\p{L})(' +
  [
    'ти', 'тебе', 'тобі', 'тобою',
    'твій', 'твоя', 'твоє', 'твої', 'твого', 'твоєї', 'твоєму', 'твоїй', 'твоїм', 'твоїх', 'твоїми', 'твою',
    'ви', 'вас', 'вам', 'вами',
    'ваш', 'ваша', 'ваше', 'ваші', 'вашого', 'вашої', 'вашому', 'вашій', 'вашим', 'ваших', 'вашими', 'вашу',
    'you', 'your', 'yours', 'yourself', 'yourselves',
  ].join('|') +
  ')(?!\\p{L})', 'iu');

// ---------- helpers ----------
function loadJson(name) {
  const path = join(DATA, name);
  if (!existsSync(path)) { err(name, 'file missing'); return []; }
  const raw = readFileSync(path, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch (e) { err(name, `invalid JSON: ${e.message}`); return []; }
  if (!Array.isArray(data)) { err(name, 'top level must be an array'); return []; }
  if (JSON.stringify(data, null, 2) + '\n' !== raw) {
    err(name, 'formatting differs from JSON.stringify(data, null, 2) + "\\n" (2-space indent, trailing newline)');
  }
  return data;
}

function checkKeys(where, obj, kind) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) { err(where, `${kind} must be an object`); return false; }
  const order = KEY_ORDER[kind];
  const keys = Object.keys(obj);
  for (const k of keys) if (!order.includes(k)) err(where, `unknown key "${k}"`);
  const known = keys.filter(k => order.includes(k));
  const sorted = [...known].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (known.join() !== sorted.join()) err(where, `keys out of order; expected order: ${order.join(', ')}`);
  for (const k of REQUIRED[kind] || []) {
    if (obj[k] === undefined || obj[k] === '') err(where, `missing required "${k}"`);
  }
  return true;
}

function checkYears(where, y) {
  if (y === undefined) return;
  if (!checkKeys(`${where}.years`, y, 'years')) return;
  if (!Number.isInteger(y.start)) err(where, 'years.start must be an integer');
  if (y.end !== undefined && !Number.isInteger(y.end)) err(where, 'years.end must be an integer');
  if (Number.isInteger(y.start) && Number.isInteger(y.end) && y.start > y.end) err(where, 'years.start > years.end');
  if (y.approx !== undefined && typeof y.approx !== 'boolean') err(where, 'years.approx must be boolean');
}

function checkCountry(where, c) {
  if (c !== undefined && !/^[A-Z]{2}$/.test(c)) err(where, `country "${c}" is not ISO 3166-1 alpha-2`);
}

function checkKind(where, k) {
  if (k !== undefined && !KINDS.includes(k)) err(where, `kind "${k}" not in [${KINDS.join(', ')}]`);
}

function checkText(where, text) {
  if (typeof text !== 'string') return;
  const m = text.match(SECOND_PERSON);
  if (m) err(where, `addresses the reader ("${m[1]}"); write in a neutral encyclopaedic voice`);
}

const NODE_LINK = /\[([^\[\]]+)\]\(node:([^)\s]+)\)/g;
function checkSummary(where, text, nodeIds) {
  if (text === undefined) return;
  if (typeof text !== 'string' || !text.trim()) { err(where, 'must be a non-empty string'); return; }
  for (const m of text.matchAll(NODE_LINK)) {
    if (!nodeIds.has(m[2])) err(where, `link to unknown node "${m[2]}"`);
  }
  const stripped = text.replace(NODE_LINK, '$1');
  if (/[\[\]<>`*#]/.test(stripped)) err(where, 'contains markup other than [text](node:<id>) links');
  checkText(where, stripped);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// ---------- load ----------
const nodes = loadJson('nodes.json');
const edges = loadJson('edges.json');
const articles = loadJson('articles.json');
const images = loadJson('images.json');

// ---------- articles ----------
const articleIds = new Set();
articles.forEach((a, i) => {
  const where = `articles.json[${i}]${a?.id ? ` (${a.id})` : ''}`;
  if (!checkKeys(where, a, 'article')) return;
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(a.id)) err(where, 'id must be YYYY-MM-DD-<slug>');
  if (articleIds.has(a.id)) err(where, 'duplicate id');
  articleIds.add(a.id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date) || Number.isNaN(Date.parse(a.date))) err(where, 'date must be YYYY-MM-DD');
  else if (!a.id.startsWith(a.date)) err(where, 'id must start with the date');
  checkCountry(where, a.country);
  checkKind(where, a.kind);
  if (a.title_en === undefined) warn(where, 'missing title_en');
});

// ---------- nodes ----------
const nodeById = new Map();
nodes.forEach((n, i) => {
  const where = `nodes.json[${i}]${n?.id ? ` (${n.id})` : ''}`;
  if (!checkKeys(where, n, 'node')) return;
  if (!/^(Q[1-9]\d*|x:[a-z0-9]+(-[a-z0-9]+)*)$/.test(n.id)) err(where, 'id must be a QID (Q123) or x:<kebab-slug>');
  if (nodeById.has(n.id)) err(where, 'duplicate id');
  nodeById.set(n.id, n);
});
const nodeIds = new Set(nodeById.keys());

nodes.forEach((n, i) => {
  if (!n || typeof n !== 'object') return;
  const where = `nodes.json[${i}] (${n.id})`;
  if (!NODE_TYPES.includes(n.type)) err(where, `type "${n.type}" not in [${NODE_TYPES.join(', ')}]`);
  if (n.label_en === undefined) warn(where, 'missing label_en');
  checkYears(where, n.years);
  checkCountry(where, n.country);
  checkKind(where, n.kind);
  if (n.coords !== undefined) {
    const c = n.coords;
    if (!Array.isArray(c) || c.length !== 2 || !c.every(v => typeof v === 'number')
      || Math.abs(c[0]) > 90 || Math.abs(c[1]) > 180) err(where, 'coords must be [lat, lon]');
  } else if (n.type === 'place') warn(where, 'place without coords');
  if (n.image !== undefined && !existsSync(join(SITE, n.image))) err(where, `image "${n.image}" not found`);
  if (n.core !== undefined && typeof n.core !== 'boolean') err(where, 'core must be boolean');
  if (n.articles !== undefined) {
    if (!Array.isArray(n.articles)) err(where, 'articles must be an array');
    else for (const a of n.articles) if (!articleIds.has(a)) err(where, `unknown article "${a}"`);
  }
  checkSummary(`${where}.summary_uk`, n.summary_uk, nodeIds);
  checkSummary(`${where}.summary_en`, n.summary_en, nodeIds);
  if (n.wiki !== undefined && checkKeys(`${where}.wiki`, n.wiki, 'wiki')) {
    for (const [lang, title] of Object.entries(n.wiki)) {
      if (typeof title !== 'string' || !title || /[\s#?]|^https?:/.test(title)) err(where, `wiki.${lang} must be a page title with underscores, not a URL`);
    }
  }
});

// article subjects: existing core nodes that list the article
articles.forEach((a, i) => {
  if (!a || a.subjects === undefined) {
    if (a?.id) warn(`articles.json[${i}] (${a.id})`, 'no subjects; the issue shelf cannot open it');
    return;
  }
  const where = `articles.json[${i}] (${a.id})`;
  if (!Array.isArray(a.subjects) || !a.subjects.length) { err(where, 'subjects must be a non-empty array'); return; }
  for (const s of a.subjects) {
    const n = nodeById.get(s);
    if (!n) err(where, `unknown subject "${s}"`);
    else {
      if (n.core !== true) err(where, `subject "${s}" is not marked core`);
      if (!(n.articles || []).includes(a.id)) err(where, `subject "${s}" does not list this article`);
    }
  }
});

// ---------- edges ----------
const seen = new Set();
const degree = new Map();
edges.forEach((e, i) => {
  const where = `edges.json[${i}]${e?.from ? ` (${e.from} ${e.rel} ${e.to})` : ''}`;
  if (!checkKeys(where, e, 'edge')) return;
  const from = nodeById.get(e.from);
  const to = nodeById.get(e.to);
  if (!from) err(where, `unknown from "${e.from}"`);
  if (!to) err(where, `unknown to "${e.to}"`);
  if (e.from === e.to) err(where, 'self-loop');
  const spec = RELS[e.rel];
  if (!spec) err(where, `rel "${e.rel}" not in vocabulary`);
  else if (from && to) {
    if (!spec[0].includes(from.type)) warn(where, `${e.rel} usually starts at ${spec[0].join('/')}, not ${from.type}`);
    if (!spec[1].includes(to.type)) warn(where, `${e.rel} usually ends at ${spec[1].join('/')}, not ${to.type}`);
  }
  checkYears(where, e.years);
  if (e.article !== undefined && !articleIds.has(e.article)) err(where, `unknown article "${e.article}"`);
  const key = SYMMETRIC.has(e.rel) ? [e.rel, ...[e.from, e.to].sort()].join('|') : JSON.stringify(e);
  if (seen.has(key)) err(where, 'duplicate edge');
  seen.add(key);
  degree.set(e.from, (degree.get(e.from) || 0) + 1);
  degree.set(e.to, (degree.get(e.to) || 0) + 1);
});
for (const id of nodeIds) if (!degree.get(id)) warn(`node ${id}`, 'has no edges');

// ---------- images ----------
const listedFiles = new Set();
images.forEach((im, i) => {
  const where = `images.json[${i}]${im?.file ? ` (${im.file})` : ''}`;
  if (!checkKeys(where, im, 'image')) return;
  if (listedFiles.has(im.file)) err(where, 'duplicate file');
  listedFiles.add(im.file);
  if (!/^assets\/img\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(im.file)) err(where, 'file must be assets/img/<lowercase-ascii>.<jpg|png|webp>');
  if (!existsSync(join(SITE, im.file))) err(where, 'file not found');
  if (!nodeIds.has(im.node)) err(where, `unknown node "${im.node}"`);
  if (typeof im.source !== 'string' || !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(im.source)) err(where, 'source must be a Commons File: page URL');
  checkText(`${where}.caption_uk`, im.caption_uk);
  checkText(`${where}.caption_en`, im.caption_en);
});
for (const f of walk(IMG_DIR)) {
  const rel = relative(SITE, f).split('\\').join('/');
  if (rel.endsWith('/.gitkeep') || rel === 'assets/img/.gitkeep') continue;
  if (!listedFiles.has(rel)) err(rel, 'image file not listed in images.json');
}

// ---------- whole-site scans ----------
const TEXT_EXT = /\.(json|html|js|mjs|css|md|txt|svg|geojson)$/i;
for (const f of walk(SITE)) {
  const rel = relative(ROOT, f);
  const size = statSync(f).size;
  if (size > 500 * 1024 && !rel.includes(`${'site'}/vendor/`)) warn(rel, `file is ${Math.round(size / 1024)} KB (> 500 KB)`);
  if (!TEXT_EXT.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  for (const [re, label] of PRIVATE_PATTERNS) {
    const m = text.match(re);
    if (m) err(rel, `contains ${label}: "${m[0]}"`);
  }
}

// ---------- report ----------
for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`ERROR    ${e}`);
console.log(`\n${nodes.length} nodes, ${edges.length} edges, ${articles.length} articles, ${images.length} images — ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);

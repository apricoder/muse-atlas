// App wiring: data, URL state (#/n/<id>?filters), filters, search, theme and language.
import { STRINGS, label, fold, century, centuryLabel, countryName, yearsLabel } from './i18n.js';
import { createGraph } from './graph.js';
import { renderPanel } from './panel.js';

const $ = sel => document.querySelector(sel);
const TYPES = ['person', 'work', 'place', 'event', 'movement'];
const store = {
  get(k) { try { return localStorage.getItem(`muse-atlas:${k}`); } catch { return null; } },
  set(k, v) { try { if (v === null) localStorage.removeItem(`muse-atlas:${k}`); else localStorage.setItem(`muse-atlas:${k}`, v); } catch { /* ignore */ } },
};

const app = {
  lang: document.documentElement.lang === 'en' ? 'en' : 'uk',
  data: null,      // { nodes, edges, articles, images }
  nodes: new Map(),
  edgesByNode: new Map(),
  graph: null,
  state: null,     // { node, core, types:Set, country, kind, from, to }
};
const S = () => STRINGS[app.lang];

// ---------------- URL state ----------------
const DEFAULTS = { core: true, types: new Set(TYPES), country: '', kind: '', from: '', to: '' };

function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const [path, query = ''] = raw.split('?');
  const m = path.match(/^\/n\/(.+)$/);
  const q = new URLSearchParams(query);
  const types = q.get('types');
  return {
    node: m ? decodeURIComponent(m[1]) : null,
    core: q.has('core') ? q.get('core') !== '0' : DEFAULTS.core,
    types: types ? new Set(types.split(',').filter(t => TYPES.includes(t))) : new Set(DEFAULTS.types),
    country: q.get('country') || '',
    kind: q.get('kind') || '',
    from: q.get('from') || '',
    to: q.get('to') || '',
  };
}

function hashFor(st) {
  const q = new URLSearchParams();
  if (st.core !== DEFAULTS.core) q.set('core', st.core ? '1' : '0');
  if (st.types.size !== TYPES.length) q.set('types', TYPES.filter(t => st.types.has(t)).join(','));
  for (const k of ['country', 'kind', 'from', 'to']) if (st[k]) q.set(k, st[k]);
  const qs = q.toString();
  return `#${st.node ? `/n/${encodeURIComponent(st.node)}` : '/'}${qs ? `?${qs}` : ''}`;
}

/** Push a new history entry (opening/closing nodes) or replace it (filter tweaks). */
function go(patch, { replace = false } = {}) {
  const next = { ...app.state, ...patch };
  const h = hashFor(next);
  if (h !== location.hash) {
    if (replace) history.replaceState({ app: true }, '', h);
    else history.pushState({ app: true }, '', h);
  }
  route();
}
const hrefFor = id => hashFor({ ...app.state, node: id });

// ---------------- filters ----------------
function passes(n, st) {
  if (st.core && !n.core) return false;
  if (!st.types.has(n.type)) return false;
  if (st.country && n.country !== st.country) return false;
  if (st.kind && n.kind !== st.kind) return false;
  if ((st.from || st.to) && n.years) {
    const c = century(n.years.start);
    if (st.from && c < Number(st.from)) return false;
    if (st.to && c > Number(st.to)) return false;
  }
  return true;
}

function renderFilters() {
  const s = S();
  const st = app.state;
  const box = $('#filters');
  const focused = document.activeElement?.dataset?.f;
  box.replaceChildren();
  const el = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) { if (k.includes('-')) e.setAttribute(k, v); else e[k] = v; }
    e.append(...kids);
    return e;
  };

  const present = new Set(app.data.nodes.map(n => n.type));
  for (const t of TYPES.filter(t => present.has(t))) {
    const b = el('button', { type: 'button', className: 'chip' }, el('span', { className: `dot ${t}` }), s.types[t]);
    b.dataset.f = `type-${t}`;
    b.setAttribute('aria-pressed', String(st.types.has(t)));
    b.addEventListener('click', () => {
      const types = new Set(st.types);
      types.has(t) ? types.delete(t) : types.add(t);
      if (!types.size) TYPES.forEach(x => types.add(x));
      go({ types }, { replace: true });
    });
    box.append(b);
  }

  box.append(el('span', { className: 'sep' }));

  const core = el('button', { type: 'button', className: 'chip' }, s.coreOnly);
  core.dataset.f = 'core';
  core.setAttribute('aria-pressed', String(st.core));
  core.addEventListener('click', () => go({ core: !st.core }, { replace: true }));
  box.append(core);

  const select = (key, allLabel, options) => {
    const sel = el('select', { 'aria-label': allLabel });
    sel.dataset.f = key;
    sel.append(el('option', { value: '' }, allLabel));
    for (const [v, text] of options) sel.append(el('option', { value: v, selected: st[key] === v }, text));
    sel.addEventListener('change', () => go({ [key]: sel.value }, { replace: true }));
    return sel;
  };
  const countries = [...new Set(app.data.nodes.map(n => n.country).filter(Boolean))]
    .map(c => [c, countryName(c, app.lang)]).sort((a, b) => a[1].localeCompare(b[1], app.lang));
  box.append(select('country', s.allCountries, countries));
  const kinds = [...new Set(app.data.nodes.map(n => n.kind).filter(Boolean))]
    .map(k => [k, s.kinds[k] || k]).sort((a, b) => a[1].localeCompare(b[1], app.lang));
  box.append(select('kind', s.allKinds, kinds));

  const cents = [...new Set(app.data.nodes.filter(n => n.years).map(n => century(n.years.start)))].sort((a, b) => a - b);
  const centOpts = cents.map(c => [String(c), centuryLabel(c, app.lang)]);
  const range = el('span', { className: 'century' });
  const from = select('from', `${s.centuryFrom} —`, centOpts);
  const to = select('to', `${s.centuryTo} —`, centOpts);
  range.append(from, to);
  box.append(range);

  if (st.node && app.nodes.has(st.node)) {
    const f = el('button', { type: 'button', className: 'chip focus-chip', title: s.clearFocus }, `${s.focus(label(app.nodes.get(st.node), app.lang))} ✕`);
    f.dataset.f = 'focus';
    f.addEventListener('click', () => go({ node: null }));
    box.append(f);
  }

  if (focused) box.querySelector(`[data-f="${focused}"]`)?.focus();
}

function renderStatus(shown) {
  const s = S();
  const total = app.data.nodes.length;
  const box = $('#status');
  box.replaceChildren(s.shown(shown, total));
  if (shown < total) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.showAll;
    b.addEventListener('click', () => go({ ...DEFAULTS, types: new Set(TYPES), core: false }, { replace: true }));
    box.append(' · ', b);
  }
}

// ---------------- routing ----------------
let lastNode;
function route() {
  if (!app.data) return;
  const st = parseHash();
  if (st.node && !app.nodes.has(st.node)) st.node = null;
  app.state = st;

  const visible = new Set(app.data.nodes.filter(n => passes(n, st)).map(n => n.id));
  const forced = new Set();
  if (st.node) {
    forced.add(st.node);
    for (const e of app.edgesByNode.get(st.node) || []) { forced.add(e.from); forced.add(e.to); }
  }
  app.graph.setVisible(visible, forced);
  renderFilters();
  renderStatus(visible.size);

  const panel = $('#panel');
  const wasOpen = !panel.hidden;
  if (st.node) {
    renderPanel(panel, app.nodes.get(st.node), {
      lang: app.lang, nodes: app.nodes, edgesByNode: app.edgesByNode,
      articles: app.data.articlesById, images: app.data.imagesByFile, hrefFor,
      onBack: () => (history.state?.app ? history.back() : go({ node: null })),
      onClose: () => go({ node: null }),
    });
    panel.hidden = false;
  } else {
    panel.hidden = true;
  }
  if (wasOpen !== !panel.hidden) app.graph.resize();

  if (st.node !== lastNode) {
    app.graph.focus(st.node);
    if (!st.node) app.graph.fitVisible();
    lastNode = st.node;
  } else if (!st.node) {
    app.graph.fitVisible();
  }
  document.title = st.node ? `${label(app.nodes.get(st.node), app.lang)} · Muse Atlas` : 'Muse Atlas';
}

// ---------------- search ----------------
function setupSearch() {
  const input = $('#q');
  const list = $('#results');
  let items = [];
  let active = -1;

  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
  const pick = id => { close(); input.value = ''; input.blur(); go({ node: id }); };

  const render = () => {
    const q = fold(input.value.trim());
    list.replaceChildren();
    if (!q) return close();
    const scored = [];
    for (const n of app.data.nodes) {
      const a = fold(n.label_uk), b = fold(n.label_en);
      const i = Math.min(...[a.indexOf(q), b.indexOf(q)].map(x => (x === -1 ? Infinity : x)));
      if (i !== Infinity) scored.push([i === 0 ? 0 : (a.includes(` ${q}`) || b.includes(` ${q}`)) ? 1 : 2, n.core ? 0 : 1, n]);
    }
    scored.sort((x, y) => x[0] - y[0] || x[1] - y[1] || label(x[2], app.lang).localeCompare(label(y[2], app.lang)));
    items = scored.slice(0, 10).map(x => x[2]);
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = S().noResults;
      list.append(li);
    }
    items.forEach((n, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === active ? 'active' : '';
      const dot = document.createElement('span');
      dot.className = `dot ${n.type}`;
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = yearsLabel(n.years, app.lang) || countryName(n.country, app.lang);
      b.append(dot, label(n, app.lang), meta);
      b.addEventListener('mousedown', ev => ev.preventDefault());
      b.addEventListener('click', () => pick(n.id));
      li.append(b);
      list.append(li);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', () => { active = -1; render(); });
  input.addEventListener('focus', render);
  input.addEventListener('blur', close);
  input.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      if (!items.length) return;
      ev.preventDefault();
      active = (active + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      render();
    } else if (ev.key === 'Enter') {
      const n = items[active >= 0 ? active : 0];
      if (n) pick(n.id);
    } else if (ev.key === 'Escape') {
      input.value = ''; close(); input.blur();
    }
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === '/' && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName)) {
      ev.preventDefault();
      input.focus();
    } else if (ev.key === 'Escape' && app.state?.node && document.activeElement !== input) {
      go({ node: null });
    }
  });
}

// ---------------- theme & language ----------------
function applyChrome() {
  const s = S();
  document.documentElement.lang = app.lang;
  for (const b of document.querySelectorAll('[data-view]')) {
    const v = b.dataset.view;
    b.textContent = s.views[v];
    if (b.disabled) b.title = s.soon;
  }
  const q = $('#q');
  q.placeholder = s.search;
  q.setAttribute('aria-label', s.searchLabel);
  const zl = { in: s.zoomIn, out: s.zoomOut, fit: s.fit };
  for (const b of document.querySelectorAll('[data-zoom]')) { b.setAttribute('aria-label', zl[b.dataset.zoom]); b.title = zl[b.dataset.zoom]; }
  const theme = store.get('theme') || 'auto';
  for (const b of document.querySelectorAll('[data-theme-set]')) {
    const t = b.dataset.themeSet;
    b.setAttribute('aria-pressed', String(t === theme || (t === 'auto' && !['light', 'dark'].includes(theme))));
    b.setAttribute('aria-label', s.theme[t]);
    b.title = s.theme[t];
  }
  for (const b of document.querySelectorAll('[data-lang-set]')) b.setAttribute('aria-pressed', String(b.dataset.langSet === app.lang));
}

function setupChrome() {
  for (const b of document.querySelectorAll('[data-theme-set]')) {
    b.addEventListener('click', () => {
      const t = b.dataset.themeSet;
      store.set('theme', t === 'auto' ? null : t);
      if (t === 'auto') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', t);
      applyChrome();
      app.graph?.refreshStyle();
    });
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => app.graph?.refreshStyle());
  for (const b of document.querySelectorAll('[data-lang-set]')) {
    b.addEventListener('click', () => {
      app.lang = b.dataset.langSet;
      store.set('lang', app.lang === 'en' ? 'en' : null);
      applyChrome();
      app.graph?.setLang(app.lang);
      route();
    });
  }
  for (const b of document.querySelectorAll('[data-zoom]')) {
    b.addEventListener('click', () => {
      const z = b.dataset.zoom;
      if (z === 'fit') app.graph.fitVisible();
      else app.graph.zoomBy(z === 'in' ? 1.3 : 1 / 1.3);
    });
  }
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', () => app.graph?.resize());
}

// ---------------- boot ----------------
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function boot() {
  applyChrome();
  setupChrome();
  const loading = $('#loading');
  loading.textContent = S().loading;
  try {
    const [nodes, edges, articles, images] = await Promise.all(
      ['nodes', 'edges', 'articles', 'images'].map(f => loadJson(`data/${f}.json`)));
    app.data = {
      nodes, edges, articles, images,
      articlesById: new Map(articles.map(a => [a.id, a])),
      imagesByFile: new Map(images.map(i => [i.file, i])),
    };
    for (const n of nodes) { app.nodes.set(n.id, n); app.edgesByNode.set(n.id, []); }
    for (const e of edges) { app.edgesByNode.get(e.from)?.push(e); app.edgesByNode.get(e.to)?.push(e); }

    app.graph = await createGraph($('#cy'), { nodes, edges }, {
      lang: app.lang,
      labelOf: label,
      relLabel: (rel, l) => STRINGS[l].relShort[rel] || rel,
      onSelect: id => go({ node: id }),
      onBackground: () => { if (app.state?.node) go({ node: null }); },
    });
    loading.hidden = true;
    setupSearch();
    route();
  } catch (err) {
    console.error(err);
    loading.textContent = S().loadError;
  }
}

boot();

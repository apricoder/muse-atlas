// Entity panel: hero, summary with node links, relations, articles, sources.
// All text goes in through textContent / DOM nodes, never innerHTML.
import { STRINGS, label, title, yearsLabel, countryName, dateLabel } from './i18n.js';

const SYMMETRIC = new Set(['rival_of', 'relative_of']);
// Display order of relation groups: "out:" = from this node, "in:" = to this node, "sym:" = either.
const GROUP_ORDER = [
  'in:created', 'out:created', 'in:commissioned', 'out:commissioned', 'in:patron_of', 'out:patron_of',
  'sym:rival_of', 'sym:relative_of', 'in:influenced', 'out:influenced',
  'out:depicts', 'in:depicts', 'out:part_of', 'in:part_of', 'out:located_in', 'in:located_in',
  'out:born_in', 'out:died_in', 'out:buried_in', 'in:born_in', 'in:died_in', 'in:buried_in',
  'in:restored', 'out:restored', 'in:relocated', 'out:relocated',
  'out:involved_in', 'in:involved_in', 'out:stolen_from', 'in:stolen_from',
];
const MAX_LINKS = 8;
let io = null;

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.setAttribute('style', v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const ICON = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20'); svg.setAttribute('height', '20'); svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICON[name]; // static, trusted markup
  return svg;
}

/** Summary text -> <p> elements; only [text](node:id) becomes a link. */
function renderSummary(text, ctx) {
  const paras = text.split(/\n{2,}/);
  return paras.map(p => {
    const el = h('p');
    let last = 0;
    for (const m of p.matchAll(/\[([^\[\]]+)\]\(node:([^)\s]+)\)/g)) {
      if (m.index > last) el.append(p.slice(last, m.index));
      el.append(ctx.nodes.has(m[2]) ? h('a', { href: ctx.hrefFor(m[2]) }, m[1]) : m[1]);
      last = m.index + m[0].length;
    }
    if (last < p.length) el.append(p.slice(last));
    return el;
  });
}

function relationGroups(node, ctx) {
  const groups = new Map();
  for (const e of ctx.edgesByNode.get(node.id) || []) {
    const out = e.from === node.id;
    const key = SYMMETRIC.has(e.rel) ? `sym:${e.rel}` : `${out ? 'out' : 'in'}:${e.rel}`;
    const other = ctx.nodes.get(out ? e.to : e.from);
    if (!other) continue;
    if (!groups.has(key)) groups.set(key, []);
    const list = groups.get(key);
    if (!list.some(x => x.other.id === other.id)) list.push({ other, edge: e });
  }
  const order = k => { const i = GROUP_ORDER.indexOf(k); return i === -1 ? 999 : i; };
  return [...groups.entries()].sort((a, b) => order(a[0]) - order(b[0]));
}

function groupTitle(key, lang) {
  const [dir, rel] = key.split(':');
  const s = STRINGS[lang];
  return (dir === 'in' ? s.relIn[rel] : s.relOut[rel]) || rel;
}

function relLink(item, ctx) {
  const y = item.edge.years ? yearsLabel(item.edge.years, ctx.lang) : '';
  return h('a', { class: 'rl', href: ctx.hrefFor(item.other.id) },
    h('span', { class: `dot ${item.other.type}`, 'aria-hidden': 'true' }),
    label(item.other, ctx.lang),
    y ? h('span', { class: 'y' }, y) : null);
}

export function renderPanel(root, node, ctx) {
  const { lang } = ctx;
  const s = STRINGS[lang];
  const img = node.image ? ctx.images.get(node.image) : null;
  root.replaceChildren();
  root.style.setProperty('--type-color', `var(--${node.type})`);

  const name = label(node, lang);
  const other = lang === 'en' ? node.label_uk : node.label_en;
  const meta = [node.kind && s.kinds[node.kind], node.country && countryName(node.country, lang)].filter(Boolean).join(' · ');
  const sub = [other !== name ? other : null, yearsLabel(node.years, lang)].filter(Boolean).join(' · ');

  const backBtn = cls => h('button', { type: 'button', class: cls, 'aria-label': s.back, onclick: ctx.onBack }, icon('back'));
  const closeBtn = cls => h('button', { type: 'button', class: cls, 'aria-label': s.close, onclick: ctx.onClose }, icon('close'));

  const bar = h('div', { class: 'panel-bar' }, backBtn('icon-btn'), h('div', { class: 't' }, name), closeBtn('icon-btn'));

  const hero = h('header', { class: `hero ${img ? 'has-img' : 'no-img'}` },
    img ? h('img', { src: node.image, alt: (lang === 'en' && img.caption_en) || img.caption_uk || name, loading: 'lazy' }) : null,
    h('div', { class: 'top' }, backBtn('icon-btn'), closeBtn('icon-btn')),
    h('div', { class: 'txt' },
      h('div', { class: 'tags' },
        h('span', { class: 'tag type' }, s.type1[node.type].toUpperCase()),
        meta ? h('span', { class: 'tag meta' }, meta) : null),
      h('h1', {}, name),
      sub ? h('div', { class: 'sub' }, sub) : null));

  const credit = img ? h('div', { class: 'credit' },
    `${s.photo}: `, h('a', { href: img.source, target: '_blank', rel: 'noopener' }, img.author), ` · ${img.license}`) : null;

  const summaryText = lang === 'en' ? (node.summary_en || node.summary_uk) : node.summary_uk;
  const summary = summaryText
    ? h('div', { class: 'summary' }, renderSummary(summaryText, ctx))
    : h('div', { class: 'summary empty' }, s.noSummary);

  const groups = relationGroups(node, ctx);
  const relations = groups.length ? h('section', { class: 'sec' },
    h('h2', {}, s.relations),
    groups.map(([key, items]) => {
      const links = h('div', { class: 'links' }, items.slice(0, MAX_LINKS).map(it => relLink(it, ctx)));
      if (items.length > MAX_LINKS) {
        const more = h('button', { type: 'button', class: 'rl more' }, `+ ${items.length - MAX_LINKS}`);
        more.addEventListener('click', () => { more.replaceWith(...items.slice(MAX_LINKS).map(it => relLink(it, ctx))); });
        links.append(more);
      }
      return h('div', { class: 'group' }, h('div', { class: 'gh' }, `${groupTitle(key, lang)} · ${items.length}`), links);
    })) : null;

  const arts = (node.articles || []).map(id => ctx.articles.get(id)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
  const mentioned = arts.length ? h('section', { class: 'sec' },
    h('h2', {}, s.mentionedIn),
    h('ul', { class: 'arts' }, arts.map(a => h('li', {}, h('span', { class: 'd' }, dateLabel(a.date, lang)), h('span', {}, title(a, lang)))))) : null;

  const ext = [];
  if (node.wiki?.uk) ext.push(h('a', { href: `https://uk.wikipedia.org/wiki/${encodeURIComponent(node.wiki.uk)}`, target: '_blank', rel: 'noopener' }, `${s.wikipedia} ↗`));
  if (node.wiki?.en) ext.push(h('a', { href: `https://en.wikipedia.org/wiki/${encodeURIComponent(node.wiki.en)}`, target: '_blank', rel: 'noopener' }, `${s.wikipediaEn} ↗`));
  if (/^Q\d+$/.test(node.id)) ext.push(h('a', { href: `https://www.wikidata.org/wiki/${node.id}`, target: '_blank', rel: 'noopener' }, `Wikidata · ${node.id} ↗`));
  const sources = ext.length ? h('section', { class: 'sec' }, h('h2', {}, s.sources), h('div', { class: 'ext' }, ext)) : null;

  const scroll = h('div', { class: 'panel-scroll' }, hero, credit, h('div', { class: 'body' }, summary, relations, mentioned, sources));
  root.append(bar, scroll);
  root.setAttribute('aria-label', name);

  // Slim bar fades in once the hero has scrolled out of view.
  io?.disconnect();
  io = new IntersectionObserver(([entry]) => bar.classList.toggle('show', !entry.isIntersecting),
    { root: scroll, threshold: 0, rootMargin: '-52px 0px 0px 0px' });
  io.observe(hero);
  scroll.scrollTop = 0;
}

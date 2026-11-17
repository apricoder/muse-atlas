// Cytoscape wrapper: one deterministic layout of the whole graph; filters only hide/show,
// so positions stay stable and the reader learns where things are.
/* global cytoscape */

const SHAPES = { person: 'ellipse', work: 'round-rectangle', place: 'diamond', event: 'ellipse', movement: 'hexagon' };
const TYPES = Object.keys(SHAPES);
const SYM = new Set(['rival_of', 'relative_of']);
// Ring order around a focused node; mirrors the panel's relation groups.
const RING_ORDER = [
  'in:created', 'out:created', 'in:commissioned', 'out:commissioned', 'in:patron_of', 'out:patron_of',
  'sym:rival_of', 'sym:relative_of', 'in:influenced', 'out:influenced', 'out:depicts', 'in:depicts',
  'out:part_of', 'in:part_of', 'out:located_in', 'in:located_in', 'out:born_in', 'out:died_in', 'out:buried_in',
  'in:born_in', 'in:died_in', 'in:buried_in', 'in:restored', 'out:restored', 'in:relocated', 'out:relocated',
  'out:involved_in', 'in:involved_in', 'out:stolen_from', 'in:stolen_from',
];

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Small seeded PRNG (mulberry32) so the cose layout is the same on every load.
function seeded(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Labels keep a readable on-screen size when zoomed out: below zoom 1 they are scaled up by 1/zoom
// (capped), above zoom 1 they grow normally with the graph.
let labelScale = 1;
const fs = base => () => base * labelScale;
const tw = base => () => base * labelScale;

function buildStyle() {
  const c = {
    edge: cssVar('--edge'), label: cssVar('--label'), halo: cssVar('--label-halo'),
    text: cssVar('--text'), muted: cssVar('--text-muted'), bg: cssVar('--graph-bg'),
  };
  const type = Object.fromEntries(TYPES.map(t => [t, cssVar(`--${t}`)]));
  const font = cssVar('--font-ui');
  return [
    {
      selector: 'node',
      style: {
        shape: 'data(shape)',
        width: 'mapData(degree, 1, 24, 14, 38)',
        height: 'mapData(degree, 1, 24, 14, 38)',
        'background-color': c.edge,
        label: 'data(label)',
        'font-family': font,
        'font-size': fs(11),
        color: c.label,
        'text-valign': 'bottom',
        'text-margin-y': 5,
        'text-outline-color': c.halo,
        'text-outline-width': 2,
        'text-max-width': tw(140),
        'text-wrap': 'ellipsis',
        'min-zoomed-font-size': 9,
        'overlay-opacity': 0,
        'transition-property': 'opacity',
        'transition-duration': 150,
      },
    },
    ...TYPES.map(t => ({ selector: `node[type = "${t}"]`, style: { 'background-color': type[t], 'border-color': type[t] } })),
    { selector: 'node[type = "place"]', style: { width: 'mapData(degree, 1, 24, 13, 34)', height: 'mapData(degree, 1, 24, 13, 34)' } },
    { selector: 'node[type = "event"]', style: { 'background-opacity': 0, 'border-width': 3 } },
    { selector: 'node[?core]', style: { 'font-weight': 600, 'font-size': fs(12), 'min-zoomed-font-size': 0, 'text-max-width': tw(170) } },
    {
      selector: 'edge',
      style: {
        width: 1.2, 'line-color': c.edge, opacity: 0.5, 'curve-style': 'straight',
        // Small arrow at the target: "who created what", "what is located where".
        'target-arrow-shape': 'triangle', 'target-arrow-color': c.edge, 'arrow-scale': 0.75,
        'overlay-opacity': 0, 'transition-property': 'opacity', 'transition-duration': 150,
      },
    },
    { selector: 'edge[rel = "rival_of"], edge[rel = "relative_of"]', style: { 'target-arrow-shape': 'none' } },
    { selector: 'edge[rel = "rival_of"]', style: { 'line-style': 'dashed', 'line-color': type.person, opacity: 0.8 } },
    { selector: '.hidden', style: { display: 'none' } },
    {
      selector: 'node.hover',
      style: {
        'underlay-color': c.text, 'underlay-opacity': 0.28, 'underlay-padding': 10, 'underlay-shape': 'ellipse',
        'text-opacity': 1, 'font-weight': 700, opacity: 1, 'z-index': 30, 'min-zoomed-font-size': 0,
      },
    },
    { selector: 'node.faded', style: { opacity: 0.1, 'text-opacity': 0 } },
    { selector: 'edge.faded', style: { opacity: 0.04 } },
    {
      selector: 'node.sel',
      style: {
        'border-width': 3, 'border-color': c.text, 'font-size': fs(14), 'font-weight': 700, 'text-opacity': 1,
        'text-max-width': tw(260), 'min-zoomed-font-size': 0,
        'underlay-color': c.text, 'underlay-padding': 7, 'underlay-opacity': 0.12, 'underlay-shape': 'ellipse',
        'z-index': 10,
      },
    },
    { selector: 'node.peek', style: { opacity: 0.6, 'text-opacity': 0.85, 'min-zoomed-font-size': 0, 'z-index': 25 } },
    { selector: 'node.nb', style: { 'text-opacity': 1, 'min-zoomed-font-size': 0, 'text-max-width': tw(200) } },
    // Ring labels point away from the centre.
    { selector: 'node[lpos = "left"]', style: { 'text-halign': 'left', 'text-valign': 'center', 'text-margin-x': -7, 'text-margin-y': 0 } },
    { selector: 'node[lpos = "right"]', style: { 'text-halign': 'right', 'text-valign': 'center', 'text-margin-x': 7, 'text-margin-y': 0 } },
    { selector: 'node[lpos = "top"]', style: { 'text-valign': 'top', 'text-margin-y': -6 } },
    { selector: 'node[lpos = "bottom"]', style: { 'text-valign': 'bottom', 'text-margin-y': 6 } },
    { selector: 'edge.focus', style: { opacity: 0.9, width: 1.8, 'z-index': 5 } },
    {
      selector: 'edge.hl',
      style: {
        opacity: 1, width: 2.4, label: 'data(relLabel)', 'font-family': font, 'font-size': fs(11), color: c.text,
        'text-rotation': 'autorotate', 'text-background-color': c.bg, 'text-background-opacity': 1,
        'text-background-padding': 3, 'z-index': 20,
      },
    },
  ];
}

export async function createGraph(container, { nodes, edges }, { lang, labelOf, relLabel, onSelect, onBackground }) {
  const degree = new Map();
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) || 0) + 1);
    degree.set(e.to, (degree.get(e.to) || 0) + 1);
  }
  const elements = [
    ...nodes.map(n => ({
      group: 'nodes',
      data: { id: n.id, label: labelOf(n, lang), type: n.type, shape: SHAPES[n.type] || 'ellipse', core: !!n.core, degree: degree.get(n.id) || 1 },
    })),
    ...edges.map((e, i) => ({
      group: 'edges',
      data: { id: `e${i}`, source: e.from, target: e.to, rel: e.rel, relLabel: relLabel(e.rel, lang) },
    })),
  ];

  const cy = cytoscape({
    container,
    elements,
    style: buildStyle(),
    minZoom: 0.15,
    maxZoom: 3,
    boxSelectionEnabled: false,
    autoungrabify: false,
    selectionType: 'single',
  });

  // Deterministic layout of the whole graph, computed once.
  const realRandom = Math.random;
  Math.random = seeded(20261017);
  try {
    const layout = cy.layout({
      name: 'cose', animate: false, randomize: true, fit: false, padding: 40,
      nodeRepulsion: () => 7000, idealEdgeLength: () => 60, edgeElasticity: () => 100,
      gravity: 1.2, componentSpacing: 30, numIter: 2500, nodeDimensionsIncludeLabels: true,
    });
    const done = layout.promiseOn('layoutstop');
    layout.run();
    await done;
  } finally {
    Math.random = realRandom;
  }

  cy.on('tap', 'node', e => onSelect(e.target.id()));
  cy.on('tap', e => { if (e.target === cy) onBackground(); });
  let raf = 0;
  const rescale = () => {
    const next = Math.min(2.6, Math.max(1, 1 / cy.zoom()));
    if (Math.abs(next - labelScale) < 0.02) return;
    labelScale = next;
    cy.style().update();
  };
  cy.on('zoom', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(rescale); });

  // Hover shows relation labels: on one edge, or on all edges of a hovered node.
  // Hovering a node also "peeks" its neighbours: faded ones come back at half strength with labels.
  const peek = n => {
    const edges = n.connectedEdges().not('.hidden');
    edges.addClass('hl');
    edges.connectedNodes().not(n).addClass('peek');
  };
  const unpeek = () => { cy.edges('.hl').removeClass('hl'); cy.nodes('.peek').removeClass('peek'); };
  cy.on('mouseover', 'node', e => { container.style.cursor = 'pointer'; cy.batch(() => peek(e.target)); });
  cy.on('mouseout', 'node', () => { container.style.cursor = ''; cy.batch(unpeek); });
  cy.on('mouseover', 'edge', e => e.target.addClass('hl'));
  cy.on('mouseout', 'edge', e => e.target.removeClass('hl'));

  let focusId = null;
  // Home positions from the global layout; focus rings are temporary and always return here.
  const home = new Map(cy.nodes().map(n => [n.id(), { ...n.position() }]));
  // A node dragged outside focus mode keeps its new place.
  cy.on('dragfree', 'node', e => { if (!focusId) home.set(e.target.id(), { ...e.target.position() }); });

  // Ring of neighbours around the selected node, split into sectors by relation (same order as the
  // panel), with a small gap between groups. No group titles: on the graph they were noise.
  function ringLayout(center, targets) {
    const c = home.get(center.id());
    targets.set(center.id(), c);
    const seen = new Set();
    const items = [];
    center.connectedEdges().not('.hidden').forEach(e => {
      const out = e.source().id() === center.id();
      const other = out ? e.target() : e.source();
      if (seen.has(other.id())) return;
      seen.add(other.id());
      const rel = e.data('rel');
      const key = SYM.has(rel) ? `sym:${rel}` : `${out ? 'out' : 'in'}:${rel}`;
      const rank = RING_ORDER.indexOf(key);
      items.push({ node: other, key, rank: rank === -1 ? 999 : rank, label: other.data('label') });
    });
    items.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
    const count = items.length;
    if (!count) return { c, r: 0, sectors: [] };
    const groups = [];
    for (const it of items) {
      if (!groups.length || groups[groups.length - 1].key !== it.key) groups.push({ key: it.key, items: [] });
      groups[groups.length - 1].items.push(it);
    }
    const twoRings = count > 14;
    const r = Math.max(160, count * (twoRings ? 16 : 26));
    const gap = groups.length > 1 ? 1.3 : 0; // gap between sectors, in item slots
    const step = (2 * Math.PI) / (count + gap * groups.length);
    let slot = 0;
    const sectors = [];
    for (const g of groups) {
      const start = slot;
      g.items.forEach((it, j) => {
        const angle = -Math.PI / 2 + (slot + 0.5) * step;
        const radius = twoRings && j % 2 ? r * 1.3 : r;
        targets.set(it.node.id(), { x: c.x + radius * Math.cos(angle), y: c.y + radius * Math.sin(angle) });
        const cos = Math.cos(angle);
        it.node.data('lpos', Math.abs(cos) < 0.35 ? (Math.sin(angle) < 0 ? 'top' : 'bottom') : (cos < 0 ? 'left' : 'right'));
        slot += 1;
      });
      sectors.push({ key: g.key, count: g.items.length, angle: -Math.PI / 2 + ((start + slot) / 2) * step });
      slot += gap;
    }
    return { c, r, sectors };
  }

  const boundsOf = pts => pts.reduce((b, p) => ({
    x1: Math.min(b.x1, p.x), y1: Math.min(b.y1, p.y), x2: Math.max(b.x2, p.x), y2: Math.max(b.y2, p.y),
  }), { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });

  // Fit a model-space box into the view, never zooming in past MAX_FIT_ZOOM (small rings stay small).
  const MAX_FIT_ZOOM = 1.1;
  // Padding is in screen px; side padding is larger because ring labels stick out sideways.
  function fitBox(bb, padding, animate, sidePadding = padding) {
    const w = Math.max(bb.x2 - bb.x1, 1), h = Math.max(bb.y2 - bb.y1, 1);
    // Never let padding eat the view: at least ~45% of each dimension stays for the graph itself.
    sidePadding = Math.min(sidePadding, cy.width() * 0.275);
    padding = Math.min(padding, cy.height() * 0.275);
    const zoom = Math.max(cy.minZoom(), Math.min(MAX_FIT_ZOOM,
      (cy.width() - 2 * sidePadding) / w, (cy.height() - 2 * padding) / h));
    const pan = { x: cy.width() / 2 - zoom * (bb.x1 + w / 2), y: cy.height() / 2 - zoom * (bb.y1 + h / 2) };
    cy.stop(true); // drop any queued viewport animation so fits never stack
    if (animate) cy.animate({ zoom, pan }, { duration: 420, easing: 'ease-in-out-cubic' });
    else cy.viewport({ zoom, pan });
  }

  const api = {
    cy,
    /** Show nodes in `visible` plus `forced`; an edge shows when both ends show. */
    setVisible(visible, forced = new Set()) {
      cy.batch(() => {
        cy.nodes().forEach(n => n.toggleClass('hidden', !(visible.has(n.id()) || forced.has(n.id()))));
        cy.edges().forEach(e => e.toggleClass('hidden', e.source().hasClass('hidden') || e.target().hasClass('hidden')));
      });
    },
    focus(id, { animate = true } = {}) {
      focusId = id;
      const n = id ? cy.getElementById(id) : null;
      const targets = new Map(); // node id -> position; everything else goes home
      cy.batch(() => {
        cy.elements().removeClass('faded sel nb focus hover');
        cy.nodes().removeData('lpos');
        if (!n || n.empty()) return;
        const hood = n.closedNeighborhood();
        cy.elements().not(hood).addClass('faded');
        n.addClass('sel');
        hood.nodes().not(n).addClass('nb');
        n.connectedEdges().addClass('focus');
        ringLayout(n, targets);
      });
      // Animate every node to its ring position or back to its home position.
      cy.nodes().forEach(node => {
        const to = targets.get(node.id()) || home.get(node.id());
        const at = node.position();
        if (Math.abs(at.x - to.x) < 0.5 && Math.abs(at.y - to.y) < 0.5) return;
        node.stop();
        if (animate) node.animate({ position: to }, { duration: 420, easing: 'ease-in-out-cubic' });
        else node.position(to);
      });
      const eles = n && !n.empty() ? n.closedNeighborhood().not('.hidden') : null;
      if (!eles) return;
      // Fit to where the ring will be, in parallel with the move.
      // Side labels keep a near-constant on-screen size, so reserve their estimated width as padding.
      let longest = 0;
      eles.nodes().forEach(x => {
        const p = x.data('lpos');
        if (p === 'left' || p === 'right') longest = Math.max(longest, (x.data('label') || '').length);
      });
      fitBox(boundsOf(eles.nodes().map(x => targets.get(x.id()) || home.get(x.id()))), 70, animate,
        Math.min(230, 28 + longest * 6.6));
    },
    fitVisible(animate = true) {
      // Use home positions: nodes may still be gliding back from a focus ring.
      const pts = cy.nodes().not('.hidden').map(n => home.get(n.id()));
      if (pts.length) fitBox(boundsOf(pts), 70, animate);
    },
    zoomBy(f) {
      cy.animate({ zoom: { level: cy.zoom() * f, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }, duration: 150 });
    },
    setLang(l) {
      cy.batch(() => {
        nodes.forEach(n => cy.getElementById(n.id).data('label', labelOf(n, l)));
        cy.edges().forEach(e => e.data('relLabel', relLabel(e.data('rel'), l)));
      });
    },
    /** Hover from the panel: emphasise one node (and its edge to the focused node), or clear with null. */
    highlight(id) {
      cy.batch(() => {
        cy.nodes('.hover').removeClass('hover');
        unpeek();
        if (!id) return;
        const n = cy.getElementById(id);
        if (n.empty()) return;
        n.addClass('hover');
        peek(n);
      });
    },
    refreshStyle() { cy.style(buildStyle()); },
    resize() { cy.resize(); },
    get focusId() { return focusId; },
  };
  return api;
}

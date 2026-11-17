# Muse Atlas — design (draft)

Status: planning. Nothing is built yet. This document is the starting point for implementation.

## Purpose

A personal knowledge graph of art and architecture: the people, works, places and events covered by a recurring series of short art articles (written in Ukrainian), with links between them and years attached. It should help you:

- **organise** what has been read: who made what, where it is, when, and how it connects to the rest;
- **refresh** it easily: browse, filter and quiz;
- **grow automatically**: each new article adds its entities and relations through a scheduled Claude routine that commits to this repo.

It is a graph rather than a mind map: one person links to many works, places and other people, so the data is a graph that can be shown in several views.

## Constraints

- **Static only.** Hosted on GitHub Pages: no backend, no server, no secrets.
- **No build step, no package management.** Plain HTML + ES modules + pinned library files kept in the repo. No bundler, no `npm install`, no `node_modules`, no lockfile (see *Stack*).
- **Self-contained.** No runtime dependency on Wikipedia/Wikidata/Commons or CDNs (see *Self-contained assets*).
- **Public repo.** Only public, encyclopaedic facts go in. No personal notes or reflections, no "visited / not visited", no private links (see *Privacy*).
- **Languages:** Ukrainian first, English second. Every entity has `label_uk` (required) and `label_en` (optional but expected). The UI is in Ukrainian, with an English toggle later.
- **Small scale:** about 100 entities now, a few hundred within a year. Flat JSON files plus a client-side JS library are enough.

## Repo layout

```
site/                  # everything that is served; deployed to Pages as-is
  index.html
  js/                  # app code (ES modules)
  css/
  vendor/              # pinned third-party files (cytoscape, leaflet, base map)
  data/
    nodes.json
    edges.json
    articles.json
    images.json
  assets/img/          # local image copies
scripts/
  validate.mjs         # dependency-free Node validator
docs/
  design.md
.github/workflows/pages.yml
```

## Data model

Source of truth: JSON under `site/data/`, loaded by the page directly with `fetch`, with no conversion step. Formatting convention so diffs stay readable and stable: 2-space indent, one array entry per object, keys in the order shown below, a trailing newline. The validator checks the formatting (it re-serialises each file and compares), so the routine and humans can't drift.

### Identifiers

- **Wikidata QIDs** (`Q…`) are the canonical IDs wherever they exist. They deduplicate spelling variants (Берніні / Bernini / Бернини), and they bring labels, coordinates, dates, images and place hierarchy at write time.
- Fallback for entities without a QID: `x:<kebab-slug>`, for example `x:roebling-rooster-crossing`.
- Article IDs: `YYYY-MM-DD-<slug>`.

### Nodes (`site/data/nodes.json`)

```json
{
  "id": "Q160538",
  "type": "person",
  "label_uk": "Джан Лоренцо Берніні",
  "label_en": "Gian Lorenzo Bernini",
  "years": { "start": 1598, "end": 1680, "approx": false },
  "country": "IT",
  "kind": "sculpture",
  "coords": [41.9022, 12.4539],
  "image": "assets/img/q160538.jpg",
  "core": true,
  "articles": ["2026-10-14-st-peters-square"],
  "summary_uk": "Італійський скульптор і архітектор доби бароко, автор колонади [площі Святого Петра](node:Q…) …",
  "summary_en": "Italian Baroque sculptor and architect …",
  "wiki": { "uk": "Джан_Лоренцо_Берніні", "en": "Gian_Lorenzo_Bernini" }
}
```

| field | notes |
|---|---|
| `id` | QID or `x:` slug (always verify a QID on Wikidata before using it) |
| `type` | `person` \| `work` \| `place` \| `event` \| `movement` |
| `years` | person: birth–death; work: created/built; event: when (see *Fuzzy dates*) |
| `country` | ISO 3166-1 alpha-2 (present-day country), for filtering |
| `kind` | optional, one value: `architecture` \| `painting` \| `sculpture` \| `engineering` \| `urbanism` \| `mosaic` \| `literature` \| `patronage` \| `history`. Articles use the same list. One kind per entry for now; a list may be needed later for people who worked in several arts |
| `coords` | optional `[lat, lon]`, mostly for places and works; copied from Wikidata |
| `image` | optional; path to the local copy (see *Self-contained assets*) |
| `core` | main subject of some article, as opposed to merely mentioned |
| `summary_uk` / `summary_en` | optional; 1–2 short paragraphs (about 600–1000 characters), neutral encyclopaedic tone, written from Wikidata/Wikipedia facts, **never paraphrased from the digest articles** (see *Privacy*). Paragraphs are separated by `\n\n`. The only markup allowed is inline node links `[text](node:<id>)` |
| `wiki` | optional; Wikipedia page titles by language (`uk`, `en`), copied from Wikidata sitelinks. The site builds the URLs. They are outbound links only and nothing is fetched at runtime. The Wikidata link comes from the QID, so it needs no field |

### Edges (`site/data/edges.json`)

```json
{
  "from": "Q160538",
  "rel": "created",
  "to": "Q…",
  "years": { "start": 1656, "end": 1667 },
  "article": "2026-10-14-st-peters-square"
}
```

Relation vocabulary (closed list, extend on purpose):

| rel | from → to |
|---|---|
| `created` | person → work |
| `commissioned` | person → work |
| `relocated` | person → work (moved it, e.g. an obelisk) |
| `located_in` | work/place/event → place/work (`years` for a past location) |
| `born_in` / `died_in` | person → place |
| `buried_in` | person → place/work |
| `depicts` | work → person/event/work/place |
| `patron_of` | person → person |
| `rival_of` | person ↔ person (symmetric) |
| `relative_of` | person ↔ person (symmetric; family) |
| `influenced` | person/work/event → person/work/event |
| `part_of` | work/place → work/place |
| `restored` | person → work |
| `stolen_from` | work/event → place/work |
| `involved_in` | person/work/place → event |

The validator errors on an unknown `rel` and warns when the from/to types don't match this table.

### Articles (`site/data/articles.json`)

```json
{
  "id": "2026-10-14-st-peters-square",
  "date": "2026-10-14",
  "title_uk": "Площа Святого Петра",
  "title_en": "St Peter's Square",
  "country": "IT",
  "kind": "architecture"
}
```

There is no article text and no links to private chat or session pages, only metadata. The digest articles often address the reader personally ("you liked…", "you saw…"), and publishing a cleaned copy would mean trusting the routine to remove all of it with no review. Article text is deferred (see *Later*).

### Fuzzy dates

`years.start` / `years.end` are integers. Negative values mean BCE. `approx: true` means "c.". Leave `end` out for a point in time. This handles "c. 1432", "1506–1515" and "over 17 years" without free text.

## Self-contained assets

**Rule: the site must keep working if Wikipedia, Wikidata, Commons or any CDN changes or disappears.** Everything the site shows is copied into the repo when it's added. External services are only used as **sources at write time**, never at runtime.

- **Facts:** dates, coords and labels taken from Wikidata are written into the JSON, so nothing is fetched at runtime. The QID is kept only as a reference.
- **Images:** downloaded into `site/assets/img/` when the entity is added.
  - Fetch a pre-scaled version (Commons `Special:FilePath/<file>?width=1000`) and keep only that, not the original. Aim for about 1000px on the long side and at most about 250 KB each (JPEG/WebP). There is no build step, so no generated thumbnails; the browser scales with CSS and uses `loading="lazy"`.
  - File name: `<node-id-slug>[-n].<ext>`, for example `q160538.jpg` or `q160538-2.jpg`. Lowercase ASCII only, so URLs never need encoding.
  - **Attribution is required**, since most Commons images are CC BY / CC BY-SA. Keep a record for each image in `site/data/images.json`:
    ```json
    {
      "file": "assets/img/q160538.jpg",
      "node": "Q160538",
      "source": "https://commons.wikimedia.org/wiki/File:<original name>",
      "author": "<author as given on Commons>",
      "license": "CC BY-SA 4.0",
      "caption_uk": "…"
    }
    ```
    The site shows the credit wherever the image appears and on a credits page. Validation fails if an image has no license or author, or if an image file isn't listed.
  - Only freely licensed or public-domain images. Fair-use images from Wikipedia are not allowed.
- **Libraries:** pinned copies in `site/vendor/` (see *Stack*). No CDN at runtime.
- **Map base layer:** live tile servers (OSM) can't be copied. Use a low-detail base map kept in the repo (a Natural Earth countries GeoJSON, a few hundred KB) as the default layer, with OSM tiles only as an optional detailed layer when online.
- **Size budget:** GitHub Pages sites have a 1 GB limit and the repo should stay well under that. At ~250 KB × 3 images × a few hundred entities, that's ~200–300 MB over years, which is fine. Validation warns on any file over 500 KB. Prefer compression over Git LFS (Pages doesn't serve LFS files).

## Validation (`node scripts/validate.mjs`)

A single script using only Node built-ins (`node:fs`, `node:path`, `node:assert`), with no dependencies to install. It runs in CI and in the routine before every commit, and must pass:

- JSON parses, and the formatting matches the convention (re-serialise and compare);
- schema checks (required fields, enum values for `type` and `rel`, years are integers, `start <= end`);
- unique node IDs, and the ID format is `Q\d+` or `x:[a-z0-9-]+`;
- every edge's `from`/`to` exists in nodes, and every `article` exists in articles;
- no exact duplicate edges;
- every `image` path exists, every file in `assets/img/` is listed in `images.json`, and every image record has `author`, `license` and `source`;
- every `node:` link in a summary points to an existing node, and summaries contain no markup other than those links;
- **private content:** no file under `site/` may contain links to private Claude artifacts, chats, code sessions or projects, routine trigger IDs, Anthropic or GitHub tokens, or email addresses. The exact patterns are in the validator. This is the same check as the local pre-commit hook, which the cloud routine doesn't have because it clones the repo fresh. Since the routine must run the validator before every commit, the check applies wherever data is written;
- **privacy backstop:** summaries and captions must not address the reader. The check fails on Ukrainian second-person words (`ти`, `ви`, `тебе`, `вас`, `твій`, `ваш` and their forms, matched as whole words) and English `you`/`your`. Encyclopaedic text never needs them, so a match means personal text leaked in;
- warnings (not errors) for a node with no edges, a missing `label_en`, a place with no coords, or a file over 500 KB.

An optional `package.json` with only `"scripts": { "validate": "node scripts/validate.mjs" }` and no dependencies is allowed as a shortcut.

## Views (static site)

1. **Graph:** Cytoscape.js. Filters by type, country, art form and century. Focus mode: click a node to see only its neighbourhood. Core nodes show by default and mentioned ones on request. It must work with touch on a phone.
2. **Timeline:** everything placed by year, colour-coded by country or art form. It surfaces "these happened at the same time" connections. Likely plain SVG/HTML, no library.
3. **Map:** Leaflet with the base map from the repo (and an optional OSM layer), pins from `coords`.
4. **Quiz:** questions generated from edges ("Who created X?", "Where is X?", "When?"). Spaced repetition state lives in `localStorage` only.

Plus an **entity side panel**, which opens when a node is clicked in any view. From top to bottom:

1. A full-width hero image with the title over a dark gradient, the years and type as small labels, and a one-line image credit underneath. Without an image, the panel shows a plain header.
2. The summary, rendered as paragraphs with `node:` links. Clicking a link opens that node's panel and focuses it in the current view.
3. Relations, grouped by `rel` and shown as links.
4. "Згадується в": the titles and dates of the articles that mention the node.
5. References: Wikipedia (uk, en) and Wikidata, each shown only when present.

**Layout by screen width.** At about 900px and wider, the panel is a column on the right and the graph shrinks next to it. On narrower screens it is a bottom sheet with three positions:

- **peek** (about 25%, the position it opens in): thumbnail, title, years and type. The graph stays usable, with the selected node centred in the visible area above the sheet;
- **half** (about 55%): the hero image and the start of the summary;
- **full**: the whole panel, scrolling. A grab handle and a close button stay pinned at the top.

Swipe up or down to change position. Swiping down from peek, tapping empty graph space, or pressing back closes it. At full, dragging down shrinks the sheet only when the content is scrolled to the top; otherwise it scrolls the content. Following a link inside the panel keeps the sheet in its current position and moves the graph to the new node behind it. The sheet is built with plain CSS transforms and pointer events, uses `100dvh` and safe-area insets, and needs no library.

The panel's state is in the URL hash (`#/n/Q160538`), so a panel can be linked and bookmarked, and the back button steps back through the nodes you visited. Summary rendering is a few lines of our own code: split paragraphs, escape all text, and turn `[text](node:id)` into links. No Markdown library is needed.

Order: v1 is the data plus graph plus entity panel. v2 adds the timeline and map. v3 adds the quiz.

## Stack

- **No build.** `site/index.html` loads pinned library files with `<script src="vendor/…">` and the app as native ES modules (`<script type="module" src="js/main.js">`). It works with any static file server locally (`python3 -m http.server -d site`).
- **Libraries, pinned and stored in the repo:** Cytoscape.js and Leaflet (+ its CSS and marker images). Download the minified files of a specific released version once, and record the name, version, source URL and SHA-256 in `site/vendor/VERSIONS.md`. Updating = download the new version, update that file, commit.
- **Why not a CDN:** a CDN breaks the self-contained rule, adds third-party requests on every visit, and needs `integrity` hashes to be safe. Browsers no longer share caches between sites, so it brings no caching benefit either.
- **Why no bundler / npm:** two libraries and no TypeScript or framework give a bundler nothing to do. Having no dependencies means no supply-chain updates to manage. If the app outgrows this (TypeScript, many views), Vite can be added later without changing the data.
- **Deploy:** a GitHub Actions workflow on push to `main`: run `node scripts/validate.mjs`, then upload `site/` with `actions/upload-pages-artifact` and `actions/deploy-pages`. That is a check plus an upload, not a build.

## Automated updates (routine → repo)

The article series is produced by a scheduled Claude routine with this repo attached. After it writes an article, it adds these steps:

1. Extract the article's entities and relations. **Cap about 15 entities per article**, and mark `core` vs mentioned.
2. Resolve IDs: first look in `site/data/nodes.json` (the repo is the index), then use Wikidata search (`wbsearchentities`, language `uk` then `en`). Check that the candidate's type and country match the article. Flag low-confidence matches in the commit message.
3. Fill in facts from Wikidata where possible (dates, coords, labels, Wikipedia sitelinks for `wiki`), not from memory. Write `summary_uk` (and `summary_en`) from Wikidata/Wikipedia, not from the article text, and add `node:` links to other nodes that are already in the graph. Download 1–3 freely licensed images per core entity into `site/assets/img/` and record their attribution in `site/data/images.json`.
4. Add the entries to the JSON files, run `node scripts/validate.mjs`, then commit and push straight to `main`. The routine is the only automated writer, and git history is the undo.
5. If any step fails, skip it and mention that in the routine's notification. It must never block the article itself.

The routine's own prompt and configuration live outside this repo.

### Backfill

A one-off run, done in an interactive session, seeds the graph from the 18 articles written between October and mid-November 2026 (listed in `site/data/articles.json`). It follows the same steps as the routine.

## Privacy

This repo is public. Rules for everything committed, including by the routine:

- **In:** public, encyclopaedic facts (names, dates, places, relations, Wikimedia images with credits), neutral node summaries written from public sources, and article titles and dates.
- **Not yet:** article text (see *Later*).
- **Out:** personal reflections, travel plans, "been there / want to see", anything about the reader, email addresses, links to private Claude sessions or docs, routine IDs and prompts, tokens of any kind.
- A possible personal layer (visited / want to see / seen in person) would live **only in the browser** (`localStorage`). A private overlay can be designed later if it's wanted.

## Later

- **Full article text in the panel.** Each article would be stored as Markdown in `site/articles/<id>.md`, with explicit `[text](node:<id>)` links and inline images listed in `images.json`, and rendered by a small renderer for a limited set of Markdown features. The panel would show the article(s) in which the node is `core` below the summary. This is blocked on privacy: the digest text addresses the reader, so it needs either a public version written for the purpose or a review step before anything is published, not a cleanup by the routine with nobody checking.

## Decisions

- `country` is stored on each node, not derived through `located_in` chains.
- Licence: code is MIT (`LICENSE`), data in `site/data/` is CC0 1.0 (`LICENSE-DATA.md`), matching Wikidata. Images keep their own licences per `images.json`. Because the data is CC0, summaries must be written in the routine's own words and must not closely paraphrase Wikipedia (which is CC BY-SA).

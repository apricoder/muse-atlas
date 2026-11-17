# Muse Atlas

A static knowledge graph of art and architecture (people, works, places, relations, years), hosted on GitHub Pages. The design is in [docs/design.md](docs/design.md). Read it first.

## Rules

- **This repo is public.** Commit only public, encyclopaedic facts. Never commit personal notes, travel or visit status, email addresses, links to private Claude sessions or docs, routine IDs or prompts, or tokens. See *Privacy* in the design doc.
- Static only: no backend, no secrets, no runtime API keys.
- No build step and no package dependencies: plain HTML + ES modules, with pinned library copies in `site/vendor/` (see `site/vendor/VERSIONS.md`). Don't add npm packages or a bundler without asking.
- Self-contained: no runtime dependency on Wikipedia, Wikidata, Commons or CDNs. Copy facts into `site/data/*.json`, images into `site/assets/img/` (with attribution in `site/data/images.json`), and libraries into `site/vendor/`.
- Ukrainian labels come first (`label_uk` is required) and English second.
- Use Wikidata QIDs as node IDs, with an `x:<slug>` fallback.
- `node scripts/validate.mjs` must pass before any commit that touches `site/data/` or `site/assets/`.
- Run locally with `python3 -m http.server -d site`.

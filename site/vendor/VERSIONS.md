# Vendored libraries

Pinned copies, loaded with plain `<script>` tags. Nothing is fetched from a CDN at runtime.

To update: download the new release, verify it against the npm registry tarball (`dist.integrity`), replace the file, update this table, commit.

| File | Library | Version | Source | SHA-256 | Licence |
|---|---|---|---|---|---|
| `cytoscape.min.js` | Cytoscape.js | 3.30.2 | https://cdn.jsdelivr.net/npm/cytoscape@3.30.2/dist/cytoscape.min.js | `83e8c54a6bec655bfd81df07df605649c268af69aeca67a5ea2da54ea42dac81` | MIT (`cytoscape.LICENSE`) |

Verified 2026-11-17: identical to `package/dist/cytoscape.min.js` in the npm tarball `cytoscape-3.30.2.tgz` (registry integrity `sha512-oICxQsjW8uSaRmn4UK/jkczKOqTrVqt5/1WL0POiJUT2EKNc9STM4hYFHv917yu55aTBMFNRzymlJhVAiWPCxw==`).

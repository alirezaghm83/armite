# Armite maintenance

- Static, buildless site in `docs/`, served by GitHub Pages from `main /docs`.
- No framework, bundler, server, API key, or runtime third-party API is required.
- UI guidance: `DESIGN.md` and `design/app-picker.md`. Keep application artwork self-hosted, preserve `docs/assets/apps/sources.json` provenance and license notices, and regenerate `docs/icons.js` with `python3 scripts/import_icons.py` only for missing artwork. UI glyphs live in `docs/ui-icons.js`.
- Keep `docs/data/catalog.json` checked in; the browser must never resolve latest releases itself.
- Source configuration: `data/sources.json`. Refresh with `python3 scripts/refresh_catalog.py` (or `--only id1,id2`). Inspect diffs before committing.
- Accept explicit Windows ARM64 artifacts from publisher pages or ARM64 WinGet entries. Never infer native support from a Linux/macOS ARM filename or silently substitute x64. Withhold conflicting architecture filenames. Label ARM64EC and universal packages.
- Preserve source URLs, checked dates, and published SHA-256 hashes. Failed refreshes preserve prior entries; report failures honestly.
- `python3 scripts/check_links.py` checks file headers with bounded reads. Local blocks are distinct from proof that a URL is broken. Do not automatically rewrite URLs on a network error.
- Run `npm run check` for code/catalog changes and `python3 -m unittest discover -s tests -p '*_test.py'` for resolver changes. Browser-check changed user flows with a visible browser.
- Keep relative asset URLs so `/armite/` works. Selection hashes contain app IDs and format indices, never executable URLs.
- Inspect git status/diffs; commit coherent milestones. Never commit credentials, downloaded installers, local preview metadata, node_modules, or temporary screenshots.
- Update this file only when enduring architecture, commands, or maintenance rules change.

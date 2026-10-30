# Armite design system

The incumbent visual identity is a quiet, light tool for collecting Windows ARM64 app downloads: teal accent, green-tinted neutral surfaces, Manrope headings, DM Sans controls and body. Preserve that identity when refining this project.

## Tokens

- Text: `--ink` #19372e; secondary copy `--muted` #586e63; supporting metadata `--subtle` #5c7063.
- Accent: `--green` #087e6b; pressed/strong link color #075d50; selected background #eef8f1.
- Surfaces: page #f7f9f7; panels #ffffff; dividers #dce5df.
- Type: 48 px desktop / 38 px phone heading; 25 px section headings; 14–15 px app names; 12–13 px descriptions/actions; 12 px architecture/version metadata. Use rem-equivalent browser scaling and avoid shrinking app names for density.
- Spacing: 4 px base rhythm; 18 px app-row padding; 24 px category gaps; 32 px workspace gap. Category panels use a single 1 px border and 14 px radius, not a shadow.
- Controls: native checkboxes and selects; shared 44 px button minimum; visible 2 px teal focus outlines; selected, hover, disabled, loading, error, and empty states.
- UI icons: consistent authored SVG strokes in `docs/ui-icons.js`. App identities: locally served original/community artwork, with provenance in `docs/assets/apps/sources.json` and licensing in its NOTICE file.

## Responsive structure

The main picker and sticky selection sidebar share the desktop workspace. Category controls wrap rather than scrolling horizontally. Below 680 px, categories use a native select, the catalog becomes one column, and a bottom shortcut brings the selection panel into view. Keep icons and controls legible rather than compressing two app columns onto a phone.

The matching surface brief is `design/app-picker.md`.

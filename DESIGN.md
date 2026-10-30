---
name: Armite
description: An editorial software index for Windows ARM64.
colors:
  ink: "#191c19"
  paper: "#f3f2ea"
  citron: "#d8ed91"
  selected: "#e6edbe"
  focus: "#3457c9"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "5.25rem"
    fontWeight: 650
    lineHeight: 1.02
    letterSpacing: "-.04em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1rem"
rounded:
  flat: "0px"
spacing:
  row: "16px"
  desktop-gutter: "40px"
  phone-gutter: "18px"
components:
  button-primary:
    backgroundColor: "#20251a"
    textColor: "{colors.paper}"
    rounded: "{rounded.flat}"
    height: "44px"
---

# Armite — editorial software index

## Overview

Premium software publication / industrial product index. Supersedes the teal category-card system. The catalog is visible by default; app artwork carries recognition rather than decoration.

## Colors

Warm paper against ink; citron for masthead emphasis and selection. The deliberate paper/citron relationship gives the catalog a quiet reading surface. Blue marks keyboard focus.

## Typography

Self-hosted Manrope for measured display type; DM Sans for controls and app information. Heading 84 px desktop, 54 px phone; section titles 34/30 px; app names 15–16 px; descriptions 13 px. Supporting controls/data 11–13 px.

## Layout

Full-width dark masthead, narrow sticky category rail, uninterrupted ruled app rows. At 760 px the rail becomes a native category select and app rows stack. Desktop gutters 40 px; phone gutters 18 px. Starter packs remain available before selection.

## Elevation & Depth

Use depth only for the fixed collection tray and native modal overlays. A 180 ms tray entrance and restrained row hover transitions supply feedback. Respect reduced motion.

## Shapes

Flat edges and fine rules. The brand mark retains a small 3 px corner. Avoid decorative containers around categories or individual apps.

## Components

Selecting apps reveals a compact tray; review opens selection controls in a native dialog. Keep visible focus, native checkboxes, format selection, explicit Download actions and publisher links. Icons and provenance remain self-hosted and unchanged.

## Do's and Don'ts

Preserve all catalog facts, source dates, hash sharing, exports and checksums. Avoid gradients, repetitive cards, floating icon tiles and decorative imagery. Baseline controls live in `docs/styles.css`; replacement composition and tokens in `docs/redesign.css`. Task decisions are in `design/app-picker.md`.

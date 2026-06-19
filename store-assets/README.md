# Store listing assets

## Icons

Original MIT-licensed artwork in [`public/icons/`](../public/icons/).

- `icon.svg` — editable source
- `icon-{16,32,48,96,128}.png` — run `npm run icons` to regenerate

## Screenshots (capture manually)

1. Results panel showing **iiif full** on [catalog.archives.gov](https://catalog.archives.gov/)
2. Element picker highlighting a target
3. CSS `background-image` fixture or Instagram overlay example

## Listing copy

**Name:** Background Reveal

**Short description:** Reveal images hidden in CSS backgrounds, overlays, and tiled IIIF viewers.

**Permissions (`<all_urls>`):** Used only when you right-click or use the picker. Reads computed styles and fetches IIIF manifests locally. No data is collected or transmitted.

**Feature bullets**

- Right-click **Reveal images here** on any page
- Element picker for precise selection
- Finds CSS backgrounds, pseudo-elements, lazy `data-*` attrs, stacked overlays
- Reconstructs full-resolution URLs from IIIF / OpenSeadragon (National Archives Catalog)
- Open, copy, or download revealed URLs

## Build artifacts

```bash
npm run zip:firefox
npm run zip:chrome
npm run sign:firefox
```

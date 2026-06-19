# Store listing assets

Draft copy and asset checklist for AMO, Chrome Web Store, and Edge Add-ons. Full process: [`docs/STORE_SUBMISSION.md`](../docs/STORE_SUBMISSION.md).

## Icons (included in build)

Original MIT-licensed artwork in [`public/icons/`](../public/icons/).

| Asset | File | Store use |
|-------|------|-----------|
| Source | `icon.svg` | Edit and run `npm run icons` |
| 128×128 | `icon-128.png` | Chrome / Edge store icon |
| 48×48 | `icon-48.png` | AMO icon |
| All sizes | `icon-{16,32,48,96,128}.png` | Bundled in extension |

## Screenshots (you must add)

Save PNGs here when captured:

```
store-assets/screenshots/
  01-nara-iiif-panel.png      # Results panel with iiif full on catalog.archives.gov
  02-element-picker.png       # Picker highlight on a target
  03-background-reveal.png    # CSS background-image reveal
  04-open-all-buttons.png     # Panel with Open all / Download all visible
```

**Suggested sizes**

- **Chrome / Edge:** 1280×800 or 640×400 (16:10)
- **Firefox AMO:** min 640×512; 1280×800 works well

## Listing copy (draft)

### Name

Background Reveal

### Tagline / short description (≤ 132 chars for Chrome)

Reveal images hidden in CSS backgrounds, overlays, and IIIF tiled viewers.

### Long description

Background Reveal finds image URLs that websites display without a normal “Save image” target — CSS background images, elements under transparent overlays, lazy-load data attributes, open shadow DOM, and IIIF / OpenSeadragon tiled viewers (e.g. National Archives Catalog).

**How to use**

- Right-click anywhere → **Reveal images here**
- Or click the toolbar icon → **Start element picker** → click a target

The results panel lists each unique URL. Use **Open**, **Copy**, or **Download** per image, or **Open all** / **Download all**. Repeated reveals add to the same list until you close the panel.

**Works with**

- CSS `background-image`, `image-set()`, pseudo-elements, masks
- `<img>`, `<picture>`, `srcset`, lazy `data-*` attributes
- IIIF full-resolution URLs from tiled pan/zoom viewers

**Privacy**

All processing happens locally in your browser. No analytics, no accounts, no data sent to the extension developer. See the privacy policy URL in the listing.

### Permission justification (short)

`<all_urls>` is used only when you invoke the extension. It reads page styles/DOM and may fetch IIIF manifests to build full image URLs. Nothing is collected or transmitted to us.

### Categories

- Firefox: Photos / Developer Tools
- Chrome: Productivity or Developer Tools

## Build commands

```bash
npm run zip:firefox
npm run zip:chrome
npm run sign:firefox   # AMO JWT credentials required
npm run lint:ext
```

## Checklist before upload

- [ ] Public privacy policy URL live
- [ ] Firefox `gecko.id` finalized in `wxt.config.ts` (not `@local.dev` placeholder if AMO rejects it)
- [ ] Version bumped
- [ ] `npm test` and `npm run lint:ext` pass
- [ ] Screenshots added to `store-assets/screenshots/`
- [ ] Smoke test on NARA catalog + one CSS-background site
- [ ] Reviewer notes pasted (see `docs/STORE_SUBMISSION.md`)

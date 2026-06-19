# Background Reveal

Browser extension that reveals image URLs hidden behind CSS backgrounds, transparent overlays, lazy-load attributes, open shadow DOM, and IIIF tiled viewers (OpenSeadragon / National Archives Catalog).

Works in **Firefox**, **Chrome**, and **Edge**.

## Install (development)

```bash
npm install
npm run build:firefox   # → .output/firefox-mv2
npm run build:chrome    # → .output/chrome-mv3
```

Or watch mode:

```bash
npm run dev:firefox
npm run dev             # Chrome
```

**Load unpacked**

| Browser | Path |
|---------|------|
| Firefox | `.output/firefox-mv2` — `about:debugging` → Load Temporary Add-on → pick `manifest.json` |
| Chrome / Edge | `.output/chrome-mv3` — Extensions → Developer mode → Load unpacked |

## Usage

1. **Context menu** — Right-click anywhere → **Reveal images here**
2. **Element picker** — Toolbar icon → **Start element picker** → click target → **Esc** to cancel

The results panel lists unique image URLs with **Open**, **Copy URL**, and **Download**. Repeated reveals append to the same panel until you close it. **Open all** and **Download all** act on the full list.

### Tips for specific sites

| Site | Notes |
|------|-------|
| [National Archives Catalog](https://catalog.archives.gov/) | Uses IIIF v3 tiles on a canvas, not a plain `<img>`. Open the record, **wait for the viewer to load** (pan/zoom once), then reveal. Look for an **iiif full** entry — that is the full-resolution URL. |
| Instagram | Images often sit under transparent overlays; stack picking finds the `<img>` / largest `srcset` entry. Login walls may block some content. |
| Generic CSS hero sections | Works on `background-image`, `image-set()`, and `::before` / `::after` pseudo-elements. |

## What we support

### Extraction sources

| Source | How |
|--------|-----|
| CSS `background-image` | `getComputedStyle` + `url()` parsing |
| `image-set()` | Parsed from computed background |
| `::before` / `::after` | Pseudo-element backgrounds, masks, `content: url()` |
| CSS `mask-image` / `-webkit-mask-image` | Parsed from computed style |
| Transparent overlays | `document.elementsFromPoint` stack at cursor |
| `<img>` / `<picture>` / `srcset` | `currentSrc`, largest `srcset` candidate |
| Lazy `data-*` attrs | `data-src`, `data-background-image`, `data-bg`, etc. |
| CSS custom properties | `--bg-image`, `--background-image`, etc. |
| Open shadow DOM | Walks open shadow roots |
| Blob / data URIs | Passed through |
| IIIF / OpenSeadragon | Tile URLs from network + DOM → full-res `{base}/full/max/0/default.jpg` |
| `<video poster>` | Poster URL |
| Inline / linked SVG `<image>` | `href` / `xlink:href` |
| Same-origin iframes | Best-effort DOM walk |

### Actions

- **Open** / **Copy** / **Download** — per image
- **Open all** / **Download all** — entire accumulated list
- Repeated **Reveal images here** appends to the panel until you close it (×)

### Known limitations

| Scenario | Status |
|----------|--------|
| Closed shadow DOM | Not supported |
| Cross-origin iframe content | Not supported |
| Canvas / WebGL without a DOM URL | Not supported |
| DRM / encrypted media | Not supported |
| Sites that never load tile URLs until interaction | Reveal after the viewer has fetched tiles |

## Icons

Original artwork in [`public/icons/`](public/icons/) (MIT license, see [`public/icons/LICENSE`](public/icons/LICENSE)).

- Source SVG: `public/icons/icon.svg`
- Regenerate PNGs: `npm run icons`

## Build & release

```bash
npm run build:firefox
npm run build:chrome
npm run zip:firefox
npm run zip:chrome
npm run lint:ext      # web-ext lint (after firefox build)
```

### Firefox (AMO)

Extension ID (development): `background-reveal@local.dev` — change to a permanent ID before listing; see [`docs/STORE_SUBMISSION.md`](docs/STORE_SUBMISSION.md).

```bash
npm run sign:firefox   # requires AMO API credentials → web-ext-artifacts/*.xpi
```

### Chrome Web Store / Edge Add-ons

Upload zip from `npm run zip:chrome`. Listing checklist: [`docs/STORE_SUBMISSION.md`](docs/STORE_SUBMISSION.md).

## Test

```bash
npm test
npm run test:e2e
```

Chromium E2E loads the unpacked extension automatically. Firefox E2E is documented in [`tests/e2e/firefox-spike.spec.ts`](tests/e2e/firefox-spike.spec.ts).

## Privacy

See [PRIVACY.md](PRIVACY.md). No data collection; `<all_urls>` is used only when you invoke the extension on a page.

**Store listings** require a **public HTTPS URL** to that policy — hosting the file in git is not sufficient. See [`docs/STORE_SUBMISSION.md`](docs/STORE_SUBMISSION.md).

## License

MIT — code and icons (see `public/icons/LICENSE`).

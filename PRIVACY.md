# Privacy Policy — Background Reveal

**Last updated:** 2026-06-18

**Extension version:** 0.1.0

## Summary

Background Reveal processes web page content locally in your browser to find image URLs. It does not collect, store, or transmit personal data to any server operated by the extension author.

## Data access

The extension requests `<all_urls>` host permission so it can:

- Read computed styles and DOM attributes on pages you interact with
- Fetch IIIF `info.json` manifests when you use the reveal feature on tiled image viewers
- Open, copy, or download image URLs you select

This access runs only after your explicit action: context menu (**Reveal images here**), element picker, or popup (**Start element picker**). The extension does not scan pages in the background.

## Data collection

We do not:

- Collect browsing history
- Collect image URLs or page content
- Use analytics or tracking
- Send data to third-party servers operated by the extension author

## Data storage

The extension does not persist page content to disk or extension storage. The on-page results panel holds URLs in memory until you close it; closing the panel clears that list.

## Third parties

When you choose **Open**, **Download**, **Open all**, or **Download all**, your browser contacts the image host directly (e.g. `catalog.archives.gov`, Instagram, other CDNs). Those sites have their own privacy policies.

## Permissions

| Permission | Why |
|------------|-----|
| `host_permissions` (`<all_urls>`) | Read styles/DOM and fetch IIIF metadata on user-invoked reveal |
| `contextMenus` | “Reveal images here” menu item |
| `downloads` | Save revealed images when you click Download |
| `clipboardWrite` | Copy URL when you click Copy |
| `scripting` | Clipboard fallback on restrictive pages |
| `activeTab` | User-gesture tab access |

## Contact

For privacy questions, contact the developer via the support URL listed on the extension’s store page, or open an issue in the project repository.

## Changes

Material changes to this policy will be reflected in extension store listings and this document.

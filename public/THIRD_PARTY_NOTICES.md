# Third-party notices

Background Reveal (MIT) bundles the following third-party software in its
store builds. Development-only tools (WXT, Vitest, Playwright, etc.) are **not**
included in shipped extension packages.

## webextension-polyfill

- **Version:** 0.12.0 (see `package-lock.json`)
- **License:** Mozilla Public License 2.0 (MPL-2.0)
- **Copyright:** Mozilla and contributors
- **Source:** https://github.com/mozilla/webextension-polyfill
- **Use:** Promise-based `browser.*` API wrapper; bundled into `background.js`,
  `content-scripts/content.js`, and popup scripts by the build.

This project’s own source remains under the MIT license (see root `LICENSE`).
MPL-2.0 applies to the polyfill portions above. Unmodified polyfill source is
available at the URL above.

### MPL-2.0

The full license text is included in `public/licenses/MPL-2.0.txt` and in the
upstream repository.

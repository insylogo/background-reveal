const URL_IN_CSS_RE =
  /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;

const IMAGE_SET_RE =
  /image-set\(\s*([^)]+)\)/gi;

const DATA_ATTRS = [
  'data-src',
  'data-bg',
  'data-background-image',
  'data-lazy-src',
  'data-original',
  'data-srcset',
  'data-bgimage',
  'data-image',
  'data-thumb',
  'data-poster',
] as const;

const CSS_VAR_PATTERNS = [
  '--bg-image',
  '--background-image',
  '--background-image-lazy',
  '--image-url',
] as const;

export function parseUrlsFromCssValue(value: string): string[] {
  if (!value || value === 'none') return [];

  const urls: string[] = [];

  for (const match of value.matchAll(URL_IN_CSS_RE)) {
    const url = match[2]?.trim();
    if (url) urls.push(url);
  }

  for (const setMatch of value.matchAll(IMAGE_SET_RE)) {
    const inner = setMatch[1] ?? '';
    for (const match of inner.matchAll(URL_IN_CSS_RE)) {
      const url = match[2]?.trim();
      if (url) urls.push(url);
    }
  }

  return urls;
}

export function resolveUrl(raw: string, base: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//')
  ) {
    if (trimmed.startsWith('//')) {
      return new URL(`https:${trimmed}`).href;
    }
    return trimmed;
  }
  try {
    return new URL(trimmed, base).href;
  } catch {
    return trimmed;
  }
}

export function parseSrcset(srcset: string): string[] {
  if (!srcset) return [];
  return srcset
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

export function pickLargestSrcsetUrl(srcset: string, base: string): string | null {
  const candidates = srcset
    .split(',')
    .map((part) => {
      const [url, descriptor] = part.trim().split(/\s+/);
      const width = descriptor?.endsWith('w')
        ? Number.parseInt(descriptor, 10)
        : descriptor?.endsWith('x')
          ? Number.parseFloat(descriptor) * 1000
          : 0;
      return { url, width: Number.isFinite(width) ? width : 0 };
    })
    .filter((c) => c.url);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.width - a.width);
  return resolveUrl(candidates[0].url, base);
}

export function dedupeImages<T extends { url: string }>(images: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const img of images) {
    const key = img.url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(img);
  }
  return result;
}

export function filenameFromUrl(url: string, fallback = 'image'): string {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split('/').pop();
    if (name && name.includes('.')) return name;
  } catch {
    // ignore
  }
  if (url.startsWith('data:image/')) {
    const mime = url.slice(5, url.indexOf(';'));
    const ext = mime.split('/')[1] ?? 'bin';
    return `${fallback}.${ext}`;
  }
  return `${fallback}.jpg`;
}

export function readDataAttributeUrls(el: Element, base: string): string[] {
  const urls: string[] = [];
  for (const attr of DATA_ATTRS) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    if (attr === 'data-srcset') {
      for (const u of parseSrcset(value)) {
        urls.push(resolveUrl(u, base));
      }
    } else {
      urls.push(resolveUrl(value, base));
    }
  }
  return urls;
}

export function readCssVariableUrls(el: Element, base: string): string[] {
  const style = getComputedStyle(el);
  const urls: string[] = [];
  for (const name of CSS_VAR_PATTERNS) {
    const value = style.getPropertyValue(name).trim();
    if (!value) continue;
    for (const raw of parseUrlsFromCssValue(value)) {
      urls.push(resolveUrl(raw, base));
    }
    if (value && !value.includes('url(')) {
      urls.push(resolveUrl(value, base));
    }
  }
  return urls;
}

export {
  DATA_ATTRS,
  CSS_VAR_PATTERNS,
};

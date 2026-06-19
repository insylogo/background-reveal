import type { ExtractedImage } from './types';
import { resolveUrl } from './url-utils';

interface IiifInfo {
  '@id'?: string;
  id?: string;
  '@context'?: string | string[];
  profile?: string | string[];
  width?: number;
  height?: number;
  thumbnail?: string | { '@id'?: string; id?: string };
  sizes?: Array<{ width?: number; height?: number }>;
}

declare global {
  interface Window {
    OpenSeadragon?: {
      getViewer?: (element: Element | string) => OpenSeadragonViewer | undefined;
      viewers?: OpenSeadragonViewer[];
    };
  }
}

interface OpenSeadragonViewer {
  element?: Element;
  tileSources?: unknown;
  world?: {
    getItemCount: () => number;
    getItemAt: (index: number) => { source?: unknown };
  };
}

function isIiifInfoUrl(value: string): boolean {
  return /\/info\.json(?:\?|#|$)/i.test(value);
}

const IIIF_IMAGE_URL_RE =
  /https?:\/\/[^\s"'<>]+\/iiif\/\d+\/[^\s"'<>/]+\/[^\s"'<>]+/gi;

const IIIF_BASE_RE = /^(https?:\/\/[^/]+\/iiif\/\d+\/[^/]+)/i;

export function parseIiifImageBase(url: string): string | null {
  const match = url.match(IIIF_BASE_RE);
  return match?.[1] ?? null;
}

export function buildIiifInfoUrl(base: string): string {
  return `${normalizeIiifBase(base)}/info.json`;
}

export function detectIiifUrlsFromPerformance(): string[] {
  const bases = new Set<string>();
  try {
    for (const entry of performance.getEntriesByType('resource')) {
      const name = entry.name;
      if (!name.includes('/iiif/')) continue;
      const base = parseIiifImageBase(name);
      if (base) bases.add(base);
      if (isIiifInfoUrl(name)) bases.add(normalizeIiifBase(name));
    }
  } catch {
    // ignore
  }
  return [...bases];
}

export function detectIiifUrlsInText(text: string): string[] {
  const bases = new Set<string>();
  for (const match of text.matchAll(IIIF_IMAGE_URL_RE)) {
    const base = parseIiifImageBase(match[0]);
    if (base) bases.add(base);
  }
  for (const match of text.matchAll(/https?:\/\/[^"'\\s<>]+?\/iiif\/\d+\/[^"'\\s<>/]+\/info\.json/gi)) {
    bases.add(normalizeIiifBase(match[0]));
  }
  return [...bases];
}

function detectIiifUrlsInDom(stack: Element[]): string[] {
  const bases = new Set<string>();
  const roots = new Set<Element>(stack);

  for (const el of stack) {
    let parent: Element | null = el;
    for (let i = 0; i < 8 && parent; i++) {
      roots.add(parent);
      parent = parent.parentElement;
    }
  }

  for (const root of roots) {
    for (const attr of Array.from(root.attributes)) {
      for (const base of detectIiifUrlsInText(attr.value)) {
        bases.add(base);
      }
    }
  }

  const viewer = stack.find(
    (el) =>
      el.classList.contains('openseadragon-canvas') ||
      el.closest('.openseadragon-container') ||
      el.tagName.toLowerCase() === 'canvas',
  );
  if (viewer) {
    const container = viewer.closest('.openseadragon-container') ?? viewer.parentElement;
    if (container) {
      for (const base of detectIiifUrlsInText(container.innerHTML)) {
        bases.add(base);
      }
    }
  }

  if (location.hostname.includes('archives.gov')) {
    for (const base of detectIiifUrlsInText(document.body.innerHTML.slice(0, 500_000))) {
      bases.add(base);
    }
  }

  return [...bases];
}

function normalizeIiifBase(id: string): string {
  return id.replace(/\/info\.json$/i, '').replace(/\/$/, '');
}

export function buildIiifFullUrl(baseId: string, format = 'jpg'): string {
  const base = normalizeIiifBase(baseId);
  return `${base}/full/max/0/default.${format}`;
}

export function buildIiifThumbnailUrl(baseId: string, width = 256): string {
  const base = normalizeIiifBase(baseId);
  return `${base}/full/${width},/0/default.jpg`;
}

export function imagesFromIiifInfo(
  info: IiifInfo,
  base: string,
): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const id = info['@id'] ?? info.id;
  if (!id) return images;

  const resolvedId = resolveUrl(id, base);
  const format =
    typeof info.profile === 'string' && info.profile.includes('png')
      ? 'png'
      : 'jpg';

  images.push({
    url: buildIiifFullUrl(resolvedId, format),
    kind: 'iiif-full',
    label: `IIIF full (${info.width ?? '?'}×${info.height ?? '?'})`,
    width: info.width,
    height: info.height,
  });

  if (info.thumbnail) {
    const thumbUrl =
      typeof info.thumbnail === 'string'
        ? info.thumbnail
        : (info.thumbnail['@id'] ?? info.thumbnail.id);
    if (thumbUrl) {
      images.push({
        url: resolveUrl(thumbUrl, base),
        kind: 'iiif-thumb',
        label: 'IIIF thumbnail',
      });
    }
  }

  return images;
}

export async function fetchIiifImages(infoUrl: string): Promise<ExtractedImage[]> {
  const resolved = resolveUrl(infoUrl, document.baseURI);
  const response = await fetch(resolved);
  if (!response.ok) {
    throw new Error(`IIIF fetch failed: ${response.status}`);
  }
  const info = (await response.json()) as IiifInfo;
  return imagesFromIiifInfo(info, resolved);
}

function collectTileSourceUrls(tileSources: unknown): string[] {
  const urls: string[] = [];

  const visit = (source: unknown) => {
    if (!source) return;
    if (typeof source === 'string') {
      if (isIiifInfoUrl(source) || source.startsWith('http')) {
        urls.push(source);
      }
      return;
    }
    if (Array.isArray(source)) {
      source.forEach(visit);
      return;
    }
    if (typeof source === 'object') {
      const obj = source as Record<string, unknown>;
      if (typeof obj['@id'] === 'string') urls.push(obj['@id']);
      if (typeof obj.id === 'string') urls.push(obj.id);
      if (typeof obj.tileSource === 'string') urls.push(obj.tileSource);
      if (typeof obj.url === 'string') urls.push(obj.url);
      if (obj.type === 'image' && typeof obj.url === 'string') {
        urls.push(obj.url);
      }
    }
  };

  visit(tileSources);
  return urls;
}

function findOpenSeadragonViewers(stack: Element[]): OpenSeadragonViewer[] {
  const viewers: OpenSeadragonViewer[] = [];
  const osd = window.OpenSeadragon;
  if (!osd) return viewers;

  for (const el of stack) {
    const viewer =
      osd.getViewer?.(el) ??
      osd.viewers?.find((v) => v.element === el || el.contains(v.element ?? null));
    if (viewer) viewers.push(viewer);
  }

  if (viewers.length === 0 && osd.viewers?.length) {
    viewers.push(...osd.viewers);
  }

  return viewers;
}

function tileSourcesFromViewer(viewer: OpenSeadragonViewer): unknown[] {
  const sources: unknown[] = [];
  if (viewer.tileSources) {
    sources.push(viewer.tileSources);
  }
  if (viewer.world) {
    const count = viewer.world.getItemCount();
    for (let i = 0; i < count; i++) {
      const item = viewer.world.getItemAt(i);
      if (item?.source) sources.push(item.source);
    }
  }
  return sources;
}

export function detectIiifBasesInStack(stack: Element[]): string[] {
  const bases = new Set<string>();

  for (const base of detectIiifUrlsFromPerformance()) {
    bases.add(normalizeIiifBase(base));
  }

  for (const base of detectIiifUrlsInDom(stack)) {
    bases.add(normalizeIiifBase(base));
  }

  for (const el of stack) {
    for (const attr of Array.from(el.attributes)) {
      if (isIiifInfoUrl(attr.value)) {
        bases.add(normalizeIiifBase(attr.value));
      } else {
        const parsed = parseIiifImageBase(attr.value);
        if (parsed) bases.add(normalizeIiifBase(parsed));
      }
    }
  }

  for (const viewer of findOpenSeadragonViewers(stack)) {
    for (const source of tileSourcesFromViewer(viewer)) {
      for (const url of collectTileSourceUrls(source)) {
        if (isIiifInfoUrl(url)) {
          bases.add(normalizeIiifBase(url));
        } else {
          const parsed = parseIiifImageBase(url);
          if (parsed) bases.add(normalizeIiifBase(parsed));
        }
      }
    }
  }

  for (const script of Array.from(document.querySelectorAll('script'))) {
    const text = script.textContent ?? '';
    for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+\/iiif\/\d+\/[^\s"'<>/]+/gi)) {
      const parsed = parseIiifImageBase(match[0]);
      if (parsed) bases.add(normalizeIiifBase(parsed));
    }
  }

  return [...bases];
}

export function dedupeIiifImages(images: ExtractedImage[]): ExtractedImage[] {
  const byBase = new Map<string, ExtractedImage>();

  for (const img of images) {
    const base = parseIiifImageBase(img.url);
    const key = base ?? img.url;
    const existing = byBase.get(key);
    if (!existing) {
      byBase.set(key, img);
      continue;
    }
    if (img.kind === 'iiif-full' && existing.kind !== 'iiif-full') {
      byBase.set(key, img);
    }
  }

  return [...byBase.values()];
}

export function detectIiifInfoUrlsInStack(stack: Element[]): string[] {
  return detectIiifBasesInStack(stack).map((base) => buildIiifInfoUrl(base));
}

export async function resolveIiifImagesForStack(
  stack: Element[],
): Promise<ExtractedImage[]> {
  const bases = detectIiifBasesInStack(stack);
  const images: ExtractedImage[] = [];

  for (const base of bases) {
    try {
      images.push(...(await fetchIiifImages(buildIiifInfoUrl(base))));
    } catch {
      images.push({
        url: buildIiifFullUrl(base),
        kind: 'iiif-full',
        label: 'IIIF full resolution',
      });
    }
  }

  return dedupeIiifImages(images);
}

import type { ExtractedImage, ImageKind } from './types';
import {
  dedupeImages,
  parseSrcset,
  parseUrlsFromCssValue,
  pickLargestSrcsetUrl,
  readCssVariableUrls,
  readDataAttributeUrls,
  resolveUrl,
} from './url-utils';

function makeImage(
  url: string,
  kind: ImageKind,
  label: string,
  element: Element,
  pseudo?: '::before' | '::after',
): ExtractedImage | null {
  if (!url) return null;
  return {
    url,
    kind,
    label,
    elementTag: element.tagName.toLowerCase(),
    pseudo,
  };
}

function extractFromImg(el: Element, base: string): ExtractedImage[] {
  if (!(el instanceof HTMLImageElement)) return [];
  const images: ExtractedImage[] = [];
  const current = el.currentSrc || el.src;
  if (current) {
    const img = makeImage(resolveUrl(current, base), 'img', 'img src', el);
    if (img) images.push(img);
  }
  if (el.srcset) {
    const largest = pickLargestSrcsetUrl(el.srcset, base);
    if (largest) {
      const img = makeImage(largest, 'img', 'img srcset (largest)', el);
      if (img) images.push(img);
    }
    for (const u of parseSrcset(el.srcset)) {
      const img = makeImage(resolveUrl(u, base), 'img', 'img srcset entry', el);
      if (img) images.push(img);
    }
  }
  return images;
}

function extractFromPicture(el: Element, base: string): ExtractedImage[] {
  if (el.tagName.toLowerCase() !== 'picture') return [];
  const images: ExtractedImage[] = [];
  for (const source of Array.from(el.querySelectorAll('source'))) {
    const srcset = source.getAttribute('srcset');
    if (srcset) {
      const largest = pickLargestSrcsetUrl(srcset, base);
      if (largest) {
        const img = makeImage(largest, 'picture', 'picture source', el);
        if (img) images.push(img);
      }
    }
    const src = source.getAttribute('src');
    if (src) {
      const img = makeImage(resolveUrl(src, base), 'picture', 'picture source src', el);
      if (img) images.push(img);
    }
  }
  const imgEl = el.querySelector('img');
  if (imgEl) images.push(...extractFromImg(imgEl, base));
  return images;
}

function extractFromVideo(el: Element, base: string): ExtractedImage[] {
  if (!(el instanceof HTMLVideoElement)) return [];
  const images: ExtractedImage[] = [];
  const poster = el.poster || el.getAttribute('poster');
  if (poster) {
    const img = makeImage(resolveUrl(poster, base), 'video', 'video poster', el);
    if (img) images.push(img);
  }
  if (el.currentSrc) {
    const img = makeImage(resolveUrl(el.currentSrc, base), 'video', 'video src', el);
    if (img) images.push(img);
  }
  return images;
}

function extractFromSvg(el: Element, base: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  if (el instanceof SVGImageElement) {
    const href =
      el.getAttribute('href') ??
      el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (href) {
      const img = makeImage(resolveUrl(href, base), 'svg', 'svg image', el);
      if (img) images.push(img);
    }
  }
  if (el.tagName.toLowerCase() === 'svg' || el instanceof SVGElement) {
    for (const imageEl of Array.from(el.querySelectorAll('image'))) {
      images.push(...extractFromSvg(imageEl, base));
    }
  }
  return images;
}

function extractFromObject(el: Element, base: string): ExtractedImage[] {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'object' && tag !== 'embed') return [];
  const data = el.getAttribute('data');
  if (!data) return [];
  const img = makeImage(resolveUrl(data, base), 'object', `${tag} data`, el);
  return img ? [img] : [];
}

function extractFromComputedStyle(
  el: Element,
  base: string,
  pseudo?: '::before' | '::after',
): ExtractedImage[] {
  const style = getComputedStyle(el, pseudo);
  const images: ExtractedImage[] = [];
  const bgKind: ImageKind = pseudo ? 'pseudo-background' : 'background';
  const maskKind: ImageKind = pseudo ? 'pseudo-mask' : 'mask';

  for (const raw of parseUrlsFromCssValue(style.backgroundImage)) {
    const resolved = resolveUrl(raw, base);
    const kind = resolved.startsWith('blob:')
      ? 'blob'
      : resolved.startsWith('data:')
        ? 'data-uri'
        : bgKind;
    const img = makeImage(
      resolved,
      kind,
      pseudo ? `${pseudo} background` : 'background-image',
      el,
      pseudo,
    );
    if (img) images.push(img);
  }

  for (const prop of ['maskImage', 'webkitMaskImage'] as const) {
    const value = (style as CSSStyleDeclaration & { webkitMaskImage?: string })[
      prop === 'webkitMaskImage' ? 'webkitMaskImage' : 'maskImage'
    ];
    if (!value) continue;
    for (const raw of parseUrlsFromCssValue(value)) {
      const img = makeImage(
        resolveUrl(raw, base),
        maskKind,
        pseudo ? `${pseudo} mask` : 'mask-image',
        el,
        pseudo,
      );
      if (img) images.push(img);
    }
  }

  const content = style.content;
  if (content && content !== 'none' && content !== 'normal') {
    for (const raw of parseUrlsFromCssValue(content)) {
      const img = makeImage(
        resolveUrl(raw, base),
        pseudo ? 'pseudo-background' : 'background',
        pseudo ? `${pseudo} content` : 'content url',
        el,
        pseudo,
      );
      if (img) images.push(img);
    }
  }

  return images;
}

function extractFromDataAttrs(el: Element, base: string): ExtractedImage[] {
  return readDataAttributeUrls(el, base).map((url) => {
    const kind: ImageKind = url.startsWith('blob:')
      ? 'blob'
      : url.startsWith('data:')
        ? 'data-uri'
        : 'data-attr';
    return makeImage(url, kind, 'data attribute', el)!;
  });
}

function extractFromCssVars(el: Element, base: string): ExtractedImage[] {
  return readCssVariableUrls(el, base).map(
    (url) => makeImage(url, 'css-var', 'CSS variable', el)!,
  );
}

function walkOpenShadowRoots(el: Element, base: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  if (el.shadowRoot) {
    for (const child of Array.from(el.shadowRoot.querySelectorAll('*'))) {
      images.push(...extractImagesFromElement(child, base));
    }
  }
  for (const child of Array.from(el.children)) {
    images.push(...walkOpenShadowRoots(child, base));
  }
  return images;
}

function extractFromSameOriginIframes(base: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  for (const iframe of Array.from(document.querySelectorAll('iframe'))) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) continue;
      for (const el of doc.querySelectorAll('*')) {
        images.push(...extractImagesFromElement(el, base));
      }
    } catch {
      // cross-origin
    }
  }
  return images;
}

export function extractImagesFromElement(
  el: Element,
  base: string = document.baseURI,
): ExtractedImage[] {
  const tag = el.tagName.toLowerCase();
  let images: ExtractedImage[] = [];

  if (tag === 'img') images.push(...extractFromImg(el, base));
  if (tag === 'picture') images.push(...extractFromPicture(el, base));
  if (tag === 'video') images.push(...extractFromVideo(el, base));
  if (tag === 'svg' || tag === 'image') images.push(...extractFromSvg(el, base));
  if (tag === 'object' || tag === 'embed') images.push(...extractFromObject(el, base));

  images.push(...extractFromComputedStyle(el, base));
  images.push(...extractFromComputedStyle(el, base, '::before'));
  images.push(...extractFromComputedStyle(el, base, '::after'));
  images.push(...extractFromDataAttrs(el, base));
  images.push(...extractFromCssVars(el, base));
  images.push(...walkOpenShadowRoots(el, base));

  return dedupeImages(images.filter(Boolean));
}

export function extractImagesAtPoint(
  x: number,
  y: number,
  getStack: (x: number, y: number) => Element[],
): { layers: { element: Element; tagName: string; images: ExtractedImage[] }[]; allImages: ExtractedImage[] } {
  const stack = getStack(x, y);
  const layers = stack.map((element) => ({
    element,
    tagName: element.tagName.toLowerCase(),
    images: extractImagesFromElement(element),
  }));

  const allImages = dedupeImages(layers.flatMap((l) => l.images));
  return { layers, allImages };
}

export function extractAllDocumentImages(base: string = document.baseURI): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  for (const el of Array.from(document.querySelectorAll('*'))) {
    images.push(...extractImagesFromElement(el, base));
  }
  images.push(...extractFromSameOriginIframes(base));
  return dedupeImages(images);
}

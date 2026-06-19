import { OVERLAY_ROOT_ID } from './types';

const MAX_SHADOW_DEPTH = 20;

export function deepElementFromPoint(x: number, y: number): Element | null {
  let el = document.elementFromPoint(x, y);
  for (let depth = 0; el?.shadowRoot && depth < MAX_SHADOW_DEPTH; depth++) {
    const inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
}

function peelElementsAtPoint(x: number, y: number): Element[] {
  const elements: Element[] = [];
  const savedVisibility: string[] = [];

  while (true) {
    const element = document.elementFromPoint(x, y);
    if (
      !element ||
      element === document.documentElement ||
      element === document.body
    ) {
      break;
    }
    elements.push(element);
    savedVisibility.push((element as HTMLElement).style.visibility);
    (element as HTMLElement).style.visibility = 'hidden';
  }

  for (let i = 0; i < elements.length; i++) {
    (elements[i] as HTMLElement).style.visibility = savedVisibility[i] ?? '';
  }

  return elements;
}

function isOverlayNode(el: Element): boolean {
  if (el.id === OVERLAY_ROOT_ID) return true;
  return Boolean(el.closest(`#${OVERLAY_ROOT_ID}`));
}

function shouldSkipElement(el: Element): boolean {
  if (isOverlayNode(el)) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === 'html') return true;
  if (tag === 'body' && !elementMayHaveImages(el)) return true;
  return false;
}

function elementMayHaveImages(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (['img', 'picture', 'video', 'svg', 'object', 'embed'].includes(tag)) {
    return true;
  }
  const style = getComputedStyle(el);
  if (style.backgroundImage && style.backgroundImage !== 'none') return true;
  for (const attr of ['data-src', 'data-background-image', 'data-bg']) {
    if (el.hasAttribute(attr)) return true;
  }
  return false;
}

export function getElementsAtPoint(
  x: number,
  y: number,
  options?: { excludeOverlay?: boolean },
): Element[] {
  const excludeOverlay = options?.excludeOverlay ?? true;
  let stack: Element[] = [];

  if (typeof document.elementsFromPoint === 'function') {
    stack = document.elementsFromPoint(x, y);
  } else {
    stack = peelElementsAtPoint(x, y);
  }

  const seen = new Set<Element>();
  const result: Element[] = [];

  const addElement = (el: Element) => {
    if (excludeOverlay && shouldSkipElement(el)) return;
    if (seen.has(el)) return;
    seen.add(el);
    result.push(el);
  };

  for (const el of stack) {
    addElement(el);

    const parent = el.parentElement;
    if (parent) {
      for (const sibling of Array.from(parent.children)) {
        const rect = sibling.getBoundingClientRect();
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          addElement(sibling);
        }
      }
    }

    let host: Element | null = el;
    for (let depth = 0; host?.shadowRoot && depth < MAX_SHADOW_DEPTH; depth++) {
      const inner = host.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === host || seen.has(inner)) break;
      if (excludeOverlay && shouldSkipElement(inner)) break;
      addElement(inner);
      host = inner;
    }
  }

  const deep = deepElementFromPoint(x, y);
  if (deep && !seen.has(deep) && !(excludeOverlay && shouldSkipElement(deep))) {
    result.unshift(deep);
  }

  return result;
}

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ResultsPanel } from '../../src/ui/results-panel';
import type { ExtractionResult, ExtractedImage } from '../../src/lib/types';

function result(urls: string[], x = 10, y = 20): ExtractionResult {
  const allImages: ExtractedImage[] = urls.map((url) => ({
    url,
    kind: 'img',
    label: 'img src',
  }));
  return { x, y, layers: [], allImages };
}

describe('ResultsPanel', () => {
  let panel: ResultsPanel;
  const messages: unknown[] = [];

  beforeEach(() => {
    panel = new ResultsPanel();
    messages.length = 0;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    panel.hide();
  });

  it('accumulates images across reveals without closing', () => {
    panel.add(result(['https://example.com/a.jpg']), (msg) => messages.push(msg));
    panel.add(result(['https://example.com/b.jpg']), (msg) => messages.push(msg));

    const rows = document.querySelectorAll('#background-reveal-panel .image-row');
    expect(rows).toHaveLength(2);
  });

  it('dedupes the same url on repeated reveals', () => {
    panel.add(result(['https://example.com/a.jpg']), () => {});
    panel.add(result(['https://example.com/a.jpg']), () => {});

    const rows = document.querySelectorAll('#background-reveal-panel .image-row');
    expect(rows).toHaveLength(1);
  });

  it('fires open all with every accumulated url', () => {
    panel.add(result(['https://example.com/a.jpg']), (msg) => messages.push(msg));
    panel.add(result(['https://example.com/b.jpg']), (msg) => messages.push(msg));

    document
      .querySelector('#background-reveal-panel [data-action="open-all"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(messages).toContainEqual({
      type: 'OPEN_ALL_URLS',
      urls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    });
  });

  it('clears accumulated images on close', () => {
    panel.add(result(['https://example.com/a.jpg']), () => {});
    panel.hide();
    panel.add(result(['https://example.com/b.jpg']), () => {});

    const rows = document.querySelectorAll('#background-reveal-panel .image-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.getAttribute('data-image-url')).toBe('https://example.com/b.jpg');
  });
});

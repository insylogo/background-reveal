import { describe, expect, it } from 'vitest';
import {
  parseUrlsFromCssValue,
  resolveUrl,
  parseSrcset,
  pickLargestSrcsetUrl,
  dedupeImages,
  filenameFromUrl,
} from '../../src/lib/url-utils';

describe('parseUrlsFromCssValue', () => {
  it('parses single url()', () => {
    expect(parseUrlsFromCssValue('url("https://example.com/a.jpg")')).toEqual([
      'https://example.com/a.jpg',
    ]);
  });

  it('parses unquoted url()', () => {
    expect(parseUrlsFromCssValue('url(/images/bg.png)')).toEqual(['/images/bg.png']);
  });

  it('parses image-set()', () => {
    const value =
      'image-set(url("a.webp") type("image/webp"), url("a.jpg") type("image/jpeg"))';
    expect(parseUrlsFromCssValue(value)).toEqual(['a.webp', 'a.jpg']);
  });

  it('returns empty for none', () => {
    expect(parseUrlsFromCssValue('none')).toEqual([]);
  });
});

describe('resolveUrl', () => {
  it('resolves relative paths', () => {
    expect(resolveUrl('/img.png', 'https://example.com/page')).toBe(
      'https://example.com/img.png',
    );
  });

  it('passes through data urls', () => {
    const data = 'data:image/png;base64,abc';
    expect(resolveUrl(data, 'https://example.com')).toBe(data);
  });

  it('resolves protocol-relative urls', () => {
    expect(resolveUrl('//cdn.example.com/x.jpg', 'https://example.com')).toBe(
      'https://cdn.example.com/x.jpg',
    );
  });
});

describe('srcset', () => {
  it('parses srcset entries', () => {
    expect(parseSrcset('a.jpg 1x, b.jpg 2x')).toEqual(['a.jpg', 'b.jpg']);
  });

  it('picks largest width', () => {
    const url = pickLargestSrcsetUrl(
      'small.jpg 320w, large.jpg 1280w, med.jpg 640w',
      'https://example.com',
    );
    expect(url).toBe('https://example.com/large.jpg');
  });
});

describe('dedupeImages', () => {
  it('removes duplicate urls', () => {
    const result = dedupeImages([
      { url: 'https://a.com/1.jpg' },
      { url: 'https://a.com/1.jpg' },
      { url: 'https://a.com/2.jpg' },
    ]);
    expect(result).toHaveLength(2);
  });
});

describe('filenameFromUrl', () => {
  it('extracts filename from path', () => {
    expect(filenameFromUrl('https://example.com/path/photo.jpg')).toBe('photo.jpg');
  });

  it('falls back for bare paths', () => {
    expect(filenameFromUrl('https://example.com/noext')).toBe('image.jpg');
  });
});

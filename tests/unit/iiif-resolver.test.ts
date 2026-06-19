import { describe, expect, it } from 'vitest';
import {
  buildIiifFullUrl,
  buildIiifThumbnailUrl,
  imagesFromIiifInfo,
  parseIiifImageBase,
  detectIiifUrlsInText,
} from '../../src/lib/iiif-resolver';

describe('IIIF URL builder', () => {
  it('builds full resolution url', () => {
    expect(buildIiifFullUrl('https://iiif.example.org/image1')).toBe(
      'https://iiif.example.org/image1/full/max/0/default.jpg',
    );
  });

  it('strips info.json suffix', () => {
    expect(buildIiifFullUrl('https://iiif.example.org/image1/info.json')).toBe(
      'https://iiif.example.org/image1/full/max/0/default.jpg',
    );
  });

  it('builds thumbnail url', () => {
    expect(buildIiifThumbnailUrl('https://iiif.example.org/image1', 512)).toBe(
      'https://iiif.example.org/image1/full/512,/0/default.jpg',
    );
  });
});

describe('parseIiifImageBase', () => {
  it('parses NARA IIIF v3 tile URLs', () => {
    const tile =
      'https://catalog.archives.gov/iiif/3/opastorage%2Flive%2F84%2F2102%2F42210284%2Fcontent%2Fseattle%2Frg-079%2F2252773%2FBox14%2F2252773-014-001%2F2252773-014-001-0354.jpg/0,0,6627,4158/415,260/0/default.jpg';
    const base = parseIiifImageBase(tile);
    expect(base).toBe(
      'https://catalog.archives.gov/iiif/3/opastorage%2Flive%2F84%2F2102%2F42210284%2Fcontent%2Fseattle%2Frg-079%2F2252773%2FBox14%2F2252773-014-001%2F2252773-014-001-0354.jpg',
    );
    expect(buildIiifFullUrl(base!)).toContain('/full/max/0/default.jpg');
  });

  it('finds IIIF bases in page text', () => {
    const html =
      '<img src="https://catalog.archives.gov/iiif/3/foo%2Fbar.jpg/0,0,100,100/50,50/0/default.jpg">';
    const bases = detectIiifUrlsInText(html);
    expect(bases).toContain('https://catalog.archives.gov/iiif/3/foo%2Fbar.jpg');
  });
});

describe('imagesFromIiifInfo', () => {
  it('creates full and thumbnail entries', () => {
    const images = imagesFromIiifInfo(
      {
        '@id': 'https://iiif.example.org/img',
        width: 4000,
        height: 3000,
        thumbnail: 'https://iiif.example.org/img/full/128,/0/default.jpg',
        sizes: [{ width: 256 }, { width: 1024 }],
      },
      'https://iiif.example.org/img/info.json',
    );

    expect(images.some((i) => i.kind === 'iiif-full')).toBe(true);
    expect(images.some((i) => i.kind === 'iiif-thumb')).toBe(true);
    expect(images.filter((i) => i.kind === 'iiif-size')).toHaveLength(0);
  });
});

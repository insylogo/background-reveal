import { describe, expect, it } from 'vitest';
import {
  buildIiifFullUrl,
  buildIiifThumbnailUrl,
  imagesFromIiifInfo,
  parseIiifImageBase,
  detectIiifUrlsInText,
  getIiifVersion,
} from '../../src/lib/iiif-resolver';

describe('IIIF URL builder', () => {
  it('builds IIIF v3 full resolution url', () => {
    expect(buildIiifFullUrl('https://iiif.example.org/image1', 'jpg', 3)).toBe(
      'https://iiif.example.org/image1/full/max/0/default.jpg',
    );
  });

  it('builds IIIF v2 full resolution url with explicit dimensions', () => {
    expect(
      buildIiifFullUrl('https://iiif.example.org/image1', 'jpg', 2, {
        width: 7045,
        height: 5785,
      }),
    ).toBe('https://iiif.example.org/image1/full/7045,5785/0/default.jpg');
  });

  it('strips info.json suffix', () => {
    expect(buildIiifFullUrl('https://iiif.example.org/image1/info.json', 'jpg', 3)).toBe(
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
    expect(buildIiifFullUrl(base!, 'jpg', 3)).toContain('/full/max/0/default.jpg');
  });

  it('parses Nationalmuseum IIIF v2 manifest URLs', () => {
    const manifest =
      'http://nationalmuseumse.iiifhosting.com/iiif/6b67e82d21f66308380c15509e97bafa5e696618cff1137988ff80c1aa05e4ee/';
    const base = parseIiifImageBase(manifest);
    expect(base).toBe(
      'http://nationalmuseumse.iiifhosting.com/iiif/6b67e82d21f66308380c15509e97bafa5e696618cff1137988ff80c1aa05e4ee',
    );
    expect(buildIiifFullUrl(base!, 'jpg', 2)).toContain('/full/full/0/default.jpg');
  });

  it('never uses IIIF v3 max syntax for versionless v2 hosts', () => {
    const base =
      'http://nationalmuseumse.iiifhosting.com/iiif/6b67e82d21f66308380c15509e97bafa5e696618cff1137988ff80c1aa05e4ee';
    const url = buildIiifFullUrl(base, 'jpg', 2, { width: 7045, height: 5785 });
    expect(url).toContain('/full/7045,5785/0/default.jpg');
    expect(url).not.toContain('/full/max/');
  });

  it('finds Nationalmuseum IIIF link in embedded JSON', () => {
    const json =
      '"ObjIIIFLnkTxt":"http://nationalmuseumse.iiifhosting.com/iiif/6b67e82d21f66308380c15509e97bafa5e696618cff1137988ff80c1aa05e4ee/"';
    const bases = detectIiifUrlsInText(json);
    expect(bases).toContain(
      'http://nationalmuseumse.iiifhosting.com/iiif/6b67e82d21f66308380c15509e97bafa5e696618cff1137988ff80c1aa05e4ee',
    );
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

  it('uses IIIF v2 full size syntax from info.json context', () => {
    const info = {
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id':
        'http://nationalmuseumse.iiifhosting.com/iiif/6b67e82d21f66308380c15509e97bafa5e696618cff1137988ff80c1aa05e4ee',
      width: 7045,
      height: 5785,
      profile: ['http://iiif.io/api/image/2/level1.json'],
    };
    expect(getIiifVersion(info)).toBe(2);

    const images = imagesFromIiifInfo(
      info,
      'http://nationalmuseumse.iiifhosting.com/iiif/6b67e82d21f66308380c15509e97bafa5e696618cff1137988ff80c1aa05e4ee/info.json',
    );

    const full = images.find((i) => i.kind === 'iiif-full');
    expect(full?.url).toContain('/full/7045,5785/0/default.jpg');
    expect(full?.url).not.toContain('/full/max/');
    expect(full?.width).toBe(7045);
  });
});

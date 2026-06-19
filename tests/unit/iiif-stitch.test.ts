import { describe, expect, it } from 'vitest';
import {
  buildIiifTileUrl,
  computeIiifTileGrid,
  resolveIiifTileConfig,
} from '../../src/lib/iiif-stitch';

describe('IIIF tile stitching', () => {
  const base =
    'https://nationalmuseumse.iiifhosting.com/iiif/6b67e82d21f66308380c15509e97bafa5e696618cff1137988ff80c1aa05e4ee';

  it('derives full-resolution tile grid from info.json tiles', () => {
    const config = resolveIiifTileConfig({
      width: 7045,
      height: 5785,
      tiles: [{ width: 256, height: 256, scaleFactors: [1, 2, 4, 8, 16, 32] }],
    });

    expect(config).toEqual({ tileWidth: 256, tileHeight: 256, scaleFactor: 1 });

    const tiles = computeIiifTileGrid(7045, 5785, config);
    expect(tiles).toHaveLength(28 * 23);
    expect(tiles[0]).toEqual({ x: 0, y: 0, w: 256, h: 256 });
    expect(tiles[tiles.length - 1]).toEqual({ x: 6912, y: 5632, w: 133, h: 153 });
  });

  it('builds IIIF v2 tile urls with comma-separated sizes', () => {
    const url = buildIiifTileUrl(
      base,
      { x: 6912, y: 5529, w: 133, h: 256 },
      'jpg',
      2,
    );

    expect(url).toBe(
      `${base}/6912,5529,133,256/133,256/0/default.jpg`,
    );
  });

  it('builds IIIF v3 tile urls with comma-separated sizes', () => {
    const naraBase = 'https://catalog.archives.gov/iiif/3/foo%2Fbar.jpg';
    const url = buildIiifTileUrl(
      naraBase,
      { x: 0, y: 0, w: 256, h: 256 },
      'jpg',
      3,
    );

    expect(url).toBe(`${naraBase}/0,0,256,256/256,256/0/default.jpg`);
  });
});

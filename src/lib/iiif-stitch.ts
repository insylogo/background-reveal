import {
  buildIiifInfoUrl,
  fetchIiifInfo,
  getIiifVersion,
  parseIiifImageBase,
  type IiifInfo,
} from './iiif-resolver';
import { fetchImageInPageContext } from './page-image-fetch';

export interface IiifTileRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IiifTileConfig {
  tileWidth: number;
  tileHeight: number;
  scaleFactor: number;
}

export interface StitchProgress {
  completed: number;
  total: number;
}

const DEFAULT_TILE = 256;
const MAX_CANVAS_DIMENSION = 16384;
const MAX_PIXELS = 120_000_000;
const TILE_CONCURRENCY = 6;

function normalizeBase(base: string): string {
  return parseIiifImageBase(base) ?? base.replace(/\/info\.json$/i, '').replace(/\/$/, '');
}

function imageFormat(info: IiifInfo): string {
  if (typeof info.profile === 'string' && info.profile.includes('png')) {
    return 'png';
  }
  return 'jpg';
}

export function resolveIiifTileConfig(info: IiifInfo): IiifTileConfig {
  const tile = info.tiles?.[0];
  if (!tile) {
    return { tileWidth: DEFAULT_TILE, tileHeight: DEFAULT_TILE, scaleFactor: 1 };
  }

  const scaleFactors = tile.scaleFactors?.length ? tile.scaleFactors : [1];
  return {
    tileWidth: tile.width ?? DEFAULT_TILE,
    tileHeight: tile.height ?? DEFAULT_TILE,
    scaleFactor: Math.min(...scaleFactors),
  };
}

export function computeIiifTileGrid(
  width: number,
  height: number,
  config: IiifTileConfig,
): IiifTileRegion[] {
  const stepX = config.tileWidth * config.scaleFactor;
  const stepY = config.tileHeight * config.scaleFactor;
  const tiles: IiifTileRegion[] = [];

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      tiles.push({
        x,
        y,
        w: Math.min(stepX, width - x),
        h: Math.min(stepY, height - y),
      });
    }
  }

  return tiles;
}

export function buildIiifTileUrl(
  base: string,
  region: IiifTileRegion,
  format: string,
  version: 2 | 3,
): string {
  const normalized = normalizeBase(base);
  const regionStr = `${region.x},${region.y},${region.w},${region.h}`;
  const sizeStr = `${region.w},${region.h}`;
  const quality = version === 3 ? 'default' : 'default';
  return `${normalized}/${regionStr}/${sizeStr}/0/${quality}.${format}`;
}

function assertStitchableSize(width: number, height: number): void {
  if (width <= 0 || height <= 0) {
    throw new Error('IIIF manifest is missing image dimensions');
  }
  if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
    throw new Error(
      `Image too large to stitch (${width}×${height}). Browser limit is ${MAX_CANVAS_DIMENSION}px per side.`,
    );
  }
  if (width * height > MAX_PIXELS) {
    throw new Error(
      `Image too large to stitch (${width}×${height}). Try downloading individual tiles instead.`,
    );
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, runWorker);
  await Promise.all(workers);
}

async function loadTileBitmap(url: string): Promise<ImageBitmap> {
  const blob = await fetchImageInPageContext(url);
  return createImageBitmap(blob);
}

export async function stitchIiifImage(
  base: string,
  onProgress?: (progress: StitchProgress) => void,
  info?: IiifInfo,
): Promise<Blob> {
  const normalizedBase = normalizeBase(base);
  const manifest = info ?? (await fetchIiifInfo(normalizedBase));
  const width = manifest.width ?? 0;
  const height = manifest.height ?? 0;
  assertStitchableSize(width, height);

  const version = getIiifVersion(manifest, normalizedBase);
  const format = imageFormat(manifest);
  const tileConfig = resolveIiifTileConfig(manifest);
  const tiles = computeIiifTileGrid(width, height, tileConfig);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not available');
  }

  let completed = 0;
  onProgress?.({ completed, total: tiles.length });

  await mapWithConcurrency(tiles, TILE_CONCURRENCY, async (region) => {
    const tileUrl = buildIiifTileUrl(normalizedBase, region, format, version);
    const bitmap = await loadTileBitmap(tileUrl);
    try {
      ctx.drawImage(bitmap, region.x, region.y);
    } finally {
      bitmap.close();
    }
    completed += 1;
    onProgress?.({ completed, total: tiles.length });
  });

  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Failed to encode stitched image'));
      },
      mime,
      format === 'jpg' ? 0.95 : undefined,
    );
  });

  return blob;
}

export function iiifStitchFilename(base: string, info: IiifInfo): string {
  const width = info.width ?? 'unknown';
  const height = info.height ?? 'unknown';
  const slug = normalizeBase(base).split('/').pop() ?? 'iiif';
  const shortSlug = slug.length > 32 ? slug.slice(0, 32) : slug;
  return `iiif-${shortSlug}-${width}x${height}.jpg`;
}

export async function downloadStitchedIiifImage(
  base: string,
  onProgress?: (progress: StitchProgress) => void,
): Promise<string> {
  const normalizedBase = normalizeBase(base);
  const info = await fetchIiifInfo(normalizedBase);
  const blob = await stitchIiifImage(normalizedBase, onProgress, info);
  const filename = iiifStitchFilename(normalizedBase, info);
  const blobUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

  return filename;
}

export { buildIiifInfoUrl };

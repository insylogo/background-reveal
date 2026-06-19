import { extractImagesAtPoint } from './image-extractor';
import { getElementsAtPoint } from './stack-picker';
import { resolveIiifImagesForStack } from './iiif-resolver';
import { dedupeImages } from './url-utils';
import type { ExtractionResult } from './types';

export async function revealAtPoint(x: number, y: number): Promise<ExtractionResult> {
  const stack = getElementsAtPoint(x, y);
  const { layers, allImages } = extractImagesAtPoint(x, y, () => stack);

  let iiifImages: typeof allImages = [];
  try {
    iiifImages = await resolveIiifImagesForStack(stack);
  } catch {
    // IIIF optional
  }

  const merged = dedupeImages([...allImages, ...iiifImages]);

  return {
    x,
    y,
    layers,
    allImages: merged,
  };
}

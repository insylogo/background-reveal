export type ImageKind =
  | 'img'
  | 'picture'
  | 'video'
  | 'svg'
  | 'object'
  | 'background'
  | 'pseudo-background'
  | 'pseudo-mask'
  | 'mask'
  | 'data-attr'
  | 'css-var'
  | 'iiif-full'
  | 'iiif-thumb'
  | 'iiif-size'
  | 'blob'
  | 'data-uri';

export interface ExtractedImage {
  url: string;
  kind: ImageKind;
  label: string;
  elementTag?: string;
  pseudo?: '::before' | '::after';
  width?: number;
  height?: number;
  iiifBase?: string;
}

export interface StackLayer {
  element: Element;
  tagName: string;
  images: ExtractedImage[];
}

export interface ExtractionResult {
  x: number;
  y: number;
  layers: StackLayer[];
  allImages: ExtractedImage[];
}

export type MessageType =
  | { type: 'START_PICKER' }
  | { type: 'STOP_PICKER' }
  | { type: 'PICKER_ACTIVE'; active: boolean }
  | { type: 'REVEAL_AT_POINT'; x: number; y: number }
  | { type: 'OPEN_URL'; url: string }
  | { type: 'OPEN_ALL_URLS'; urls: string[] }
  | { type: 'DOWNLOAD_URL'; url: string; filename?: string }
  | { type: 'DOWNLOAD_ALL_URLS'; urls: string[] }
  | { type: 'STITCH_IIIF'; base: string; rowUrl: string }
  | { type: 'COPY_URL'; url: string };

export const OVERLAY_ROOT_ID = 'background-reveal-root';
export const CONTEXT_MENU_ID = 'background-reveal-here';

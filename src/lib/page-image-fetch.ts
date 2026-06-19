import { filenameFromUrl } from './url-utils';

export function refererForPageRequest(
  url: string,
  pageHref: string = location.href,
): string | undefined {
  try {
    const pageUrl = new URL(pageHref);
    const target = new URL(url, pageUrl.href);
    if (target.origin === pageUrl.origin) {
      return pageUrl.href;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function fetchInit(url: string): RequestInit {
  const referer = refererForPageRequest(url);
  return {
    credentials: 'include',
    referrer: referer ?? '',
    referrerPolicy: referer ? 'strict-origin-when-cross-origin' : 'no-referrer',
    headers: referer ? { Referer: referer } : undefined,
  };
}

async function readErrorBody(response: Response): Promise<string> {
  const text = (await response.text()).trim();
  if (text) return text.slice(0, 300);
  return `HTTP ${response.status}`;
}

function isImageContentType(contentType: string | null): boolean {
  return Boolean(contentType?.startsWith('image/'));
}

export async function fetchImageInPageContext(url: string): Promise<Blob> {
  const response = await fetch(url, fetchInit(url));
  if (!response.ok) {
    throw new Error(await readErrorBody(response));
  }

  const contentType = response.headers.get('content-type');
  if (isImageContentType(contentType)) {
    return response.blob();
  }

  const blob = await response.blob();
  if (blob.type.startsWith('image/')) {
    return blob;
  }

  const text = await blob.text();
  throw new Error(text.trim().slice(0, 300) || 'Response is not an image');
}

async function canOpenDirectly(url: string): Promise<boolean> {
  if (refererForPageRequest(url)) return false;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && isImageContentType(response.headers.get('content-type'));
  } catch {
    return false;
  }
}

function openInNewTab(url: string): void {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    throw new Error('Pop-up blocked — allow pop-ups for this site');
  }
}

export async function openUrlInPageContext(url: string): Promise<void> {
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    openInNewTab(url);
    return;
  }

  if (await canOpenDirectly(url)) {
    openInNewTab(url);
    return;
  }

  const blob = await fetchImageInPageContext(url);
  const blobUrl = URL.createObjectURL(blob);
  try {
    openInNewTab(blobUrl);
  } catch (error) {
    URL.revokeObjectURL(blobUrl);
    throw error;
  }
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
}

function triggerAnchorDownload(href: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function downloadUrlInPageContext(
  url: string,
  filename?: string,
): Promise<void> {
  const name = filename ?? filenameFromUrl(url);

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    triggerAnchorDownload(url, name);
    return;
  }

  const blob = await fetchImageInPageContext(url);
  const blobUrl = URL.createObjectURL(blob);
  try {
    triggerAnchorDownload(blobUrl, name);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}

export async function openUrlsInPageContext(
  urls: string[],
  onError?: (url: string, message: string) => void,
): Promise<void> {
  for (const url of urls) {
    try {
      await openUrlInPageContext(url);
      await new Promise((resolve) => window.setTimeout(resolve, 200));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Open failed';
      onError?.(url, message);
    }
  }
}

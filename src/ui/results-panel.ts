import type { ExtractionResult, ExtractedImage } from '../lib/types';
import { dedupeImages, filenameFromUrl } from '../lib/url-utils';
import type { MessageType } from '../lib/types';

const PANEL_ID = 'background-reveal-panel';

const STYLES = `
#${PANEL_ID} {
  position: fixed;
  top: 12px;
  right: 12px;
  width: min(420px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow: auto;
  background: #1a1a2e;
  color: #f1f5f9;
  border: 1px solid #475569;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
  z-index: 2147483647;
  pointer-events: auto;
  isolation: isolate;
}
#${PANEL_ID} * { box-sizing: border-box; }
#${PANEL_ID} h2,
#${PANEL_ID} p,
#${PANEL_ID} span,
#${PANEL_ID} div {
  color: inherit;
}
#${PANEL_ID} .header {
  position: sticky;
  top: 0;
  padding: 10px 36px 10px 12px;
  border-bottom: 1px solid #475569;
  background: #0f172a;
  z-index: 1;
  color: #f8fafc;
}
#${PANEL_ID} .header h2 {
  margin: 0;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: #f8fafc;
  background: transparent;
  border: none;
  text-transform: none;
  letter-spacing: normal;
}
#${PANEL_ID} .close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  font: 20px/1 system-ui, sans-serif;
  width: 28px;
  height: 28px;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  z-index: 2;
}
#${PANEL_ID} .close:hover { color: #fff; background: rgba(255,255,255,0.12); }
#${PANEL_ID} .meta { padding: 8px 12px 4px; color: #94a3b8; font-size: 12px; }
#${PANEL_ID} .bulk-actions {
  display: flex;
  gap: 6px;
  padding: 0 12px 8px;
  border-bottom: 1px solid #2a2a3e;
}
#${PANEL_ID} .bulk-actions button {
  font-size: 11px;
  padding: 4px 10px;
  border: 1px solid #475569;
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
}
#${PANEL_ID} .bulk-actions button:hover { background: #334155; }
#${PANEL_ID} .bulk-actions[hidden] { display: none; }
#${PANEL_ID} .empty { padding: 16px 12px; color: #cbd5e1; }
#${PANEL_ID} .image-row {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #2a2a3e;
}
#${PANEL_ID} .thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  background: #111;
  border-radius: 4px;
}
#${PANEL_ID} .thumb-placeholder {
  width: 48px;
  height: 48px;
  background: #111;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #666;
}
#${PANEL_ID} .badge {
  display: inline-block;
  font-size: 10px;
  background: #2d3a5c;
  color: #9db4ff;
  padding: 1px 6px;
  border-radius: 3px;
  margin-bottom: 4px;
}
#${PANEL_ID} .url {
  font-size: 11px;
  color: #bbb;
  word-break: break-all;
  margin-bottom: 6px;
}
#${PANEL_ID} .actions { display: flex; gap: 4px; flex-wrap: wrap; }
#${PANEL_ID} .actions button {
  font-size: 11px;
  padding: 4px 10px;
  border: 1px solid #444;
  background: #252540;
  color: #ddd;
  border-radius: 4px;
  cursor: pointer;
}
#${PANEL_ID} .actions button:hover { background: #333355; border-color: #666; }
`;

function truncate(url: string, max = 80): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 3)}...`;
}

function kindBadge(kind: string): string {
  return kind.replace(/-/g, ' ');
}

export class ResultsPanel {
  private panel: HTMLElement | null = null;
  private styleEl: HTMLStyleElement | null = null;
  private onAction: ((msg: MessageType) => void) | null = null;
  private images: ExtractedImage[] = [];
  private revealCount = 0;

  add(result: ExtractionResult, onAction: (msg: MessageType) => void): void {
    this.onAction = onAction;
    this.revealCount += 1;

    const known = new Set(this.images.map((img) => img.url));
    const merged = dedupeImages([...this.images, ...result.allImages]);
    const newImages = merged.filter((img) => !known.has(img.url));
    this.images = merged;

    if (!this.panel) {
      this.mountPanel();
    }

    this.updateMeta(result);
    this.updateBulkActions();
    this.appendImages(newImages);
  }

  hide(): void {
    this.panel?.removeEventListener('click', this.handleClick);
    this.panel?.remove();
    this.panel = null;
    this.styleEl?.remove();
    this.styleEl = null;
    this.onAction = null;
    this.images = [];
    this.revealCount = 0;
  }

  private mountPanel(): void {
    if (!this.styleEl) {
      this.styleEl = document.createElement('style');
      this.styleEl.textContent = STYLES;
      document.head.appendChild(this.styleEl);
    }

    this.panel = document.createElement('div');
    this.panel.id = PANEL_ID;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Revealed images');
    this.panel.innerHTML = `
      <button class="close" type="button" aria-label="Close">×</button>
      <div class="header">
        <h2>Revealed images</h2>
      </div>
      <div class="meta"></div>
      <div class="bulk-actions" hidden>
        <button type="button" data-action="open-all">Open all</button>
        <button type="button" data-action="download-all">Download all</button>
      </div>
      <div class="content"></div>
    `;

    this.panel.addEventListener('click', this.handleClick);
    this.panel.addEventListener('mousedown', (e) => e.stopPropagation());
    document.body.appendChild(this.panel);
  }

  private updateMeta(latest: ExtractionResult): void {
    const meta = this.panel?.querySelector('.meta');
    if (!meta) return;

    if (this.images.length === 0) {
      meta.textContent = `No images at (${Math.round(latest.x)}, ${Math.round(latest.y)}) · ${this.revealCount} reveal(s)`;
      return;
    }

    meta.textContent = `${this.images.length} image(s) · ${this.revealCount} reveal(s) · last at (${Math.round(latest.x)}, ${Math.round(latest.y)})`;
  }

  private updateBulkActions(): void {
    const bulk = this.panel?.querySelector('.bulk-actions') as HTMLElement | null;
    if (!bulk) return;
    bulk.hidden = this.images.length === 0;
  }

  private appendImages(newImages: ExtractedImage[]): void {
    const content = this.panel?.querySelector('.content');
    if (!content) return;

    if (this.images.length === 0 && newImages.length === 0) {
      if (!content.querySelector('.empty')) {
        content.innerHTML = `<div class="empty">No images found at this point.</div>`;
      }
      return;
    }

    content.querySelector('.empty')?.remove();

    for (const img of newImages) {
      content.appendChild(this.renderImageRow(img));
    }
  }

  private handleClick = (e: MouseEvent): void => {
    e.stopPropagation();
    const target = e.target as HTMLElement;

    if (target.closest('.close')) {
      this.hide();
      return;
    }

    const btn = target.closest('[data-action]') as HTMLElement | null;
    if (!btn || !this.onAction) return;

    const action = btn.getAttribute('data-action');

    if (action === 'open-all') {
      this.onAction({ type: 'OPEN_ALL_URLS', urls: this.images.map((img) => img.url) });
      return;
    }

    if (action === 'download-all') {
      this.onAction({
        type: 'DOWNLOAD_ALL_URLS',
        urls: this.images.map((img) => img.url),
      });
      return;
    }

    const row = btn.closest('[data-image-url]') as HTMLElement | null;
    const url = row?.getAttribute('data-image-url');
    if (!url) return;

    if (action === 'open') {
      this.onAction({ type: 'OPEN_URL', url });
    } else if (action === 'copy') {
      void navigator.clipboard.writeText(url).catch(() => {
        this.onAction?.({ type: 'COPY_URL', url });
      });
    } else if (action === 'download') {
      this.onAction({
        type: 'DOWNLOAD_URL',
        url,
        filename: filenameFromUrl(url),
      });
    }
  };

  private renderImageRow(img: ExtractedImage): HTMLElement {
    const row = document.createElement('div');
    row.className = 'image-row';
    row.setAttribute('data-image-url', img.url);

    const canPreview =
      img.url.startsWith('http') ||
      img.url.startsWith('data:') ||
      img.url.startsWith('blob:');

    const thumbHtml = canPreview
      ? `<img class="thumb" src="${escapeAttr(img.url)}" alt="" loading="lazy" />`
      : `<div class="thumb-placeholder">?</div>`;

    row.innerHTML = `
      ${thumbHtml}
      <div class="info">
        <span class="badge">${kindBadge(img.kind)}</span>
        <div class="url" title="${escapeAttr(img.url)}">${escapeHtml(truncate(img.url))}</div>
        <div class="actions">
          <button type="button" data-action="open">Open</button>
          <button type="button" data-action="copy">Copy</button>
          <button type="button" data-action="download">Download</button>
        </div>
      </div>
    `;

    return row;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

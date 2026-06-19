import { OVERLAY_ROOT_ID } from '../lib/types';
import { getElementsAtPoint } from '../lib/stack-picker';

export type PickerSelectHandler = (x: number, y: number) => void;

export class PickerOverlay {
  private root: HTMLDivElement | null = null;
  private highlight: HTMLDivElement | null = null;
  private label: HTMLDivElement | null = null;
  private active = false;
  private onSelect: PickerSelectHandler | null = null;

  start(onSelect: PickerSelectHandler): void {
    if (this.active) return;
    this.active = true;
    this.onSelect = onSelect;
    this.mount();
    document.addEventListener('mousemove', this.onMouseMove, true);
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    document.removeEventListener('mousemove', this.onMouseMove, true);
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    this.root?.remove();
    this.root = null;
    this.highlight = null;
    this.label = null;
    this.onSelect = null;
  }

  isActive(): boolean {
    return this.active;
  }

  private mount(): void {
    this.root = document.createElement('div');
    this.root.id = OVERLAY_ROOT_ID;
    this.root.setAttribute('data-background-reveal', 'picker');
    this.root.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483644;
      cursor: crosshair;
      pointer-events: none;
    `;

    this.highlight = document.createElement('div');
    this.highlight.style.cssText = `
      position: absolute;
      display: none;
      border: 2px solid #4a9eff;
      background: rgba(74, 158, 255, 0.12);
      pointer-events: none;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
      z-index: 2147483645;
    `;

    this.label = document.createElement('div');
    this.label.style.cssText = `
      position: absolute;
      display: none;
      background: rgba(74, 158, 255, 0.92);
      color: #fff;
      font: 11px/1.3 monospace;
      padding: 2px 6px;
      border-radius: 3px;
      pointer-events: none;
      white-space: nowrap;
      z-index: 2147483646;
    `;

    const hint = document.createElement('div');
    hint.textContent = 'Click to reveal images · Esc to cancel';
    hint.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: #fff;
      padding: 8px 14px;
      border-radius: 6px;
      font: 13px system-ui, sans-serif;
      pointer-events: none;
      z-index: 2147483646;
    `;

    this.root.appendChild(this.highlight);
    this.root.appendChild(this.label);
    this.root.appendChild(hint);
    document.documentElement.appendChild(this.root);
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.highlight || !this.label) return;

    const stack = getElementsAtPoint(e.clientX, e.clientY);
    const target = stack[0];
    if (!target) {
      this.highlight.style.display = 'none';
      this.label.style.display = 'none';
      return;
    }

    const rect = target.getBoundingClientRect();
    Object.assign(this.highlight.style, {
      display: 'block',
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });

    const tag = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : '';
    const cls =
      target.classList.length > 0
        ? `.${Array.from(target.classList).slice(0, 2).join('.')}`
        : '';

    Object.assign(this.label.style, {
      display: 'block',
      top: `${rect.top + window.scrollY - 22}px`,
      left: `${rect.left + window.scrollX}px`,
    });
    this.label.textContent = `${tag}${id}${cls} · ${stack.length} layer(s)`;
  };

  private onClick = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX;
    const y = e.clientY;
    this.stop();
    this.onSelect?.(x, y);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.stop();
    }
  };
}

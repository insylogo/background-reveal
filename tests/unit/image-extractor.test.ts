import { describe, expect, it, beforeEach } from 'vitest';
import { extractImagesFromElement } from '../../src/lib/image-extractor';

describe('extractImagesFromElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts img src and srcset', () => {
    document.body.innerHTML = `
      <img src="https://example.com/small.jpg"
           srcset="https://example.com/small.jpg 320w, https://example.com/large.jpg 1280w" />
    `;
    const img = document.querySelector('img')!;
    const images = extractImagesFromElement(img);
    expect(images.some((i) => i.url.includes('large.jpg'))).toBe(true);
  });

  it('extracts data-background-image', () => {
    document.body.innerHTML = `
      <div data-background-image="https://example.com/lazy-bg.jpg"></div>
    `;
    const div = document.querySelector('div')!;
    const images = extractImagesFromElement(div);
    expect(images.some((i) => i.url.includes('lazy-bg.jpg'))).toBe(true);
  });

  it('extracts inline background style', () => {
    document.body.innerHTML = `
      <div style="background-image: url('https://example.com/bg.png')"></div>
    `;
    const div = document.querySelector('div')!;
    const images = extractImagesFromElement(div);
    expect(images.some((i) => i.url.includes('bg.png'))).toBe(true);
  });

  it('extracts video poster', () => {
    document.body.innerHTML = `
      <video poster="https://example.com/poster.jpg"></video>
    `;
    const video = document.querySelector('video')!;
    const images = extractImagesFromElement(video);
    expect(images.some((i) => i.url.includes('poster.jpg'))).toBe(true);
  });

  it('walks open shadow dom', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<div data-src="https://example.com/shadow.jpg"></div>`;
    const images = extractImagesFromElement(host);
    expect(images.some((i) => i.url.includes('shadow.jpg'))).toBe(true);
  });
});

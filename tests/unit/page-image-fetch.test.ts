import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchImageInPageContext,
  openUrlInPageContext,
  refererForPageRequest,
} from '../../src/lib/page-image-fetch';

describe('refererForPageRequest', () => {
  const page = 'https://collection.nationalmuseum.se/sv/collection/item/19222/';

  it('returns the page url for same-origin image requests', () => {
    expect(
      refererForPageRequest(
        'https://collection.nationalmuseum.se/multimedia/6/multimedia-269356.large.jpg',
        page,
      ),
    ).toBe(page);
  });

  it('returns undefined for cross-origin image requests', () => {
    expect(
      refererForPageRequest(
        'http://nationalmuseumse.iiifhosting.com/iiif/abc/full/full/0/default.jpg',
        page,
      ),
    ).toBeUndefined();
  });
});

describe('fetchImageInPageContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces plain-text IIIF errors instead of opening them as images', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('invalid size: no comma found'),
      }),
    );

    await expect(
      fetchImageInPageContext('http://example.com/iiif/bad/full/max/0/default.jpg'),
    ).rejects.toThrow('invalid size: no comma found');
  });
});

describe('openUrlInPageContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens public image urls directly when HEAD succeeds', async () => {
    const openMock = vi.fn().mockReturnValue({});
    vi.stubGlobal('open', openMock);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'image/jpeg' },
      }),
    );

    await openUrlInPageContext('https://cdn.example.com/public.jpg');

    expect(openMock).toHaveBeenCalledWith(
      'https://cdn.example.com/public.jpg',
      '_blank',
      'noopener,noreferrer',
    );
  });
});

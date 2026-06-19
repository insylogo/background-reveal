import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  outDir: '.output',
  manifest: {
    name: 'Background Reveal',
    description:
      'Reveal images hidden in CSS backgrounds, overlays, lazy attributes, and tiled viewers.',
    version: '0.1.0',
    permissions: [
      'contextMenus',
      'activeTab',
      'scripting',
      'downloads',
      'clipboardWrite',
    ],
    host_permissions: ['<all_urls>'],
    browser_specific_settings: {
      gecko: {
        id: 'background-reveal@local.dev',
        strict_min_version: '109.0',
        data_collection_permissions: {
          required: ['none'],
        },
      } as Record<string, unknown>,
    },
    action: {
      default_title: 'Background Reveal',
      default_popup: 'popup.html',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      96: 'icons/icon-96.png',
      128: 'icons/icon-128.png',
    },
  },
});

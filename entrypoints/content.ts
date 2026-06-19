import browser from 'webextension-polyfill';
import type { MessageType } from '../src/lib/types';
import { revealAtPoint } from '../src/lib/reveal';
import { PickerOverlay } from '../src/ui/picker-overlay';
import { ResultsPanel } from '../src/ui/results-panel';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    const picker = new PickerOverlay();
    const panel = new ResultsPanel();
    let lastContextCoords = { x: 0, y: 0 };

    document.addEventListener(
      'contextmenu',
      (e) => {
        lastContextCoords = { x: e.clientX, y: e.clientY };
      },
      true,
    );

    async function handleReveal(x: number, y: number): Promise<void> {
      const result = await revealAtPoint(x, y);
      panel.add(result, (msg) => {
        browser.runtime.sendMessage(msg);
      });
    }

    browser.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as MessageType;
      if (msg.type === 'START_PICKER') {
        picker.start((x, y) => {
          void handleReveal(x, y);
          browser.runtime.sendMessage({ type: 'PICKER_ACTIVE', active: false });
        });
        browser.runtime.sendMessage({ type: 'PICKER_ACTIVE', active: true });
        return Promise.resolve();
      }

      if (msg.type === 'STOP_PICKER') {
        picker.stop();
        return Promise.resolve();
      }

      if (msg.type === 'REVEAL_AT_POINT') {
        const x = msg.x || lastContextCoords.x;
        const y = msg.y || lastContextCoords.y;
        void handleReveal(x, y);
        return Promise.resolve();
      }

      return undefined;
    });
  },
});

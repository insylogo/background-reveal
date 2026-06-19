import './style.css';
import browser from 'webextension-polyfill';

const app = document.querySelector('#app')!;

app.innerHTML = `
  <h1>Background Reveal</h1>
  <p>Reveal images hidden in CSS backgrounds, overlays, and tiled viewers.</p>
  <button id="start-picker" type="button">Start element picker</button>
  <p class="hint">Or right-click any page and choose <strong>Reveal images here</strong>.</p>
`;

document.querySelector('#start-picker')?.addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await browser.tabs.sendMessage(tab.id, { type: 'START_PICKER' });
    window.close();
  }
});

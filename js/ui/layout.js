import { escapeHtml } from '../core/utils.js';

export function sectionLayout(title, content, options = {}) {
  const subtitle = options.subtitle ? `<p class="app-bar__subtitle">${escapeHtml(options.subtitle)}</p>` : '';
  return `
    <section class="screen screen--section">
      <header class="app-bar">
        <button class="icon-button" type="button" data-route="home" aria-label="Back to home">←</button>
        <div class="app-bar__titles">
          <h1>${escapeHtml(title)}</h1>
          ${subtitle}
        </div>
        <div class="app-bar__actions">
          <button class="button button--ghost" type="button" data-global-action="import">Import</button>
          <button class="button button--ghost" type="button" data-global-action="export">Export</button>
        </div>
      </header>
      <div class="screen__content">${content}</div>
    </section>`;
}

export function emptyState(title, text) {
  return `<div class="empty-state"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`;
}

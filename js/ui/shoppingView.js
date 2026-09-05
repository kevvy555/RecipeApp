import { escapeHtml } from '../core/utils.js';
import { rankedShopItems, selectedItemCount, selectedShopItems } from '../domain/shoppingService.js';
import { sectionLayout } from './layout.js';

function shopStatus(shop) {
  const selected = selectedItemCount(shop);
  if (shop.current?.locked) return `${selected} item${selected === 1 ? '' : 's'} locked`;
  if (selected > 0) return `${selected} item${selected === 1 ? '' : 's'} selected`;
  return `${shop.items.length} items`;
}

export class ShoppingView {
  constructor(root, context) {
    this.root = root;
    this.context = context;
  }

  render() {
    const shopId = this.context.shoppingShopId;
    if (shopId) this.renderShop(shopId);
    else this.renderShopTypes();
  }

  renderShopTypes() {
    const shops = this.context.state.shopping?.shops || [];
    const cards = shops.map(shop => `
      <button class="shopping-shop-card" type="button" data-open-shopping-shop="${escapeHtml(shop.id)}">
        <span class="shopping-shop-card__icon" aria-hidden="true">🛒</span>
        <span class="shopping-shop-card__name">${escapeHtml(shop.name)}</span>
        <span class="shopping-shop-card__status ${shop.current?.locked ? 'shopping-shop-card__status--locked' : ''}">${escapeHtml(shopStatus(shop))}</span>
      </button>`).join('');

    const content = `
      <div class="stack stack--lg">
        <section>
          <p class="eyebrow">Shopping lists</p>
          <h2 class="shopping-heading">Where are you shopping?</h2>
          <p class="muted">Choose a shop to build or continue its list.</p>
        </section>
        <div class="shopping-shop-grid">${cards}</div>
      </div>`;

    this.root.innerHTML = sectionLayout('Shopping', content, { subtitle: `${shops.length} shop types stored on this device` });
    this.root.querySelectorAll('[data-open-shopping-shop]').forEach(button => {
      button.addEventListener('click', () => this.context.actions.openShoppingShop(button.dataset.openShoppingShop));
    });
  }

  renderShop(shopId) {
    const shop = this.context.state.shopping?.shops?.find(item => item.id === shopId);
    if (!shop) {
      this.context.actions.closeShoppingShop();
      return;
    }

    const locked = Boolean(shop.current?.locked);
    const items = locked ? selectedShopItems(shop) : rankedShopItems(shop);
    const selected = selectedItemCount(shop);
    const itemCards = items.map(item => {
      const quantity = Number(shop.current?.quantities?.[item.id] || 0);
      const collected = Boolean(shop.current?.collected?.[item.id]);
      const classes = [
        'shopping-item',
        quantity > 0 ? 'shopping-item--selected' : '',
        locked ? 'shopping-item--locked' : '',
        collected ? 'shopping-item--collected' : ''
      ].filter(Boolean).join(' ');
      const action = locked ? 'data-toggle-collected-shopping-item' : 'data-increment-shopping-item';
      return `
        <button class="${classes}" type="button" ${action}="${escapeHtml(item.id)}">
          <span class="shopping-item__name">${escapeHtml(item.name)}</span>
          <span class="shopping-item__category">${escapeHtml(item.category)}</span>
          ${quantity > 0 ? `<span class="shopping-item__quantity">${quantity}×</span>` : ''}
          ${collected ? '<span class="shopping-item__check" aria-hidden="true">✓</span>' : ''}
        </button>`;
    }).join('');

    const actions = locked
      ? `<button class="button button--primary shopping-action" type="button" data-complete-shopping-shop>Done</button>`
      : `<div class="shopping-actions">
          <button class="button button--ghost" type="button" data-clear-shopping-selection ${selected === 0 ? 'disabled' : ''}>Clear selections</button>
          <button class="button button--primary shopping-action" type="button" data-lock-shopping-items ${selected === 0 ? 'disabled' : ''}>Lock Items</button>
        </div>`;

    const help = locked
      ? 'Tap an item as you collect it. Done records this shop for future frequency ranking and resets the list.'
      : 'Tap an item once for 1×. Each extra tap increases the quantity. Frequent purchases automatically rise toward the top-left after completed shops.';

    this.root.innerHTML = `
      <section class="screen screen--section">
        <header class="app-bar">
          <button class="icon-button" type="button" data-shopping-back aria-label="Back to shop types">←</button>
          <div class="app-bar__titles">
            <h1>${escapeHtml(shop.name)}</h1>
            <p class="app-bar__subtitle">${locked ? `${selected} locked item${selected === 1 ? '' : 's'}` : `${shop.items.length} available items`}</p>
          </div>
          <div class="app-bar__actions">
            <button class="button button--ghost" type="button" data-global-action="import">Import</button>
            <button class="button button--ghost" type="button" data-global-action="export">Export</button>
          </div>
        </header>
        <div class="screen__content">
          <div class="stack stack--lg">
            <section class="card shopping-list-header">
              <div>
                <p class="eyebrow">${locked ? 'Locked shopping list' : 'Build shopping list'}</p>
                <h2>${locked ? 'Collect your items' : 'Tap what you need'}</h2>
                <p class="muted">${escapeHtml(help)}</p>
              </div>
              ${actions}
            </section>
            <div class="shopping-item-grid">${itemCards}</div>
          </div>
        </div>
      </section>`;

    this.bindShop(shopId, locked);
  }

  bindShop(shopId, locked) {
    this.root.querySelector('[data-shopping-back]')?.addEventListener('click', () => this.context.actions.closeShoppingShop());
    this.root.querySelector('[data-clear-shopping-selection]')?.addEventListener('click', () => this.context.actions.clearShoppingSelection(shopId));
    this.root.querySelector('[data-lock-shopping-items]')?.addEventListener('click', () => this.context.actions.lockShoppingItems(shopId));
    this.root.querySelector('[data-complete-shopping-shop]')?.addEventListener('click', () => this.context.actions.completeShoppingShop(shopId));

    const attribute = locked ? '[data-toggle-collected-shopping-item]' : '[data-increment-shopping-item]';
    this.root.querySelectorAll(attribute).forEach(button => {
      button.addEventListener('click', () => {
        const itemId = locked ? button.dataset.toggleCollectedShoppingItem : button.dataset.incrementShoppingItem;
        if (locked) this.context.actions.toggleCollectedShoppingItem(shopId, itemId);
        else this.context.actions.incrementShoppingItem(shopId, itemId);
      });
    });
  }
}

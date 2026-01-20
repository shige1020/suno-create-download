(function () {
  const SHARE_BUTTON_SELECTOR = 'button[aria-label="Share clip"]';
  const PROCESSED_ATTR = 'data-suno-download-pills';
  const PILL_CONTAINER_CLASS = 'suno-download-pill-container';
  const PILL_CLASS = 'suno-download-pill';
  const OVERFLOW_BUTTON_CLASS = 'suno-download-overflow';
  const TOAST_CLASS = 'suno-download-toast';
  const STYLE_ID = 'suno-download-pill-style';
  const MAX_INLINE_PILLS = 3;
  const MENU_CLICK_TIMEOUT = 4000;
  const MENU_POLL_INTERVAL = 250;
  const CLIP_ROW_SELECTOR = '[data-testid="clip-row"]';
  const FIXED_DOWNLOAD_LABELS = ['MP3', 'WAV', 'Video'];

  class DownloadPillManager {
    constructor() {
      this.mutationObserver = null;
      this.injected = false;
    }

    start() {
      if (this.injected) {
        return;
      }
      this.injectStyles();
      this.scanForShareButtons();
      this.setupShareObserver();
      this.injected = true;
    }

    injectStyles() {
      if (document.getElementById(STYLE_ID)) {
        return;
      }
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .${PILL_CONTAINER_CLASS} {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          margin-left: 4px;
        }
        .${PILL_CLASS} {
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 999px;
          padding: 2px 12px;
          font-size: 12px;
          line-height: 1;
          background: rgba(255, 255, 255, 0.1);
          color: inherit;
          cursor: pointer;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .${PILL_CLASS}[disabled] {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .${PILL_CLASS} .suno-pill-pro {
          font-size: 10px;
          padding: 0 4px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
        }
        .${PILL_CONTAINER_CLASS} .${OVERFLOW_BUTTON_CLASS} {
          border-radius: 999px;
          border: 1px dashed rgba(255, 255, 255, 0.5);
          padding: 0 8px;
          min-width: 32px;
          justify-content: center;
        }
        .${PILL_CONTAINER_CLASS} .${OVERFLOW_BUTTON_CLASS}::after {
          content: '\u00a0';
        }
        .suno-download-overflow-popover {
          position: absolute;
          z-index: 10000;
          background: rgba(18, 18, 18, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 180px;
          color: inherit;
        }
        .suno-download-popover button {
          text-align: left;
          background: transparent;
          border: none;
          color: inherit;
          font-size: 13px;
          padding: 4px 8px;
          border-radius: 8px;
        }
        .suno-download-popover button:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .${TOAST_CLASS} {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 18px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border-radius: 999px;
          font-size: 13px;
          z-index: 10001;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }

    setupShareObserver() {
      if (this.mutationObserver) {
        return;
      }
      this.mutationObserver = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => this.inspectNodeForClipRows(node));
        });
      });
      const target = document.querySelector(CLIP_ROW_SELECTOR)?.parentElement || document.body;
      if (!target) {
        return;
      }
      this.mutationObserver.observe(target, { childList: true, subtree: true });
    }

    inspectNodeForClipRows(node) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      const element = node;
      if (element.matches && element.matches(CLIP_ROW_SELECTOR)) {
        this.processClipRow(element);
      }
      const descendants = element.querySelectorAll
        ? element.querySelectorAll(CLIP_ROW_SELECTOR)
        : [];
      descendants.forEach((row) => this.processClipRow(row));
    }

    scanForShareButtons() {
      const rows = document.querySelectorAll(CLIP_ROW_SELECTOR);
      rows.forEach((row) => this.processClipRow(row));
    }

    processClipRow(row) {
      const shareBtn = row.querySelector(SHARE_BUTTON_SELECTOR);
      if (!shareBtn || shareBtn.hasAttribute(PROCESSED_ATTR)) {
        return;
      }
      shareBtn.setAttribute(PROCESSED_ATTR, '1');
      this.setupClipContext(shareBtn);
    }

    setupClipContext(shareBtn) {
      const container = shareBtn.parentElement;
      if (!container) {
        return;
      }
      const clipRow = shareBtn.closest(CLIP_ROW_SELECTOR);
      const pillContainer = document.createElement('div');
      pillContainer.className = PILL_CONTAINER_CLASS;
      pillContainer.setAttribute('aria-live', 'polite');
      shareBtn.insertAdjacentElement('afterend', pillContainer);

      const context = {
        shareButton: shareBtn,
        clipRow,
        actionContainer: container,
        pillContainer,
        options: [],
        loading: false,
        menuButton: this.findMenuButton(clipRow, container, shareBtn),
        error: null,
      };

      if (context.menuButton) {
        this.renderFixedPills(context);
      } else {
        this.renderFallback(context, 'Menu button not found');
      }
    }

    renderFallback(context, message) {
      context.pillContainer.innerHTML = '';
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = PILL_CLASS;
      pill.textContent = 'Download';
      pill.disabled = true;
      pill.setAttribute('aria-label', message);
      context.pillContainer.appendChild(pill);
    }

    renderFixedPills(context) {
      context.options = FIXED_DOWNLOAD_LABELS.map((label) => ({
        label,
        isPro: false,
        action: () => this.handlePillAction(context, label),
      }));
      this.renderPills(context);
    }

    getMenuButton(context) {
      if (context.menuButton && context.menuButton.isConnected) {
        return context.menuButton;
      }
      const clipRow = context.shareButton.closest(CLIP_ROW_SELECTOR);
      const fresh = this.findMenuButton(clipRow, context.actionContainer, context.shareButton);
      context.menuButton = fresh;
      return fresh;
    }

    findMenuButton(clipRow, container, shareBtn) {
      const scopes = [clipRow, container].filter(Boolean);
      for (const scope of scopes) {
        const contextButtons = Array.from(scope.querySelectorAll('button[data-context-menu-trigger="true"]'));
        const candidate = contextButtons.find((btn) => {
          const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
          return !label.includes('remix') && !label.includes('edit');
        }) || contextButtons[0];
        if (candidate) {
          return candidate;
        }
      }
      for (const scope of scopes) {
        const candidates = Array.from(scope.querySelectorAll('button'));
        for (const button of candidates) {
          if (button === shareBtn) {
            continue;
          }
          const label = (button.getAttribute('aria-label') || button.textContent || '').toLowerCase();
          if (
            label.includes('more') ||
            label.includes('menu') ||
            label.includes('options')
          ) {
            return button;
          }
        }
      }
      return null;
    }

    isBefore(elA, elB) {
      return Boolean(elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_PRECEDING);
    }

    containsText(el, keyword) {
      return el && el.textContent && el.textContent.includes(keyword);
    }

    containsDownloadItems(el) {
      if (!el || !el.textContent) {
        return false;
      }
      const candidateTokens = ['download', 'mp3', 'wav', 'video', 'audio'];
      const text = el.textContent.toLowerCase();
      return candidateTokens.some((token) => text.includes(token));
    }

    findDownloadTrigger(menu) {
      const candidates = Array.from(menu.querySelectorAll('button, [role="menuitem"], [role="option"], [role="link"]'));
      return candidates.find((btn) => btn.textContent && btn.textContent.trim().startsWith('Download')) || null;
    }

    handlePillAction(context, label) {
      this.simulateDownloadFlow(context, label).catch((error) => console.warn('Pill click failed', error));
    }

    renderPills(context) {
      context.pillContainer.innerHTML = '';
      const primary = context.options.slice(0, MAX_INLINE_PILLS);
      const overflow = context.options.slice(MAX_INLINE_PILLS);
      primary.forEach((option) => {
        const pill = this.createPill(option);
        context.pillContainer.appendChild(pill);
      });
      if (overflow.length) {
        const overflowButton = this.createOverflowButton(context, overflow);
        context.pillContainer.appendChild(overflowButton);
      }
    }

    createPill(option) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = PILL_CLASS;
      button.textContent = option.label;
      if (option.isPro) {
        const indicator = document.createElement('span');
        indicator.className = 'suno-pill-pro';
        indicator.textContent = 'PRO';
        button.appendChild(indicator);
      }
      button.addEventListener('click', option.action);
      return button;
    }

    createOverflowButton(context, overflowOptions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `${PILL_CLASS} ${OVERFLOW_BUTTON_CLASS}`;
      button.textContent = `+${overflowOptions.length}`;
      let popover = null;
      const closePopover = () => {
        if (popover && popover.parentElement) {
          popover.parentElement.removeChild(popover);
          popover = null;
        }
        document.removeEventListener('click', clickAway);
      };
      const clickAway = (event) => {
        if (!popover || popover.contains(event.target)) {
          return;
        }
        closePopover();
      };
      const togglePopover = () => {
        if (popover) {
          closePopover();
          return;
        }
        popover = document.createElement('div');
        popover.className = 'suno-download-overflow-popover suno-download-popover';
        overflowOptions.forEach((option) => {
          const optButton = document.createElement('button');
          optButton.type = 'button';
          optButton.textContent = option.label + (option.isPro ? ' (Pro)' : '');
          optButton.addEventListener('click', () => {
            option.action();
            closePopover();
          });
          popover.appendChild(optButton);
        });
        document.body.appendChild(popover);
        const rect = button.getBoundingClientRect();
        popover.style.top = `${rect.bottom + window.scrollY + 4}px`;
        popover.style.left = `${rect.left + window.scrollX}px`;
        document.addEventListener('click', clickAway);
      };
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        togglePopover();
      });
      return button;
    }

    async simulateDownloadFlow(context, label) {
      context.menuButton = this.getMenuButton(context);
      if (!context.menuButton) {
        return;
      }
      context.menuButton.click();
      const menu = await this.waitForPopup((el) => this.containsText(el, 'Download'), MENU_CLICK_TIMEOUT);
      if (!menu) {
        return;
      }
      const downloadTrigger = this.findDownloadTrigger(menu);
      if (!downloadTrigger) {
        return;
      }
      downloadTrigger.click();
      const downloadMenu = await this.waitForPopup((el) => this.containsDownloadItems(el), MENU_CLICK_TIMEOUT);
      if (!downloadMenu) {
        return;
      }
      const targetOption = Array.from(downloadMenu.querySelectorAll('button, [role="menuitem"], [role="option"], [role="link"]')).find((opt) => {
        const text = opt.textContent;
        return text && text.trim().startsWith(label);
      });
      if (targetOption) {
        targetOption.click();
      }
      this.closeOpenMenus();
    }

    waitForPopup(predicate, timeout) {
      const poll = async (deadline) => {
        while (Date.now() < deadline) {
          const candidate = this.findLatestPopup(predicate);
          if (candidate) {
            return candidate;
          }
          await this.delay(MENU_POLL_INTERVAL);
        }
        return null;
      };
      return poll(Date.now() + timeout);
    }

    findLatestPopup(predicate) {
      if (!document.body) {
        return null;
      }
      const nodes = Array.from(document.body.querySelectorAll('[role="menu"],[role="listbox"],[role="dialog"], div'));
      for (let i = nodes.length - 1; i >= 0; i -= 1) {
        const node = nodes[i];
        if (!node.isConnected || node.offsetParent === null) {
          continue;
        }
        if (predicate(node)) {
          return node;
        }
      }
      return null;
    }

    closeOpenMenus() {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.body.click();
    }

    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    showToast(message) {
      const existing = document.querySelector(`.${TOAST_CLASS}`);
      if (existing) {
        existing.remove();
      }
      const toast = document.createElement('div');
      toast.className = TOAST_CLASS;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 4000);
    }
  }

  const manager = new DownloadPillManager();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => manager.start());
  } else {
    manager.start();
  }
})();

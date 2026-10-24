'use strict';
'require baseclass';
'require ui';

const THEME_VERSION = '1.0.49';
const MOBILE_MEDIA_QUERY = '(max-width: 991px), (max-height: 550px) and (orientation: landscape)';
const FONTS = {
  system: { title: 'System', description: 'Default interface font', family: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  arial: { title: 'Arial', description: 'Clean sans serif', family: 'Arial, Helvetica, sans-serif' },
  serif: { title: 'Georgia', description: 'Classic serif', family: 'Georgia, "Times New Roman", serif' },
  mono: { title: 'Monospace', description: 'Technical fixed-width', family: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace' }
};
const PALETTES = {
  streamline: { title: 'Streamline', description: 'Purple and graphite', colors: ['#8b5cf6', '#4ea1ff', '#090b11'], themeColor: '#0b0e14' },
  glinet: { title: 'GL.iNet', description: 'Turquoise and navy', colors: ['#00d6c6', '#25aee8', '#080b25'], themeColor: '#111331' },
  ocean: { title: 'Ocean', description: 'Cool blue and deep sea', colors: ['#38bdf8', '#34d399', '#071521'], themeColor: '#071521' },
  forest: { title: 'Forest', description: 'Fresh green and pine', colors: ['#4ade80', '#60a5fa', '#0a1511'], themeColor: '#0a1511' },
  sunset: { title: 'Sunset', description: 'Warm orange and ember', colors: ['#fb923c', '#4ade80', '#17100f'], themeColor: '#17100f' },
  rose: { title: 'Rose', description: 'Soft pink and plum', colors: ['#f472b6', '#818cf8', '#180f18'], themeColor: '#180f18' }
};

return baseclass.extend({
  __init__() {
    this.setupSidebar();
    this.normalizeRealtimeGraphs();
    ui.menu.load()
      .then((tree) => this.render(tree))
      .catch(() => {
        if (ui.menu && typeof ui.menu.flushCache === 'function')
          ui.menu.flushCache();
        return ui.menu.load().then((tree) => this.render(tree));
      })
      .catch((err) => {
        console.warn('Streamline menu load fallback:', err);
      });
    this.preloadProtocols();
  },

  normalizeRealtimeGraphs() {
    const applyStyles = () => {
      const svgs = document.querySelectorAll('svg');
      for (let i = 0; i < svgs.length; i++) {
        const svg = svgs[i];
        if (!svg.querySelector('polyline'))
          continue;
        svg.style.setProperty('background', 'var(--sl-surface-2)', 'important');
        svg.style.setProperty('border-radius', 'var(--sl-radius)', 'important');
        const container = svg.parentElement;
        if (container) {
          container.classList.add('sl-realtime-graph');
          container.style.setProperty('background', 'var(--sl-surface-2)', 'important');
          container.style.setProperty('border', '1px solid var(--sl-border)', 'important');
          container.style.setProperty('border-radius', 'var(--sl-radius)', 'important');
          container.style.setProperty('overflow', 'hidden', 'important');
          container.style.setProperty('box-shadow', '0 4px 20px -2px rgba(0, 0, 0, 0.4)', 'important');
        }
      }

      const scaleBadges = document.querySelectorAll('#scale, #scale2');
      for (let j = 0; j < scaleBadges.length; j++) {
        const badge = scaleBadges[j];
        const parent = badge.parentElement;
        if (parent && parent.classList.contains('right')) {
          parent.classList.add('sl-realtime-scale');
          parent.style.setProperty('height', 'auto', 'important');
          parent.style.setProperty('min-height', '0px', 'important');
          parent.style.setProperty('background', 'transparent', 'important');
          parent.style.setProperty('border', 'none', 'important');
          parent.style.setProperty('box-shadow', 'none', 'important');
        }
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyStyles);
    } else {
      applyStyles();
    }

    const targetNode = document.querySelector('#view') || document.body;
    if (targetNode && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => applyStyles());
      observer.observe(targetNode, { childList: true, subtree: true });
    }
  },

  preloadProtocols() {
    if (typeof L === 'undefined' || typeof L.require !== 'function')
      return;
    const glProtos = {
      wgclient: 'WireGuard Client (GL.iNet)',
      wgserver: 'WireGuard Server (GL.iNet)',
      ovpnclient: 'OpenVPN Client (GL.iNet)',
      ovpnserver: 'OpenVPN Server (GL.iNet)',
      tethering: 'Tethering (GL.iNet)'
    };
    Object.keys(glProtos).forEach((proto) => {
      L.require('protocol.' + proto).catch(() => {
        L.require('network').then((network) => {
          if (network && typeof network.registerProtocol === 'function' && !network.getProtocol(proto)) {
            network.registerProtocol(proto, {
              getI18n: () => _(glProtos[proto]),
              getIfname() { return this._ubus('l3_device') || this._ubus('device') || this.sid || proto; },
              isFloating: () => true,
              isVirtual: () => true,
              getDevices: () => null,
              containsDevice(ifname) { return (network.getIfnameOf(ifname) === this.getIfname()); },
              renderFormOptions(s) {
                L.require('form').then((form) => {
                  if (form && s && typeof s.taboption === 'function') {
                    const o = s.taboption('general', form.DummyValue, '_gl_managed', _('Managed by GL.iNet'));
                    o.rawhtml = true;
                    o.default = '<div class="alert-message notice" style="margin: 8px 0; padding: 12px 16px; border-radius: 8px;">' +
                      '<strong>' + _(glProtos[proto]) + '</strong><br>' +
                      _('This interface is managed by the GL.iNet VPN subsystem.') +
                      '</div>';
                  }
                }).catch(() => {});
              }
            });
          }
        }).catch(() => {});
      });
    });
  },

  getDispatchPath() {
    return Array.isArray(L && L.env && L.env.dispatchpath) ? L.env.dispatchpath : [];
  },

  getRequestPath() {
    return Array.isArray(L && L.env && L.env.requestpath) ? L.env.requestpath : [];
  },

  isMobileLayout() {
    if (typeof window === 'undefined' || !window.matchMedia)
      return false;
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  },

  menuUrl() {
    if (typeof L !== 'undefined' && typeof L.url === 'function')
      return L.url.apply(L, arguments);
    return '#';
  },

  render(tree) {
    this.menuTree = tree;
    const dispatchpath = this.getDispatchPath();
    let node = tree;
    let url = '';
    this.renderModeMenu(tree);
    this.setupSidebar();
    this.setupQuickSearch(tree);
    this.setupWirelessLayout();

    if (dispatchpath.length >= 3) {
      for (let i = 0; i < 3 && node; i++) {
        node = node && node.children ? node.children[dispatchpath[i]] : null;
        url += (url ? '/' : '') + dispatchpath[i];
      }
      if (node)
        this.renderTabMenu(node, url);
    }
  },

  renderTabMenu(tree, url, level) {
    const container = document.querySelector('#tabmenu');
    if (!container)
      return E([]);
    if (level == null || level === 0)
      container.innerHTML = '';

    const ul = E('ul', { 'class': 'tabs' });
    const dispatchpath = this.getDispatchPath();
    const children = ui.menu && ui.menu.getChildren ? ui.menu.getChildren(tree) : [];
    let activeNode = null;

    children.forEach((child) => {
      const active = dispatchpath[3 + (level || 0)] === child.name;
      ul.appendChild(E('li', { 'class': 'tabmenu-item-%s%s'.format(child.name, active ? ' active' : '') }, [
        E('a', { 'href': this.menuUrl(url, child.name) }, [_(child.title)])
      ]));
      if (active)
        activeNode = child;
    });

    if (!ul.children.length)
      return E([]);

    container.appendChild(ul);
    container.style.display = '';
    if (activeNode)
      this.renderTabMenu(activeNode, url + '/' + activeNode.name, (level || 0) + 1);
    return ul;
  },

  renderMainMenu(tree, url, level) {
    const ul = level ? E('ul', { 'class': 'dropdown-menu' }) : document.querySelector('#topmenu');
    if (!ul)
      return E([]);
    if (!level)
      ul.innerHTML = '';

    const children = ui.menu && ui.menu.getChildren ? ui.menu.getChildren(tree) : [];
    if (!children.length || level > 1)
      return E([]);

    if (!level && !ul.querySelector('.mobile-home')) {
      const homeUrl = this.menuUrl('admin/status/overview');
      const home = E('li', { 'class': 'mobile-home' }, [
        E('a', { 'href': homeUrl, 'title': _('Home') }, [E('span', { 'class': 'menu-label' }, [_('Home')])])
      ]);
      home.addEventListener('click', (event) => {
        event.preventDefault();
        document.querySelectorAll('#topmenu > li.dropdown').forEach((item) => {
          item.classList.remove('open');
          const itemLink = item.querySelector(':scope > a');
          if (itemLink)
            itemLink.setAttribute('aria-expanded', 'false');
          if (item.dataset.preferenceKey)
            this.setPreference(item.dataset.preferenceKey, 'closed');
        });
        this.setMobileMenu(false);
        window.location.assign(homeUrl);
      });
      ul.appendChild(home);
    }

    children.forEach((child) => {
      const childName = String(child && child.name || 'item');
      const childTitle = String(child && child.title || childName);
      const normalizedName = childName.toLowerCase();
      const normalizedTitle = childTitle.toLowerCase();
      if (normalizedName === 'argon-config' || normalizedName === 'argon_config' || normalizedTitle === 'argon config')
        return;

      const submenu = this.renderMainMenu(child, url + '/' + child.name, (level || 0) + 1);
      const hasSubmenu = !!(submenu && submenu.firstElementChild);
      const dispatchpath = this.getDispatchPath();
      const active = dispatchpath[(level || 0) + 1] === child.name;
      const path = url + '/' + child.name;
      const state = hasSubmenu ? this.getPreference('streamline.menu.' + path) : null;
      const open = hasSubmenu && (active || state === 'open');
      const itemClass = 'menu-item-' + String(child.name || 'item').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const li = E('li', { 'class': itemClass + ' ' + (hasSubmenu ? 'dropdown ' : '') + (active ? 'active ' : '') + (open ? 'open' : '') });
      const itemTitle = _(child.title || child.name || _('Menu'));
      const link = E('a', {
        'class': hasSubmenu ? 'menu' : '',
        'href': hasSubmenu ? '#' : this.menuUrl(url, child.name),
        'title': itemTitle,
        'aria-expanded': hasSubmenu ? String(open) : null
      }, [E('span', { 'class': 'menu-label' }, [itemTitle])]);

      if (hasSubmenu) {
        li.setAttribute('data-preference-key', 'streamline.menu.' + path);
        submenu.id = 'streamline-menu-' + child.name;
        link.setAttribute('aria-controls', submenu.id);
        link.addEventListener('click', (event) => {
          event.preventDefault();
          const mobile = this.isMobileLayout();
          if (mobile) {
            document.querySelectorAll('#topmenu > li.open').forEach((item) => {
              if (item !== li) {
                item.classList.remove('open');
                const itemLink = item.querySelector(':scope > a');
                if (itemLink)
                  itemLink.setAttribute('aria-expanded', 'false');
              }
            });
          }
          if (!mobile && document.body.classList.contains('sidebar-collapsed')) {
            this.setSidebarCollapsed(false);
            li.classList.add('open');
          } else {
            li.classList.toggle('open');
          }
          const isOpen = li.classList.contains('open');
          link.setAttribute('aria-expanded', String(isOpen));
          if (mobile)
            this.setMobileMenu(true);
          this.setPreference('streamline.menu.' + path, isOpen ? 'open' : 'closed');
        });

        submenu.addEventListener('click', (event) => {
          if (event.target && event.target.closest && event.target.closest('a'))
            this.setMobileMenu(false);
        });
      } else {
        link.addEventListener('click', () => {
          if (this.isMobileLayout())
            this.setMobileMenu(false);
        });
      }

      li.appendChild(link);
      li.appendChild(submenu);
      ul.appendChild(li);
    });
    ul.style.display = '';
    return ul;
  },

  renderModeMenu(tree) {
    const ul = document.querySelector('#modemenu');
    if (!ul)
      return;
    ul.innerHTML = '';

    const requestpath = this.getRequestPath();
    const children = ui.menu && ui.menu.getChildren ? ui.menu.getChildren(tree) : [];

    children.forEach((child, index) => {
      const active = requestpath.length ? child.name === requestpath[0] : index === 0;
      ul.appendChild(E('li', { 'class': active ? 'active' : '' }, [
        E('a', { 'href': this.menuUrl(child.name) }, [_(child.title || child.name)])
      ]));
      if (active)
        this.renderMainMenu(child, child.name);
    });
    if (ul.children.length > 1)
      ul.style.display = '';
  },

  applyPalette(name) {
    const palette = Object.prototype.hasOwnProperty.call(PALETTES, name) ? name : 'streamline';
    document.documentElement.setAttribute('data-palette', palette);
    this.setPreference('streamline.palette', palette);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor)
      themeColor.setAttribute('content', PALETTES[palette].themeColor);
    const favicon = document.querySelector('link[rel~="icon"]');
    if (favicon) {
      const iconName = palette === 'glinet' ? 'logo-glinet.svg' : 'logo.svg';
      favicon.setAttribute('href', favicon.getAttribute('href').replace(/logo(?:-glinet)?\.svg(?:\?[^#]*)?/, iconName + '?v=' + THEME_VERSION));
    }
  },

  applyFont(name) {
    const font = Object.prototype.hasOwnProperty.call(FONTS, name) ? name : 'system';
    document.documentElement.setAttribute('data-font', font);
    this.setPreference('streamline.font', font);
  },

  showPalettePicker() {
    const savedPalette = this.getPreference('streamline.palette');
    const current = Object.prototype.hasOwnProperty.call(PALETTES, savedPalette) ? savedPalette : 'streamline';
    const choices = E('div', { 'class': 'sl-palette-choices' });
    const savedFont = this.getPreference('streamline.font');
    const currentFont = Object.prototype.hasOwnProperty.call(FONTS, savedFont) ? savedFont : 'system';
    const fontChoices = E('div', { 'class': 'sl-font-choices' });

    Object.keys(PALETTES).forEach((id) => {
      const palette = PALETTES[id];
      const swatches = E('span', { 'class': 'sl-palette-swatches', 'aria-hidden': 'true' },
        palette.colors.map((color) => E('i', { 'style': 'background:' + color })));
      const button = E('button', {
        'type': 'button',
        'class': 'sl-palette-choice' + (id === current ? ' active' : ''),
        'data-palette': id,
        'aria-pressed': String(id === current)
      }, [swatches, E('strong', {}, [_(palette.title)]), E('small', {}, [_(palette.description)])]);

      button.addEventListener('click', () => {
        this.applyPalette(id);
        choices.querySelectorAll('.sl-palette-choice').forEach((choice) => {
          const selected = choice.getAttribute('data-palette') === id;
          choice.classList.toggle('active', selected);
          choice.setAttribute('aria-pressed', String(selected));
        });
      });
      choices.appendChild(button);
    });

    Object.keys(FONTS).forEach((id) => {
      const font = FONTS[id];
      const button = E('button', {
        'type': 'button',
        'class': 'sl-font-choice' + (id === currentFont ? ' active' : ''),
        'data-font': id,
        'aria-pressed': String(id === currentFont),
        'style': 'font-family:' + font.family
      }, [E('strong', {}, [_(font.title)]), E('small', {}, [_(font.description)])]);

      button.addEventListener('click', () => {
        this.applyFont(id);
        fontChoices.querySelectorAll('.sl-font-choice').forEach((choice) => {
          const selected = choice.getAttribute('data-font') === id;
          choice.classList.toggle('active', selected);
          choice.setAttribute('aria-pressed', String(selected));
        });
      });
      fontChoices.appendChild(button);
    });

    ui.showModal(_('Appearance'), [
      E('p', { 'class': 'sl-palette-description' }, [_('Choose the color palette used on this device.')]),
      choices,
      E('h3', { 'class': 'sl-font-heading' }, [_('Font')]),
      E('p', { 'class': 'sl-palette-description' }, [_('Choose the font used across the interface.')]),
      fontChoices,
      E('div', { 'class': 'right' }, [
        E('button', { 'type': 'button', 'class': 'btn', 'click': ui.hideModal }, [_('Close')])
      ])
    ], 'streamline-palette-dialog');
  },

  setupPaletteControls() {
    const indicators = document.querySelector('#indicators');
    const topmenu = document.querySelector('#topmenu');
    const openPicker = () => {
      this.setMobileMenu(false);
      this.showPalettePicker();
    };

    this.applyPalette(this.getPreference('streamline.palette'));
    this.applyFont(this.getPreference('streamline.font'));

    if (indicators && !indicators.querySelector('.sidebar-palette')) {
      const button = E('button', {
        'type': 'button',
        'class': 'sidebar-palette',
        'title': _('Appearance'),
        'aria-label': _('Appearance')
      }, [E('span', { 'class': 'indicator-label' }, [_('Appearance')])]);
      button.addEventListener('click', openPicker);
      indicators.appendChild(button);
    }

    if (topmenu && !topmenu.querySelector('.mobile-palette')) {
      const button = E('button', { 'type': 'button', 'title': _('Appearance') }, [E('span', { 'class': 'menu-label' }, [_('Appearance')])]);
      const item = E('li', { 'class': 'mobile-palette' }, [button]);
      button.addEventListener('click', openPicker);
      const home = topmenu.querySelector('.mobile-home');
      if (home && home.nextSibling)
        topmenu.insertBefore(item, home.nextSibling);
      else if (home)
        topmenu.appendChild(item);
      else
        topmenu.insertBefore(item, topmenu.firstChild);
    }
  },

  getPreference(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },

  setPreference(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {}
  },

  setSidebarCollapsed(collapsed) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    this.setPreference('streamline.sidebar', collapsed ? 'collapsed' : 'expanded');
    const button = document.querySelector('.sidebar-toggle');
    if (button) {
      button.setAttribute('aria-expanded', String(!collapsed));
      button.textContent = collapsed ? '\u203A' : '\u2039';
      button.title = collapsed ? _('Expand navigation') : _('Collapse navigation');
    }
  },

  setMobileMenu(open) {
    document.body.classList.toggle('mobile-menu-open', open);
    const mobileToggle = document.querySelector('.mobile-toggle');
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-expanded', String(open));
      mobileToggle.textContent = open ? '\u00D7' : '\u2630';
      mobileToggle.title = open ? _('Close navigation') : _('Open navigation');
    }
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle && this.isMobileLayout()) {
      sidebarToggle.setAttribute('aria-expanded', String(open));
      sidebarToggle.textContent = '\u00D7';
      sidebarToggle.title = _('Close navigation');
    }
  },

  setupSidebar() {
    const header = document.querySelector('header');
    const mobileQuery = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_MEDIA_QUERY) : null;
    if (!header || header.querySelector('.sidebar-toggle'))
      return;

    this.setupPaletteControls();

    const indicators = document.querySelector('#indicators');
    if (indicators && !indicators.querySelector('.sidebar-home')) {
      const homeUrl = L.url('admin/status/overview');
      const homeLink = E('a', {
        'class': 'sidebar-home',
        'href': homeUrl,
        'title': _('Home'),
        'aria-label': _('Home')
      }, [E('span', { 'class': 'indicator-label' }, [_('Home')])]);
      homeLink.addEventListener('click', (event) => {
        event.preventDefault();
        document.querySelectorAll('#topmenu > li.dropdown').forEach((item) => {
          item.classList.remove('open');
          const link = item.querySelector(':scope > a');
          if (link)
            link.setAttribute('aria-expanded', 'false');
          if (item.dataset.preferenceKey)
            this.setPreference(item.dataset.preferenceKey, 'closed');
        });
        document.body.classList.remove('mobile-menu-open');
        window.location.assign(homeUrl);
      });
      indicators.prepend(homeLink);
    }

    const button = E('button', {
      'type': 'button',
      'class': 'sidebar-toggle',
      'aria-label': _('Toggle navigation'),
      'aria-expanded': 'true'
    });
    button.addEventListener('click', () => {
      if (!document.body)
        return;
      if (this.isMobileLayout())
        this.setMobileMenu(!document.body.classList.contains('mobile-menu-open'));
      else
        this.setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
    });
    header.appendChild(button);

    let mobileToggle = document.querySelector('.mobile-toggle');
    if (!mobileToggle) {
      const mobileBar = document.querySelector('.mobile-bar');
      if (mobileBar) {
        mobileToggle = E('button', {
          'type': 'button',
          'class': 'mobile-toggle',
          'aria-label': _('Toggle navigation'),
          'aria-expanded': 'false'
        }, ['\u2630']);
        mobileBar.prepend(mobileToggle);
      }
    }
    if (mobileToggle && !mobileToggle._streamlineBound) {
      mobileToggle._streamlineBound = true;
      const handleToggle = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (!document.body)
          return;
        this.setMobileMenu(!document.body.classList.contains('mobile-menu-open'));
      };
      mobileToggle.addEventListener('click', handleToggle);
    }

    const closeMobileSections = () => {
      document.querySelectorAll('#topmenu > li.open').forEach((item) => {
        item.classList.remove('open');
        const link = item.querySelector(':scope > a');
        if (link)
          link.setAttribute('aria-expanded', 'false');
      });
    };

    const syncNavigationMode = () => {
      if (!document.body)
        return;
      if (this.isMobileLayout()) {
        document.body.classList.remove('sidebar-collapsed');
        closeMobileSections();
        this.setMobileMenu(false);
        const mToggle = document.querySelector('.mobile-toggle');
        if (mToggle) {
          mToggle.setAttribute('aria-expanded', 'false');
          mToggle.textContent = '\u2630';
          mToggle.title = _('Open navigation');
        }
        const sToggle = document.querySelector('.sidebar-toggle');
        if (sToggle) {
          sToggle.setAttribute('aria-expanded', 'false');
          sToggle.textContent = '\u00D7';
          sToggle.title = _('Close navigation');
        }
      } else {
        this.setMobileMenu(false);
        this.setSidebarCollapsed(this.getPreference('streamline.sidebar') === 'collapsed');
      }
    };
    syncNavigationMode();
    if (mobileQuery && typeof mobileQuery.addEventListener === 'function')
      mobileQuery.addEventListener('change', syncNavigationMode);
    else if (mobileQuery && typeof mobileQuery.addListener === 'function')
      mobileQuery.addListener(syncNavigationMode);

    document.addEventListener('click', (event) => {
      if (!this.isMobileLayout() || !event.target || !event.target.closest)
        return;
      if (event.target.closest('header') || event.target.closest('.mobile-bar'))
        return;
      closeMobileSections();
      this.setMobileMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('mobile-menu-open')) {
        closeMobileSections();
        this.setMobileMenu(false);
      }
    });
  },

  buildSearchIndex(tree) {
    const items = [];
    const walk = (node, parentTitles, currentPath) => {
      if (!node) return;
      const children = ui.menu && ui.menu.getChildren ? ui.menu.getChildren(node) : [];
      const title = node.title ? _(node.title) : '';
      const newParents = title ? parentTitles.concat([title]) : parentTitles;

      if (children && children.length) {
        children.forEach((child) => {
          const subPath = currentPath ? (currentPath + '/' + child.name) : child.name;
          walk(child, newParents, subPath);
        });
      } else if (currentPath && title) {
        const crumb = parentTitles.length > 1
          ? parentTitles.slice(1).join(' \u203A ')
          : (parentTitles.length === 1 ? parentTitles[0] : '');
        items.push({
          title: title,
          breadcrumb: crumb,
          url: this.menuUrl(currentPath),
          path: currentPath
        });
      }
    };
    walk(tree, [], '');
    return items;
  },

  openQuickSearch() {
    if (document.querySelector('.sl-search-dialog'))
      return;

    const items = this.searchIndex || [];
    const dialog = E('div', { 'class': 'sl-search-dialog', 'role': 'dialog', 'aria-modal': 'true' });
    const box = E('div', { 'class': 'sl-search-box' });
    const header = E('div', { 'class': 'sl-search-header' });
    const searchIcon = E('span', { 'class': 'sl-search-icon' }, ['\u26B2']);
    const input = E('input', {
      'type': 'search',
      'class': 'sl-search-input',
      'placeholder': _('Search menus, settings, services...'),
      'autocomplete': 'off',
      'spellcheck': 'false'
    });
    const kbdEsc = E('kbd', { 'class': 'sl-search-badge' }, ['ESC']);
    header.appendChild(searchIcon);
    header.appendChild(input);
    header.appendChild(kbdEsc);

    const resultsContainer = E('div', { 'class': 'sl-search-results' });
    const footer = E('div', { 'class': 'sl-search-footer' });
    footer.innerHTML = '<div class="sl-search-hints">' +
      '<span><kbd>&uarr;&darr;</kbd> ' + _('Navigate') + '</span>' +
      '<span><kbd>&crarr;</kbd> ' + _('Select') + '</span>' +
      '<span><kbd>ESC</kbd> ' + _('Close') + '</span>' +
      '</div>';

    box.appendChild(header);
    box.appendChild(resultsContainer);
    box.appendChild(footer);
    dialog.appendChild(box);
    document.body.appendChild(dialog);

    let activeIndex = 0;
    let currentResults = [];

    const close = () => {
      dialog.remove();
    };

    const renderResults = (query) => {
      resultsContainer.innerHTML = '';
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        currentResults = items.slice(0, 10);
        resultsContainer.appendChild(E('div', { 'class': 'sl-search-heading' }, [_('Popular Pages')]));
      } else {
        currentResults = items.filter(function (item) {
          return item.title.toLowerCase().indexOf(q) !== -1 ||
            item.breadcrumb.toLowerCase().indexOf(q) !== -1 ||
            item.path.toLowerCase().indexOf(q) !== -1;
        }).slice(0, 15);
      }

      if (!currentResults.length) {
        resultsContainer.appendChild(E('div', { 'class': 'sl-search-empty' }, [_('No matching pages found.')]));
        return;
      }

      activeIndex = 0;
      currentResults.forEach((item, idx) => {
        const itemEl = E('a', {
          'class': 'sl-search-item' + (idx === 0 ? ' active' : ''),
          'href': item.url
        }, [
          E('div', { 'class': 'sl-search-item-info' }, [
            E('div', { 'class': 'sl-search-item-title' }, [item.title]),
            item.breadcrumb ? E('div', { 'class': 'sl-search-item-crumb' }, [item.breadcrumb]) : E([])
          ]),
          E('kbd', { 'class': 'sl-search-enter-hint' }, ['\u21B5'])
        ]);
        itemEl.addEventListener('mouseenter', () => {
          resultsContainer.querySelectorAll('.sl-search-item').forEach((el, i) => {
            el.classList.toggle('active', i === idx);
          });
          activeIndex = idx;
        });
        resultsContainer.appendChild(itemEl);
      });
    };

    input.addEventListener('input', () => {
      renderResults(input.value);
    });

    input.addEventListener('keydown', (e) => {
      const itemsList = resultsContainer.querySelectorAll('.sl-search-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (itemsList.length > 0) {
          activeIndex = (activeIndex + 1) % itemsList.length;
          itemsList.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
          if (itemsList[activeIndex]) itemsList[activeIndex].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (itemsList.length > 0) {
          activeIndex = (activeIndex - 1 + itemsList.length) % itemsList.length;
          itemsList.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
          if (itemsList[activeIndex]) itemsList[activeIndex].scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentResults[activeIndex]) {
          close();
          window.location.assign(currentResults[activeIndex].url);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog)
        close();
    });

    renderResults('');
    window.setTimeout(() => input.focus(), 60);
  },

  setupQuickSearch(tree) {
    this.searchIndex = this.buildSearchIndex(tree);

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        this.openQuickSearch();
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement && document.activeElement.tagName) || '') && !document.activeElement.isContentEditable) {
        e.preventDefault();
        this.openQuickSearch();
      }
    });

    const indicators = document.querySelector('#indicators');
    if (indicators && !indicators.querySelector('.sidebar-search')) {
      const searchBtn = E('button', {
        'type': 'button',
        'class': 'sidebar-search',
        'title': _('Quick Search') + ' (Ctrl+K)',
        'aria-label': _('Quick Search')
      }, [
        E('span', { 'class': 'indicator-label' }, [_('Search')]),
        E('kbd', { 'class': 'sidebar-search-kbd' }, ['Ctrl+K'])
      ]);
      searchBtn.addEventListener('click', () => this.openQuickSearch());
      const home = indicators.querySelector('.sidebar-home');
      if (home && home.nextSibling)
        indicators.insertBefore(searchBtn, home.nextSibling);
      else
        indicators.appendChild(searchBtn);
    }

    const topmenu = document.querySelector('#topmenu');
    if (topmenu && !topmenu.querySelector('.mobile-search')) {
      const button = E('button', { 'type': 'button', 'title': _('Quick Search') }, [E('span', { 'class': 'menu-label' }, [_('Search')])]);
      const item = E('li', { 'class': 'mobile-search' }, [button]);
      button.addEventListener('click', () => {
        this.setMobileMenu(false);
        this.openQuickSearch();
      });
      const home = topmenu.querySelector('.mobile-home');
      if (home && home.nextSibling)
        topmenu.insertBefore(item, home.nextSibling);
      else
        topmenu.prepend(item);
    }
  },

  setupWirelessLayout() {
    const isWirelessPage = () => {
      const page = document.body && document.body.getAttribute('data-page');
      return page === 'admin-network-wireless' || window.location.pathname.indexOf('network/wireless') !== -1;
    };

    const updateChildrenVisibility = () => {
      const radioRows = document.querySelectorAll('.cbi-section-table-row.is-radio-row');
      radioRows.forEach((radioRow) => {
        const radioId = radioRow.getAttribute('data-radio-id');
        const isCollapsed = radioRow.classList.contains('is-collapsed-radio');
        const childRows = document.querySelectorAll('.cbi-section-table-row.is-ssid-row[data-parent-radio="' + radioId + '"]');

        childRows.forEach((childRow) => {
          if (isCollapsed) {
            if (!childRow.classList.contains('is-collapsed-child')) {
              childRow.classList.add('is-collapsed-child');
              childRow.style.display = 'none';
            }
          } else {
            if (childRow.classList.contains('is-collapsed-child')) {
              childRow.classList.remove('is-collapsed-child');
              childRow.style.display = '';
            }
          }
        });

        let countBadge = radioRow._countBadge || radioRow.querySelector('.sl-radio-count-badge');
        if (!countBadge) {
          countBadge = document.createElement('span');
          countBadge.className = 'sl-radio-count-badge';
          countBadge.style.cursor = 'pointer';
          countBadge.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            radioRow.classList.toggle('is-collapsed-radio');
            updateChildrenVisibility();
          });
          radioRow._countBadge = countBadge;
        }

        const statCell = radioRow.querySelector('[data-name="_stat"] big') || radioRow.querySelector('[data-name="_stat"]');
        if (statCell && countBadge.parentNode !== statCell) {
          statCell.appendChild(countBadge);
        }

        if (countBadge) {
          const countStr = childRows.length > 0 ? childRows.length.toString() : '';
          if (countBadge.textContent !== countStr) {
            countBadge.textContent = countStr;
          }
          const countTitle = childRows.length === 1 ? '1 network' : childRows.length + ' networks';
          if (countBadge.title !== countTitle) {
            countBadge.title = countTitle;
          }
          const expectedDisplay = childRows.length > 0 ? '' : 'none';
          if (countBadge.style.display !== expectedDisplay) {
            countBadge.style.display = expectedDisplay;
          }
        }
      });
    };

    const applyClasses = () => {
      if (!isWirelessPage()) return;
      const rows = document.querySelectorAll('.cbi-section-table-row[data-sid]');
      if (!rows.length) return;

      let currentRadioSid = null;

      rows.forEach((row) => {
        if (row.querySelector('.cbi-button-add')) {
          currentRadioSid = row.getAttribute('data-sid') || 'radio';
          if (!row.classList.contains('is-radio-row')) {
            row.classList.add('is-radio-row');
            row.classList.remove('is-ssid-row');
          }
          if (row.getAttribute('data-radio-id') !== currentRadioSid) {
            row.setAttribute('data-radio-id', currentRadioSid);
          }

          const firstCell = row.querySelector('td:first-child, .td:first-child, [data-name="_badge"]');
          if (firstCell && !firstCell.querySelector('.sl-radio-collapse-toggle')) {
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'sl-radio-collapse-toggle';
            toggle.setAttribute('aria-label', 'Toggle networks');
            toggle.title = 'Collapse / Expand';
            toggle.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>';

            firstCell.prepend(toggle);

            toggle.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              row.classList.toggle('is-collapsed-radio');
              updateChildrenVisibility();
            });
          }

          if (!row.hasAttribute('data-radio-init')) {
            row.setAttribute('data-radio-init', '1');
            row.classList.add('is-collapsed-radio');
            try {
              localStorage.removeItem('streamline.wifi_collapsed_' + currentRadioSid);
            } catch (_) {}
          }

        } else if (row.querySelector('.enable-disable, .remove, [data-signal]')) {
          if (!row.classList.contains('is-ssid-row')) {
            row.classList.add('is-ssid-row');
            row.classList.remove('is-radio-row');
          }
          if (currentRadioSid && row.getAttribute('data-parent-radio') !== currentRadioSid) {
            row.setAttribute('data-parent-radio', currentRadioSid);
          }

          const btn = row.querySelector('.enable-disable');
          if (btn && (btn.textContent.trim().toLowerCase() === 'enable' || btn.textContent.trim().toLowerCase() === 'ativar')) {
            if (!row.classList.contains('is-disabled-network')) row.classList.add('is-disabled-network');
          } else {
            if (row.classList.contains('is-disabled-network')) row.classList.remove('is-disabled-network');
          }
        }
      });

      updateChildrenVisibility();
    };

    let isMutating = false;
    const syncWireless = () => {
      if (isMutating) return;
      isMutating = true;
      try {
        applyClasses();
      } finally {
        isMutating = false;
      }
    };

    syncWireless();
    const main = document.querySelector('#maincontent') || document.body;
    if (main && window.MutationObserver) {
      const observer = new MutationObserver((mutations) => {
        if (isMutating) return;
        let relevant = false;
        for (let i = 0; i < mutations.length; i++) {
          const t = mutations[i].target;
          if (t && t.classList && (t.classList.contains('sl-radio-collapse-toggle') || t.classList.contains('sl-radio-count-badge'))) {
            continue;
          }
          relevant = true;
          break;
        }
        if (relevant) {
          syncWireless();
        }
      });
      observer.observe(main, { childList: true, subtree: true });
    }
  }
});

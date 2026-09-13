'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
  __init__() {
    ui.menu.load().then((tree) => this.render(tree));
  },

  render(tree) {
    let node = tree;
    let url = '';
    this.renderModeMenu(tree);
    this.setupSidebar();

    if (L.env.dispatchpath.length >= 3) {
      for (let i = 0; i < 3 && node; i++) {
        node = node.children[L.env.dispatchpath[i]];
        url += (url ? '/' : '') + L.env.dispatchpath[i];
      }
      if (node)
        this.renderTabMenu(node, url);
    }
  },

  renderTabMenu(tree, url, level) {
    const container = document.querySelector('#tabmenu');
    const ul = E('ul', { 'class': 'tabs' });
    const children = ui.menu.getChildren(tree);
    let activeNode = null;

    children.forEach((child) => {
      const active = L.env.dispatchpath[3 + (level || 0)] === child.name;
      ul.appendChild(E('li', { 'class': 'tabmenu-item-%s%s'.format(child.name, active ? ' active' : '') }, [
        E('a', { 'href': L.url(url, child.name) }, [_(child.title)])
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
    const children = ui.menu.getChildren(tree);
    if (!children.length || level > 1)
      return E([]);

    if (!level && !ul.querySelector('.mobile-home')) {
      const homeUrl = L.url('admin/status/overview');
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
      const childName = String(child.name || '').toLowerCase();
      const childTitle = String(child.title || '').toLowerCase();
      if (childName === 'argon-config' || childName === 'argon_config' || childTitle === 'argon config')
        return;

      const submenu = this.renderMainMenu(child, url + '/' + child.name, (level || 0) + 1);
      const hasSubmenu = !!submenu.firstElementChild;
      const active = L.env.dispatchpath[(level || 0) + 1] === child.name;
      const path = url + '/' + child.name;
      const state = hasSubmenu ? this.getPreference('streamline.menu.' + path) : null;
      const open = hasSubmenu && (state == null ? active : state === 'open');
      const itemClass = 'menu-item-' + String(child.name || 'item').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const li = E('li', { 'class': itemClass + ' ' + (hasSubmenu ? 'dropdown ' : '') + (active ? 'active ' : '') + (open ? 'open' : '') });
      const link = E('a', {
        'class': hasSubmenu ? 'menu' : '',
        'href': hasSubmenu ? '#' : L.url(url, child.name),
        'title': _(child.title),
        'aria-expanded': hasSubmenu ? String(open) : null
      }, [E('span', { 'class': 'menu-label' }, [_(child.title)])]);

      if (hasSubmenu) {
        li.setAttribute('data-preference-key', 'streamline.menu.' + path);
        submenu.id = 'streamline-menu-' + child.name;
        link.setAttribute('aria-controls', submenu.id);
        link.addEventListener('click', (event) => {
          event.preventDefault();
          const mobile = window.matchMedia('(max-width: 854px)').matches;
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
          if (document.body.classList.contains('sidebar-collapsed')) {
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
          if (event.target.closest('a'))
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
    ui.menu.getChildren(tree).forEach((child, index) => {
      const active = L.env.requestpath.length ? child.name === L.env.requestpath[0] : index === 0;
      ul.appendChild(E('li', { 'class': active ? 'active' : '' }, [
        E('a', { 'href': L.url(child.name) }, [_(child.title)])
      ]));
      if (active)
      this.renderMainMenu(child, child.name);
    });
    if (ul.children.length > 1)
      ul.style.display = '';
  },

  applyPalette(name) {
    const palette = name === 'glinet' ? 'glinet' : 'streamline';
    document.documentElement.setAttribute('data-palette', palette);
    this.setPreference('streamline.palette', palette);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor)
      themeColor.setAttribute('content', palette === 'glinet' ? '#111331' : '#0b0e14');
    const favicon = document.querySelector('link[rel~="icon"]');
    if (favicon) {
      const iconName = palette === 'glinet' ? 'logo-glinet.svg' : 'logo.svg';
      favicon.setAttribute('href', favicon.getAttribute('href').replace(/logo(?:-glinet)?\.svg(?:\?[^#]*)?/, iconName + '?v=1.0.20'));
    }
  },

  showPalettePicker() {
    const current = this.getPreference('streamline.palette') === 'glinet' ? 'glinet' : 'streamline';
    const palettes = [
      { id: 'streamline', title: 'Streamline', colors: ['#8b5cf6', '#4ea1ff', '#090b11'] },
      { id: 'glinet', title: 'GL.iNet', colors: ['#00d6c6', '#25aee8', '#080b25'] }
    ];
    const choices = E('div', { 'class': 'sl-palette-choices' });

    palettes.forEach((palette) => {
      const swatches = E('span', { 'class': 'sl-palette-swatches', 'aria-hidden': 'true' },
        palette.colors.map((color) => E('i', { 'style': 'background:' + color })));
      const button = E('button', {
        'type': 'button',
        'class': 'sl-palette-choice' + (palette.id === current ? ' active' : ''),
        'data-palette': palette.id,
        'aria-pressed': String(palette.id === current)
      }, [swatches, E('strong', {}, [palette.title]), E('small', {}, [palette.id === 'glinet' ? _('Turquoise and navy') : _('Purple and graphite')])]);

      button.addEventListener('click', () => {
        this.applyPalette(palette.id);
        choices.querySelectorAll('.sl-palette-choice').forEach((choice) => {
          const selected = choice.getAttribute('data-palette') === palette.id;
          choice.classList.toggle('active', selected);
          choice.setAttribute('aria-pressed', String(selected));
        });
      });
      choices.appendChild(button);
    });

    ui.showModal(_('Appearance'), [
      E('p', { 'class': 'sl-palette-description' }, [_('Choose the color palette used on this device.')]),
      choices,
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
      button.textContent = collapsed ? '›' : '‹';
      button.title = collapsed ? _('Expand navigation') : _('Collapse navigation');
    }
  },

  setMobileMenu(open) {
    document.body.classList.toggle('mobile-menu-open', open);
    const button = document.querySelector('.sidebar-toggle');
    if (button && window.matchMedia('(max-width: 854px)').matches) {
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? '×' : '☰';
      button.title = open ? _('Close navigation') : _('Open navigation');
    }
  },

  setupSidebar() {
    const header = document.querySelector('header');
    const mobileQuery = window.matchMedia('(max-width: 854px)');
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
      if (mobileQuery.matches)
        this.setMobileMenu(!document.body.classList.contains('mobile-menu-open'));
      else
        this.setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
    });
    header.appendChild(button);

    const closeMobileSections = () => {
      document.querySelectorAll('#topmenu > li.open').forEach((item) => {
        item.classList.remove('open');
        const link = item.querySelector(':scope > a');
        if (link)
          link.setAttribute('aria-expanded', 'false');
      });
    };

    const syncNavigationMode = () => {
      if (mobileQuery.matches) {
        document.body.classList.remove('sidebar-collapsed');
        closeMobileSections();
        this.setMobileMenu(false);
      } else {
        this.setMobileMenu(false);
        this.setSidebarCollapsed(this.getPreference('streamline.sidebar') === 'collapsed');
      }
    };
    syncNavigationMode();
    if (typeof mobileQuery.addEventListener === 'function')
      mobileQuery.addEventListener('change', syncNavigationMode);
    else
      mobileQuery.addListener(syncNavigationMode);

    document.addEventListener('click', (event) => {
      if (!mobileQuery.matches || event.target.closest('header'))
        return;
      document.querySelectorAll('#topmenu > li.open').forEach((item) => {
        item.classList.remove('open');
        const link = item.querySelector(':scope > a');
        if (link)
          link.setAttribute('aria-expanded', 'false');
      });
      this.setMobileMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('mobile-menu-open')) {
        closeMobileSections();
        this.setMobileMenu(false);
      }
    });
  }
});

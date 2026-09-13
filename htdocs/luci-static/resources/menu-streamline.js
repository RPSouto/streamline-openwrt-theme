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
      const li = E('li', { 'class': (hasSubmenu ? 'dropdown ' : '') + (active ? 'active ' : '') + (open ? 'open' : '') });
      const link = E('a', {
        'class': hasSubmenu ? 'menu' : '',
        'href': hasSubmenu ? '#' : L.url(url, child.name),
        'title': _(child.title),
        'aria-expanded': hasSubmenu ? String(open) : null
      }, [_(child.title)]);

      if (hasSubmenu) {
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
            document.body.classList.toggle('mobile-menu-open', isOpen);
          this.setPreference('streamline.menu.' + path, isOpen ? 'open' : 'closed');
        });

        submenu.addEventListener('click', (event) => {
          if (event.target.closest('a'))
            document.body.classList.remove('mobile-menu-open');
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

  setupSidebar() {
    const header = document.querySelector('header');
    if (!header || header.querySelector('.sidebar-toggle'))
      return;

    const button = E('button', {
      'type': 'button',
      'class': 'sidebar-toggle',
      'aria-label': _('Toggle navigation'),
      'aria-expanded': 'true'
    });
    button.addEventListener('click', () => {
      this.setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
    });
    header.appendChild(button);
    this.setSidebarCollapsed(this.getPreference('streamline.sidebar') === 'collapsed');

    const resetMobileMenu = () => {
      if (!window.matchMedia('(max-width: 854px)').matches)
        return;
      document.querySelectorAll('#topmenu > li.open').forEach((item) => {
        item.classList.remove('open');
        const link = item.querySelector(':scope > a');
        if (link)
          link.setAttribute('aria-expanded', 'false');
      });
      document.body.classList.remove('mobile-menu-open');
    };
    resetMobileMenu();
    window.addEventListener('resize', resetMobileMenu);

    document.addEventListener('click', (event) => {
      if (!window.matchMedia('(max-width: 854px)').matches || event.target.closest('header'))
        return;
      document.querySelectorAll('#topmenu > li.open').forEach((item) => {
        item.classList.remove('open');
        const link = item.querySelector(':scope > a');
        if (link)
          link.setAttribute('aria-expanded', 'false');
      });
      document.body.classList.remove('mobile-menu-open');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('mobile-menu-open')) {
        document.body.classList.remove('mobile-menu-open');
        document.querySelectorAll('#topmenu > li.open').forEach((item) => item.classList.remove('open'));
      }
    });
  }
});

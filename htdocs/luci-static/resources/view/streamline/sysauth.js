'use strict';
'require ui';
'require view';

return view.extend({
  render() {
    document.body.classList.add('login-page');
    try {
      window.sessionStorage.removeItem('streamline.session_init');
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith('streamline.menu.'))
          window.localStorage.removeItem(key);
      });
    } catch (e) {}

    const section = document.querySelector('section');
    const form = document.querySelector('form');
    const btn = document.querySelector('button');
    const hostnameNode = section ? section.querySelector('.login-hostname') : null;
    const versionNode = section ? section.querySelector('.login-version') : null;
    const hostname = hostnameNode ? hostnameNode.textContent.trim() : '';

    let versionText = versionNode ? versionNode.textContent.trim() : '';
    if (!versionText) {
      try {
        versionText = window.sessionStorage.getItem('streamline.openwrt_version') || '';
      } catch (_) {}
    }
    if (!versionText) {
      const brand = document.querySelector('.brand[data-sub], .mobile-brand[data-sub]');
      if (brand)
        versionText = brand.getAttribute('data-sub') || '';
    }
    if (!versionText)
      versionText = 'OPENWRT';

    const content = section
      ? Array.from(section.children).filter((node) => node !== hostnameNode && node !== versionNode)
      : [];
    const poweredNode = E('div', { 'class': 'login-powered' }, [versionText]);
    content.push(poweredNode);
    const dlg = ui.showModal(hostname || 'OpenWrt', content, 'login');

    if (versionText === 'OPENWRT' && typeof L !== 'undefined' && typeof L.require === 'function') {
      L.require('rpc').then((rpc) => {
        const callBoard = rpc.declare({
          object: 'system',
          method: 'board',
          expect: { release: {} }
        });
        callBoard().then((board) => {
          const rel = (board && board.release) || {};
          const dist = (rel.distribution && rel.distribution.trim()) ? rel.distribution.toUpperCase() : 'OPENWRT';
          const match = rel.version ? String(rel.version).match(/^(\d+)/) : null;
          let label = dist;
          if (match) {
            label = dist + ' ' + match[1];
          } else if (rel.version && /snapshot/i.test(String(rel.version))) {
            label = dist + ' SNAPSHOT';
          }
          if (label && poweredNode) {
            poweredNode.textContent = label;
          }
        }).catch(() => {});
      }).catch(() => {});
    }

    form.addEventListener('keypress', (event) => {
      if (event.key === 'Enter')
        btn.click();
    });

    btn.addEventListener('click', () => {
      try {
        window.sessionStorage.removeItem('streamline.session_init');
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith('streamline.menu.'))
            window.localStorage.removeItem(key);
        });
      } catch (e) {}
      dlg.querySelectorAll('*').forEach((node) => { node.style.display = 'none'; });
      dlg.appendChild(E('div', { 'class': 'spinning' }, _('Logging in…')));
      form.submit();
    });

    if (dlg && dlg.classList)
      dlg.classList.add('login');

    const passInput = document.querySelector('input[type="password"]');
    const userInput = document.querySelector('input[type="text"]');
    if (userInput && !userInput.value)
      userInput.focus();
    else if (passInput)
      passInput.focus();

    return '';
  },
  addFooter() {}
});

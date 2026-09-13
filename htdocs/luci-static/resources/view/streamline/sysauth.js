'use strict';
'require ui';
'require view';

return view.extend({
  render() {
    const section = document.querySelector('section');
    const form = document.querySelector('form');
    const btn = document.querySelector('button');
    const hostnameNode = section.querySelector('.login-hostname');
    const hostname = hostnameNode ? hostnameNode.textContent.trim() : '';
    const content = Array.from(section.children).filter((node) => node !== hostnameNode);
    content.unshift(E('div', { 'class': 'login-subtitle' }, _('Authorization Required')));
    const dlg = ui.showModal(hostname || _('Authorization Required'), content, 'login');

    form.addEventListener('keypress', (event) => {
      if (event.key === 'Enter')
        btn.click();
    });

    btn.addEventListener('click', () => {
      dlg.querySelectorAll('*').forEach((node) => { node.style.display = 'none'; });
      dlg.appendChild(E('div', { 'class': 'spinning' }, _('Logging in…')));
      form.submit();
    });

    document.querySelector('input[type="password"]').focus();
    return '';
  },
  addFooter() {}
});

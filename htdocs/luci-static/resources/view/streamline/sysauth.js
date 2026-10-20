'use strict';
'require ui';
'require view';

return view.extend({
  render() {
    document.body.classList.add('login-page');
    const section = document.querySelector('section');
    const form = document.querySelector('form');
    const btn = document.querySelector('button');
    const hostnameNode = section.querySelector('.login-hostname');
    const hostname = hostnameNode ? hostnameNode.textContent.trim() : '';
    const content = Array.from(section.children).filter((node) => node !== hostnameNode);
    content.push(E('div', { 'class': 'login-powered' }, ['Powered by OpenWrt']));
    const dlg = ui.showModal(hostname || 'OpenWrt', content, 'login');

    form.addEventListener('keypress', (event) => {
      if (event.key === 'Enter')
        btn.click();
    });

    btn.addEventListener('click', () => {
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

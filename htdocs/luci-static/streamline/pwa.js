(function () {
  'use strict';

  var installPrompt;
  var button;

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    installPrompt = event;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'pwa-install';
    button.textContent = document.documentElement.lang.indexOf('pt') === 0 ? 'Instalar app' : 'Install app';
    button.addEventListener('click', function () {
      if (!installPrompt)
        return;
      installPrompt.prompt();
      installPrompt.userChoice.then(function () {
        installPrompt = null;
        button.remove();
      });
    });
    document.body.appendChild(button);
  });

  window.addEventListener('appinstalled', function () {
    if (button)
      button.remove();
    installPrompt = null;
  });

  if (!('serviceWorker' in navigator) || !window.isSecureContext)
    return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/streamline-sw.js', { scope: '/cgi-bin/luci/' }).catch(function (error) {
      console.warn('Streamline PWA:', error);
    });
  });
}());

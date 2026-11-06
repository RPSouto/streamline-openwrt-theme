(function () {
  'use strict';

  if (!window.Streamline || typeof window.Streamline.registerAddon !== 'function')
    return;

  window.Streamline.registerAddon('glinet', {
    name: 'GL.iNet Hardware & Protocol Profiles',
    version: '1.0.0-3',
    vendor: 'GL.iNet',
    protocols: {
      wgclient: 'WireGuard Client (GL.iNet)',
      wgserver: 'WireGuard Server (GL.iNet)',
      ovpnclient: 'OpenVPN Client (GL.iNet)',
      ovpnserver: 'OpenVPN Server (GL.iNet)',
      tethering: 'Tethering (GL.iNet)',
      qmi: 'QMI Cellular',
      wwan: 'Wireless WAN',
      relay: 'Relay bridge',
      '3g': '3G / UMTS / GPRS',
      ncm: 'NCM Cellular',
      qcm: 'QCM Cellular',
      directip: 'DirectIP (Sierra)',
      callip: 'Cellular IP',
      amneziawg: 'Amnezia WireGuard'
    },
    routerProfiles: {
      'gl-mt6000': {
        name: 'GL.iNet GL-MT6000 (Flint 2)',
        vendor: 'GL.iNet',
        ports: [
          { device: 'eth1', role: 'wan', label: 'WAN (2.5G)' },
          { device: 'lan1', role: 'lan', label: 'LAN 1 (2.5G)' },
          { device: 'lan2', role: 'lan', label: 'LAN 2 (1G)' },
          { device: 'lan3', role: 'lan', label: 'LAN 3 (1G)' },
          { device: 'lan4', role: 'lan', label: 'LAN 4 (1G)' }
        ]
      },
      'gl-mt3000': {
        name: 'GL.iNet GL-MT3000 (Beryl AX)',
        vendor: 'GL.iNet',
        ports: [
          { device: 'eth0', role: 'wan', label: 'WAN (2.5G)' },
          { device: 'eth1', role: 'lan', label: 'LAN (1G)' }
        ]
      },
      'gl-axt1800': {
        name: 'GL.iNet GL-AXT1800 (Slate AX)',
        vendor: 'GL.iNet',
        ports: [
          { device: 'eth0', role: 'wan', label: 'WAN (Gigabit)' },
          { device: 'lan1', role: 'lan', label: 'LAN 1' },
          { device: 'lan2', role: 'lan', label: 'LAN 2' }
        ]
      },
      'gl-ax1800': {
        name: 'GL.iNet GL-AX1800 (Flint)',
        vendor: 'GL.iNet',
        ports: [
          { device: 'eth0', role: 'wan', label: 'WAN (Gigabit)' },
          { device: 'lan1', role: 'lan', label: 'LAN 1' },
          { device: 'lan2', role: 'lan', label: 'LAN 2' },
          { device: 'lan3', role: 'lan', label: 'LAN 3' },
          { device: 'lan4', role: 'lan', label: 'LAN 4' }
        ]
      },
      'gl-x3000': {
        name: 'GL.iNet GL-X3000 (Spitz AX)',
        vendor: 'GL.iNet',
        ports: [
          { device: 'eth0', role: 'wan', label: 'WAN (2.5G)' },
          { device: 'eth1', role: 'lan', label: 'LAN (Gigabit)' }
        ]
      },
      'gl-xe3000': {
        name: 'GL.iNet GL-XE3000 (Puli AX)',
        vendor: 'GL.iNet',
        ports: [
          { device: 'eth0', role: 'wan', label: 'WAN (2.5G)' },
          { device: 'eth1', role: 'lan', label: 'LAN (Gigabit)' }
        ]
      },
      'gl-mt2500': {
        name: 'GL.iNet GL-MT2500 (Brume 2)',
        vendor: 'GL.iNet',
        ports: [
          { device: 'eth0', role: 'wan', label: 'WAN (2.5G)' },
          { device: 'eth1', role: 'lan', label: 'LAN (Gigabit)' }
        ]
      }
    },
    classifiers: [
      function (dev, iface, raw, devName, ifaceName) {
        if (/^wgclient|wgserver/i.test(iface) || /^wgclient|wgserver/i.test(dev)) {
          return {
            category: 'vpn',
            className: 'sl-type-vpn',
            typeLabel: /server/i.test(iface || dev) ? 'WireGuard Server' : 'WireGuard Client',
            nameLabel: devName || ifaceName,
            icon: 'vpn'
          };
        }
        if (/^ovpnclient|ovpnserver/i.test(iface) || /^ovpnclient|ovpnserver/i.test(dev)) {
          return {
            category: 'vpn',
            className: 'sl-type-vpn',
            typeLabel: /server/i.test(iface || dev) ? 'OpenVPN Server' : 'OpenVPN Client',
            nameLabel: devName || ifaceName,
            icon: 'vpn'
          };
        }
        if (/^tethering/i.test(iface) || /^tethering/i.test(dev)) {
          return {
            category: 'tether',
            className: 'sl-type-tether',
            typeLabel: 'USB / Phone Tethering',
            nameLabel: devName || ifaceName,
            icon: 'tether'
          };
        }
        return null;
      }
    ]
  });
})();

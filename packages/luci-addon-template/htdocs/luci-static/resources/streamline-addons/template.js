/**
 * Streamline Theme - Router & Protocol Addon Template
 *
 * This file is automatically detected and loaded by Streamline when placed in:
 * /www/luci-static/resources/streamline-addons/<addon-name>.js
 */
(function () {
  'use strict';

  // Ensure Streamline registry is available
  if (!window.Streamline || typeof window.Streamline.registerAddon !== 'function')
    return;

  window.Streamline.registerAddon('template', {
    name: 'Sample Router Addon',
    version: '1.0.0-1',
    vendor: 'SampleVendor',

    /**
     * 1. Custom Protocols
     * Registers protocol titles into LuCI's network system.
     * When users view Network > Interfaces, these protocols will not crash with 404s.
     */
    protocols: {
      sampleproto: 'Sample Protocol (Vendor Name)'
    },

    /**
     * 2. Hardware Profiles & Port Mapping
     * Key: board ID substring or model name substring (case-insensitive)
     * Used by Dashboard port status cards.
     */
    routerProfiles: {
      'sample-router-model': {
        name: 'Sample Router Model Pro',
        vendor: 'SampleVendor',
        ports: [
          { device: 'eth0', role: 'wan', label: 'WAN (2.5G)' },
          { device: 'lan1', role: 'lan', label: 'LAN 1 (Gigabit)' },
          { device: 'lan2', role: 'lan', label: 'LAN 2 (Gigabit)' },
          { device: 'lan3', role: 'lan', label: 'LAN 3 (Gigabit)' },
          { device: 'lan4', role: 'lan', label: 'LAN 4 (Gigabit)' }
        ]
      }
    },

    /**
     * 3. Device & Interface Classifiers
     * Provides custom badge category, icon, and label in Network > Interfaces.
     */
    classifiers: [
      function (dev, iface, raw, devName, ifaceName) {
        if (/sampleproto/i.test(iface) || /sampleproto/i.test(dev)) {
          return {
            category: 'vpn',
            className: 'sl-type-vpn',
            typeLabel: 'Sample Protocol Tunnel',
            nameLabel: devName || ifaceName,
            icon: 'vpn'
          };
        }
        return null; // Return null to fall back to default Streamline classification
      }
    ],

    /**
     * 4. Optional Initialization Callback
     */
    init: function (streamline) {
      // Optional: run any custom UI enhancements or register custom widgets
    }
  });
})();

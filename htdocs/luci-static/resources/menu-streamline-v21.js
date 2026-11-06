'use strict';
'require baseclass';
'require ui';

const THEME_VERSION = '1.0.58-10';
const MOBILE_MEDIA_QUERY = '(max-width: 991px), (max-height: 550px) and (orientation: landscape)';
const FONTS = {
  system: { title: 'System', description: 'Default interface font', family: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  arial: { title: 'Arial', description: 'Clean sans serif', family: 'Arial, Helvetica, sans-serif' },
  serif: { title: 'Georgia', description: 'Classic serif', family: 'Georgia, "Times New Roman", serif' },
  mono: { title: 'Monospace', description: 'Technical fixed-width', family: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace' }
};
const PALETTES = {
  glinet: { title: 'GL.iNet', description: 'Turquoise and navy', colors: ['#00d6c6', '#25aee8', '#080b25'], themeColor: '#111331' },
  streamline: { title: 'Streamline', description: 'Purple and graphite', colors: ['#8b5cf6', '#4ea1ff', '#090b11'], themeColor: '#0b0e14' },
  ocean: { title: 'Ocean', description: 'Cool blue and deep sea', colors: ['#38bdf8', '#34d399', '#071521'], themeColor: '#071521' },
  forest: { title: 'Forest', description: 'Fresh green and pine', colors: ['#4ade80', '#60a5fa', '#0a1511'], themeColor: '#0a1511' },
  sunset: { title: 'Sunset', description: 'Warm orange and ember', colors: ['#fb923c', '#4ade80', '#17100f'], themeColor: '#17100f' },
  rose: { title: 'Rose', description: 'Soft pink and plum', colors: ['#f472b6', '#818cf8', '#180f18'], themeColor: '#180f18' },
  oled: { title: 'OLED Black', description: 'Pure obsidian for AMOLED', colors: ['#38bdf8', '#34d399', '#000000'], themeColor: '#000000' },
  light: { title: 'Light', description: 'Clean slate and neutral light', colors: ['#6366f1', '#0284c7', '#ffffff'], themeColor: '#f8fafc' }
};

return baseclass.extend({
  __init__() {
    this.initSession();
    this.setupSidebar();
    this.setupBrandVersion();
    this.setupFooter();
    this.normalizeRealtimeGraphs();
    this.normalizeFirewallBadges();
    this.normalizeWirelessOverview();
    this.setupWirelessLayout();
    this.loadWirelessEncryptionMap();
    this.setupClickToCopy();
    this.setupResponsiveTables();
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

  initSession() {
    const isLoginPage = typeof document !== 'undefined' && document.body && (document.body.classList.contains('login-page') || document.body.getAttribute('data-page') === 'admin-login');
    try {
      if (isLoginPage || !window.sessionStorage.getItem('streamline.session_init')) {
        window.sessionStorage.setItem('streamline.session_init', '1');
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith('streamline.menu.'))
            window.localStorage.removeItem(key);
        });
      }
    } catch (e) {}
  },

  normalizeRealtimeGraphs() {
    const isRealtime = () => {
      const page = document.body.getAttribute('data-page') || '';
      return page.includes('realtime') || window.location.pathname.includes('realtime');
    };

    const applyStyles = () => {
      if (!isRealtime())
        return;

      const svgs = document.querySelectorAll('#view svg, .cbi-section svg');
      for (let i = 0; i < svgs.length; i++) {
        const svg = svgs[i];
        if (svg.closest('.sl-radio-collapse-toggle, button, a, .btn, .cbi-button'))
          continue;
        if (!svg.querySelector('polyline'))
          continue;
        const container = svg.parentElement;
        if (!container || container.tagName === 'BUTTON' || container.tagName === 'A' || container.classList.contains('sl-radio-collapse-toggle'))
          continue;

        svg.style.setProperty('background', 'var(--sl-surface-2)', 'important');
        svg.style.setProperty('border-radius', 'var(--sl-radius)', 'important');
        container.classList.add('sl-realtime-graph');
        container.style.setProperty('background', 'var(--sl-surface-2)', 'important');
        container.style.setProperty('border', '1px solid var(--sl-border)', 'important');
        container.style.setProperty('border-radius', 'var(--sl-radius)', 'important');
        container.style.setProperty('overflow', 'hidden', 'important');
        container.style.setProperty('box-shadow', '0 4px 20px -2px rgba(0, 0, 0, 0.4)', 'important');
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

  normalizeFirewallBadges() {
    const parseRgb = (colorStr) => {
      if (!colorStr) return null;
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (match) {
        return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
      }
      const hex = colorStr.replace('#', '').trim();
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16)
        ];
      }
      if (hex.length === 6) {
        return [
          parseInt(hex.substring(0, 2), 16),
          parseInt(hex.substring(2, 4), 16),
          parseInt(hex.substring(4, 6), 16)
        ];
      }
      return null;
    };

    const applyFirewallStyles = () => {
      const badges = document.querySelectorAll('.zonebadge');
      for (let i = 0; i < badges.length; i++) {
        const badge = badges[i];

        if (badge.classList.contains('zonebadge-empty')) {
          const txt = badge.textContent.trim().toUpperCase();
          if (txt.includes('REJECT')) {
            badge.style.setProperty('background-color', 'rgba(244, 63, 94, 0.12)', 'important');
            badge.style.setProperty('border', '1px dashed rgba(244, 63, 94, 0.5)', 'important');
            badge.style.setProperty('color', '#fda4af', 'important');
          } else if (txt.includes('DROP')) {
            badge.style.setProperty('background-color', 'rgba(239, 68, 68, 0.14)', 'important');
            badge.style.setProperty('border', '1px dashed rgba(239, 68, 68, 0.55)', 'important');
            badge.style.setProperty('color', '#fca5a5', 'important');
          } else if (txt.includes('ACCEPT')) {
            badge.style.setProperty('background-color', 'rgba(16, 185, 129, 0.12)', 'important');
            badge.style.setProperty('border', '1px dashed rgba(16, 185, 129, 0.5)', 'important');
            badge.style.setProperty('color', '#6ee7b7', 'important');
          }
          continue;
        }

        if (badge.classList.contains('sl-zonebadge-styled'))
          continue;

        const rawBg = badge.style.backgroundColor;
        if (!rawBg)
          continue;

        badge.setAttribute('data-sl-rawbg', rawBg);
        badge.classList.add('sl-zonebadge-styled');

        const strongEl = badge.querySelector('strong');
        const emEl = badge.querySelector('em');
        const zoneName = (strongEl ? strongEl.textContent : badge.textContent).trim().toLowerCase();

        let r = 139, g = 92, b = 246;
        if (zoneName === 'lan') {
          r = 16; g = 185; b = 129;
        } else if (zoneName === 'wan' || zoneName === 'wan6') {
          r = 244; g = 63; b = 94;
        } else {
          const rgb = parseRgb(rawBg);
          if (rgb) {
            [r, g, b] = rgb;
          }
        }

        badge.style.setProperty('background-color', `rgba(${r}, ${g}, ${b}, 0.20)`, 'important');
        badge.style.setProperty('border', `1px solid rgba(${r}, ${g}, ${b}, 0.55)`, 'important');
        badge.style.setProperty('color', '#ffffff', 'important');
        badge.style.setProperty('box-shadow', `0 2px 6px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(${r}, ${g}, ${b}, 0.35)`, 'important');
        badge.style.setProperty('text-shadow', '0 1px 2px rgba(0, 0, 0, 0.6)', 'important');

        if (strongEl) {
          strongEl.style.setProperty('color', '#ffffff', 'important');
        }
        if (emEl) {
          emEl.style.setProperty('color', 'rgba(255, 255, 255, 0.75)', 'important');
        }
      }

      const policyItems = document.querySelectorAll('.cbi-dropdown > ul:not(.dropdown) > li');
      for (let k = 0; k < policyItems.length; k++) {
        const item = policyItems[k];
        const val = (item.getAttribute('data-value') || item.textContent).trim().toLowerCase();
        if (val === 'accept') {
          item.style.setProperty('color', '#34d399', 'important');
          item.style.setProperty('font-weight', '600', 'important');
        } else if (val === 'reject') {
          item.style.setProperty('color', '#fbbf24', 'important');
          item.style.setProperty('font-weight', '600', 'important');
        } else if (val === 'drop') {
          item.style.setProperty('color', '#f87171', 'important');
          item.style.setProperty('font-weight', '600', 'important');
        }
      }

      const policySelects = document.querySelectorAll('select.cbi-input-select');
      for (let s = 0; s < policySelects.length; s++) {
        const sel = policySelects[s];
        const updateSelectColor = () => {
          const v = sel.value.trim().toLowerCase();
          if (v === 'accept') {
            sel.style.setProperty('color', '#34d399', 'important');
            sel.style.setProperty('font-weight', '600', 'important');
          } else if (v === 'reject') {
            sel.style.setProperty('color', '#fbbf24', 'important');
            sel.style.setProperty('font-weight', '600', 'important');
          } else if (v === 'drop') {
            sel.style.setProperty('color', '#f87171', 'important');
            sel.style.setProperty('font-weight', '600', 'important');
          } else {
            sel.style.removeProperty('color');
            sel.style.removeProperty('font-weight');
          }
        };
        if (!sel.hasAttribute('data-sl-firewall-bound')) {
          sel.setAttribute('data-sl-firewall-bound', '1');
          sel.addEventListener('change', updateSelectColor);
        }
        updateSelectColor();
      }
    };

    let rafId = null;
    const scheduleApply = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        applyFirewallStyles();
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scheduleApply);
    } else {
      scheduleApply();
    }

    const targetNode = document.body;
    if (targetNode && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => scheduleApply());
      observer.observe(targetNode, { childList: true, subtree: true });
    }
  },

  formatWirelessModes(str) {
    if (!str || typeof str !== 'string') return str;
    const modeRegex = /\b802\.11(?:\s*(?:[\/+,]\s*)?(?:ax|ac|be|ad|ay|ah|[abgn]))+\b/gi;
    return str.replace(modeRegex, (match) => {
      const after = match.slice(6);
      const tokens = after.match(/ax|ac|be|ad|ay|ah|[abgn]/gi);
      if (!tokens || !tokens.length) return match;
      return '802.11 ' + tokens.map((t) => t.toLowerCase()).join('/');
    });
  },

  formatWirelessTextNodes(element) {
    if (!element || typeof document === 'undefined') return;
    if (element.nodeType === 3 /* Node.TEXT_NODE */) {
      if (element.nodeValue && /\b802\.11/i.test(element.nodeValue)) {
        const formatted = this.formatWirelessModes(element.nodeValue);
        if (formatted !== element.nodeValue) {
          element.nodeValue = formatted;
        }
      }
      return;
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && /\b802\.11/i.test(node.nodeValue)) {
        const formatted = this.formatWirelessModes(node.nodeValue);
        if (formatted !== node.nodeValue) {
          node.nodeValue = formatted;
        }
      }
    }
  },

  formatWifiEncryptionString(raw) {
    const noneStr = (typeof _ === 'function') ? _('None') : 'None';
    if (!raw || typeof raw !== 'string') return noneStr;
    const s = raw.toLowerCase().trim();
    if (s === 'none' || s === 'open' || s === 'off' || s === '') {
      return noneStr;
    }
    if (s === 'owe') {
      return 'OWE';
    }
    if (s === 'sae-mixed' || s === 'psk2/sae' || s === 'sae-compat' || s === 'wpa3-mixed' || s === 'mixed-sae') {
      return 'mixed WPA2/WPA3 PSK/SAE (CCMP)';
    }
    if (s === 'sae' || s === 'wpa3' || s === 'wpa3-sae' || s === 'sae-ext') {
      return 'WPA3 SAE (CCMP)';
    }
    if (s === 'wpa3-eap-mixed') {
      return 'mixed WPA2/WPA3 EAP (CCMP)';
    }
    if (s === 'wpa3-eap192') {
      return 'WPA3 EAP 192-bit (GCMP-256)';
    }
    if (s === 'wpa3-eap') {
      return 'WPA3 EAP (CCMP)';
    }
    if (s === 'psk-mixed' || s === 'wpa-mixed' || s === 'psk+psk2' || s === 'mixed-psk') {
      return 'mixed WPA/WPA2 PSK (TKIP, CCMP)';
    }
    if (s === 'wpa-eap-mixed' || s === 'eap-mixed') {
      return 'mixed WPA/WPA2 EAP (TKIP, CCMP)';
    }
    if (s === 'psk2+tkip+ccmp' || s === 'psk2+ccmp+tkip') {
      return 'WPA2 PSK (TKIP, CCMP)';
    }
    if (s === 'psk2+tkip' || s === 'psk2-tkip') {
      return 'WPA2 PSK (TKIP)';
    }
    if (s === 'psk2' || s === 'psk2+ccmp' || s === 'psk2+aes' || s === 'psk2-ccmp' || s === 'wpa2' || s === 'wpa2-psk') {
      return 'WPA2 PSK (CCMP)';
    }
    if (s === 'wpa2-eap' || s === 'eap2' || s === 'wpa2/eap') {
      return 'WPA2 EAP (CCMP)';
    }
    if (s === 'psk' || s === 'psk+tkip' || s === 'wpa' || s === 'wpa-psk') {
      return 'WPA PSK (TKIP)';
    }
    if (s === 'wpa-eap' || s === 'eap') {
      return 'WPA EAP (TKIP)';
    }
    if (s.startsWith('wep')) {
      return 'WEP';
    }
    return raw.toUpperCase();
  },

  isEncryptionLabel(label) {
    if (!label) return false;
    const t = label.replace(/:$/, '').trim().toLowerCase();
    if (typeof _ === 'function') {
      try {
        const localized = _('Encryption');
        if (localized && t === localized.toLowerCase()) return true;
      } catch (_) {}
    }
    return /encrypt|cript|cif|versch|chiff|szyfr|salaus|krypt|mã hóa|暗号|加密/i.test(t);
  },

  loadWirelessEncryptionMap() {
    if (this._wirelessEncMap) {
      return Promise.resolve(this._wirelessEncMap);
    }
    if (this._wirelessEncMapPromise) {
      return this._wirelessEncMapPromise;
    }
    if (typeof L === 'undefined' || typeof L.require !== 'function') {
      return Promise.resolve({});
    }

    const parseSections = (values) => {
      const map = {};
      if (!values || typeof values !== 'object') return map;
      const secs = Array.isArray(values) ? values : Object.values(values);
      secs.forEach((sec) => {
        if (!sec || (sec['.type'] !== 'wifi-iface' && sec.type !== 'wifi-iface')) return;
        const rawEnc = sec.encryption || 'none';
        const ssid = (sec.ssid || '').trim();
        const dev = (sec.device || '').trim();
        const formatted = this.formatWifiEncryptionString(rawEnc);
        if (ssid) {
          map[ssid.toLowerCase()] = formatted;
          if (dev) {
            map[dev.toLowerCase() + ':' + ssid.toLowerCase()] = formatted;
          }
        }
        if (sec.ifname) {
          map[sec.ifname.toLowerCase()] = formatted;
        }
      });
      return map;
    };

    this._wirelessEncMapPromise = new Promise((resolve) => {
      L.require('rpc').then((rpc) => {
        const callUciGet = rpc.declare({
          object: 'uci',
          method: 'get',
          params: ['config'],
          expect: { values: {} }
        });
        return callUciGet('wireless').then((res) => {
          const map = parseSections(res);
          this._wirelessEncMap = map;
          if (typeof this._runWirelessEnhance === 'function') {
            try { this._runWirelessEnhance(); } catch (_) {}
          }
          if (typeof this._syncWirelessLayout === 'function') {
            try { this._syncWirelessLayout(); } catch (_) {}
          }
          resolve(map);
        });
      }).catch(() => {
        L.require('uci').then((uci) => {
          return uci.load('wireless').then(() => {
            const ifaces = uci.sections('wireless', 'wifi-iface') || [];
            const map = parseSections(ifaces);
            this._wirelessEncMap = map;
            if (typeof this._runWirelessEnhance === 'function') {
              try { this._runWirelessEnhance(); } catch (_) {}
            }
            if (typeof this._syncWirelessLayout === 'function') {
              try { this._syncWirelessLayout(); } catch (_) {}
            }
            resolve(map);
          });
        }).catch(() => resolve({}));
      });
    });

    return this._wirelessEncMapPromise;
  },

  resolveWifiEncryption(ssid, dev) {
    if (!this._wirelessEncMap) return null;
    const s = (ssid || '').toLowerCase().trim();
    const d = (dev || '').toLowerCase().trim();
    if (d && s && this._wirelessEncMap[d + ':' + s]) {
      return this._wirelessEncMap[d + ':' + s];
    }
    if (s && this._wirelessEncMap[s]) {
      return this._wirelessEncMap[s];
    }
    return null;
  },

  fixWirelessEncryptionElement(container, radioDev) {
    if (!container) return;
    const nowraps = container.querySelectorAll('.nowrap');
    if (!nowraps || !nowraps.length) return;

    let ssidStr = '';
    let encNowrap = null;
    let encStrong = null;

    for (let i = 0; i < nowraps.length; i++) {
      const nw = nowraps[i];
      const strong = nw.querySelector('strong');
      if (!strong) continue;
      const label = (strong.textContent || '').trim();

      if (/ssid/i.test(label)) {
        ssidStr = nw.textContent.replace(strong.textContent, '').trim().replace(/^["']|["']$/g, '');
      } else if (this.isEncryptionLabel(label)) {
        encNowrap = nw;
        encStrong = strong;
      }
    }

    if (!encNowrap || !encStrong) return;

    const currentVal = encNowrap.textContent.replace(encStrong.textContent, '').trim();
    if (currentVal !== '-' && currentVal !== '?' && currentVal !== '') {
      return;
    }

    const resolved = this.resolveWifiEncryption(ssidStr, radioDev);
    if (!resolved) {
      this.loadWirelessEncryptionMap();
      return;
    }

    while (encNowrap.lastChild && encNowrap.lastChild !== encStrong) {
      encNowrap.removeChild(encNowrap.lastChild);
    }
    encNowrap.appendChild(document.createTextNode(' ' + resolved));
    encNowrap.setAttribute('data-sl-enc-resolved', '1');
  },

  classifyDevice(devName, ifaceName, rawText) {
    const dev = (devName || '').toLowerCase().trim();
    const iface = (ifaceName || '').toLowerCase().trim();
    const raw = (rawText || '').toLowerCase().trim();

    // 1. Empty / Virtual / No Physical Device
    if (!dev || dev === 'none' || dev === '""' || dev === '?' || /no interfaces attached|nenhuma interface/i.test(raw)) {
      const isVpn = /wg|wireguard|ovpn|openvpn/i.test(iface);
      return {
        category: 'virtual',
        className: 'sl-type-virtual',
        typeLabel: isVpn ? 'VPN Interface' : 'Virtual Interface',
        nameLabel: isVpn ? (ifaceName || 'Managed by Subsystem') : 'No physical device',
        isVirtual: true,
        icon: 'virtual'
      };
    }

    // 2. WireGuard VPN
    if (/^wg|wireguard/i.test(dev) || /^wg|wireguard/i.test(iface)) {
      return {
        category: 'vpn',
        className: 'sl-type-vpn',
        typeLabel: 'WireGuard VPN',
        nameLabel: devName,
        icon: 'vpn'
      };
    }

    // 3. OpenVPN / Tunnels
    if (/^(tun|tap|ovpn|gre|sit|ip6tnl)/i.test(dev) || /ovpn|openvpn/i.test(iface)) {
      return {
        category: 'vpn',
        className: 'sl-type-vpn',
        typeLabel: 'OpenVPN',
        nameLabel: devName,
        icon: 'vpn'
      };
    }

    // 4. USB Tethering
    if (/^(usb|rndis|cdc|ncm)\d*/i.test(dev) || /tether/i.test(iface)) {
      return {
        category: 'tether',
        className: 'sl-type-tether',
        typeLabel: 'USB Tethering',
        nameLabel: devName,
        icon: 'tether'
      };
    }

    // 5. Cellular / 4G / 5G Modem
    if (/^(wwan|qmi|mbim|modem)\d*/i.test(dev) || /wwan|modem|cellular|mobile/i.test(iface)) {
      return {
        category: 'cellular',
        className: 'sl-type-cellular',
        typeLabel: 'Cellular Modem',
        nameLabel: devName,
        icon: 'cellular'
      };
    }

    // 6. WAN Physical Port (eth1 on GL-MT6000 is 2.5G WAN)
    if (dev === 'eth1' || (/wan/i.test(iface) && /^(eth\d+|wan)/i.test(dev))) {
      const is25G = (dev === 'eth1');
      return {
        category: 'wan',
        className: 'sl-type-wan',
        typeLabel: is25G ? '2.5G WAN Port' : 'WAN Port',
        nameLabel: devName,
        icon: 'wan'
      };
    }

    // 7. Bridge Interface (e.g. br-lan)
    if (/^br-|^bridge/i.test(dev) || /bridge|ponte|puente|pont/i.test(raw)) {
      return {
        category: 'bridge',
        className: 'sl-type-bridge',
        typeLabel: 'LAN Bridge',
        nameLabel: devName,
        icon: 'bridge'
      };
    }

    // 8. Individual LAN Port (DSA switch port)
    if (/^lan\d+$/i.test(dev)) {
      const isLan25G = (dev === 'lan1');
      return {
        category: 'lan',
        className: 'sl-type-lan',
        typeLabel: isLan25G ? '2.5G LAN Port' : 'LAN Port',
        nameLabel: devName.toUpperCase(),
        icon: 'lan'
      };
    }

    // 9. VLAN Interface
    if (/\.\d+$|vlan/i.test(dev) || /vlan/i.test(raw)) {
      return {
        category: 'vlan',
        className: 'sl-type-vlan',
        typeLabel: 'VLAN',
        nameLabel: devName,
        icon: 'vlan'
      };
    }

    // 10. Alias / Sub-interface (@wan, @lan)
    if (/^@/.test(dev) || /alias/i.test(raw)) {
      return {
        category: 'alias',
        className: 'sl-type-alias',
        typeLabel: 'Alias Interface',
        nameLabel: devName,
        icon: 'virtual'
      };
    }

    // 11. Wi-Fi Wireless Adapter
    if (/^(wlan|ra|rax|ath|wl)\d+/i.test(dev) || /wireless|wifi/i.test(raw)) {
      return {
        category: 'wifi',
        className: 'sl-type-wifi',
        typeLabel: 'Wireless Network',
        nameLabel: devName,
        icon: 'wifi'
      };
    }

    // 12. Default physical Ethernet
    return {
      category: 'ethernet',
      className: 'sl-type-ethernet',
      typeLabel: 'Ethernet Adapter',
      nameLabel: devName || ifaceName,
      icon: 'ethernet'
    };
  },

  cleanDeviceBadges(box) {
    const badges = box.querySelectorAll('.ifacebadge');
    if (!badges || !badges.length) return;

    const head = box.querySelector('.ifacebox-head');
    const strong = head ? head.querySelector('strong') : null;
    const ifaceName = (strong ? strong.textContent : (head ? head.textContent : '')).trim();

    badges.forEach((badge) => {
      const text = badge.textContent || '';
      if (/SSID:|Mode:\s*(Master|Client|Ad-Hoc)|BSSID:|Encryption:|Associations:/i.test(text)) {
        return;
      }

      this.formatDeviceBadgeElement(badge, ifaceName);
    });
  },

  formatDeviceBadgeElement(badge, ifaceName) {
    if (!badge) return;
    if (badge.dataset && badge.dataset.slEnhanced) return;

    const fullText = (badge.textContent || '').trim();

    // 1. Extract device name if present
    let devName = '';
    const quoteMatch = fullText.match(/"([^"\r\n]+?)"/);
    if (quoteMatch) {
      devName = quoteMatch[1].trim();
    } else {
      const colonMatch = fullText.match(/:\s*"?([^\s()"'\r\n]+)/);
      if (colonMatch) {
        devName = colonMatch[1].trim();
      }
    }

    if (!devName || devName === 'none' || devName === '""' || devName === '?') {
      devName = '';
    }

    // 2. Extract ports if bridge
    let portsStr = '';
    const portsMatch = fullText.match(/\(([^)]+)\)/);
    if (portsMatch && !/no interfaces attached|nenhuma interface/i.test(portsMatch[1])) {
      portsStr = portsMatch[1].trim();
    }

    // 3. Classify device
    const info = this.classifyDevice(devName, ifaceName || '', fullText);

    badge.className = 'ifacebadge sl-device-badge ' + info.className;
    if (badge.dataset) badge.dataset.slEnhanced = '1';

    // SVG icon mapping
    const svgMap = {
      wan: '<svg class="sl-dev-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      lan: '<svg class="sl-dev-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h8v6h-2v3h-4v-3H8V8z"/></svg>',
      bridge: '<svg class="sl-dev-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="7" height="6" rx="2"/><rect x="14" y="14" width="7" height="6" rx="2"/><path d="M6.5 10v4M17.5 10v4"/></svg>',
      vpn: '<svg class="sl-dev-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="2"/></svg>',
      tether: '<svg class="sl-dev-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="19" r="2"/><circle cx="6" cy="9" r="1.5"/><circle cx="18" cy="9" r="1.5"/><path d="M12 17V8M6 10.5v2a3.5 3.5 0 0 0 3.5 3.5h5a3.5 3.5 0 0 0 3.5-3.5v-2"/></svg>',
      cellular: '<svg class="sl-dev-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h2M7 16v4M12 12v8M17 8v12M22 4v16"/></svg>',
      vlan: '<svg class="sl-dev-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
      virtual: '<svg class="sl-dev-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>',
      ethernet: '<svg class="sl-dev-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h8v6h-2v3h-4v-3H8V8z"/></svg>'
    };

    badge.innerHTML = '';

    // Icon wrapper
    const iconWrap = document.createElement('span');
    iconWrap.className = 'sl-device-icon-wrap ' + (info.isVirtual ? 'is-virtual' : '');
    iconWrap.innerHTML = svgMap[info.icon] || svgMap.ethernet;
    badge.appendChild(iconWrap);

    // Content container
    const content = document.createElement('span');
    content.className = 'sl-device-content';

    // Type label
    const typeSpan = document.createElement('span');
    typeSpan.className = 'sl-device-type';
    typeSpan.textContent = info.typeLabel;
    content.appendChild(typeSpan);

    // Separator dot
    const sepSpan = document.createElement('span');
    sepSpan.className = 'sl-device-sep';
    sepSpan.textContent = '•';
    content.appendChild(sepSpan);

    // Name or Empty label
    if (info.isVirtual) {
      const emptySpan = document.createElement('span');
      emptySpan.className = 'sl-device-empty-label';
      emptySpan.textContent = info.nameLabel;
      content.appendChild(emptySpan);
    } else {
      const nameSpan = document.createElement('strong');
      nameSpan.className = 'sl-device-name';
      nameSpan.textContent = info.nameLabel;
      content.appendChild(nameSpan);

      // If bridge has member ports, append ports pill
      if (portsStr) {
        const portsSpan = document.createElement('span');
        portsSpan.className = 'sl-device-ports';
        portsSpan.textContent = portsStr;
        portsSpan.setAttribute('title', 'Bridge member ports: ' + portsStr);
        content.appendChild(portsSpan);
      }
    }

    badge.appendChild(content);
  },

  normalizeWirelessOverview() {
    this.loadWirelessEncryptionMap();

    const enhance = () => {
      const boxes = document.querySelectorAll('.network-status-table .ifacebox');
      if (!boxes || !boxes.length) return;

      boxes.forEach((box) => {
        // Clean and modernize device footer badges (e.g. 2.5G WAN Port • eth1)
        this.cleanDeviceBadges(box);

        const head = box.querySelector('.ifacebox-head');
        if (!head) return;

        // Ensure upstream network cards NEVER get Wi-Fi frequency badges or icons
        const headText = head.textContent || '';
        if (/upstream/i.test(headText) || /wan/i.test(headText)) {
          head.classList.add('is-upstream');
          const strayBand = head.querySelector('.sl-radio-band');
          if (strayBand) strayBand.remove();
        }

        // Check for wireless indicators: wireless controller in strong, or channel/freq/SSID in body
        const strong = head.querySelector('strong');
        const telemetry = box.querySelector('.ifacebox-body > span:first-child');
        const telemetryText = telemetry ? telemetry.textContent || '' : '';

        const isWireless = (strong && /radio\d+|phy\d+|mt\d+|wireless/i.test(strong.textContent)) ||
                           /channel\s*:\s*\d+/i.test(telemetryText) ||
                           /bitrate\s*:/i.test(telemetryText) ||
                           /mode\s*:\s*master/i.test(box.textContent || '');

        if (!isWireless) {
          head.classList.add('is-non-wireless');
          const strayBand = head.querySelector('.sl-radio-band');
          if (strayBand) strayBand.remove();
          return;
        }

        // Format Wi-Fi modes (e.g. MediaTek 802.11bgnax -> MediaTek 802.11 b/g/n/ax)
        if (strong) {
          this.formatWirelessTextNodes(strong);
        }
        if (telemetry) {
          this.formatWirelessTextNodes(telemetry);
        }

        // Extract radio device name if present
        let radioDev = '';
        const devMatch = headText.match(/\b(radio\d+|mt\d+|phy\d+|ra\d+|rax\d+|wlan\d+)\b/i);
        if (devMatch) {
          radioDev = devMatch[1].toLowerCase();
        }

        // 1. Detect Frequency Band & inject Frequency pill in Header
        if (!head.querySelector('.sl-radio-band')) {
          let bandLabel = null;
          if (/\(\s*2\.\d+\s*GHz\s*\)|\b2\.4\s*GHz\b/i.test(telemetryText)) {
            bandLabel = '2.4 GHz';
          } else if (/\(\s*5\.\d+\s*GHz\s*\)|\b5\s*GHz\b/i.test(telemetryText)) {
            bandLabel = '5 GHz';
          } else if (/\(\s*6\.\d+\s*GHz\s*\)|\b6\s*GHz\b/i.test(telemetryText)) {
            bandLabel = '6 GHz';
          }

          if (bandLabel) {
            const bandPill = document.createElement('span');
            bandPill.className = 'sl-radio-band';
            bandPill.textContent = bandLabel;
            if (strong) {
              strong.insertAdjacentElement('afterend', bandPill);
            } else {
              head.appendChild(bandPill);
            }
          }
        }

        // 2. Enhance SSID Cards
        const badges = box.querySelectorAll('.ifacebadge');
        badges.forEach((badge) => {
          if (badge.querySelector('em') && !badge.classList.contains('sl-wifi-disabled')) {
            badge.classList.add('sl-wifi-disabled');
          }

          const nowraps = badge.querySelectorAll('.nowrap');
          nowraps.forEach((nw) => {
            const str = nw.textContent || '';
            const match = str.match(/Associations:\s*(\d+)/i);
            if (match && parseInt(match[1], 10) > 0) {
              nw.classList.add('has-associations');
            }
          });

          // Fix missing wireless encryption via UCI fallback
          this.fixWirelessEncryptionElement(badge, radioDev);
        });
      });
    };

    let isMutating = false;
    const runEnhance = () => {
      if (isMutating) return;
      isMutating = true;
      try {
        enhance();
      } finally {
        isMutating = false;
      }
    };
    this._runWirelessEnhance = runEnhance;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runEnhance);
    } else {
      runEnhance();
    }

    const targetNode = document.querySelector('#view') || document.querySelector('#maincontent') || document.body;
    if (targetNode && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => runEnhance());
      observer.observe(targetNode, { childList: true, subtree: true });
    }
  },

  preloadProtocols() {
    if (typeof L === 'undefined' || typeof L.require !== 'function')
      return;
    const glProtos = {
      qmi: 'QMI Cellular',
      wwan: 'Wireless WAN',
      relay: 'Relay bridge',
      wgclient: 'WireGuard Client (GL.iNet)',
      wgserver: 'WireGuard Server (GL.iNet)',
      ovpnclient: 'OpenVPN Client (GL.iNet)',
      ovpnserver: 'OpenVPN Server (GL.iNet)',
      tethering: 'Tethering (GL.iNet)'
    };
    L.require('network').then((network) => {
      if (!network || typeof network.registerProtocol !== 'function')
        return;
      Object.keys(glProtos).forEach((proto) => {
        if (!network.getProtocol(proto)) {
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
                  const o = s.taboption('general', form.DummyValue, '_gl_managed', _('Managed by System / GL.iNet'));
                  o.rawhtml = true;
                  o.default = '<div class="alert-message notice" style="margin: 8px 0; padding: 12px 16px; border-radius: 8px;">' +
                    '<strong>' + _(glProtos[proto]) + '</strong><br>' +
                    _('This interface protocol is managed by system services or external tools.') +
                    '</div>';
                }
              }).catch(() => {});
            }
          });
        }
      });
    }).catch(() => {});
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

    const tabmenuContainer = document.querySelector('#tabmenu');
    if (tabmenuContainer) {
      tabmenuContainer.innerHTML = '';
      tabmenuContainer.style.display = 'none';
    }

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
      if (!child || !child.title)
        return;
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
      const open = hasSubmenu && state === 'open';
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
        if (child.name === 'logout') {
          link.addEventListener('click', () => {
            try {
              window.sessionStorage.removeItem('streamline.session_init');
              Object.keys(window.localStorage).forEach((key) => {
                if (key.startsWith('streamline.menu.'))
                  window.localStorage.removeItem(key);
              });
            } catch (e) {}
          });
        }
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
    const palette = Object.prototype.hasOwnProperty.call(PALETTES, name) ? name : 'glinet';
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
    const current = Object.prototype.hasOwnProperty.call(PALETTES, savedPalette) ? savedPalette : 'glinet';
    const choices = E('div', { 'class': 'sl-palette-choices' });
    const savedFont = this.getPreference('streamline.font');
    const currentFont = Object.prototype.hasOwnProperty.call(FONTS, savedFont) ? savedFont : 'system';
    const fontChoices = E('div', { 'class': 'sl-font-choices' });

    Object.keys(PALETTES).forEach((id) => {
      const palette = PALETTES[id];
      const swatches = E('span', { 'class': 'sl-palette-swatches', 'aria-hidden': 'true' },
        palette.colors.map((color) => E('i', { 'style': 'background:' + color })));
      const text = E('div', { 'class': 'sl-palette-text' }, [
        E('strong', {}, [_(palette.title)]),
        E('small', {}, [_(palette.description)])
      ]);
      const button = E('button', {
        'type': 'button',
        'class': 'sl-palette-choice' + (id === current ? ' active' : ''),
        'data-palette': id,
        'aria-pressed': String(id === current)
      }, [swatches, text]);

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
    this.setupBrandVersion();
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

  setupBrandVersion() {
    const applyBrand = (label) => {
      if (!label) return;
      const brands = document.querySelectorAll('.brand, .mobile-brand');
      brands.forEach((b) => {
        if (b.getAttribute('data-sub') !== label) {
          b.setAttribute('data-sub', label);
        }
      });
    };

    // 1. Check if cached in sessionStorage
    try {
      const cached = window.sessionStorage.getItem('streamline.openwrt_version');
      if (cached) {
        applyBrand(cached);
        return;
      }
    } catch (_) {}

    // 2. Check if already present on DOM
    const existing = document.querySelector('.brand[data-sub], .mobile-brand[data-sub]');
    if (existing) {
      const val = existing.getAttribute('data-sub');
      if (val && val !== 'OPENWRT') {
        try {
          window.sessionStorage.setItem('streamline.openwrt_version', val);
        } catch (_) {}
        applyBrand(val);
        return;
      }
    }

    // 3. Query system.board via LuCI RPC
    if (typeof L !== 'undefined' && typeof L.require === 'function') {
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
          applyBrand(label);
          try {
            window.sessionStorage.setItem('streamline.openwrt_version', label);
          } catch (_) {}
        }).catch(() => {});
      }).catch(() => {});
    }
  },

  setupFooter() {
    const cleanFooter = () => {
      const footerSpan = document.querySelector('footer > span');
      if (!footerSpan) return;
      const text = footerSpan.textContent || '';
      if (/Powered by LuCI/i.test(text) || /-SNAPSHOT|r\d+\+/i.test(text) || /\sr\d+/i.test(text)) {
        const clean = text.replace(/Powered by LuCI[^\/]*\/\s*/i, '');
        const match = clean.match(/^(?:Streamline\s*·\s*)?([A-Za-z0-9_-]+)\s+(\d+\.\d+(?:\.\d+)?)/i);
        if (match) {
          footerSpan.textContent = 'Streamline · ' + match[1] + ' ' + match[2];
        }
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cleanFooter);
    } else {
      cleanFooter();
    }
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
    if (this._wirelessLayoutSetup) return;
    this._wirelessLayoutSetup = true;

    this.loadWirelessEncryptionMap();

    const isWirelessPage = () => {
      const page = typeof document !== 'undefined' && document.body && document.body.getAttribute('data-page');
      const path = (typeof window !== 'undefined' && window.location ? (window.location.pathname || '') + (window.location.hash || '') : '');
      const dispatch = this.getDispatchPath().join('/');
      return page === 'admin-network-wireless' ||
             path.indexOf('network/wireless') !== -1 ||
             dispatch.indexOf('network/wireless') !== -1 ||
             (typeof document !== 'undefined' && document.querySelector('.cbi-button-add') !== null && document.querySelector('.cbi-section-table') !== null);
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
        if (statCell) {
          this.formatWirelessTextNodes(statCell);
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

          const statCell = row.querySelector('[data-name="_stat"]');
          if (statCell) {
            this.formatWirelessTextNodes(statCell);
          }

          const firstCell = row.querySelector('td:first-child, .td:first-child, [data-name="_badge"]');
          if (firstCell && !firstCell.querySelector('.sl-radio-collapse-toggle')) {
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'sl-radio-collapse-toggle';
            toggle.setAttribute('aria-label', 'Toggle networks');
            toggle.title = 'Collapse / Expand';
            toggle.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

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

          // Fix missing wireless encryption on Network -> Wireless SSID rows
          this.fixWirelessEncryptionElement(row, currentRadioSid);
        }
      });

      const sectionNode = document.querySelector('[data-page="admin-network-wireless"] .cbi-section-node, #cbi-wireless .cbi-section-node');
      if (sectionNode) {
        const headings = sectionNode.querySelectorAll('big, strong, .cbi-section-descr');
        headings.forEach((h) => this.formatWirelessTextNodes(h));
      }

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
    this._syncWirelessLayout = syncWireless;

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
  },

  setupClickToCopy() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target;
      if (!target || this.isCopyExcluded(target))
        return;

      if (!target.hasAttribute('data-sl-copy-bound')) {
        target.setAttribute('data-sl-copy-bound', '1');
        const addr = this.resolveAddressFromElement(target, e);
        if (addr) {
          target.classList.add('sl-copyable-address');
          if (!target.getAttribute('title')) {
            const isPt = (document.documentElement.lang || '').startsWith('pt') ||
                         ((document.body && document.body.className) || '').includes('lang_pt');
            const hint = isPt ? 'Clique para copiar' : 'Click to copy';
            target.setAttribute('title', `${hint} (${addr.value})`);
          }
        }
      }
    }, { passive: true });

    document.addEventListener('click', (e) => {
      const sel = window.getSelection ? window.getSelection().toString().trim() : '';
      if (sel && sel.length > 0)
        return;

      const target = e.target;
      if (!target || this.isCopyExcluded(target))
        return;

      const addr = this.resolveAddressFromElement(target, e);
      if (!addr)
        return;

      this.copyToClipboard(addr.value).then(() => {
        this.showToast(addr.value, addr.type);
      }).catch((err) => {
        console.warn('Streamline click-to-copy failed:', err);
      });
    });
  },

  isCopyExcluded(target) {
    if (!target || typeof target.closest !== 'function')
      return true;

    // Exclude modal windows / dialogs
    if (target.closest('.modal, .modal-dialog, .cbi-modal, [role="dialog"], [aria-modal="true"], #modal_overlay'))
      return true;

    // Exclude buttons
    if (target.closest('button, .btn, .cbi-button, [role="button"], a.btn, input[type="button"], input[type="submit"], input[type="reset"], .mobile-toggle, .sl-quick-search-trigger, .sidebar-toggle, .sl-radio-collapse-toggle'))
      return true;

    // Exclude forms and form inputs
    if (target.closest('form, input, textarea, select, option, label, .cbi-dropdown, .cbi-input-text, .cbi-input-select, .cbi-input-checkbox, .cbi-input-radio, .cbi-value-field, [contenteditable="true"]'))
      return true;

    // Exclude theme navigation & chrome
    if (target.closest('.mobile-bar, header, nav, #topmenu, #modemenu, #tabmenu, .sl-sidebar, .sl-quick-search-modal, .sl-toast-container, .sl-palette-choices, .sl-font-choices'))
      return true;

    // Exclude active anchor links
    const anchor = target.closest('a');
    if (anchor && anchor.getAttribute('href') && !/^#|^javascript:/i.test(anchor.getAttribute('href')))
      return true;

    return false;
  },

  extractAddress(text) {
    if (!text || typeof text !== 'string')
      return null;

    const clean = text.trim();

    // 1. MAC Address (e.g. 00:11:22:33:44:55 or 00-11-22-33-44-55)
    const macMatch = clean.match(/\b([0-9A-Fa-f]{2}(?:[:-][0-9A-Fa-f]{2}){5})\b/);
    if (macMatch) {
      return { type: 'MAC', value: macMatch[1].toUpperCase() };
    }

    // 2. IPv4 Address (e.g. 192.168.1.1 or 192.168.1.1/24)
    const ipv4Match = clean.match(/\b((?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9]))(?:\/\d+)?\b/);
    if (ipv4Match) {
      return { type: 'IPv4', value: ipv4Match[1] };
    }

    // 3. IPv6 Address (e.g. fe80::1, fd00::1/60, 2001:db8::1)
    const isIPv6 = (str) => {
      const c = str.replace(/^\s*\[?|\s*\]?$/g, '').replace(/\/\d+$/, '');
      if ((c.match(/:/g) || []).length < 2) return false;
      if ((c.match(/::/g) || []).length > 1) return false;
      const parts = c.split('::');
      if (parts.length === 1) {
        const groups = c.split(':');
        if (groups.length !== 8) return false;
        return groups.every(g => /^[0-9a-fA-F]{1,4}$/.test(g));
      } else {
        const left = parts[0] ? parts[0].split(':') : [];
        const right = parts[1] ? parts[1].split(':') : [];
        if (left.length + right.length > 7) return false;
        return left.concat(right).every(g => /^[0-9a-fA-F]{1,4}$/.test(g));
      }
    };

    const tokens = clean.split(/[\s,()\[\]"']+/);
    for (let i = 0; i < tokens.length; i++) {
      const candidate = tokens[i].replace(/\/\d+$/, '');
      if (isIPv6(candidate)) {
        return { type: 'IPv6', value: candidate };
      }
    }

    return null;
  },

  resolveAddressFromElement(target, e) {
    if (!target)
      return null;

    if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      let textNode = null;
      let offset = 0;

      if (document.caretPositionFromPoint) {
        try {
          const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
          if (pos && pos.offsetNode && pos.offsetNode.nodeType === Node.TEXT_NODE) {
            textNode = pos.offsetNode;
            offset = pos.offset;
          }
        } catch (err) {}
      } else if (document.caretRangeFromPoint) {
        try {
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
            textNode = range.startContainer;
            offset = range.startOffset;
          }
        } catch (err) {}
      }

      if (textNode && textNode.textContent) {
        const fullText = textNode.textContent;
        let start = Math.max(0, Math.min(offset, fullText.length));
        let end = start;

        while (start > 0 && !/[\s,()\[\]"';<>]/.test(fullText.charAt(start - 1))) {
          start--;
        }
        while (end < fullText.length && !/[\s,()\[\]"';<>]/.test(fullText.charAt(end))) {
          end++;
        }
        const token = fullText.slice(start, end);
        const tokenAddr = this.extractAddress(token);
        if (tokenAddr)
          return tokenAddr;
      }
    }

    const text = target.textContent || '';
    if (text.length <= 120) {
      return this.extractAddress(text);
    }

    return null;
  },

  copyToClipboard(text) {
    return new Promise((resolve, reject) => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(resolve).catch(() => {
          this.fallbackCopy(text) ? resolve() : reject(new Error('Copy rejected'));
        });
      } else {
        this.fallbackCopy(text) ? resolve() : reject(new Error('Fallback copy failed'));
      }
    });
  },

  fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      success = false;
    }
    document.body.removeChild(textArea);
    return success;
  },

  showToast(value, type) {
    let container = document.getElementById('sl-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sl-toast-container';
      container.className = 'sl-toast-container';
      document.body.appendChild(container);
    }

    container.innerHTML = '';

    const isPt = (document.documentElement.lang || '').startsWith('pt') ||
                 ((document.body && document.body.className) || '').includes('lang_pt');
    const labelText = isPt ? 'Copiado' : 'Copied';

    const toast = document.createElement('div');
    toast.className = 'sl-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML =
      '<div class="sl-toast-icon">' +
        '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' +
      '</div>' +
      '<div class="sl-toast-body">' +
        '<span class="sl-toast-label">' + labelText + ':</span>' +
        '<code class="sl-toast-val">' + value.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>' +
      '</div>';

    container.appendChild(toast);

    window.requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.classList.add('is-hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 2400);
  },

  setupResponsiveTables() {
    const wrapTables = () => {
      const tables = document.querySelectorAll('table.table, .cbi-section-table, table');
      tables.forEach((tbl) => {
        const parent = tbl.parentElement;
        if (!parent) return;
        if (
          parent.classList.contains('cbi-section-node') ||
          parent.classList.contains('table-wrapper') ||
          parent.hasAttribute('data-chain') ||
          parent.classList.contains('modal') ||
          parent.classList.contains('modal-body') ||
          parent.closest('.table-wrapper, .modal, .modal-body, .cbi-tooltip, .cbi-section, .cbi-section-node') ||
          (parent.tagName === 'DIV' && parent.parentElement && parent.parentElement.classList.contains('cbi-section')) ||
          tbl.rows.length <= 1 ||
          tbl.querySelector('.cbi-progressbar')
        ) {
          return;
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        parent.insertBefore(wrapper, tbl);
        wrapper.appendChild(tbl);
      });
    };

    wrapTables();

    const main = document.querySelector('#maincontent') || document.body;
    if (main && window.MutationObserver) {
      let isMutating = false;
      const observer = new MutationObserver(() => {
        if (isMutating) return;
        isMutating = true;
        try {
          wrapTables();
        } finally {
          isMutating = false;
        }
      });
      observer.observe(main, { childList: true, subtree: true });
    }

    this.setupTableDragScroll();
  },

  setupTableDragScroll() {
    let activeContainer = null;
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;

    const findScrollContainer = (target) => {
      let container = target.closest(
        '.table-wrapper, .cbi-section > div, .cbi-section-node, div[data-chain], [data-page="admin-network-wireless"] .cbi-section-table, .cbi-section, table.table, table.leases, table.leases6, table#status_leases, table#status_leases6, table.assoclist, table#wifi_assoclist_table, #wifi_assoclist_table'
      );
      while (container && (container.tagName === 'TABLE' || container.scrollWidth <= container.clientWidth)) {
        if (container.tagName !== 'TABLE' && container.scrollWidth > container.clientWidth) break;
        container = container.parentElement ? container.parentElement.closest(
          '.table-wrapper, .cbi-section > div, .cbi-section-node, div[data-chain], [data-page="admin-network-wireless"] .cbi-section-table, .cbi-section, table.table, table.leases, table.leases6, table#status_leases, table#status_leases6, table.assoclist, table#wifi_assoclist_table, #wifi_assoclist_table'
        ) : null;
      }
      return container;
    };

    // Mouse drag scroll (for desktop click-and-drag with mouse)
    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const target = e.target;
      if (!target) return;
      if (target.closest('button, a, input, select, textarea, .cbi-button, .sl-copyable-address, [role="button"], label')) {
        return;
      }

      const container = findScrollContainer(target);
      if (!container || container.scrollWidth <= container.clientWidth) return;

      activeContainer = container;
      startX = e.pageX - container.getBoundingClientRect().left;
      scrollLeft = container.scrollLeft;
      isDragging = false;
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (!activeContainer) return;
      const x = e.pageX - activeContainer.getBoundingClientRect().left;
      const walk = x - startX;
      if (!isDragging && Math.abs(walk) > 6) {
        isDragging = true;
      }
      if (isDragging) {
        activeContainer.scrollLeft = scrollLeft - walk;
        try {
          const sel = window.getSelection();
          if (sel && sel.empty) sel.empty();
          else if (sel && sel.removeAllRanges) sel.removeAllRanges();
        } catch (err) {}
      }
    }, { passive: true });

    const endDrag = () => {
      activeContainer = null;
      isDragging = false;
    };

    document.addEventListener('mouseup', endDrag, { passive: true });
    document.addEventListener('mouseleave', endDrag, { passive: true });

    // Touch drag scroll tracking for mobile (complements native touch scrolling)
    let touchContainer = null;
    let touchStartX = 0;
    let touchScrollLeft = 0;

    document.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const target = e.touches[0].target;
      if (!target) return;
      if (target.closest('button, a, input, select, textarea, .cbi-button, [role="button"], label')) {
        return;
      }

      const container = findScrollContainer(target);
      if (!container || container.scrollWidth <= container.clientWidth) return;

      touchContainer = container;
      touchStartX = e.touches[0].pageX - container.getBoundingClientRect().left;
      touchScrollLeft = container.scrollLeft;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!touchContainer || !e.touches || e.touches.length !== 1) return;
      touchScrollLeft = touchContainer.scrollLeft;
    }, { passive: true });

    const endTouch = () => {
      touchContainer = null;
    };

    document.addEventListener('touchend', endTouch, { passive: true });
    document.addEventListener('touchcancel', endTouch, { passive: true });
  }
});

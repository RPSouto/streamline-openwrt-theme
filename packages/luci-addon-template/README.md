# Streamline Router Addon Template

Este diretório serve como modelo base (boilerplate) para criar extensões e pacotes de suporte a routers de qualquer fabricante para o tema **Streamline** (ex.: Teltonika, Xiaomi, Cudy, MikroTik, Asus, etc.).

---

## Estrutura do Addon

```
luci-addon-template/
├── Makefile                                              # Makefile compatível com OpenWrt SDK
├── build-ipk.sh                                          # Script de compilação autónomo para .ipk
├── packaging/
│   ├── control                                           # Metadados do pacote opkg
│   ├── postinst                                          # Script pós-instalação (limpa cache LuCI)
│   └── postrm                                            # Script pós-remoção
└── htdocs/
    └── luci-static/
        └── resources/
            ├── streamline-addons/
            │   └── template.js                           # Registo de perfis de hardware e protocolos
            └── protocol/
                └── sampleproto.js                        # Handler LuCI JavaScript (evita 404s ao editar)
```

---

## Como Criar um Novo Addon para Outro Fabricante

1. **Duplicar a pasta do modelo:**
   ```bash
   cp -R packages/luci-addon-template packages/luci-addon-teltonika
   ```

2. **Personalizar os metadados:**
   - Editar `packaging/control` e `Makefile` mudando o nome para `luci-addon-teltonika`.
   - Renomear `htdocs/luci-static/resources/streamline-addons/template.js` para `teltonika.js`.

3. **Configurar os perfis de router e protocolos no JavaScript:**
   No ficheiro `streamline-addons/teltonika.js`:
   ```javascript
   window.Streamline.registerAddon('teltonika', {
     name: 'Teltonika Hardware Profiles',
     version: '1.0.0-1',
     vendor: 'Teltonika',
     protocols: {
       rut_cellular: 'Teltonika Mobile Data'
     },
     routerProfiles: {
       'rutx50': {
         name: 'Teltonika RUTX50 5G Gateway',
         vendor: 'Teltonika',
         ports: [
           { device: 'eth0', role: 'wan', label: 'WAN' },
           { device: 'lan1', role: 'lan', label: 'LAN 1' },
           { device: 'lan2', role: 'lan', label: 'LAN 2' },
           { device: 'lan3', role: 'lan', label: 'LAN 3' },
           { device: 'lan4', role: 'lan', label: 'LAN 4' }
         ]
       }
     }
   });
   ```

4. **Compilar o pacote `.ipk`:**
   ```bash
   ./build-ipk.sh
   ```
   Ou a partir da raiz do repositório:
   ```bash
   ./build-addons.sh
   ```

5. **Instalação no router:**
   ```bash
   opkg install luci-addon-teltonika_1.0.0-1_all.ipk
   ```

---

## Como o Streamline Detecta os Addons

O tema Streamline insere no cabeçalho HTML uma deteção do lado do servidor:
- **Zero chamadas RPC:** Verifica diretamente se existem ficheiros `.js` em `/www/luci-static/resources/streamline-addons/`.
- **Zero erros 404:** Se o addon não estiver instalado, nenhuma tag `<script>` é emitida.
- **Carregamento diferido (`defer`):** O script regista-se no objeto global `window.Streamline` antes da inicialização do dashboard e do menu de interfaces.

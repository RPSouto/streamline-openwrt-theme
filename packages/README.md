# Streamline Addon Ecosystem & Router Extension Architecture

Este diretório contém os pacotes modulares de extensões (**Addons**) para o tema **Streamline**. 

A arquitetura de addons permite adicionar suporte a perfis de hardware específicos de diferentes fabricantes (GL.iNet, Teltonika, Xiaomi, MikroTik, Asus, etc.), mapeamento personalizado de portas Ethernet/SFP/WAN, protocolos proprietários e widgets customizados **sem modificar o núcleo do tema e sem qualquer conflito de ficheiros (`check_data_file_clashes`)**.

---

## Pacotes Disponíveis

| Pacote | Versão | Descrição |
|---|---|---|
| `luci-proto-glinet` | `1.0.0-3` | Suporte completo a 14 protocolos GL.iNet/celulares (`wgclient`, `wgserver`, `ovpnclient`, `ovpnserver`, `tethering`, `qmi`, `wwan`, `relay`, `3g`, `ncm`, `qcm`, `directip`, `callip`, `amneziawg`) e perfis de hardware de routers GL.iNet (Flint 2, Beryl AX, Slate AX, Spitz AX, Puli AX, Brume 2, etc.). |
| `luci-addon-template` | `1.0.0-1` | Modelo base (boilerplate) documentado para criação rápida de addons para novos fabricantes e equipamentos. |

---

## Como Funciona a Arquitetura de Addons

### 1. Deteção Dinâmica no Servidor (Zero Chamadas RPC & Zero Erros 404)
Nos cabeçalhos do Streamline (`header.htm` em Lua e `header.ut` em ucode), o tema efetua uma verificação local rápida de ficheiros `.js` no diretório:
```
/www/luci-static/resources/streamline-addons/*.js
```
- Se o pacote do addon **estiver instalado**, o tema renderiza a tag `<script defer src="/luci-static/resources/streamline-addons/<addon>.js">`.
- Se o addon **não estiver instalado**, **nenhuma tag `<script>` é emitida**, evitando requisições HTTP e erros 404 no browser.
- O carregamento com `defer` garante execução antes dos controladores de vista e do dashboard, registando o addon no namespace global.

### 2. Namespace Global `window.Streamline`
O tema disponibiliza um objeto global leve e seguro:
```javascript
window.Streamline = {
  version: '1.0.58-10',
  addons: {},
  protocols: {},
  routerProfiles: {},
  classifiers: [],
  customWidgets: [],
  registerAddon(id, def) { ... },
  registerRouterProfile(id, profile) { ... },
  registerProtocol(id, title) { ... },
  getRouterProfile(board, model) { ... },
  getProtocol(name) { ... }
};
```

### 3. Integração Automática com o Dashboard
Ao detetar portas Ethernet/WAN no Dashboard (`dashboard.js`), o Streamline consulta `Streamline.getRouterProfile(boardId, modelName)`. Se existir um perfil registado por um addon, as portas e velocidades (ex.: 2.5G WAN, 2.5G LAN) são imediatamente mapeadas com precisão física.

### 4. Integração com a Gestão de Interfaces
Na vista de *Rede > Interfaces*, o Streamline consome `Streamline.protocols` e os classificadores personalizados (`classifiers`), garantindo que interfaces geridas por serviços externos recebam etiquetas, ícones e estados sem necessidade de ficheiros de protocolo fictícios no tema base.

---

## Como Criar um Novo Addon para Outro Router

1. Copie o diretório `luci-addon-template`:
   ```bash
   cp -R packages/luci-addon-template packages/luci-addon-meufabricante
   ```

2. Ajuste `packaging/control` com o nome e descrição do seu pacote.
3. Crie ou edite o ficheiro `htdocs/luci-static/resources/streamline-addons/meufabricante.js`:
   ```javascript
   (function () {
     'use strict';
     if (!window.Streamline || typeof window.Streamline.registerAddon !== 'function') return;

     window.Streamline.registerAddon('meufabricante', {
       name: 'Meu Fabricante Hardware & Protocol Profiles',
       version: '1.0.0-1',
       vendor: 'MeuFabricante',
       protocols: {
         meuproto: 'Meu Protocolo Especial'
       },
       routerProfiles: {
         'modelo-xyz': {
           name: 'Router Modelo XYZ Pro',
           vendor: 'MeuFabricante',
           ports: [
             { device: 'eth0', role: 'wan', label: 'WAN (2.5G)' },
             { device: 'lan1', role: 'lan', label: 'LAN 1 (Gigabit)' },
             { device: 'lan2', role: 'lan', label: 'LAN 2 (Gigabit)' }
           ]
         }
       }
     });
   })();
   ```

4. Compile o pacote com o script local:
   ```bash
   cd packages/luci-addon-meufabricante && ./build-ipk.sh
   ```
   Ou a partir da raiz do repositório para compilar todos os addons:
   ```bash
   ./build-addons.sh
   ```

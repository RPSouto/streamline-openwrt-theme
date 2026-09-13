# Streamline para LuCI

Tema escuro para OpenWrt inspirado na linguagem visual do Stremio Server: navegação lateral, cartões discretos, acentos roxos, estados em verde/âmbar e alta densidade de informação. Não contém código nem marcas do Stremio.

## Compatibilidade

- OpenWrt 21.02, 22.03, 23.05, 24.10, 25.12 e LuCI atual.
- Templates Lua (`.htm`) para versões antigas e ucode (`.ut`) para versões novas no mesmo pacote.
- `opkg`/IPK, `apk` e instalação direta por SSH.
- Arquitetura independente (`all`): apenas HTML, CSS, JavaScript e SVG.
- GL.iNet Flint 2 (GL-MT6000): o tema altera somente o LuCI aberto em **Sistema → Definições avançadas**. O painel principal da GL.iNet permanece inalterado.
- Sidebar recolhível e secções de navegação expansíveis, com estado guardado no navegador.
- Visualizadores de syslog, kernel log e saídas de comandos com largura total e scroll próprio.

## Teste rápido no Flint 2

Mantenha uma sessão SSH aberta durante o primeiro teste. Copie esta pasta inteira para o router:

```sh
scp -r luci-theme-streamline root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'sh /tmp/luci-theme-streamline/install.sh'
```

Depois abra **Sistema → Definições avançadas → Ir para LuCI** no painel GL.iNet. Se o browser ainda mostrar o tema anterior, faça uma atualização forçada (`Ctrl+F5`).

Para remover:

```sh
ssh root@192.168.8.1 'sh /tmp/luci-theme-streamline/uninstall.sh'
```

Recuperação manual caso o LuCI não carregue:

```sh
uci set luci.main.mediaurlbase='/luci-static/bootstrap'
uci commit luci
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
/etc/init.d/uhttpd restart
```

## Instalação como PWA

O tema inclui manifesto e service worker. Abra o LuCI em HTTPS e use **Instalar app** no menu do Chrome/Edge ou **Adicionar ao ecrã principal** no Android.

O service worker guarda apenas CSS, ícone e a página de indisponibilidade. Navegação LuCI, autenticação, RPC/ubus e páginas de configuração nunca são guardadas; quando o router não está acessível, a PWA apenas explica como voltar à rede local/VPN.

Se o LuCI ainda não tiver HTTPS, instale a variante SSL adequada ao firmware (`luci-ssl` em instalações OpenWrt habituais) e aceda pelo endereço HTTPS do router. Certificados autoassinados precisam ser aceites pelo dispositivo antes de o browser permitir a instalação da PWA.

## Compilar pacote IPK/APK

Para gerar um IPK universal numa máquina Linux com GNU `tar`:

```sh
sh build-ipk.sh
```

O resultado é `luci-theme-streamline_1.0.9-1_all.ipk`. Para instalar no router:

```sh
scp luci-theme-streamline_1.0.9-1_all.ipk root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'opkg install /tmp/luci-theme-streamline_1.0.9-1_all.ipk'
```

Para integrar o tema numa imagem completa ou produzir um pacote APK, copie a pasta para o buildroot:

Copie a pasta para `feeds/luci/themes/luci-theme-streamline` num buildroot OpenWrt/LuCI da versão desejada e execute:

```sh
./scripts/feeds update luci
./scripts/feeds install luci-theme-streamline
make package/luci-theme-streamline/compile V=s
```

O formato final é determinado pelo buildroot: releases com `opkg` produzem `.ipk`; versões baseadas em `apk` produzem `.apk`.

## Desenvolvimento

As cores e medidas principais ficam nas variáveis no início de `htdocs/luci-static/streamline/cascade.css`. Ao alterar assets PWA, incremente `CACHE` em `htdocs/streamline-sw.js` para eliminar automaticamente o cache anterior.

## Licença

Apache-2.0. As estruturas de integração seguem a API pública e os templates de referência do projeto LuCI, também licenciados em Apache-2.0.

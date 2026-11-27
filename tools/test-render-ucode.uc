let header_fn = loadfile('ucode/template/themes/streamline/header.ut', { raw_mode: false });
let footer_fn = loadfile('ucode/template/themes/streamline/footer.ut', { raw_mode: false });
let sysauth_fn = loadfile('ucode/template/themes/streamline/sysauth.ut', { raw_mode: false });

global.env = {
    ubus: { call: (mod, meth) => ({ release: { distribution: 'OpenWrt', version: '24.10.3' }, hostname: 'OpenWrt-Test' }) },
    http: { prepare_content: () => {} },
    dispatcher: { lang: 'en', build_url: () => '/url', lookup: () => false },
    ctx: { request_path: ['admin', 'status', 'overview'], path: ['admin', 'status', 'overview'] },
    media: '/luci-static/streamline',
    resource: '/luci-static/resources',
    blank_page: false,
    version: { distname: 'OpenWrt', distversion: '24.10.3' },
    entityencode: (s) => s,
    striptags: (s) => s,
    _: (s) => s,
    include: function(name, extra) {
        let s = {};
        for (let k in global.env) s[k] = global.env[k];
        for (let k in extra) s[k] = extra[k];
        if (name == 'header') call(header_fn, null, s);
        else if (name == 'footer') call(footer_fn, null, s);
    }
};

print('1. Testing header.ut render...\n');
call(header_fn, null, global.env);

print('\n2. Testing footer.ut render...\n');
call(footer_fn, null, global.env);

print('\n3. Testing sysauth.ut render...\n');
call(sysauth_fn, null, global.env);

print('\nALL THREE TEMPLATES RENDERED SUCCESSFULLY WITH ZERO RUNTIME ERRORS!\n');

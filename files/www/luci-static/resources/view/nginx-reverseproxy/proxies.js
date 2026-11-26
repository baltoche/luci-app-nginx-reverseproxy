// SPDX-License-Identifier: MIT
'use strict';
'require view';
'require form';
'require uci';
'require fs';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('nginx-reverseproxy')
		]);
	},

	render: function() {
		var m, s, o;

		m = new form.Map('nginx-reverseproxy', _('Proxies'),
			_('Each enabled proxy generates an HTTPS server block (port 443, SNI routing) for the given domain, proxying to the upstream host:port. Certificates and basic auth users are managed on their own tabs; logs on the Log tab. Use "Add proxy" to open the form, then Save & Apply to apply to nginx.'));

		s = m.section(form.GridSection, 'proxy', _('Proxies'));
		s.addremove = true;
		s.anonymous = false;
		s.sortable = true;
		s.nodescriptions = true;
		s.addbtntitle = _('Add proxy');

		s.tab('general', _('General'));
		o = s.taboption('general', form.Flag, 'enabled', _('Enabled'));
		o.default = '1';
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'server_name', _('Domain name'),
			_('e.g. jellyfin.example.net — must be covered by the certificate in use'));
		o.placeholder = 'jellyfin.example.net';
		o.datatype = 'hostname';
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'upstream', _('Upstream (host:port)'),
			_('Backend to proxy to, e.g. 127.0.0.1:8096 or 10.0.0.4:8989'));
		o.placeholder = '127.0.0.1:8096';
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'description', _('Description'),
			_('Optional note, emitted as a comment in the generated nginx config.'));
		o.placeholder = 'e.g. Jellyfin media server';

		o = s.taboption('general', form.Value, 'path', _('Path prefix'));
		o.placeholder = '/';
		o.default = '/';
		o.modalonly = true;

		o = s.taboption('general', form.Flag, 'websockets', _('WebSockets'));
		o.default = '0';
		o.rmempty = false;
		o.modalonly = true;

		s.tab('tls', _('Certificate'));
		o = s.taboption('tls', form.ListValue, 'certificate', _('Certificate'),
			_('Certificate for this proxy (managed on the Certificates tab). "Default" uses the default certificate, i.e. the LuCI certificate unless overridden there.'));
		o.value('', _('Default (LuCI certificate)'));
		uci.sections('nginx-reverseproxy', 'certificate').forEach(function(c) {
			o.value(c['.name'], c['.name'] + (c.cert ? ' — ' + c.cert : ''));
		});
		o.modalonly = true;

		s.tab('auth', _('Basic authentication'));
		o = s.taboption('auth', form.Flag, 'basic_auth', _('Basic authentication'),
			_('Require HTTP basic authentication (401) for this proxy.'));
		o.default = '0';
		o.rmempty = false;
		o.modalonly = true;

		o = s.taboption('auth', form.Value, 'auth_realm', _('Authentication realm'),
			_('Text shown in the browser login prompt.'));
		o.placeholder = 'Restricted';
		o.depends('basic_auth', '1');
		o.modalonly = true;

		o = s.taboption('auth', form.DynamicList, 'auth_users', _('Allowed users'),
			_('Basic authentication users allowed to access this proxy (managed on the Users tab). At least one valid user is required, otherwise all requests are rejected.'));
		o.depends('basic_auth', '1');
		o.modalonly = true;
		uci.sections('nginx-reverseproxy', 'auth').forEach(function(a) {
			o.value(a['.name'], a.username ? a['.name'] + ' (' + a.username + ')' : a['.name']);
		});

		s.tab('advanced', _('Advanced'));
		o = s.taboption('advanced', form.Value, 'client_max_body_size', _('Max. request body size'),
			_('e.g. 128M, 1G, or 0 for unlimited (uploads).'));
		o.default = '128M';
		o.placeholder = '128M';
		o.rmempty = false;
		o.modalonly = true;

		o = s.taboption('advanced', form.Value, 'proxy_connect_timeout', _('Connect timeout'));
		o.default = '60s';
		o.placeholder = '60s';
		o.rmempty = false;
		o.modalonly = true;

		o = s.taboption('advanced', form.Value, 'proxy_read_timeout', _('Read timeout'),
			_('Raise for long-lived responses / streaming.'));
		o.default = '300s';
		o.placeholder = '300s';
		o.rmempty = false;
		o.modalonly = true;

		o = s.taboption('advanced', form.Value, 'proxy_send_timeout', _('Send timeout'));
		o.default = '300s';
		o.placeholder = '300s';
		o.rmempty = false;
		o.modalonly = true;

		o = s.taboption('advanced', form.Flag, 'buffering', _('Proxy buffering'),
			_('Off (default) is recommended for WebSockets, SSE and streaming responses.'));
		o.default = '0';
		o.rmempty = false;
		o.modalonly = true;

		o = s.taboption('advanced', form.DynamicList, 'custom_options', _('Custom nginx options'),
			_('One raw nginx directive per line, emitted verbatim inside the location block, e.g. <code>proxy_set_header X-Custom value;</code>. Must end with a semicolon and contain no braces. Directives already managed above (proxy_pass, proxy_buffering, timeouts, client_max_body_size, auth_basic, …) are rejected to avoid duplicate-directive errors.'));
		o.modalonly = true;

		return m.render();
	},

	handleSaveApply: function(ev, mode) {
		return this.super('handleSaveApply', ev, mode).then(function() {
			return L.resolveDefault(fs.exec('/etc/init.d/nginx-reverseproxy', ['reload']), null);
		});
	},

	handleSave: function(ev) {
		return this.super('handleSave', ev).then(function() {
			return L.resolveDefault(fs.exec('/usr/sbin/nginx-reverseproxy-gen'), null);
		});
	}
});

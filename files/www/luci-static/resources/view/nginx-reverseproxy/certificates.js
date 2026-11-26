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

		m = new form.Map('nginx-reverseproxy', _('Certificates'),
			_('Proxies use the same certificate as the LuCI web interface by default (see below). Add further certificates here (e.g. an acme.sh wildcard) with "Add certificate", then assign them to individual proxies on the Proxies tab. Changes are applied to nginx on Save & Apply.'));

		s = m.section(form.NamedSection, 'settings', 'settings', _('Default certificate'),
			_('Certificate used for all proxies that do not select a specific certificate. Leave both fields empty to use the same certificate as the LuCI web interface (the nginx "luci" server certificate, or the uhttpd certificate /etc/uhttpd.crt on classic setups).'));
		s.addremove = false;

		o = s.option(form.Value, 'ssl_certificate', _('Certificate file'));
		o.placeholder = '/etc/uhttpd.crt';

		o = s.option(form.Value, 'ssl_certificate_key', _('Private key file'));
		o.placeholder = '/etc/uhttpd.key';

		s = m.section(form.GridSection, 'certificate', _('Additional certificates'));
		s.addremove = true;
		s.anonymous = false;
		s.nodescriptions = true;
		s.addbtntitle = _('Add certificate');

		s.tab('general', _('General'));
		o = s.taboption('general', form.Value, 'cert', _('Certificate file'),
			_('Path to the PEM certificate incl. chain, e.g. /etc/acme/example_ecc/fullchain.cer'));
		o.placeholder = '/etc/acme/example_ecc/fullchain.cer';
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'key', _('Private key file'),
			_('Path to the PEM private key, e.g. /etc/acme/example_ecc/example.key'));
		o.placeholder = '/etc/acme/example_ecc/example.key';
		o.modalonly = true;
		o.rmempty = false;

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

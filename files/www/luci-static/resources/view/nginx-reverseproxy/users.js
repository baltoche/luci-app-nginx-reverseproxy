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

		m = new form.Map('nginx-reverseproxy', _('Basic authentication users'),
			_('Users allowed to access proxies that have basic authentication enabled (see the Proxies tab). Use "Add user" to open the form and its Save button to store the user, then assign it to a proxy under "Allowed users". The password is stored in plain text in the UCI config (readable by root only); only the hash is written to the nginx htpasswd file. On Save & Apply the htpasswd files are regenerated (no nginx reload needed — they are read per request).'));

		s = m.section(form.GridSection, 'auth', _('Users'));
		s.addremove = true;
		s.anonymous = false;
		s.nodescriptions = true;
		s.addbtntitle = _('Add user');

		s.tab('general', _('General'));
		o = s.taboption('general', form.Value, 'username', _('Username'));
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'password', _('Password'));
		o.password = true;
		o.modalonly = true;
		o.rmempty = false;

		return m.render();
	},

	handleSaveApply: function(ev, mode) {
		return this.super('handleSaveApply', ev, mode).then(function() {
			return L.resolveDefault(fs.exec('/usr/sbin/nginx-reverseproxy-gen'), null);
		});
	},

	handleSave: function(ev) {
		return this.super('handleSave', ev).then(function() {
			return L.resolveDefault(fs.exec('/usr/sbin/nginx-reverseproxy-gen'), null);
		});
	}
});

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

		m = new form.Map('nginx-reverseproxy', _('Basic authentication users'),
			_('Users allowed to access proxies that have basic authentication enabled (see the Proxies tab). Use "Add user" to open the form and its Save button to store the user, then assign it to a proxy under "Allowed users". Passwords are never stored in plain text: on save the entered password is converted to an $apr1$ hash (password_hash) in the UCI config; only the hash reaches the nginx htpasswd file. On Save & Apply the htpasswd files are regenerated (no nginx reload needed — they are read per request).'));

		s = m.section(form.GridSection, 'auth', _('Users'));
		s.addremove = true;
		s.anonymous = false;
		s.nodescriptions = true;
		s.addbtntitle = _('Add user');

		s.tab('general', _('General'));
		o = s.taboption('general', form.Value, 'username', _('Username'));
		o.rmempty = false;

		o = s.taboption('general', form.Value, 'password', _('Password'),
			_('Plaintext is never stored: on save it is converted to an $apr1$ hash (password_hash) in the UCI config and only the hash reaches nginx. Leave empty to keep the current hash.'));
		o.password = true;
		o.modalonly = true;
		o.rmempty = true;

		o = s.taboption('general', form.DummyValue, '_hash', _('Stored password hash'));
		o.modalonly = true;
		o.write = function() {};
		o.cfgvalue = function(section_id) {
			var h = uci.get('nginx-reverseproxy', section_id, 'password_hash');
			return h ? _('set (%s…)').format(h.substring(0, 12)) : _('not set');
		};

		return m.render();
	},

	/* Convert any plaintext 'password' values of auth sections into
	 * 'password_hash' ($apr1$) before they are committed, so the UCI config
	 * never contains plaintext passwords. */
	hashPasswords: function() {
		var sections = uci.sections('nginx-reverseproxy', 'auth') || [];
		return Promise.all(sections.map(function(sec) {
			var id = sec['.name'];
			var pw = uci.get('nginx-reverseproxy', id, 'password');
			if (!pw || /^\$apr1\$/.test(pw) || /^\{SHA\}/.test(pw))
				return Promise.resolve();
			return L.resolveDefault(fs.exec('/usr/bin/openssl', ['passwd', '-apr1', pw]), null).then(function(res) {
				var h = res && res.stdout ? res.stdout.trim() : '';
				if (!h) return;
				uci.set('nginx-reverseproxy', id, 'password_hash', h);
				uci.unset('nginx-reverseproxy', id, 'password');
			});
		})).then(function() {
			return uci.save();
		});
	},

	handleSaveApply: function(ev, mode) {
		/* run the hash hook before the base class commits (idempotent if the
		 * base handleSaveApply also ends up calling handleSave) */
		return this.handleSave(ev).then(() => this.super('handleSaveApply', ev, mode)).then(function() {
			return L.resolveDefault(fs.exec('/usr/sbin/nginx-reverseproxy-gen'), null);
		});
	},

	handleSave: function(ev) {
		return this.super('handleSave', ev).then(() => this.hashPasswords()).then(function() {
			return L.resolveDefault(fs.exec('/usr/sbin/nginx-reverseproxy-gen'), null);
		});
	}
});

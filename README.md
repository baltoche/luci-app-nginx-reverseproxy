# luci-app-nginx-reverseproxy

LuCI application to **create and edit nginx reverse proxies** on OpenWrt (tested on OpenWrt 25.12, LuCI 26 / ucode-JS).

Each enabled entry generates an HTTPS **server block** on port 443 (SNI routing) in `/etc/nginx/conf.d/00-nginx-reverseproxy-generated.conf`, proxying the domain to an upstream `host:port`. nginx is reloaded automatically on **Save & Apply** and at boot.

## Features

- LuCI page: **Services → Reverse Proxy** with tabs — **Proxies**, **Users**, **Certificates**, **Log**
  - *Proxies*, *Users* and *Certificates* are tables (grid sections, same pattern as luci-app-acme): the **Add …** button opens a modal form with its own **Save** button, key fields are table columns, the rest lives in tabbed modals per row; each row can be edited or deleted from its own modal (rows are keyed by section name, so deleting a row never hits an unsaved new row)
  - *Log*: live system-log view (same `LogreadBox` widget as luci-app-acme) pre-filtered to the `nginx` tag — shows only reverse-proxy-relevant lines: nginx runtime errors (bad upstreams, auth failures, cert errors) and the generator's own warnings (syslog tag `nginx-reverseproxy`). Type a domain in the text filter to debug a single proxy. The parent menu entry aliases to the Proxies tab, so it is the active tab when opening the app.
- **Certificates**: proxies use the *same certificate as the LuCI web interface* by default (the nginx `luci.locations` server cert on luci-nginx setups, otherwise the uhttpd cert `/etc/uhttpd.crt` + `/etc/uhttpd.key`). Additional certificates (`config certificate` sections with `cert`/`key` paths, e.g. an acme.sh wildcard) can be added on the Certificates tab and assigned to individual proxies via the proxy's `certificate` option. `settings.ssl_certificate` / `ssl_certificate_key` (Certificates tab) override the default for all proxies.
- **HTTP basic authentication** per proxy: `config auth` sections hold `username`/`password`; a proxy with `basic_auth '1'` gets `auth_basic` + `auth_basic_user_file` pointing at a generated htpasswd file (`/etc/nginx/reverseproxy-htpasswd/<proxy>.htpasswd`). Passwords are hashed at generation time (`$apr1$` via openssl, falling back to nginx-native `{SHA}`) and never written in plain text. With basic auth enabled but no valid users, all requests are rejected (fail closed).
- Per-proxy options: `enabled`, `description` (optional, emitted as a comment in the generated config), `server_name` (domain), `upstream` (host:port), `path` prefix, `websockets` (Upgrade/Connection headers), `certificate`, `basic_auth`, `auth_realm`, `auth_users` (list)
- **Advanced tab** per proxy: common reverse-proxy options with sane defaults — `client_max_body_size` (128M), `proxy_connect_timeout` (60s), `proxy_read_timeout` (300s), `proxy_send_timeout` (300s), `buffering` (off) — plus `custom_options`, a list of arbitrary raw nginx directives emitted verbatim inside the location block (must end with `;`, no braces; directives the generator already emits are rejected to avoid duplicate-directive errors)
- The shipped example proxies are **disabled by default** (they point to non-existent backends)
- Config stored in UCI `/etc/config/nginx-reverseproxy`
- Generator: `/usr/sbin/nginx-reverseproxy-gen` → `/etc/nginx/conf.d/00-nginx-reverseproxy-generated.conf` (paths overridable via `NGINX_RP_OUT` / `NGINX_RP_HTPASSWD_DIR`, e.g. for testing)
- Init script `/etc/init.d/nginx-reverseproxy` regenerates + reloads nginx at boot and on ucitrack apply
- rpcd ACL so LuCI (non-root session) can read/write the UCI config and trigger the generator

## Requirements / package dependencies

Declared in the `Makefile` (`LUCI_DEPENDS`):

- `luci-base` — JS views, menu, rpcd ACL, ucitrack
- `nginx` — the proxy itself. On current OpenWrt this resolves to `nginx-ssl` (default variant, `PROVIDES nginx`, built with `--with-http_ssl_module`; `auth_basic` and `proxy` are built in) or `nginx-full` — either way an SSL-capable nginx with auth_basic + proxy. The router should listen on 443 ssl (e.g. with `luci-nginx`)
- `openssl-util` — `/usr/bin/openssl`, required to hash basic-auth passwords into the htpasswd files (`$apr1$`, with a `{SHA}` fallback; without any hasher the proxy fails closed)

No `ca-bundle` dependency: the app itself does no outbound TLS (acme.sh pulls its own). The Log tab uses the ubus `log` object provided by `logd` (base system). `uci`, `rpcd` and `busybox` are base.

Additionally recommended (not hard deps): a certificate for your domains (acme.sh) — proxies default to the LuCI certificate, others can be added as `config certificate` sections; LuCI 26+ (ucode JavaScript views).

## Install via feeds (recommended)

```sh
# in your OpenWrt/LEDE buildroot or with the ImageBuilder SDK:
echo 'src-git luci_app_nginx_reverseproxy https://github.com/baltoche/luci-app-nginx-reverseproxy.git' >> feeds.conf.default
./scripts/feeds update -a
./scripts/feeds install luci-app-nginx-reverseproxy
make package/luci-app-nginx-reverseproxy/compile V=sc
# -> ipk/apk in bin/packages/<arch>/luci/luci-app-nginx-reverseproxy_*.apk
```

On an already-running 25.12 (apk) router, you can also install the prebuilt apk from the GitHub Releases page (releases are built automatically on `v*` tags with the OpenWrt SDK 25.12.6, for `x86_64` and `aarch64_generic`):

```sh
# pick the apk matching your arch, e.g. luci-app-nginx-reverseproxy_1.1.0-r1_x86_64.apk
apk add --allow-untrusted luci-app-nginx-reverseproxy_*_<arch>.apk
```

## Manual install (no buildroot)

```sh
# copy this repo's files/ tree onto the router root, then:
./install.sh        # copies files, registers sysupgrade.conf, enables+starts the service, restarts rpcd
```

Note: `install.sh` also copies the example `/etc/config/nginx-reverseproxy` — back up your existing router config first if you already have proxies configured.

## Usage

1. LuCI → **Services → Reverse Proxy** → **Certificates** tab: (optional) **Add certificate** → name e.g. `wildcard`, certificate `/etc/acme/example_ecc/fullchain.cer`, key `/etc/acme/example_ecc/example.key` → **Save & Apply**
2. **Users** tab: **Add user** → username/password → **Save & Apply** (regenerates the htpasswd files; no nginx reload needed)
3. **Proxies** tab: **Add proxy** → Enabled ✅, optional Description, Domain name, Upstream, and (in the row's modal) Path, WebSockets, Certificate tab, Basic authentication tab
4. **Save & Apply** → nginx reloads automatically
5. Point a DNS record (covered by the certificate in use) at the router
6. **Log** tab shows nginx/reverse-proxy log lines (upstream errors, auth failures, reloads)

Example entries shipped in `files/etc/config/nginx-reverseproxy` (all `enabled '0'` — they are placeholders, not real backends):

| Domain | Upstream |
|---|---|
| transmission.example.net | 127.0.0.1:9091 |
| sonarr.example.net | 10.0.0.4:8989 |
| jellyfin.example.net | 127.0.0.1:8096 (websockets on) |

## UCI reference

```
config settings 'settings'
	# empty = same certificate as the LuCI web interface
	# option ssl_certificate '/etc/uhttpd.crt'
	# option ssl_certificate_key '/etc/uhttpd.key'

config certificate 'wildcard'
	option cert '/etc/acme/example_ecc/fullchain.cer'
	option key '/etc/acme/example_ecc/example.key'

config auth 'admin'
	option username 'admin'
	option password 'secret'   # replaced by your own; only the hash reaches nginx

config proxy 'jellyfin'
	option enabled '0'             # example entries ship disabled
	option description 'Jellyfin media server'   # optional comment in generated config
	option server_name 'jellyfin.example.net'
	option upstream '127.0.0.1:8096'
	option path '/'
	option websockets '1'
	option certificate 'wildcard'   # optional; empty = default (LuCI) certificate
	option basic_auth '1'          # optional
	option auth_realm 'Media'      # optional, default 'Restricted'
	list auth_users 'admin'        # auth sections allowed on this proxy
	# advanced tab:
	option client_max_body_size '128M'
	option proxy_connect_timeout '60s'
	option proxy_read_timeout '300s'
	option proxy_send_timeout '300s'
	option buffering '0'           # proxy_buffering off
	list custom_options 'proxy_set_header X-Custom "value";'   # arbitrary nginx directive
```

Generated nginx fragment per enabled proxy:

```
server {
	listen 443 ssl;
	listen [::]:443 ssl;
	server_name jellyfin.example.net;
	ssl_certificate <resolved cert>;
	ssl_certificate_key <resolved key>;
	location / {
		auth_basic "Media";                              # only if basic_auth=1
		auth_basic_user_file /etc/nginx/reverseproxy-htpasswd/jellyfin.htpasswd;
		proxy_pass http://127.0.0.1:8096;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_http_version 1.1;
		proxy_buffering off;
	}
}
```

## CI / releases

- `.github/workflows/validate.yml` runs on every push/PR: shell syntax, JS `node --check`, JSON validity, secret scan
- `.github/workflows/release.yml` runs on tags `v*` (or manually via *Run workflow*): builds the apk for `x86_64` and `aarch64_generic` inside the OpenWrt SDK 25.12.6 container, then creates a GitHub Release with the apks, a source tarball and SHA256SUMS

## License

MIT

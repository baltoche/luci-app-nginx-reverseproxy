#
# luci-app-nginx-reverseproxy — LuCI app to manage nginx reverse proxies (SNI/HTTPS)
#
# This is a LuCI feed package. Add this repo as a feed, then:
#   ./scripts/feeds update -a && ./scripts/feeds install luci-app-nginx-reverseproxy
#   make package/luci-app-nginx-reverseproxy/compile V=sc
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI nginx reverse proxy manager
LUCI_DESCRIPTION:=Create and edit nginx reverse proxies from LuCI (tabs: Proxies, Users, Certificates, Log). Each proxy generates an HTTPS server block (port 443, SNI routing) in /etc/nginx/conf.d/00-nginx-reverseproxy-generated.conf, proxying the domain to an upstream host:port, with per-proxy certificate selection, HTTP basic authentication and an advanced tab (timeouts, body size, custom nginx directives). Proxies use the LuCI certificate by default. nginx is reloaded automatically on Save & Apply and at boot.
# Dependencies:
#  +luci-base      JS views, menu.d, rpcd ACL, ucitrack
#  +nginx          reverse proxy itself. On current OpenWrt the built nginx packages
#                  are nginx-ssl (DEFAULT_VARIANT, PROVIDES nginx, --with-http_ssl_module,
#                  auth_basic and proxy built in) and nginx-full (PROVIDES nginx), so this
#                  always pulls an SSL-capable nginx with auth_basic + proxy support.
#  +openssl-util   /usr/bin/openssl — required to hash basic-auth passwords ($apr1$,
#                  {SHA} fallback) into the generated htpasswd files.
#  (log tab reads syslog via the ubus "log" object from logd, part of the base system;
#   uci/rpcd/busybox are base as well; no ca-bundle needed — the app does no outbound TLS)
LUCI_DEPENDS:=+luci-base +nginx +openssl-util
LUCI_PKGARCH:=all

PKG_VERSION:=1.1.0
PKG_RELEASE:=1

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-nginx-reverseproxy/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	/etc/init.d/nginx-reverseproxy enable
	/etc/init.d/nginx-reverseproxy start
}
exit 0
endef

# call BuildPackage - OpenWrt buildroot signature

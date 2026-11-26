#!/bin/sh
# SPDX-License-Identifier: MIT
# Reinstalls luci-app-nginx-reverseproxy (files outside /etc) from /root/maj/luci-app-nginx-reverseproxy
SRC=/root/maj/luci-app-nginx-reverseproxy
[ -d "$SRC" ] || SRC=/home/balt/maj/luci-app-nginx-reverseproxy
[ -d "$SRC" ] || exit 1
# do not clobber an existing router config with the example one
[ -f /etc/config/nginx-reverseproxy ] || cp -a "$SRC/etc/config/nginx-reverseproxy" /etc/config/ 2>/dev/null
cp -a "$SRC/etc/init.d/nginx-reverseproxy" /etc/init.d/ && chmod +x /etc/init.d/nginx-reverseproxy
mkdir -p /etc/ucitrack && cp -a "$SRC/etc/ucitrack/luci-app-nginx-reverseproxy.json" /etc/ucitrack/ 2>/dev/null
cp -a "$SRC/usr/sbin/nginx-reverseproxy-gen" /usr/sbin/ && chmod +x /usr/sbin/nginx-reverseproxy-gen
mkdir -p /usr/share/luci/menu.d /usr/share/rpcd/acl.d /www/luci-static/resources/view/nginx-reverseproxy
cp -a "$SRC/usr/share/luci/menu.d/luci-app-nginx-reverseproxy.json" /usr/share/luci/menu.d/
cp -a "$SRC/usr/share/rpcd/acl.d/luci-app-nginx-reverseproxy.json" /usr/share/rpcd/acl.d/
cp -a "$SRC/www/luci-static/resources/view/nginx-reverseproxy/"*.js /www/luci-static/resources/view/nginx-reverseproxy/
rm -f /www/luci-static/resources/view/nginx-reverseproxy.js   # legacy single-file view
for p in /usr/sbin/nginx-reverseproxy-gen /usr/share/luci/menu.d/luci-app-nginx-reverseproxy.json /usr/share/rpcd/acl.d/luci-app-nginx-reverseproxy.json /www/luci-static/resources/view/nginx-reverseproxy; do
	grep -qxF "$p" /etc/sysupgrade.conf 2>/dev/null || echo "$p" >> /etc/sysupgrade.conf
done
/etc/init.d/nginx-reverseproxy enable 2>/dev/null
/etc/init.d/nginx-reverseproxy start 2>/dev/null
/etc/init.d/rpcd restart 2>/dev/null
echo "luci-app-nginx-reverseproxy installed"

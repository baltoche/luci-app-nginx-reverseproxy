// SPDX-License-Identifier: MIT
'use strict';
'require tools.views as views';

/* Log tab: LogreadBox pre-filtered to the 'nginx' tag — this matches both
 * nginx runtime errors (e.g. "connect() failed ... server: <proxy domain>",
 * auth_basic failures) and the generator's own warnings (logger tag
 * 'nginx-reverseproxy'), i.e. only reverse-proxy-relevant lines. Use the
 * text filter with a domain name to isolate a single proxy. */
return views.LogreadBox('nginx', _('Reverse Proxy Log'));

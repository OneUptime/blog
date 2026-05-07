# Validation Summary: How to Configure Apache as an IPv6 Reverse Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- IPv6
- Reverse proxying with `mod_proxy` and `mod_proxy_http`
- Load balancing with `mod_proxy_balancer`
- Header manipulation with `mod_headers`
- Client IP restoration with `mod_remoteip`
- Apache access control and logging

## Sources Consulted
- Apache HTTP Server `mod_proxy`: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache HTTP Server reverse proxy guide: https://httpd.apache.org/docs/current/howto/reverse_proxy.html
- Apache HTTP Server `mod_headers`: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache HTTP Server expressions reference: https://httpd.apache.org/docs/current/expr.html
- Apache HTTP Server binding/listener docs: https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server core `<VirtualHost>` docs: https://httpd.apache.org/docs/current/en/mod/core.html
- Apache HTTP Server `mod_remoteip`: https://httpd.apache.org/docs/current/en/mod/mod_remoteip.html
- Apache HTTP Server `mod_authz_host`: https://httpd.apache.org/docs/current/mod/mod_authz_host.html
- Apache HTTP Server `mod_authz_core`: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache HTTP Server `mod_access_compat`: https://httpd.apache.org/docs/2.4/en/mod/mod_access_compat.html
- Apache HTTP Server `mod_log_config`: https://httpd.apache.org/docs/current/en/mod/mod_log_config.html
- Apache HTTP Server `mod_logio`: https://httpd.apache.org/docs/current/en/mod/mod_logio.html
- Debian `a2enmod` man page: https://manpages.debian.org/bookworm/apache2/a2enmod.8.en.html

## Issues Found
- The post manually overwrote `X-Forwarded-For` with `RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}e"`. That was inaccurate because `mod_proxy_http` already adds `X-Forwarded-*` headers when `ProxyAddHeaders` is enabled, and `%{VARNAME}e` reads an environment variable rather than the request expression variable. I changed the example to use `ProxyAddHeaders On` and set only `X-Real-IP` with `RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"`.
- The IPv6 load-balancing snippet defined a balancer but still proxied directly to a single backend. I changed the example so `ProxyPass` and `ProxyPassReverse` actually use `balancer://ipv6backends/`.
- The `remoteip.conf` example duplicated module loading with `LoadModule remoteip_module ...` even though the post already enables `remoteip` with `a2enmod`. I removed the duplicate load line.
- Two sample IPv6 prefixes were invalid because they used non-hex segments (`2001:db8:lb::/48` and `2001:db8:admin::/48`). I replaced them with valid documentation prefixes.
- The `/api` access-control example used deprecated `Order`/`Deny`/`Allow` directives from `mod_access_compat`. I replaced that block with current `Require ip ::/0` syntax.
- The log format used `%O`, which requires `mod_logio`, but the post never enabled that module. I changed the format to `%b` and adjusted the accompanying comment.
- The conclusion and listener commentary overstated Apache behavior by implying separate IPv4 and IPv6 vhost blocks are required and that `Listen 80` always means dual-stack. I corrected the wording to reflect Apache’s documented vhost syntax and platform-dependent IPv4-mapped IPv6 behavior.

## Review Notes
- The post is valid in a Debian/Ubuntu Apache layout: it uses `a2enmod`, `/etc/apache2/...`, and `${APACHE_LOG_DIR}`, which are distro-specific rather than generic upstream `httpd` paths.
- `Listen 80` and `Listen 443` do not guarantee identical IPv4/IPv6 behavior on every platform or build. Explicit IPv6 `Listen` directives remain the least ambiguous option when you need deterministic socket bindings.

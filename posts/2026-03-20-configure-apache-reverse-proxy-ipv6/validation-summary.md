# Validation Summary: How to Configure Apache Reverse Proxy with IPv6 Backends

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- `mod_proxy`
- `mod_proxy_http`
- `mod_proxy_balancer`
- `mod_lbmethod_byrequests`
- `mod_headers`
- `mod_ssl`
- `mod_proxy_wstunnel`
- IPv6
- `curl`
- `a2enmod`

## Sources Consulted
- Apache `mod_proxy`: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache Reverse Proxy Guide: https://httpd.apache.org/docs/current/en/howto/reverse_proxy.html
- Apache `mod_proxy_http`: https://httpd.apache.org/docs/current/mod/mod_proxy_http.html
- Apache `mod_proxy_wstunnel`: https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_wstunnel.html
- Apache `mod_headers`: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache Expressions (`ap_expr`): https://httpd.apache.org/docs/current/expr.html
- Apache `mod_lbmethod_byrequests`: https://httpd.apache.org/docs/2.4/en/mod/mod_lbmethod_byrequests.html
- Apache `mod_ssl`: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- RFC 3986, URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986
- Debian `a2enmod` manpage: https://manpages.debian.org/bookworm/apache2/a2dismod.8.en.html
- Local `curl --help all` output to confirm `-6` / `--ipv6`

## Issues Found
- The description said the post covered both HTTP and HTTPS backends, but the actual examples only showed HTTP backends with HTTP/HTTPS frontends. I corrected the description to match the content.
- The `RequestHeader set X-Real-IP "%{REMOTE_ADDR}e"` and `RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}e"` examples were incorrect for `mod_headers`. `%{VARNAME}e` reads environment variables, while the client address is available via `ap_expr` as `%{REMOTE_ADDR}`. I changed `X-Real-IP` to `RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"` and removed the manual `X-Forwarded-For` line because Apache `mod_proxy_http` adds `X-Forwarded-For` by default.
- The module enablement example was incomplete for the snippets in the post. I added `ssl` for the `SSLEngine` example and `proxy_wstunnel` for the `ws://` WebSocket example, and clarified that `a2enmod` is the Debian/Ubuntu-specific way to enable those modules.
- The per-path examples used invalid IPv6 literals (`2001:db8::api` and `2001:db8::ws`). I replaced them with valid documentation-prefix IPv6 addresses.
- Several test commands were inaccurate. The original `/api/health` check did not match the generic root-proxy examples, `curl -6` against an IPv6 literal bypassed the frontend and omitted the configured backend port, and grepping `curl -v` output cannot prove Apache forwarded backend request headers. I updated the commands so they match the configurations and made the header-check example conditional on having a header-echo endpoint.

## Review Notes
- The `ws://` proxy example is valid when `mod_proxy_wstunnel` is loaded. On Apache HTTP Server 2.4.47 and later, WebSocket upgrades can also be handled by `mod_proxy_http` using the `upgrade=websocket` parameter.
- The `a2enmod` command is Debian/Ubuntu specific. Other Apache packaging layouts enable modules differently.

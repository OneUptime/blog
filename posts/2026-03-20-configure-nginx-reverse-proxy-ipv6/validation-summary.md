# Validation Summary: How to Configure Nginx Reverse Proxy with IPv6 Backends

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (reverse proxy, `proxy_pass`, `upstream`)
- IPv6 addressing (RFC 3849 documentation prefix `2001:db8::/32`)
- HTTP keepalive (`proxy_http_version 1.1`, `Connection` header)
- TLS termination (`ssl_certificate`, `ssl_certificate_key`)
- curl IPv6 testing (`curl -6`)

## Sources Consulted
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html (proxy_pass, proxy_set_header, proxy_http_version, timeouts)
- Nginx `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html (server, keepalive, weight)
- Nginx `ngx_http_core_module` documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html (listen, ipv6only)
- RFC 3986 (URI generic syntax — bracket notation for IPv6 literals in URIs)
- RFC 3849 (`2001:db8::/32` reserved for documentation)
- curl manual: `-6, --ipv6` option
- Nginx CLI: `nginx -T` (test configuration and dump)

## Issues Found
No technical issues found.

## Review Notes
- All nginx directives, IPv6 bracket syntax, and the keepalive pattern (`proxy_http_version 1.1` + `proxy_set_header Connection ""`) match the official Nginx documentation.
- The `2001:db8::/32` addresses are correctly used as documentation-only examples per RFC 3849.
- The summary mentions HTTPS backends with `proxy_pass https://[2001:db8::10]:443`, which is syntactically valid; in practice operators may also wish to set `proxy_ssl_server_name on` and `proxy_ssl_name` for SNI to backends, but that is beyond the scope of the post and not technically incorrect as written.
- `ipv6only=on` only takes effect on the first `listen` directive that binds a particular `[::]:port` socket; subsequent listens for the same address are ignored. Behavior shown is correct.

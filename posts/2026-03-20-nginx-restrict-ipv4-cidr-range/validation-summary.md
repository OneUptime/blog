# Validation Summary: How to Restrict Access to Nginx by IPv4 CIDR Range

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (`ngx_http_access_module` — `allow`/`deny` directives)
- Nginx `ngx_http_geo_module`
- Nginx `proxy_pass` with variables and `upstream` blocks
- IPv4 CIDR notation (RFC 4632)
- RFC 1918 private address ranges
- RFC 5737 documentation address ranges (TEST-NET-3: 203.0.113.0/24)
- curl (`--interface` flag)

## Sources Consulted
- Nginx HTTP Access Module docs: https://nginx.org/en/docs/http/ngx_http_access_module.html
- Nginx HTTP Geo Module docs: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Nginx HTTP Proxy Module (`proxy_pass`): https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx HTTP Rewrite Module (`return`, `if`): https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx wiki, "If is Evil" (notes that `return` and `rewrite` are safe inside `if`): https://www.nginx.com/resources/wiki/start/topics/depth/ifisevil/
- RFC 4632 — CIDR
- RFC 1918 — Private address space (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- RFC 5737 — IPv4 address blocks reserved for documentation (203.0.113.0/24)
- curl manual page (`--interface <name>`): https://curl.se/docs/manpage.html

## Issues Found
No technical issues found.

CIDR table arithmetic verified: each host count equals 2^(32 − prefix) − 2.
- /8 → 16,777,214 ✓
- /12 → 1,048,574 ✓
- /24 → 254 ✓
- /28 → 14 ✓
- /26 → 62 ✓

The address ranges in the table match the prefixes correctly (e.g., 203.0.113.64/26 covers .64–.127).

The `geo` block syntax (`geo $remote_addr $variable { ... }`) is valid; both quoted and unquoted values are supported by the directive.

The `if ($var = 0) { return 403 "text"; }` pattern is safe — the well-known "if is evil" caveat applies to other directives, not to `return`/`rewrite`.

`proxy_pass http://$tenant_backend;` works because nginx resolves the variable's value against defined `upstream` blocks before falling back to DNS.

`curl --interface <ip>` is a valid flag and accepts an interface name, IP address, or host name (caveat: the IP must actually be configured on a local interface for the call to succeed — that's a usage detail, not a correctness issue).

The error-log grep target (`"access forbidden"`) matches the standard nginx denial message ("access forbidden by rule, client: ...").

## Review Notes
- The post uses RFC 5737 TEST-NET-3 (203.0.113.0/24) for the "remote office" example, which is the correct convention for documentation.
- Minor stylistic point (not corrected since the post is technically accurate): in `proxy_pass` with variables, some setups also need a `resolver` directive when the variable can evaluate to a non-upstream hostname. In this post all variable values map to defined `upstream` blocks, so no resolver is required.
- The `geo` module evaluates `$remote_addr` at request time; behind a reverse proxy, readers should be aware they may want `$realip_remote_addr` (with `ngx_http_realip_module`) — out of scope for this post.
- No version-specific caveats; the directives shown have been stable across modern nginx releases.

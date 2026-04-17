# Validation Summary: How to Configure X-Real-IP Header for IPv6 Clients

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx (proxy_set_header, real_ip_header, set_real_ip_from)
- HAProxy (http-request set-header, %[src], option forwardfor)
- Apache HTTP Server (mod_remoteip, mod_headers, RequestHeader)
- Python 3 `ipaddress` module
- Flask (request.remote_addr, request.headers)
- IPv6 addressing (ULA fd00::/8, documentation prefix 2001:db8::/32, link-local zone IDs)
- HTTP headers: X-Real-IP, X-Forwarded-For, Forwarded (RFC 7239)

## Sources Consulted
- Nginx docs — ngx_http_proxy_module: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx docs — ngx_http_realip_module (`set_real_ip_from`, `real_ip_header`, `real_ip_recursive`): https://nginx.org/en/docs/http/ngx_http_realip_module.html
- HAProxy configuration manual — `http-request set-header`, fetch sample `src`: https://docs.haproxy.org/
- Apache mod_remoteip — `RemoteIPHeader`, `RemoteIPTrustedProxy`: https://httpd.apache.org/docs/2.4/mod/mod_remoteip.html
- Apache mod_headers — `RequestHeader` with format specifiers and `expr=` expression syntax: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache expression parser — `%{REMOTE_ADDR}`: https://httpd.apache.org/docs/2.4/expr.html
- Python `ipaddress` module: https://docs.python.org/3/library/ipaddress.html
- RFC 7239 — Forwarded HTTP Extension: https://www.rfc-editor.org/rfc/rfc7239
- RFC 4193 — Unique Local IPv6 Unicast Addresses (fc00::/7, fd00::/8): https://www.rfc-editor.org/rfc/rfc4193
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32): https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
1. **Invalid IPv6 CIDR `2001:db8:lb::/48`** appeared in three places (Nginx `set_real_ip_from`, Apache `RemoteIPTrustedProxy`, and the Python `TRUSTED_PROXIES_CIDR` list). The character `l` is not a valid hexadecimal digit, so this string is not a valid IPv6 network and `ipaddress.ip_network()` raises `ValueError` on it (verified with Python 3.12). Replaced with the valid documentation-range example `2001:db8:1::/48`.
2. **Apache `RequestHeader set X-Real-IP "%{REMOTE_ADDR}e"`** — the `%{VARNAME}e` format specifier in mod_headers reads an *environment variable*, and `REMOTE_ADDR` is not populated as an Apache env var by default (it is a request field / expression variable). This produces an empty header in a typical configuration. Changed to the expression form `RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"`, which uses Apache's expression parser and reliably resolves to the client's connecting address.

## Review Notes
- `proxy_set_header X-Forwarded-For $remote_addr;` in the first Nginx example overwrites any existing XFF chain. For multi-proxy deployments `$proxy_add_x_forwarded_for` would be preferable, but the post explicitly sets X-Real-IP as the single-IP source of truth, so the current snippet is acceptable for the simple single-proxy case it demonstrates.
- `listen [::]:443 ssl;` plus `listen 443 ssl;` is the correct modern Nginx idiom for dual-stack listening (Nginx defaults `ipv6only=on` since 1.3.4).
- `fd00::/8` covers the "locally assigned" half of the ULA space defined by RFC 4193 (full ULA block is `fc00::/7`); using `fd00::/8` is the common practical choice and is accurate.
- `remote.split('%')[0]` to strip IPv6 zone IDs is defensive; WSGI typically does not include zone IDs in `REMOTE_ADDR`, but the guard is harmless.
- The simple IP-version detection `6 if ':' in ip else 4` will classify IPv4-mapped IPv6 literals like `::ffff:192.0.2.1` as IPv6; acceptable for a sample endpoint but worth noting.
- The table's "RFC 7239 (`Forwarded`)" entry correctly credits RFC 7239 for standardizing the `Forwarded` header rather than X-Forwarded-For itself.

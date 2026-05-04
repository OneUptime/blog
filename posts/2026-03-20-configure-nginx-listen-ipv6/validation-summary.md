# Validation Summary: How to Configure Nginx to Listen on IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (`listen` directive, `ipv6only`, `default_server`, `ssl`)
- IPv6 addressing and bracket-literal syntax (`[::]`, `[::1]`, `[2001:db8::10]`)
- TLS configuration (`ssl_certificate`, `ssl_certificate_key`, `ssl_protocols`)
- Linux network introspection (`ss`, `netstat`)
- curl IPv6 testing (`curl -6`)

## Sources Consulted
- Nginx `ngx_http_core_module` documentation (listen directive, ipv6only parameter, default_server): https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx `ngx_http_ssl_module` documentation (ssl on listen, ssl_protocols): https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- RFC 3849 (`2001:db8::/32` reserved for documentation)
- RFC 3986 (URI generic syntax — bracket notation for IPv6 literals in URIs)
- RFC 4291 (IPv6 addressing — `::` wildcard and `::1` loopback)
- curl manual: `-6, --ipv6` option
- iproute2 `ss` manual (`-6`, `-tlnp` flags)
- net-tools `netstat` manual (`-tlnp` flags)

## Issues Found
- The original "Basic IPv6 Listen Directive" block put four `listen` directives in a single server block, including both `listen [::]:80;` and `listen [::]:80 ipv6only=on;` (duplicate listen on the same address:port — nginx would fail with "duplicate listen options"), as well as the IPv6 wildcard `[::]:80` together with specific addresses `[::1]:80` and `[2001:db8::10]:80` (the wildcard already covers those, so binding both would fail with "Address already in use" at startup). Reframed the block to keep one listen active and present the others as commented-out alternatives, with a header note explaining you cannot bind the wildcard and specific addresses on the same port simultaneously, and noting that `ipv6only=on` has been the default for `[::]` listens since nginx 1.3.4.

## Review Notes
- All other code blocks (`IPv6-Only Server Block`, `Dual-Stack`, `HTTPS with IPv6`, `Listen on Specific IPv6 Addresses`, `Default Server with IPv6`) are technically correct and would parse and run as written.
- `ipv6only=on` is the default for IPv6 wildcard listens since nginx 1.3.4, so writing it explicitly (as the post does in dual-stack and HTTPS examples) is redundant but recommended for clarity and forward compatibility.
- `listen 443 ssl;` uses the modern combined syntax; the older `ssl on;` directive is deprecated and was removed in Nginx 1.25.
- `ipv6only=on` only takes effect on the first `listen` directive that binds a particular `[::]:port` socket; subsequent listens for the same address inherit the setting.
- The `netstat -tlnp | grep nginx | grep ':::'` check matches only the IPv6 wildcard listens (`:::port`); listens on specific IPv6 addresses would not contain `:::`. This is acceptable for the stated purpose but slightly narrower than `ss -6 -tlnp | grep nginx`.
- All `2001:db8::/32` addresses are correctly used as documentation-only examples per RFC 3849.

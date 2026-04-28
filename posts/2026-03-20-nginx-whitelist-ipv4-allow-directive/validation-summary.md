# Validation Summary: How to Whitelist IPv4 Addresses in Nginx Using the Allow Directive

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (`ngx_http_access_module`)
- `ngx_http_stub_status_module`
- IPv4 / CIDR notation
- RFC 1918 private address space
- RFC 5737 documentation address space

## Sources Consulted
- Nginx official documentation, ngx_http_access_module: https://nginx.org/en/docs/http/ngx_http_access_module.html
- Nginx official documentation, ngx_http_stub_status_module: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Nginx official documentation, ngx_http_core_module (`error_page`, `internal`, `include`): https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx command-line documentation (`nginx -t`, `nginx -s reload`): https://nginx.org/en/docs/beginners_guide.html
- RFC 1918 (Address Allocation for Private Internets)
- RFC 5737 (IPv4 Address Blocks Reserved for Documentation)

## Issues Found
- The conclusion described `allow`/`deny` as a "kernel-level access control layer." This is incorrect — Nginx is a userspace application, and the access module evaluates rules during HTTP request processing, not in the kernel. Genuine kernel-level access control would be provided by tools like iptables/nftables/eBPF. Replaced "kernel-level" with "request-level" to accurately describe where the check occurs.

## Review Notes
- All `allow`/`deny` syntax, CIDR usage, evaluation order ("first match wins"), and supported contexts (location, server, http, limit_except) are correct.
- The example IPs use RFC 5737 documentation ranges (`203.0.113.0/24`, `198.51.100.0/24`) and RFC 1918 private ranges, which is appropriate for documentation.
- The default 403 Forbidden response and the use of `error_page` with `internal` for the custom error page are correct.
- The `stub_status` directive in `ngx_http_stub_status_module` is documented correctly.
- The `nginx -t && nginx -s reload` workflow is the recommended reload sequence.
- The note in the basic example that `deny all` blocks both IPv4 and IPv6 is correct — `all` matches any address regardless of family.
- Future caveat: for very large or frequently-changing whitelists, the post correctly suggests the `geo` module or an external WAF; another option worth mentioning is dynamic modules / Lua / `njs` for runtime decisions, though the current scope of the post is appropriate.

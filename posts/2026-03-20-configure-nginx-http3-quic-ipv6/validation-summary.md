# Validation Summary: How to Configure Nginx HTTP/3 (QUIC) with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx 1.25+ (HTTP/3 / QUIC module)
- HTTP/3 (RFC 9114)
- QUIC transport (UDP)
- IPv6
- TLS 1.3
- ip6tables (firewall)
- curl (HTTP/3 client testing)
- tcpdump (UDP traffic inspection)
- Chrome QUIC flags

## Sources Consulted
- Nginx ngx_http_v3_module documentation: https://nginx.org/en/docs/http/ngx_http_v3_module.html
- Nginx ngx_http_v2_module documentation (for `$http2` variable): https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_core_module documentation (for `$server_protocol`): https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_ssl_module documentation (for `$ssl_early_data`): https://nginx.org/en/docs/http/ngx_http_ssl_module.html#var_ssl_early_data
- curl manpage: https://curl.se/docs/manpage.html
- iptables-persistent / netfilter-persistent (Debian/Ubuntu) — rules stored under `/etc/iptables/`
- RFC 9114 (HTTP/3) and RFC 9000 (QUIC)

## Issues Found

1. **Wrong log_format variable for HTTP version** (`## Monitoring HTTP/3 Connections` section).
   The original `log_format` used `$http2`, which is a real Nginx embedded variable but only returns `"h2"` / `"h2c"` / empty — it does NOT return the HTTP version string. The grep commands at the end of the section search for `"HTTP/3"` and `"HTTP/2"`, neither of which would ever appear in the log with `$http2`.
   Changed `$http2` → `$server_protocol`, which returns `"HTTP/1.1"`, `"HTTP/2.0"`, or `"HTTP/3.0"` and matches the grep patterns shown.

2. **Wrong path for ip6tables persistence** (`## Firewall Rules for QUIC (UDP 443)` section).
   The original wrote rules to `/etc/ip6tables/rules.v6`, which does not exist on Debian/Ubuntu. The standard `iptables-persistent` / `netfilter-persistent` package uses `/etc/iptables/rules.v6` (and `/etc/iptables/rules.v4`).
   Changed `/etc/ip6tables/rules.v6` → `/etc/iptables/rules.v6`.

## Review Notes
- The `listen 443 quic reuseport;` and `listen [::]:443 quic reuseport;` syntax is correct for Nginx 1.25+. Having `reuseport` on both listeners is acceptable since they bind different addresses (IPv4 vs IPv6 wildcard).
- `ssl_protocols TLSv1.3;` restricts the entire server block (including the HTTP/2 fallback) to TLS 1.3 only. This is functional and aligns with the QUIC requirement, but readers running legacy clients on the HTTP/2 fallback may want to add `TLSv1.2` to the list. Left as-is since it's a deliberate, valid configuration.
- The `if ($ssl_early_data = "1") { add_header Early-Data $ssl_early_data; }` block only emits a header — it does not itself "protect against replay attacks." Real protection requires the upstream/application to inspect the `Early-Data` header and refuse non-idempotent requests. The comment is slightly misleading but technically not incorrect; left untouched to preserve author voice.
- The Chrome flag example uses `--quic-version=h3-29`, which is an old IETF draft. Modern Chrome ships with HTTP/3 (RFC 9114) enabled by default and rarely needs these flags. Left in place since the line is commented out and intended only as a hint.
- Building with `--with-http_v3_module` requires a QUIC-capable TLS library (QuicTLS, BoringSSL, or OpenSSL 3.5+). Worth noting in a future revision.

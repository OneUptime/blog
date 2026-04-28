# Validation Summary: How to Configure Nginx HTTP/3 with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx 1.25.0+ (HTTP/3 / `ngx_http_v3_module`)
- HTTP/3 over QUIC (RFC 9114, RFC 9000)
- TLS 1.3 (RFC 8446) and 0-RTT early data (RFC 8470)
- IPv6 (RFC 8200)
- BoringSSL (for source builds with QUIC support)
- UFW / ip6tables firewall rules
- curl `--http3`, `ss`, `nc` for verification

## Sources Consulted
- Nginx HTTP/3 module reference: https://nginx.org/en/docs/http/ngx_http_v3_module.html
- Nginx HTTP/2 module reference: https://nginx.org/en/docs/http/ngx_http_v2_module.html (notes that the `http2` listen parameter was deprecated in 1.25.1; the `http2` directive is now required)
- Nginx SSL module reference (`ssl_early_data`): https://nginx.org/en/docs/http/ngx_http_ssl_module.html#ssl_early_data
- Nginx core `listen` directive (`reuseport`, `quic`, `ssl` parameters): https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx CHANGES log (HTTP/3 introduced 1.25.0, 23 May 2023): https://nginx.org/en/CHANGES
- RFC 8470 — Using Early Data in HTTP (defines `Early-Data` as a request header set by intermediaries toward origin): https://datatracker.ietf.org/doc/html/rfc8470
- iptables-persistent Debian package (rules path is `/etc/iptables/rules.v6`): https://sources.debian.org/src/iptables-persistent/
- curl HTTP/3 documentation: https://curl.se/docs/http3.html

## Issues Found

1. **HTTP/2 was not actually enabled on the TLS fallback listener.**
   The original config had `listen [::]:443 ssl;` and `listen 0.0.0.0:443 ssl;` with the comment "HTTP/2 fallback (TCP)". Since Nginx 1.25.1 the `http2` parameter on `listen` is deprecated and the standalone `http2 on;` directive is required to actually enable HTTP/2. Without it, the TCP listener serves only HTTP/1.1, which contradicts the comment. Added `http2 on;` to the server block.

2. **`add_header Early-Data $ssl_early_data;` was incorrect.**
   Per RFC 8470 §5.1, `Early-Data` is a *request* header that an intermediary adds when forwarding 0-RTT requests to an origin server — it is not a response header. The Nginx `ssl_early_data` documentation example uses `proxy_set_header Early-Data $ssl_early_data;`. The original `add_header` form would emit the header in responses to clients, which has no defined meaning. Replaced with a comment showing the correct `proxy_set_header Early-Data $ssl_early_data;` usage for proxy scenarios.

3. **Wrong path for IPv6 iptables rules persistence.**
   The post used `/etc/ip6tables/rules.v6`. The Debian/Ubuntu `iptables-persistent` package uses `/etc/iptables/rules.v6` (singular `iptables`, both v4 and v6 rules live in the same directory). Fixed the path.

4. **`grep quic` was unreliable for verifying HTTP/3 build support.**
   The Nginx configure flag is `--with-http_v3_module`, which does not contain the substring "quic", so `nginx -V 2>&1 | grep quic` may produce no output even on an HTTP/3-capable build. Changed to `grep -E 'http_v3_module|quic'` so both module names match.

## Review Notes
- Default Ubuntu repos still ship older Nginx versions (22.04 ships 1.18.0; 24.04 ships 1.24.0), so `sudo apt-get install nginx` alone will not yield HTTP/3 — the comment "Add Nginx mainline repository" is correct guidance but the mainline repo setup commands themselves are not shown. Acceptable as a brief note, but readers will need to consult the Nginx mainline repository documentation.
- BoringSSL is the most commonly recommended TLS library for the Nginx HTTP/3 build; quictls is also supported. The post chose BoringSSL, which is a reasonable default.
- `nc -u -z` for UDP port checks is best-effort; UDP is connectionless so a "success" doesn't strictly prove the service is reachable, but the pattern is widely used and acceptable here.
- `proxy_buffer_size`/`proxy_buffers` in the Performance Tuning section are upstream-proxy buffer sizes; they don't affect QUIC frame buffering directly. The phrasing "proxy buffer sizes for QUIC connections" is loose but the directives themselves are valid.
- HTTP/3 in Nginx 1.25.x was initially marked experimental; production deployments should pin to a current stable release of the Nginx mainline branch and monitor the changelog for QUIC-related fixes.

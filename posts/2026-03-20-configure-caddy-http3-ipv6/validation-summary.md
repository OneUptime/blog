# Validation Summary: How to Configure Caddy HTTP/3 with IPv6 - Configure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Caddy
- HTTP/3
- QUIC
- IPv6
- TLS / Automatic HTTPS / ACME
- curl
- tcpdump
- Prometheus metrics / Caddy monitoring

## Sources Consulted
- Caddy global options: https://caddyserver.com/docs/caddyfile/options
- Caddy Automatic HTTPS: https://caddyserver.com/docs/automatic-https
- Caddy HTTPS quick-start: https://caddyserver.com/docs/quick-starts/https
- Caddy `bind` directive: https://caddyserver.com/docs/caddyfile/directives/bind
- Caddy `file_server` directive: https://caddyserver.com/docs/caddyfile/directives/file_server
- Caddy `reverse_proxy` directive: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy `metrics` directive: https://caddyserver.com/docs/caddyfile/directives/metrics
- Monitoring Caddy with Prometheus metrics: https://caddyserver.com/docs/metrics
- Caddy `log` directive: https://caddyserver.com/docs/caddyfile/directives/log
- curl HTTP/3 docs: https://curl.se/docs/http3.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The HTTP/3 status section referenced an old experimental flag and an implementation detail that are not needed for current Caddy v2 releases. I updated it to match current documented behavior: HTTP/3 is enabled by default for HTTPS sites.
- The basic Caddyfile said Caddy automatically gets a Let's Encrypt certificate and explicitly listens on `[::]:443` and `0.0.0.0:443`. I changed this to Caddy's documented automatic certificate-management behavior and a more accurate description of listener behavior.
- The JSON config duplicated the HTTPS listen address and added unnecessary TLS automation and `tls_connection_policies` blocks. I simplified it to the documented pattern where a host matcher on a `:443` server is enough to trigger automatic HTTPS.
- The Alt-Svc test used case-sensitive `grep` and treated a draft `h3-29` value as expected output. I changed it to a case-insensitive Alt-Svc check.
- The explicit HTTP/3 test used `curl --http3`, which can fall back to older HTTP versions. I changed it to `curl --http3-only` with `%{http_version}` and noted that the curl build must support HTTP/3.
- The reverse-proxy example used an invalid IPv6 literal and configured cleartext upstream HTTP/2 incorrectly. I replaced it with a valid IPv6 address and `h2c://` for cleartext HTTP/2.
- The IPv6-only example implied every listener would be IPv6-only. I corrected the comments and added the caveat that Automatic HTTPS may still create a separate port 80 listener for redirects or ACME HTTP challenges.
- The metrics section showed the wrong way to enable metrics and grepped for a non-documented metric name. I corrected it to use the global `metrics` option and a documented `caddy_http_` prefix against the default admin API metrics endpoint.

## Review Notes
- `curl --http3-only` requires a curl build with HTTP/3 support.
- Public automatic HTTPS still depends on ACME challenge reachability over ports 80 and/or 443, depending on which challenge succeeds in the environment.

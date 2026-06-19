# Validation Summary: How to Implement HTTP/3 QUIC Protocol

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HTTP/3
- QUIC
- TLS 1.3 and 0-RTT
- Nginx
- Caddy
- Node.js reverse proxy deployment
- Python aioquic
- Go quic-go
- curl HTTP/3
- Linux firewall tools
- Terraform AWS security group rules

## Sources Consulted
- RFC 9114: HTTP/3 - https://datatracker.ietf.org/doc/html/rfc9114
- RFC 9000: QUIC transport - https://datatracker.ietf.org/doc/html/rfc9000
- NGINX QUIC and HTTP/3 documentation - https://nginx.org/en/docs/quic.html
- NGINX ngx_http_v3_module documentation - https://nginx.org/en/docs/http/ngx_http_v3_module.html
- NGINX ngx_http_v2_module documentation - https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Caddy Caddyfile global options documentation - https://caddyserver.com/docs/caddyfile/options
- Node.js net module documentation - https://nodejs.org/api/net.html
- aioquic asyncio API documentation - https://aioquic.readthedocs.io/en/latest/asyncio.html
- aioquic QUIC configuration documentation - https://aioquic.readthedocs.io/en/latest/quic.html
- aioquic HTTP/3 server example - https://github.com/aiortc/aioquic/blob/main/examples/http3_server.py
- quic-go HTTP/3 server documentation - https://quic-go.net/docs/http3/server/
- quic-go HTTP/3 client documentation - https://quic-go.net/docs/http3/client/
- curl HTTP/3 documentation - https://curl.se/docs/http3.html
- Terraform AWS security group rule documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule

## Issues Found
- The Nginx install command used `apt install nginx-mainline`, which is not the official nginx.org package name. Changed it to `apt install nginx` after configuring the official nginx.org mainline repository.
- The Nginx snippets used deprecated `listen 443 ssl http2` syntax. Updated them to `listen 443 ssl;` plus `http2 on;`.
- The Nginx advanced snippet described `http3_hq` as HTTP/3 over raw QUIC. Corrected it to note that `http3_hq` enables HTTP/0.9 over QUIC for interoperability tests.
- The Nginx 0-RTT snippet omitted the current OpenSSL requirement. Added the OpenSSL 3.5.1+ / BoringSSL / LibreSSL / QuicTLS caveat.
- The Nginx debug header used non-existent `$quic`. Replaced it with the documented `$http3` embedded variable.
- The Caddy snippet placed `protocols h1 h2 h3` inside a site block. Moved it into the required global `servers` options block.
- The Node.js sample used the obsolete experimental `net.createQuicSocket()` API. Replaced it with an accurate production pattern: terminate HTTP/3 at Nginx and proxy to a Node.js backend.
- The aioquic sample did not subclass `QuicConnectionProtocol`, passed certificate paths directly to `QuicConfiguration`, and did not transmit queued HTTP/3 data. Updated it to subclass `QuicConnectionProtocol`, use `H3_ALPN`, call `configuration.load_cert_chain()`, and call `self.transmit()`.
- The quic-go client used the old `http3.RoundTripper` type. Updated it to the current `http3.Transport` API with HTTP/3 ALPN configuration.
- The Go client sliced the response body with `body[:100]`, which panics for shorter bodies. Added a length guard.

## Review Notes
- NGINX HTTP/3 support remains documented as experimental in `ngx_http_v3_module`.
- curl HTTP/3 commands are correct, but they only work when the installed curl/libcurl build includes HTTP/3 support.
- HTTP/3 performance depends heavily on loss, latency, server configuration, TLS resumption, and UDP reachability; benchmark results should be interpreted as environment-specific.

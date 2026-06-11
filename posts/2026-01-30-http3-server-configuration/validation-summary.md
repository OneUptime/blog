# Validation Summary: How to Create HTTP/3 Server Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP/3
- QUIC
- TLS 1.3
- Nginx HTTP/3 module
- Caddy
- Go
- quic-go
- curl
- OpenSSL
- Alt-Svc

## Sources Consulted
- Nginx ngx_http_v3_module documentation: https://nginx.org/en/docs/http/ngx_http_v3_module.html
- Nginx QUIC and HTTP/3 documentation: https://nginx.org/en/docs/quic.html
- Caddy global options documentation: https://caddyserver.com/docs/caddyfile/options
- Caddy TLS directive documentation: https://caddyserver.com/docs/caddyfile/directives/tls
- Caddy JSON HTTP protocols documentation: https://caddyserver.com/docs/json/apps/http/servers/protocols
- Caddy JSON TLS connection policies documentation: https://caddyserver.com/docs/json/apps/http/servers/tls_connection_policies/
- quic-go HTTP/3 server documentation: https://quic-go.net/docs/http3/server/
- quic-go http3 package documentation: https://pkg.go.dev/github.com/quic-go/quic-go/http3
- RFC 9114, HTTP/3: https://datatracker.ietf.org/doc/html/rfc9114
- RFC 7838, HTTP Alternative Services: https://www.rfc-editor.org/rfc/rfc7838.html
- RFC 8470, Using Early Data in HTTP: https://datatracker.ietf.org/doc/html/rfc8470
- IANA TLS ALPN Protocol IDs registry: https://www.iana.org/assignments/tls-extensiontype-values
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The nginx package statement was too broad. Changed it to say some packages include the HTTP/3 module and that users should check the build they are running, because the official nginx module documentation says the module is not built by default and must be enabled with `--with-http_v3_module`.
- The Alt-Svc example advertised `h3-29`, an obsolete HTTP/3 draft ALPN token for a current production guide. Replaced it with a current multiple-alternative example using `h3` and `h2`.
- The Chrome Alt-Svc cache troubleshooting URL was outdated. Replaced it with browser-site-data clearing and restart guidance.
- The 0-RTT nginx example implied all early data should be rejected while the text said to reject non-idempotent requests. Updated the example to show rejecting early data on a non-idempotent route, with a separate conservative fallback for rejecting all early data when routes cannot be classified.

## Review Notes
- The Go examples could not be compiled locally because the `go` toolchain is not installed in this environment, but the APIs were checked against current quic-go documentation.
- `nginx` and `caddy` were not installed locally, so configuration syntax was verified against upstream documentation rather than local config-test commands.

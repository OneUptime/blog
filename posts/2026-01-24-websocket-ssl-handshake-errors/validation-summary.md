# Validation Summary: How to Fix 'SSL Handshake' WebSocket Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- WebSocket and WSS
- TLS/SSL certificates and handshakes
- Node.js HTTPS/TLS APIs
- ws WebSocket library
- OpenSSL command-line tools
- NGINX reverse proxy and TLS configuration
- Browser WebSocket and mixed content behavior
- curl, nmap, and netcat diagnostics

## Sources Consulted
- RFC 6455: The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3: https://datatracker.ietf.org/doc/html/rfc8446
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Node.js HTTPS documentation: https://nodejs.org/api/https.html
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- OpenSSL s_client manual: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL req manual: https://docs.openssl.org/3.5/man1/openssl-req/
- NGINX HTTPS server documentation: https://nginx.org/en/docs/http/configuring_https_servers.html
- NGINX HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- MDN mixed content documentation: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content

## Issues Found
- The certificate-chain command included the root certificate in `fullchain.pem`. Updated it to concatenate the server certificate and intermediate certificate only, matching NGINX guidance that the server certificate appears before chained intermediate certificates.
- The Node.js TLS version example combined `minVersion`/`maxVersion` with `secureProtocol`, which causes a protocol-version conflict in current Node.js. Removed `secureProtocol`.
- The mixed content section incorrectly said browsers block WSS connections from HTTP pages. Updated it to state that browsers block insecure WS connections from HTTPS pages.
- The browser HTTPS test helper converted `wss://api.example.com/socket` to the malformed URL `https:/`. Replaced string replacement with the standard `URL` API.
- The NGINX example used `listen 443 ssl http2;`. Updated it to the current `listen 443 ssl;` plus `http2 on;` form shown in NGINX HTTP/2 documentation.
- The diagnostic script checked TLS support by grepping for `Cipher is`, which can match failed handshakes reporting no cipher. Updated it to use `openssl s_client -brief` and check for `Protocol version:`.
- The diagnostic WebSocket upgrade test used `curl -I`, which sends a HEAD request. WebSocket opening handshakes use HTTP GET, so the command now uses `curl -si --http1.1`.

## Review Notes
The TLS handshake diagram is a simplified TLS 1.2-style flow; the post later allows TLS 1.3, whose handshake differs. It is acceptable as a conceptual overview, but a future revision could label it as simplified or TLS 1.2-specific.

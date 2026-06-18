# Validation Summary: How to Fix 'Handshake Failed' WebSocket Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- WebSocket protocol
- RFC 6455 opening handshake
- Browser WebSocket API
- Node.js
- ws Node.js WebSocket library
- Nginx reverse proxy configuration
- TLS certificate validation
- curl
- HTTP/2 and RFC 8441

## Sources Consulted
- RFC 6455: The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- WHATWG WebSockets Standard: https://websockets.spec.whatwg.org/
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- RFC 8441: Bootstrapping WebSockets with HTTP/2: https://www.rfc-editor.org/rfc/rfc8441.html
- MDN WebSocket constructor documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket
- Node.js TLS documentation: https://nodejs.org/api/tls.html

## Issues Found
- The `ws` examples used `verifyClient` for origin validation, authentication, and logging. The current `ws` documentation discourages `verifyClient` and recommends handling client authentication in the HTTP server's `upgrade` event. Replaced those examples with `noServer: true`, explicit `upgrade` handling, and `wss.handleUpgrade()`.
- The subprotocol example suggested returning a protocol that was not requested. RFC 6455 requires the selected subprotocol to come from the client's request, and browser clients fail the handshake if requested protocols are not acknowledged. Updated the comments and wording.
- The authentication client example interpolated the token directly into the query string. Changed it to use `encodeURIComponent(token)` so tokens containing reserved URL characters are sent correctly.
- The TLS example suggested `rejectUnauthorized: false` as a solution for `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Tightened the error guidance to recommend adding the missing CA certificate, while keeping the existing comment that disabling verification is only for testing.
- The HTTP/2 section said WebSocket requires HTTP/1.1. That is too broad because RFC 8441 defines WebSockets over HTTP/2. Updated the section to say the traditional `Upgrade`/`Connection` handshake is HTTP/1.1-specific and noted RFC 8441.
- The manual curl test used a `Sec-WebSocket-Key` value that did not decode to the RFC-required 16 bytes and did not force HTTP/1.1 for an HTTPS URL. Replaced the key with the RFC example key and added `--http1.1`.

## Review Notes
The manual low-level handshake example is intentionally illustrative and still leaves frame handling to `handleWebSocket(socket)`. In production, a tested WebSocket library is preferable to hand-rolling frame parsing and validation.

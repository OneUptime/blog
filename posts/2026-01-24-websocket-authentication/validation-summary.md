# Validation Summary: How to Handle WebSocket Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol
- Browser WebSocket API
- Node.js
- ws WebSocket library
- JSON Web Tokens
- Cookie-based sessions
- WebSocket subprotocols
- TLS/WSS

## Sources Consulted
- RFC 6455: The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- WHATWG WebSockets Standard: https://websockets.spec.whatwg.org/
- MDN WebSocket() constructor documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket
- MDN Sec-WebSocket-Protocol header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-WebSocket-Protocol
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- jsonwebtoken documentation: https://github.com/auth0/node-jsonwebtoken
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- RFC 7519: JSON Web Token: https://datatracker.ietf.org/doc/html/rfc7519

## Issues Found
- The subprotocol authentication client example used normal Base64 and described it as safe for WebSocket subprotocols. WebSocket subprotocol values must be valid `Sec-WebSocket-Protocol` tokens, and normal Base64 can include characters such as `/` and `=` that are not valid token characters. Changed the example to use unpadded base64url encoding.
- The subprotocol authentication server example used `verifyClient`, which current `ws` documentation discourages for client authentication. Replaced it with `noServer: true` and authentication in the HTTP server `upgrade` event, matching the current recommended `ws` pattern.
- The subprotocol authentication server would have allowed `ws` to echo the first requested subprotocol by default, which could echo the authentication token back in the handshake. Added `handleProtocols: () => false` so the token-bearing subprotocol is not selected in the response.
- The token refresh example decoded the JWT payload with `atob(token.split('.')[1])`, which can fail for JWT base64url payloads. Updated the code to convert base64url to Base64 and restore padding before decoding.
- The complete security implementation referenced `server` without defining or starting it and imported an unused `rateLimit` module. Added the HTTP server definition and `server.listen(8080)`, and removed the unused import.

## Review Notes
The remaining examples are illustrative and omit production hardening such as structured message validation, JSON parse error handling, Origin checks for browser clients, and distributed rate limiting. The core WebSocket handshake flow, use of WSS/TLS, cookie handling during the upgrade request, JWT verification pattern, and per-action authorization guidance are technically accurate.

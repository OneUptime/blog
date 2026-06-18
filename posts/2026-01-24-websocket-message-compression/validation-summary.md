# Validation Summary: How to Configure WebSocket Message Compression

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- WebSocket protocol compression
- permessage-deflate
- Node.js
- ws library
- Node.js zlib
- Browser WebSocket API
- Compression Streams API
- NGINX WebSocket proxying

## Sources Consulted
- ws documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- ws npm package documentation: https://www.npmjs.com/package/ws
- RFC 7692, Compression Extensions for WebSocket: https://datatracker.ietf.org/doc/html/rfc7692
- WHATWG WebSockets Standard: https://websockets.spec.whatwg.org/
- Node.js zlib documentation: https://nodejs.org/api/zlib.html
- MDN CompressionStream documentation: https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream
- MDN Sec-WebSocket-Extensions documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-WebSocket-Extensions
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- Corrected the claim that ws supports permessage-deflate "out of the box" to clarify that the client enables it by default, while the server must opt in with `perMessageDeflate`.
- Replaced request-header based checks for negotiated compression with `ws.extensions`, because `Sec-WebSocket-Extensions` on the incoming request only shows what the client offered, not what the server accepted.
- Fixed the `serverNoContextTakeover` and `clientNoContextTakeover` explanation. The original comments reversed the option semantics; `false` allows context takeover, while `true` disables it.
- Clarified `threshold` behavior in ws. The option applies to payloads when context takeover is disabled, rather than universally to every compressed message.
- Updated the browser `sendCompressed()` example to describe it as application-level payload compression, not permessage-deflate, and added a simple payload marker so a cooperating server can distinguish compressed application payloads.
- Changed compression measurement examples from `zlib.deflate()` to `zlib.deflateRaw()` so the examples better match permessage-deflate's raw DEFLATE behavior.

## Review Notes
- JavaScript snippets were checked locally for parse errors after the edits.
- The NGINX WebSocket proxying configuration is broadly consistent with official NGINX guidance for forwarding Upgrade and Connection headers.

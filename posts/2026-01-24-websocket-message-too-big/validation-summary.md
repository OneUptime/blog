# Validation Summary: How to Fix 'Message Too Big' WebSocket Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- WebSocket protocol
- Node.js `ws`
- Socket.IO
- Express with `express-ws`
- Nginx reverse proxying
- HAProxy reverse proxying
- Cloudflare Workers / Durable Objects
- Browser WebSocket API
- JavaScript binary data APIs

## Sources Consulted
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- `ws` API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- Socket.IO server options: https://socket.io/docs/v4/server-options/
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- HAProxy WebSocket configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/websocket/
- Apache HTTP Server `mod_proxy` documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy.html
- `express-ws` documentation: https://github.com/HenningM/express-ws
- Cloudflare Network WebSockets documentation: https://developers.cloudflare.com/network/websockets/
- Cloudflare Durable Objects limits: https://developers.cloudflare.com/durable-objects/platform/limits/
- MDN WebSocket API documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- MDN `DataView` documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView

## Issues Found
- The common limits table incorrectly described Nginx `client_max_body_size`, Apache `ProxyTimeout`, and a generic Cloudflare 100 MB Enterprise limit as WebSocket message-size controls. Updated the table to state that Nginx and Apache do not provide an application-level WebSocket message limit in these proxy settings, and replaced the Cloudflare entry with the documented 32 MiB received-message limit for Workers / Durable Objects.
- The Socket.IO example described `maxHttpBufferSize` as affecting the handshake and polling fallback. Updated the comment to match Socket.IO documentation: it limits the size of a single Engine.IO message before the socket is closed.
- The Nginx configuration comments claimed `client_max_body_size` and proxy buffer sizes affected WebSocket messages. Updated the snippet to describe WebSocket tunnel proxying accurately and use `proxy_read_timeout` for long-lived idle tunnels.
- The HAProxy example placed `tune.bufsize` in a `frontend` section and described it as a WebSocket message-size control. Removed that incorrect setting and moved timeout defaults into a valid `defaults` section while keeping `timeout tunnel` in the backend.
- The `ws` compression example accessed `ws._receiver._extensions`, a private internal field. Replaced it with a public-safe connection log.
- The browser compression example said compression would automatically be used. Updated it to say compression may be used when the browser and server negotiate it.
- The binary server example created `DataView(message.buffer)` from a Node.js `Buffer`, which can read the wrong byte range because Buffers may share an underlying `ArrayBuffer`. Updated it to pass `message.byteOffset` and `message.byteLength`.
- The binary client example used `new Float32Array(buffer, 5)`, which is invalid because typed array offsets must be aligned to the element size. Updated it to copy the float bytes with `Uint8Array`.

## Review Notes
The JavaScript snippets were syntax-checked with Node.js after edits. The chunking examples are suitable as illustrative samples, but production implementations should add duplicate-chunk handling, total reassembled-size limits, and stronger message IDs.

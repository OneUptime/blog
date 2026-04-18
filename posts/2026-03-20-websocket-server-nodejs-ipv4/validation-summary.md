# Validation Summary: How to Create a WebSocket Server on IPv4 in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- `ws` library (WebSocket server for Node.js)
- WebSocket protocol (RFC 6455)
- IPv4 networking
- JavaScript

## Sources Consulted
- ws library official documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- ws library source (index.js exports): https://github.com/websockets/ws/blob/master/index.js
- RFC 6455 (The WebSocket Protocol), section 7.4.1 (Defined Status Codes)
- Node.js `net.Socket` documentation (`remoteAddress` behavior on dual-stack sockets)

## Issues Found
No technical issues found.

Notes on verified details:
- `new WebSocket.Server({ host, port })` is a valid constructor — `WebSocket.Server` is exported as an alias for `WebSocketServer` in the ws package's `index.js`, so both names work.
- `wss.address()`, `wss.clients` (a Set), and `WebSocket.OPEN` are correct.
- `ws.ping()` / `pong` event, `ws.terminate()`, and `ws.close(1001, ...)` (RFC 6455 "going away") all match the ws API and WebSocket spec.
- `req.socket.remoteAddress` returning `::ffff:<ipv4>` for IPv4 clients on a dual-stack socket is standard Node.js behavior; stripping the prefix is a reasonable approach for display.
- Binding to `0.0.0.0` correctly listens on all IPv4 interfaces.

## Review Notes
- In modern code, `WebSocketServer` (destructured from `require("ws")`) is the more idiomatic import name, but the `WebSocket.Server` alias used here is still fully supported and not deprecated.
- The broadcast example uses `...msg` spread over an object parsed from untrusted input; in production the author may want to whitelist fields to avoid client-supplied `type`/`from` overriding server-set values, but this is a hardening suggestion rather than a technical error.
- The heartbeat example does not clear `isAlive` for new connections between ticks — a brand-new client could be terminated on the very next interval tick if it doesn't respond to the first ping; acceptable for a simple tutorial.
- No version of the `ws` library is pinned in the post; all APIs shown are current as of ws v8.x.

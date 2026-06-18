# Validation Summary: How to Fix 'Protocol Error' in WebSocket Connections

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- WebSocket protocol
- RFC 6455 opening handshake, framing, subprotocols, extensions, and close codes
- JavaScript browser WebSocket API
- Node.js `http` and `crypto` modules
- Node.js `ws` WebSocket library
- Nginx WebSocket reverse proxy configuration

## Sources Consulted
- RFC 6455: The WebSocket Protocol - https://datatracker.ietf.org/doc/html/rfc6455
- WHATWG WebSockets Standard - https://websockets.spec.whatwg.org/
- MDN WebSocket API - https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
- MDN CloseEvent code property - https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
- MDN JavaScript lexical grammar and reserved identifiers - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar
- `ws` API documentation - https://github.com/websockets/ws/blob/master/doc/ws.md
- Nginx WebSocket proxying documentation - https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The manual handshake example checked for the presence of `Sec-WebSocket-Key` but did not validate that it decodes to the required 16-byte value. Added a base64 decode/round-trip check and reject path for invalid keys.
- The frame validation example implied `Buffer.toString('utf8')` validates UTF-8. In Node.js this conversion does not throw for malformed byte sequences; the `ws` library validates text frames by default unless `skipUTF8Validation` is enabled. Updated the comment to reflect that behavior.
- The debugger example used `const debugger`, but `debugger` is a reserved JavaScript keyword and caused a syntax error. Renamed the variable to `wsDebugger`.
- The debugger helper reported binary sizes using only `byteLength`, which is inaccurate for browser `Blob` messages. Added `getSize()` to handle strings, `Blob`, and `ArrayBuffer`-style values.

## Review Notes
The JavaScript snippets were parse-checked with Node.js after edits. The Nginx proxy snippet matches the official WebSocket proxying pattern, and the close-code descriptions align with RFC 6455 and MDN. The post remains a practical guide; production implementations should generally prefer a maintained WebSocket library over hand-rolled frame and handshake handling.

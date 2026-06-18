# Validation Summary: How to Fix 'Invalid Frame Header' WebSocket Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- WebSocket protocol / RFC 6455
- Node.js `ws`
- Python `websockets`
- Nginx reverse proxying
- Apache HTTP Server reverse proxying
- HAProxy SSL/TLS termination and WebSocket routing
- tcpdump, TShark, curl, wscat

## Sources Consulted
- RFC 6455: The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Apache `mod_proxy_wstunnel` documentation: https://httpd.apache.org/docs/current/mod/mod_proxy_wstunnel.html
- HAProxy WebSocket configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/websocket/
- `ws` 8.21.0 package documentation and source: https://www.npmjs.com/package/ws and https://github.com/websockets/ws
- Python `websockets` 16.0 server and exceptions documentation: https://websockets.readthedocs.io/en/stable/reference/asyncio/server.html and https://websockets.readthedocs.io/en/stable/reference/exceptions.html
- MDN WebSocket `binaryType` and `send()` documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType and https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
- Wireshark / TShark manual pages: https://www.wireshark.org/docs/man-pages/
- Local CLI help for `tcpdump` 4.99.4 and `wscat` 6.1.0

## Issues Found
- The frame-structure explanation said every WebSocket message is wrapped in a single frame and omitted RSV bits. Updated it to say messages are carried in one or more frames and added RSV bits, which RFC 6455 defines as part of the first frame byte.
- The proxy failure sequence implied every stripped-upgrade response becomes an invalid frame header. Updated it to allow either failed upgrade or invalid frame header, depending on where the protocol mismatch occurs.
- One JavaScript example declared `const WebSocket` and `const wss` twice in the same code block. Wrapped the bad and good examples in separate scopes and moved the good server to a different port so the snippet is syntactically valid.
- The Node.js masking debug example used `verifyClient`, which current `ws` documentation discourages. Replaced it with origin logging from the `connection` request object.
- The Python `websockets` example used the older two-argument handler signature and caught `ProtocolError` directly. Updated it for the current asyncio API with a one-argument handler and `ConnectionClosedError`, since Sans-I/O protocol errors are translated in the asyncio implementation.
- The SSL/TLS termination wording implied TLS termination itself causes encrypted bytes to reach the backend. Reworded it to describe a proxy/backend TLS expectation mismatch.
- The HAProxy ACL example reused the same ACL name for unrelated conditions and used `Host` as a WebSocket detector. Replaced it with `Upgrade` and `Connection` ACLs.
- The frame-size and binary/text sections overstated their relationship to invalid frame headers. Updated them to identify payload-size closes, application decoding errors, and UTF-8 validation errors as related protocol symptoms rather than typical invalid-header causes.
- The summary table was updated to match the corrected explanations for size limits and binary/text mismatches.

## Review Notes
Several Node.js debugging snippets intentionally access `ws` internals such as `_receiver` and `WebSocket.Receiver.prototype.consume`. These APIs exist in `ws` 8.21.0 and the snippets parse, but they are internal implementation details and should be treated as short-term diagnostics rather than stable application code.

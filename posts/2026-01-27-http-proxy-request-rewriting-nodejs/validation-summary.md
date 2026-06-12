# Validation Summary: How to Build an HTTP Proxy with Request Rewriting in Node.js

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Node.js HTTP and HTTPS servers/clients
- HTTP proxy request forwarding
- Request path and header rewriting
- Response body transformation
- zlib gzip and deflate decompression
- Middleware-style authentication, CORS, logging, and rate limiting
- WebSocket upgrade proxying over ws and wss
- Basic weighted load balancing

## Sources Consulted
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js HTTPS documentation: https://nodejs.org/api/https.html
- Node.js Net documentation: https://nodejs.org/api/net.html
- Node.js TLS documentation: https://nodejs.org/api/tls.html
- Node.js Zlib documentation: https://nodejs.org/api/zlib.html
- RFC 9110: HTTP Semantics: https://datatracker.ietf.org/doc/html/rfc9110
- MDN Connection header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Connection

## Issues Found
- The introduction described the examples as "production-ready", but the snippets do not include production concerns such as comprehensive timeout handling, backpressure limits, retry policy, observability, or hardened header handling. Changed the wording to "practical HTTP proxy" to match the scope of the code.
- The proxy examples removed some hop-by-hop request headers but omitted `TE`, `Trailer`, and the commonly-seen non-standard `Proxy-Connection` header. Added those removals where client headers are forwarded upstream.
- The request rewriting example overwrote any existing `X-Forwarded-For` value. Updated it to append the client address to an existing forwarded chain.
- The response rewriting and middleware examples treated selected incoming header values as plain strings even though Node headers can be arrays. Updated content-type checks and API key handling to normalize those values before use.
- The WebSocket proxy only used `net.connect`, so it handled `ws://` targets but not secure `wss://` targets. Added `tls.connect` support for `wss://` and updated the usage example accordingly.
- The load balancing example accepted backend weights and labeled the algorithm as weighted round-robin, but the implementation ignored weights and skipped the first backend on the first request. Updated selection to expand healthy backends by weight and choose from that sequence.
- The load balancer forwarded `clientReq.url` directly even though Node types allow it to be undefined. Updated the path to fall back to `/`.

## Review Notes
The snippets were extracted and checked with `tsc --noEmit` using Node typings. They remain illustrative examples: a production proxy should also consider response hop-by-hop header filtering, request and response size limits, streaming transforms for large bodies, timeout policy, abort propagation, structured logging, metrics, TLS certificate policy, and behavior behind an existing trusted proxy.

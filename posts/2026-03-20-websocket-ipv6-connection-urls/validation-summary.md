# Validation Summary: How to Handle IPv6 in WebSocket Connection URLs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebSocket protocol (RFC 6455)
- IPv6 addressing / URL syntax (RFC 3986)
- Browser WebSocket API (WHATWG)
- Node.js `ws` library
- Nginx reverse proxy
- `wscat` CLI
- `curl` (IPv6 upgrade-handshake testing)

## Sources Consulted
- RFC 3986 – Uniform Resource Identifier (URI): Generic Syntax (https://datatracker.ietf.org/doc/html/rfc3986)
- RFC 6455 – The WebSocket Protocol (https://datatracker.ietf.org/doc/html/rfc6455)
- WHATWG URL Standard (https://url.spec.whatwg.org/)
- WHATWG HTML Location interface (https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-location-interface)
- MDN WebSocket API (https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- nginx ngx_http_core_module docs (https://nginx.org/en/docs/http/ngx_http_core_module.html)
- nginx ngx_http_proxy_module docs (https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- Node.js `ws` library on npm (https://www.npmjs.com/package/ws)
- wscat GitHub (https://github.com/websockets/wscat)

## Issues Found
- **Invalid IPv6 address in the Nginx example.** The original `proxy_pass http://[2001:db8:backend::1]:8080;` used the literal string `backend` inside the address. IPv6 addresses only contain hex digits (0-9, a-f); `k` and `n` are not valid hex, so this string is not a syntactically valid IPv6 address and would be rejected. Replaced with `[2001:db8:bac::1]` (valid hex within the RFC 3849 documentation prefix `2001:db8::/32`).

## Review Notes
- The `window.location.host` claim is correct: per the WHATWG URL Standard's host serializer, IPv6 hosts are serialized with surrounding square brackets, so `window.location.host` returns values like `[2001:db8::1]:443`.
- RFC 3986 §3.2.2 (IP-literal / IPvFuture) is the correct reference for the bracketed-IPv6 rule in URIs; RFC 6455 §3 defers URI parsing to RFC 3986.
- The `Sec-WebSocket-Key: test==` value in the `curl` example is not a valid base64-encoded 16-byte nonce, but the text frames it as a manual upgrade-header test, so it is acceptable as illustrative; a strictly compliant server would reject it.
- `listen [::]:80;` accepts both IPv4 and IPv6 on many Linux kernels (dual-stack sockets) unless `ipv6only=on` is set. The post does not need to cover this but readers deploying production configs may want to be aware.
- Code examples for the browser API, the `ws` library, `wscat`, and the dynamic URL helper all check out against current documentation.

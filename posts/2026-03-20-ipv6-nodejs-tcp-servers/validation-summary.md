# Validation Summary: How to Create IPv6 TCP Servers in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Node.js `net` module
- TCP clients and servers
- IPv6 and IPv4-mapped IPv6 addresses
- Newline-delimited JSON over TCP

## Sources Consulted
- Node.js `net` API documentation: https://nodejs.org/api/net.html
- Node.js `stream` API documentation (`readable.setEncoding()`): https://nodejs.org/api/stream.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The client example connected to `2001:db8::1`. That prefix is reserved for documentation, so I changed the sample target to `::1` to match the local server example and make the code work as a copy-paste test.
- The post treated `server.listen(..., '::')` as if dual-stack behavior were guaranteed. I corrected the comments and conclusion to match Node's documentation: binding to `::` may also accept IPv4 connections on most operating systems, but this is platform-dependent behavior.
- The IPv6-only example included a Linux-specific comment that did not match the Node API contract. I replaced it with the accurate behavior of `ipv6Only: true`, which disables dual-stack behavior when binding to `::`.
- The line-framed JSON example decoded each TCP chunk with `chunk.toString()`. I changed it to `socket.setEncoding('utf8')` and string buffering so split multibyte UTF-8 characters are handled correctly across chunk boundaries.

## Review Notes
- `ipv6Only` support in `server.listen(options)` was added in Node.js v11.4.0 and is available in current maintained releases.
- In addition to checking the docs, I smoke-tested the examples locally on Node.js v22.22.0. Binding to `::` accepted both `127.0.0.1` and `::1`, IPv4 clients appeared as `::ffff:127.0.0.1`, and `ipv6Only: true` rejected IPv4 connections as expected.

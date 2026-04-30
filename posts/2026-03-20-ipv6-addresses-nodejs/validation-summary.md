# Validation Summary: How to Handle IPv6 Addresses in Node.js Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- Node.js
- JavaScript
- IPv6
- DNS
- TCP sockets
- Express.js

## Sources Consulted
- Node.js `net` module documentation: https://nodejs.org/api/net.html
- Node.js `dns` module documentation: https://nodejs.org/api/dns.html
- Express API reference (`req.ip`): https://expressjs.com/en/api.html
- Express guide for reverse proxies: https://expressjs.com/en/guide/behind-proxies.html
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007.html
- RFC 6874, Representing IPv6 Zone Identifiers in Address Literals and URIs: https://www.rfc-editor.org/rfc/rfc6874

## Issues Found
- The description claimed the post covered third-party validation libraries, but the article only used Node.js built-in modules. I updated the description to match the actual content.
- The introduction said Express and other frameworks require specific IPv6 binding configuration. I corrected this to reflect that Express follows Node's underlying server binding behavior.
- The zone-ID section said link-local zone IDs must be stripped for most operations. I narrowed that claim to the accurate case where an API expects the bare address literal.
- The zone-ID snippet referenced `net.isIPv6()` without importing `net`. I added the missing `const net = require('net');`.
- The helper in the zone-ID section was labeled as URL formatting even though it strips the scope suffix. I renamed it to a bare host-literal formatter so the example matches what it actually does.
- The TCP server log printed IPv6 addresses and ports without brackets, which makes the output ambiguous. I updated the example to bracket IPv6 addresses before appending the port.
- The server-listen comment implied a specific `IPV6_V6ONLY` default. I replaced it with Node's documented behavior: listening on `::` may also accept IPv4 connections on most operating systems.
- The Express example treated `::ffff:192.168.1.1` as if it were native IPv6 and then stripped the prefix before calling `net.isIPv6()`, which incorrectly returned `false`. I corrected the explanation and changed the check to `net.isIPv6(clientIP)`.
- The DNS lookup comment said `dns.lookup(..., { all: true, family: 0 })` returns both A and AAAA records. I corrected it to note that it may return one or both families depending on the records and the system resolver.
- The client-IP extraction helper claimed to read from various proxy headers, but it only inspected `X-Forwarded-For`. I corrected the comment and added the trust-proxy caveat.

## Review Notes
- Spot-checked the examples against the local Node.js runtime (`v22.22.0`) in addition to the official docs.
- `dns.lookup()` behavior is resolver-dependent because it uses the operating system's name-resolution facilities rather than performing a raw DNS query like `dns.resolve6()`.
- Scoped IPv6 addresses are context-sensitive. Use the zone ID when an API needs the scoped address, and only strip it when the API explicitly expects the bare literal.

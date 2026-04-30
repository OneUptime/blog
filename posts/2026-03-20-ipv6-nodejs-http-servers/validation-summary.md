# Validation Summary: How to Create IPv6 HTTP Servers in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- JavaScript
- HTTP
- HTTPS
- IPv6
- Dual-stack networking
- Reverse proxy headers

## Sources Consulted
- Node.js `net` API documentation: https://nodejs.org/api/net.html
- Node.js `http` API documentation: https://nodejs.org/api/http.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://datatracker.ietf.org/doc/rfc7421/
- MDN, `X-Forwarded-For` header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For
- Local runtime validation with Node.js `v22.22.0`

## Issues Found
- The dual-stack section treated `net.isIPv6(bindAddr)` as though it reported whether the server was IPv6-only. It only validates that a string is an IPv6 address. I replaced that example with `server.listen({ host: '::', ipv6Only })`, which is the documented Node.js control for IPv6-only versus dual-stack behavior.
- The proxy section said to use `X-Forwarded-For` when behind a proxy without qualifying trust boundaries. I updated the prose and code to only trust headers added by a reverse proxy you control, which matches current security guidance.
- The proxy example detected IP version with `ip.includes(':')`, which can misclassify malformed values. I changed it to use `net.isIPv6()` and `net.isIPv4()`.
- The rate-limit example derived a `/64` key by splitting the IPv6 string on `:`, which breaks for compressed addresses such as `2001:db8::1`. I replaced it with normalization logic that expands IPv6 text before taking the first 64 bits.
- The opening and conclusion implied that `'::'` is dual-stack specifically on Linux. I corrected that to match Node.js documentation, which says binding to the unspecified IPv6 address may also bind `0.0.0.0` on most operating systems unless `ipv6Only` is enabled.

## Review Notes
- The HTTPS example is technically correct, but binding to port `443` on Unix-like systems may still require elevated privileges or a capability such as `CAP_NET_BIND_SERVICE`.
- `X-Real-IP` is a proxy-specific convention rather than a standardized header, so it depends on reverse-proxy configuration.
- All five JavaScript snippets passed syntax validation under local Node.js `v22.22.0`.
- A local runtime check confirmed that an IPv4 client connecting to a server bound to `'::'` was reported as `::ffff:127.0.0.1`, and that the revised `/64` helper produces stable keys for compressed IPv6 addresses.

# Validation Summary: How to Set IPv6 Address Preference in Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- RFC 6724 address selection
- RFC 8305 Happy Eyeballs
- Python `socket` and `asyncio`
- Java `java.net`
- Node.js `dns`, `net`, and `http`
- Go `net`

## Sources Consulted
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Python `asyncio` event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- Python `asyncio` streams documentation: https://docs.python.org/3/library/asyncio-stream.html
- Java networking properties: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/net/doc-files/net-properties.html
- Java `InetAddress` API: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/net/InetAddress.html
- Node.js `net` API: https://nodejs.org/api/net.html
- Node.js `http` API: https://nodejs.org/api/http.html
- Node.js `dns` API: https://nodejs.org/download/release/v24.2.0/docs/api/dns.html
- Go `net` package documentation: https://pkg.go.dev/net
- RFC 6724: https://www.rfc-editor.org/rfc/rfc6724
- RFC 8305: https://www.rfc-editor.org/rfc/rfc8305.html

## Issues Found
- The Python IPv6-only example treated missing AAAA results as an empty list, but `socket.getaddrinfo()` raises `socket.gaierror` on lookup failure. I changed the example to catch that exception and re-raise `ConnectionError`, and I added `SOCK_STREAM` to the source-bind example's destination lookup so it matches the TCP socket being created.
- The Java `preferIPv6Addresses` comment described the property as DNS-specific. I changed the wording to match Oracle's documentation: it changes IPv4/IPv6 address preference when both families are available.
- The Node.js example used `dns.resolve6()` and claimed `family: 6` on `net.createConnection()` forced an IPv6 socket type. Per the Node.js docs, `dns.resolve6()` performs direct DNS queries and bypasses the system resolver, while `family` is used to restrict hostname resolution. I changed the example to use `dns.lookup(hostname, { family: 6 })` and corrected the HTTP client comment.
- The Go example incorrectly said a custom `net.Resolver.Dial` callback would make the resolver return only IPv6 addresses. Go's docs show that `Resolver.Dial` controls how the resolver contacts DNS servers, while `tcp6` is the actual IPv6-only restriction. I removed the misleading resolver override and kept the `tcp6` and `LocalAddr` examples.
- The asyncio "Happy Eyeballs (RFC 8305)" example was a manual IPv6-then-IPv4 timeout fallback, not an RFC 8305 implementation. Python documents built-in Happy Eyeballs support via `asyncio.open_connection(..., happy_eyeballs_delay=..., interleave=...)`, so I replaced the example and updated the conclusion accordingly.

## Review Notes
- Python's `happy_eyeballs_delay` and `interleave` parameters were added in Python 3.8, so that example assumes Python 3.8+.
- Modern Node.js also has `autoSelectFamily` support in `net` for RFC 8305-style dual-stack connection attempts when a specific `family` is not forced; this post intentionally focuses on explicit address-family selection rather than automatic dual-stack racing.

# Validation Summary: How to Handle IPv6 Addresses in Structured Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 address representation
- Structured logging
- JSON logging
- Python `ipaddress`
- Python `logging`
- Python `urllib.parse`
- Go `net`
- Go `log/slog`

## Sources Consulted
- RFC 5952: A Recommendation for IPv6 Address Text Representation - https://datatracker.ietf.org/doc/html/rfc5952
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax - https://datatracker.ietf.org/doc/html/rfc3986
- Python `ipaddress` documentation - https://docs.python.org/3/library/ipaddress.html
- Python `logging` documentation - https://docs.python.org/3/library/logging.html
- Python `urllib.parse.urlsplit` documentation - https://docs.python.org/3/library/urllib.parse.html#urllib.parse.urlsplit
- Go `net` package documentation - https://pkg.go.dev/net
- Go `log/slog` package documentation - https://pkg.go.dev/log/slog
- Werkzeug `Request.remote_addr` documentation - https://werkzeug.palletsprojects.com/en/stable/wrappers/#werkzeug.wrappers.Request.remote_addr

## Issues Found
- The Python `ipaddress.ip_address()` example showed `::FFFF:192.168.1.1` normalizing to `::ffff:192.168.1.1`. Current Python `str(ipaddress.ip_address(...))` returns the compressed IPv6 form `::ffff:c0a8:101`, so the expected output comment was corrected.
- The Python formatter derived `ip_version` by checking whether `:` appeared in the normalized string. That could misclassify invalid values or raw host:port strings. It now uses `ipaddress.ip_address(...).version` and only emits `ip_version` when the value parses as an IP address.
- The Python formatter attempted to normalize `remote_addr`, while the field table describes `remote_addr` as a raw socket address such as `[2001:db8::1]:54321`. It now leaves `remote_addr` raw instead of treating it as an IP-only value.
- The raw socket address example used Flask `request.remote_addr` as though it contained `[IPv6]:port`. Werkzeug documents `remote_addr` as the client address, not a host:port pair. The example now uses a generic raw socket address string and parses the bracketed IPv6 host/port with `urllib.parse.urlsplit()`.

## Review Notes
- Python snippets were runtime-checked with Python 3.12. The Go toolchain was not installed locally, so the Go example was reviewed against the official Go `net` and `log/slog` documentation instead of being compiled.
- RFC 5952 recommends bracket notation when combining IPv6 addresses with port numbers in URI-style contexts; the revised raw socket example follows that convention.

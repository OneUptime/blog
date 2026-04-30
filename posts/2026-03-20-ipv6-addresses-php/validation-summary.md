# Validation Summary: How to Handle IPv6 Addresses in PHP Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- PHP
- IPv6
- HTTP proxy headers
- URL / URI formatting
- Socket programming

## Sources Consulted
- PHP manual: `filter_var()` and filter constants - https://www.php.net/manual/en/function.filter-var.php and https://www.php.net/manual/en/filter.constants.php
- PHP manual: `inet_pton()` - https://www.php.net/manual/en/function.inet-pton.php
- PHP manual: `inet_ntop()` - https://www.php.net/manual/en/function.inet-ntop.php
- PHP manual: `socket_create()` - https://www.php.net/manual/en/function.socket-create.php
- PHP manual: `socket_connect()` - https://www.php.net/manual/en/function.socket-connect.php
- RFC 3986, URI Generic Syntax - https://www.rfc-editor.org/rfc/rfc3986.html
- RFC 6874, IPv6 Zone Identifiers in URIs - https://www.rfc-editor.org/rfc/rfc6874
- RFC 7239, Forwarded HTTP Extension - https://www.rfc-editor.org/rfc/rfc7239
- MDN: `X-Forwarded-For` header parsing and trust model - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For
- Cloudflare HTTP headers reference - https://developers.cloudflare.com/fundamentals/reference/http-headers/

## Issues Found
- The IPv6 expansion and compression helpers relied on `inet_pton()` alone, which also accepts IPv4 input. I added explicit `FILTER_FLAG_IPV6` checks and preserved zone IDs so the functions now reject non-IPv6 input instead of silently producing incorrect output.
- The client-IP example unconditionally trusted `CF-Connecting-IP`, `X-Forwarded-For`, and `X-Real-IP`, which makes spoofing possible when requests do not come from a trusted proxy. I replaced it with a trusted-proxy example that falls back to `REMOTE_ADDR`, normalizes IPv4-mapped IPv6, and searches `X-Forwarded-For` from the right while skipping trusted proxies.
- The subnet-membership helper accepted malformed CIDR strings and non-IPv6 input. I added CIDR parsing and prefix-range validation so the example now rejects invalid or non-IPv6 values.
- The socket example sent an HTTP request with `HTTP/1.0` and a `Host` header that omitted the non-default port. I updated the request to `HTTP/1.1` and included `Host: [2001:db8::1]:8080` with `Connection: close`.
- The URL-formatting section cited RFC 2732 and stripped zone IDs entirely. I updated it to RFC 3986 and RFC 6874 behavior so scoped IPv6 addresses use bracket notation plus `%25`-encoded zone IDs.

## Review Notes
- PHP is not installed in this workspace, so I could not execute the snippets locally. The review was completed against the current PHP manual, RFCs, and vendor documentation instead.
- `Forwarded` is the standardized proxy header defined by RFC 7239, but keeping `X-Forwarded-For` in the example is still reasonable because it remains widely deployed.
- Cloudflare may send `CF-Connecting-IPv6` when Pseudo IPv4 is configured to overwrite visitor IP headers; that is a deployment-specific caveat to keep in mind for production setups.

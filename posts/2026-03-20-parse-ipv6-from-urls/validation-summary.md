# Validation Summary: How to Parse IPv6 Addresses from URLs

## Status
validated

## Post Type
Tutorial / Multi-language reference guide

## Technologies Covered
- IPv6 addressing in URLs (RFC 2732, RFC 3986, RFC 6874 zone IDs)
- Python `urllib.parse` and `ipaddress` modules
- Node.js WHATWG `URL` API and `net` module
- Go `net/url` and `net` packages

## Sources Consulted
- RFC 3986 (URI Generic Syntax): https://datatracker.ietf.org/doc/html/rfc3986
- RFC 2732 (Format for Literal IPv6 Addresses in URLs): https://datatracker.ietf.org/doc/html/rfc2732
- RFC 6874 (Representing IPv6 Zone Identifiers in URIs): https://datatracker.ietf.org/doc/html/rfc6874
- WHATWG URL Living Standard (host serialization): https://url.spec.whatwg.org/#host-serializing
- Python `urllib.parse` docs: https://docs.python.org/3/library/urllib.parse.html
- Python `ipaddress` docs: https://docs.python.org/3/library/ipaddress.html
- Node.js `URL` and `net` module docs: https://nodejs.org/api/url.html, https://nodejs.org/api/net.html
- Go `net/url` and `net` package docs: https://pkg.go.dev/net/url, https://pkg.go.dev/net
- Empirically verified by running the Python and JavaScript samples locally.

## Issues Found
1. **JavaScript: `URL.hostname` returns IPv6 addresses with their surrounding brackets**, but `net.isIPv6()` rejects bracketed input. The original code therefore always reported `isIPv6: false` for IPv6 URLs, contradicting both the inline comment ("Returns address without brackets") and the test output. Verified by running `new URL('http://[2001:db8::1]:8080/').hostname` → `'[2001:db8::1]'` in Node.js, and `net.isIPv6('[2001:db8::1]')` → `false`. Fixed by stripping the surrounding `[` and `]` before passing to `net.isIPv6` and updating the comment to describe the WHATWG behaviour accurately. After the fix, `isIPv6` is `true` for both `http://[2001:db8::1]:8080/api` and `https://[::1]:443/`.
2. **Python: misleading comment** "Decode percent-encoded zone ID". `urllib.parse.urlparse(...).hostname` does not percent-decode (verified: `urlparse('http://[fe80::1%25eth0]:8080/').hostname` returns `'fe80::1%25eth0'` in Python 3). The code splits on `%` to strip the zone ID, not to decode it. Comment updated to "Strip zone ID (e.g., 'fe80::1%25eth0') before IP validation".

## Review Notes
- Node.js's WHATWG URL parser rejects URLs that contain a zone identifier (e.g., `http://[fe80::1%25eth0]:8080/`) with `Invalid URL`. This is a known long-standing Node.js limitation and is independent of the post; the JS sample's `try/catch` returns the parser error for that input, which is the best the WHATWG API can do today.
- The post's claim that `parsed.port` is `null` when no port is present is correct for Python; in Node.js, `URL.port` returns an empty string (the post handles this via `port ? parseInt(port) : null`, which is correct). Note that for `https://[::1]:443/` Node also returns an empty `port` because 443 is the default scheme port — expected WHATWG behaviour, not a bug.
- The Go example would be slightly cleaner using the built-in `u.Hostname()` and `u.Port()` accessors instead of `net.SplitHostPort` plus manual bracket stripping, but the existing code is technically correct.
- RFC 6874 (the canonical reference for percent-encoded zone IDs in URIs) is not cited explicitly; only RFC 2732 and RFC 3986 are mentioned. The technical content about `%25` is correct, so this is purely a citation completeness observation, not an error.
- Calling `net.ParseIP(host)` twice in the Go IPv6 check is a minor inefficiency but not incorrect.

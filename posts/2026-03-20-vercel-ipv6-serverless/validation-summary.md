# Validation Summary: How to Configure Vercel Serverless IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vercel Serverless / Edge Functions
- IPv6 networking (RFC 4291, RFC 3986)
- Python `ipaddress` standard library module
- Python `urllib.request` and `requests` HTTP clients
- `curl` CLI (`-6`, `--resolve` flags)
- `dig` DNS lookup tool (AAAA records)
- IPv4-mapped IPv6 addresses (`::ffff:0:0/96`)

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html (verifying `ip_address()`, `IPv6Address.ipv4_mapped`, `.version`, `.is_private`)
- RFC 3986 (URI Generic Syntax) — bracket notation for IPv6 literals in URLs
- RFC 4291 (IPv6 Addressing Architecture) — IPv4-mapped address format and valid hex segments
- curl manpage: https://curl.se/docs/manpage.html (`-6` / `--ipv6` and `--resolve` options)
- Vercel Functions / Python runtime documentation: https://vercel.com/docs/functions (runtime handler shapes)

## Issues Found
- **Step 5 — Invalid IPv6 literal**: `2001:db8::backend` was used as an illustrative environment variable value, but `backend` is not a valid hex label (characters `k` and `n` are not valid hex digits 0–9 / a–f). Replaced with `2001:db8::abcd`, which is a valid hex representation while still being an RFC 3849 documentation-range address.

## Review Notes
- The post is titled "Vercel Serverless IPv6" but the Python handler example in Step 2 uses the AWS Lambda `(event, context)` API Gateway signature (`event["requestContext"]["identity"]["sourceIp"]`), which is not Vercel's Python runtime shape. Vercel's Python runtime uses a `BaseHTTPRequestHandler` subclass or WSGI/ASGI handlers. The author does frame the examples as generic ("varies by platform", "shown as generic examples"), so the code is not outright wrong as a generic serverless illustration, but readers expecting copy-paste-ready Vercel code would be misled. A future revision could either (a) change the title to drop "Vercel" and make it platform-agnostic, or (b) replace the handler with Vercel's actual Python handler shape.
- `ipaddress.IPv6Address.ipv4_mapped` correctly returns an `IPv4Address` (truthy) or `None`, so the `if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped` guard is accurate.
- `curl --resolve host:port:addr` accepts bare IPv6 addresses (curl parses it by splitting on the first two colons); bracket form `[addr]` has been supported since curl 7.57.0 but is optional here.
- Bracket notation (`http://[2001:db8::1]/...`) for IPv6 URLs is correct per RFC 3986 §3.2.2.
- `2001:db8::/32` is the reserved documentation prefix (RFC 3849), so the example addresses are safe and appropriate.

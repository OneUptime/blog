# Validation Summary: How to Understand IPv6 Address Format and Notation

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 addressing (RFC 4291)
- IPv6 text representation (RFC 5952)
- IPv6 in URIs (RFC 3986)
- Python `ipaddress` standard library module
- Nginx `listen` directive (IPv6)

## Sources Consulted
- RFC 4291 — IP Version 6 Addressing Architecture (https://www.rfc-editor.org/rfc/rfc4291)
- RFC 5952 — A Recommendation for IPv6 Address Text Representation (https://www.rfc-editor.org/rfc/rfc5952)
- RFC 3986 — URI Generic Syntax, Section 3.2.2 host (https://www.rfc-editor.org/rfc/rfc3986#section-3.2.2)
- Python `ipaddress` module documentation (https://docs.python.org/3/library/ipaddress.html)
- Nginx `listen` directive documentation (https://nginx.org/en/docs/http/ngx_http_core_module.html#listen)
- Verified compression behavior with `python3 -c "import ipaddress; print(ipaddress.IPv6Address('2001:0db8:0000:0000:0000:0000:0000:0001').compressed)"`

## Issues Found
- **Incorrect zero-group count in Rule 2 example.** The post stated `(:: replaces four :0: groups)` for the compression of `2001:0db8:0000:0000:0000:0000:0000:0001` to `2001:db8::1`. The intermediate form `2001:db8:0:0:0:0:0:1` contains five all-zero groups, not four. Changed the comment to `(:: replaces five all-zero groups)` to reflect the correct count.

## Review Notes
- The address `2001:db8::/32` is described as "(like a /32 route)" in the CIDR section. While technically the prefix length notation is shared with IPv4, an IPv4 /32 is a single host route whereas an IPv6 /32 is a large block (typically an ISP allocation per RFC 6177). The phrasing is potentially misleading but not factually wrong, so it was left unchanged.
- The Python example uses `addr.split('%')[0]` to strip the scope ID before parsing. Note that since Python 3.9, `ipaddress.IPv6Address` natively accepts scope IDs (e.g., `fe80::1%eth0`), so the split is no longer strictly necessary on modern Python — but it remains backward-compatible and harmless.
- All address examples (loopback `::1`, unspecified `::`, link-local `fe80::/10`, documentation prefix `2001:db8::/32`) align with RFC 4291 and RFC 3849.
- Bracket notation for IPv6 in URLs is correctly attributed (RFC 3986 §3.2.2).

# Validation Summary: How to Parse IPv6 Addresses in Python

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Python 3 (PEP 604 union syntax `|`, PEP 585 `list[...]`)
- `ipaddress` standard library module (`IPv6Address`, `IPv6Interface`, `IPv6Network`)
- `urllib.parse` for URL host extraction
- `re` (regular expressions) for log scraping
- IPv6 address formats: compressed, uncompressed, link-local with zone IDs, IPv4-mapped, CIDR

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python 3.9 release notes (zone ID / `scope_id` support added): https://docs.python.org/3/whatsnew/3.9.html
- Python `urllib.parse` documentation (hostname extraction strips brackets for IPv6): https://docs.python.org/3/library/urllib.parse.html
- RFC 4007 (IPv6 Scoped Address Architecture, zone ID syntax)
- RFC 4291 (IPv6 Addressing Architecture, including `::ffff:0:0/96` IPv4-mapped form)
- RFC 3986 §3.2.2 (URI authority IP-literal bracket form for IPv6)
- Local execution against Python 3.12 to confirm behavior of every snippet

## Issues Found

1. **Outdated claim about zone ID support.** The "Handling Zone IDs" section originally stated *"Python's ipaddress module does not support zone IDs - strip them first"* and showed manual `%`-splitting. This has been false since Python 3.9 (released 2020), where `IPv6Address` accepts addresses with zone IDs and exposes them via the `scope_id` attribute. I rewrote the section to use `ipaddress.IPv6Address(...).scope_id` directly, removed the unused `import re`, and updated the example output comment to reflect that `str(addr)` now includes the zone (`fe80::1%eth0`).

2. **Regex truncated compressed addresses with `::` in the middle.** The original `IPV6_PATTERN` had no alternative for the common `xxxx::yyyy` mid-`::` form. On the post's own test input (`Connection from 2001:db8::1 to 2001:4860:4860::8888 ...`), the "ends with `::`" alternative matched first and the regex returned `['2001:db8::', '2001:4860:4860::']` rather than the full addresses. I added a mid-`::` alternative ahead of the ends-with-`::` one and adjusted the trailing `\b` anchors that were ineffective next to non-word `:` characters. The pattern now correctly extracts `2001:db8::1` and `2001:4860:4860::8888`, matching what the post's test output implies.

## Review Notes
- All other snippets execute as documented on Python 3.12: `IPv6Address`, `IPv6Interface.ip` / `.network`, `IPv6Address.ipv4_mapped`, and `urllib.parse.urlparse(...).hostname` (which correctly strips IPv6 brackets per RFC 3986).
- The post uses PEP 604 union syntax (`X | None`) and PEP 585 generic syntax (`list[...]`), which require Python 3.10+ and 3.9+ respectively. The post does not state a minimum version; this is fine for a 2026 audience but worth noting.
- The IPv6 regex is still intentionally simplified and will not catch every edge case (e.g., embedded IPv4 like `::ffff:192.0.2.1` is not in any alternative; some compressed forms with leading-zero suppression around `::` are validated only because `IPv6Address()` is permissive). The post acknowledges this with the "simplified - handles most cases" comment, and the post-validation step via `IPv6Address()` filters out false positives.
- Minor: the URL-parsing snippet has an unused `import re`. Left as-is since it is not technically wrong.

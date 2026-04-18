# Validation Summary: How to Validate IPv6 Addresses in User Input

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 addressing (RFC 4291, RFC 5952)
- Python `ipaddress` standard library
- JavaScript/TypeScript regex validation
- Go `net.ParseIP` (referenced)
- PHP `filter_var` / `FILTER_VALIDATE_IP` / `FILTER_FLAG_IPV6` (referenced)
- CIDR notation, zone IDs, IPv4-mapped addresses, URL bracket notation

## Sources Consulted
- Python `ipaddress` module docs: https://docs.python.org/3/library/ipaddress.html
- `IPv6Address` attributes (`is_global`, `is_loopback`, `is_link_local`): https://docs.python.org/3/library/ipaddress.html#ipaddress.IPv6Address
- `IPv6Network(strict=False)`: https://docs.python.org/3/library/ipaddress.html#ipaddress.IPv6Network
- RFC 4291 (IP Version 6 Addressing Architecture): https://www.rfc-editor.org/rfc/rfc4291
- RFC 5952 (Recommendation for IPv6 Text Representation): https://www.rfc-editor.org/rfc/rfc5952
- RFC 6874 (Zone Identifiers in IPv6 URI scope): https://www.rfc-editor.org/rfc/rfc6874
- Go `net.ParseIP`: https://pkg.go.dev/net#ParseIP
- PHP `filter_var` with `FILTER_VALIDATE_IP`: https://www.php.net/manual/en/function.filter-var.php

## Issues Found
No technical issues found.

## Review Notes
- The Python sanitization function uses `str | None` return type hint (PEP 604 syntax), which requires Python 3.10+. If broader compatibility is needed, `Optional[str]` from `typing` could be substituted. Not an error — just a version consideration.
- The claim "Max IPv6 string: 45 chars" is correct for the longest bare textual form (the uncompressed IPv4-mapped representation `0000:0000:0000:0000:0000:ffff:255.255.255.255`). Brackets, zone IDs, or CIDR suffixes can push valid input past 45 characters, but the code's 50-char threshold handles typical forms; overly long zone IDs would be rejected by the 50-char check, which is acceptable defensive behavior.
- The TypeScript regex is functional and conservative; it includes (unreachable) branches for zone IDs that are already stripped before the regex runs. Harmless.
- Python 3.9+ supports parsing zone IDs directly in `IPv6Address`; the tutorial opts to strip zone IDs manually, which remains compatible with older versions and avoids coupling to a specific interpreter version. This is a reasonable choice and not incorrect.
- The post correctly warns readers to prefer language-native parsers over hand-rolled regex in production, which aligns with current best practice.

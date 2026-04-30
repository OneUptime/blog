# Validation Summary: How to Convert IPv4 Addresses to Binary Representation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python standard library `ipaddress` module
- IPv4 addressing
- Binary representation of IPv4 addresses
- CIDR and subnetting

## Sources Consulted
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791.html
- RFC 4632, Classless Inter-domain Routing (CIDR): https://www.rfc-editor.org/rfc/rfc4632.html

## Issues Found
- The `show_network_host_bits()` example built its `N/H` map one octet at a time, which produced incorrect output for prefixes that are not multiples of 8, such as `/26`. I changed the annotation logic to mark network and host portions bit-by-bit so the example now works for any valid IPv4 prefix length from `/0` to `/32`.

## Review Notes
- The post’s Python examples use current standard-library APIs and were re-checked against the current `ipaddress` documentation.
- The examples were executed locally with Python 3.12.3 after the fix.
- The first helper, `ipv4_to_binary()`, assumes a valid dotted-decimal IPv4 string; if stricter input validation is desired in the future, `ipaddress.IPv4Address` would be the standard-library way to enforce it.

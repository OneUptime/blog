# Validation Summary: How to Understand IPv6 CIDR Notation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and prefix notation
- CIDR subnetting and route matching
- Python `ipaddress` standard library
- Linux `ip` / `iproute2` route inspection

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture": https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 5952, "A Recommendation for IPv6 Address Text Representation": https://www.rfc-editor.org/rfc/rfc5952.html
- RFC 4193, "Unique Local IPv6 Unicast Addresses": https://www.rfc-editor.org/rfc/rfc4193.html
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
- The Python example labeled a 32-bit slice as the "first 64 bits". I corrected the snippet to print the actual first 64 bits of the network address and to mark only the visible prefix bits.
- The Python example used `IPv6Network.broadcast_address` to show the last address in a prefix. I changed it to compute the numerically last address directly because IPv6 does not use broadcast addressing.
- The "Prefix Notation vs Full Representation" table mixed expanded forms with binary shorthand and prose. I replaced those cells with actual fully expanded IPv6 representations so the column matches its heading and the `ff02::1/128` row is no longer misleading.

## Review Notes
- The remaining Python examples were executed and matched the post's explanations for containment checks and prefix aggregation.
- The `ip -6 route show` command syntax is valid and consistent with `ip-route(8)`. Longest-prefix-match behavior described in the example is correct.

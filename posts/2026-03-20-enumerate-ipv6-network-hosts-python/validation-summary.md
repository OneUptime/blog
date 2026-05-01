# Validation Summary: How to Enumerate IPv6 Network Hosts in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python `ipaddress` module
- IPv6 addressing
- Linux neighbor discovery (`ip -6 neigh`)
- ICMP ping for IPv6

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- `ip-neighbour(8)` reference for `ip neigh`: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- `ping(8)` reference for current IPv6 usage via `ping -6`: https://man7.org/linux/man-pages/man8/ping.8.html
- Local command help output from `ip -6 neigh help` and `ping -6 -h`
- Local Python runtime checks using `ipaddress.IPv6Network.hosts()` on `/126`, `/120`, `/127`, and `/128`

## Issues Found
- The post treated IPv6 usable-host counts like IPv4 by subtracting network and broadcast addresses. I corrected the `/126` example and the size-check logic to match Python's documented IPv6 `hosts()` behavior, which excludes the Subnet-Router anycast address for most IPv6 networks.
- The example prefix `2001:db8:rack1::/64` was invalid IPv6 syntax because hextets may contain only hexadecimal digits. I replaced it with a valid documentation-prefix example.
- The sweep example used `ping6`. Current `iputils` documentation treats IPv6 mode as `ping -6`, with `ping6` kept only as a compatibility symlink on some systems, so I updated the command accordingly.

## Review Notes
- The NDP example filters on `addr.is_global`, so it will omit link-local and ULA neighbors. That is a design choice rather than a correctness error.

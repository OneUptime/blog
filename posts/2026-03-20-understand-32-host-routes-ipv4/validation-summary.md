# Validation Summary: How to Understand /32 Host Routes in IPv4

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv4 routing and CIDR notation
- Linux iproute2 (`ip route`, `ip addr`)
- FRRouting / Cisco-style BGP prefix-lists
- Python `ipaddress` standard library module
- BGP, anycast, MPLS LSP, and blackhole routing concepts

## Sources Consulted
- RFC 4632 (CIDR address aggregation)
- RFC 3021 (Using 31-Bit Prefixes on IPv4 Point-to-Point Links)
- iproute2 man pages (ip-route(8), ip-address(8))
- FRRouting documentation for `ip prefix-list` (https://docs.frrouting.org/en/latest/filter.html)
- Python `ipaddress` module docs (https://docs.python.org/3/library/ipaddress.html)
- Verified Python snippets locally with Python 3

## Issues Found
No technical issues found.

- The /32 mask description (255.255.255.255, all bits network, one address) is correct.
- All iproute2 commands (`ip route add ... via ...`, `ip addr add .../32 dev lo`, `ip route add blackhole .../32`) are valid syntax.
- The FRR prefix-list syntax (`ip prefix-list NAME deny 0.0.0.0/0 ge 32`) is correct; `ge 32` matches /32 only since /32 is the maximum IPv4 prefix length.
- The Python `ipaddress.IPv4Network(..., strict=False).prefixlen` usage is correct, and the `num_addresses` / "usable" calculation produced the expected values (1, 2, 254) when executed.

## Review Notes
- The BGP filter example permits up to /30 (`le 30`), which means /31 routes are also implicitly denied along with /32. The accompanying comment focuses on /32, but in practice many operators do filter both /31 and /32 from customer announcements, so the example is reasonable; readers wanting to allow /31 point-to-point announcements would change `le 30` to `le 31`.
- The `route add 8.8.8.8/32 via gw` example in the table uses an iproute2-style shorthand rather than the legacy `route(8)` syntax, which is fine as an illustrative example.

# Validation Summary: How to Use the IPv6 Unspecified Address (::) Correctly

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- IPv6 (RFC 4291)
- Python socket and ipaddress modules
- Go net package
- Nginx configuration
- Linux iproute2 (`ip -6`)
- Cisco IOS IPv6 routing
- ICMPv6 Neighbor Discovery / Duplicate Address Detection (RFC 4862)

## Sources Consulted
- RFC 4291 — IP Version 6 Addressing Architecture (Section 2.5.2, Unspecified Address): https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (DAD): https://datatracker.ietf.org/doc/html/rfc4862
- Python `ipaddress` module documentation (`IPv6Address.is_unspecified`): https://docs.python.org/3/library/ipaddress.html
- Python `socket` module documentation (AF_INET6, IPV6_V6ONLY): https://docs.python.org/3/library/socket.html
- Go `net` package documentation (`net.Listen`): https://pkg.go.dev/net
- Nginx `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Cisco IOS IPv6 Command Reference (`ipv6 route`)

## Issues Found
No technical issues found.

All claims were verified against authoritative sources:
- RFC 4291 correctly restricts `::` from being assigned to any node and from use as a destination address; permits it as a temporary source address during initialization.
- The Python socket example is correct: `IPV6_V6ONLY = 0` enables dual-stack acceptance of IPv4-mapped addresses. The 2-tuple `bind(("::", 8080))` form is valid for AF_INET6 sockets.
- The Go `net.Listen("tcp6", "[::]:8080")` syntax is correct.
- The Nginx `listen [::]:80;` and `listen [::]:443 ssl;` directives are valid.
- DAD mechanics are accurate per RFC 4862: source `::`, destination solicited-node multicast `ff02::1:ff<low-24>`, ICMPv6 Neighbor Solicitation, default RetransTimer of ~1 second with DupAddrDetectTransmits = 1.
- The Linux `ip -6 route add default via 2001:db8::1` and Cisco `ipv6 route ::/0 2001:db8::1` commands are correct.
- Python `ipaddress.IPv6Address(addr).is_unspecified` returns the documented values for `::`, `::1`, and `0:0:0:0:0:0:0:0`.

## Review Notes
- The `connect(sock, "::", 80)` example is presented in a stylized form rather than exact C syscall syntax; this is clearly illustrative of the concept rather than a literal API call, so it is acceptable in context.
- Minor stylistic note: "tentative-free" in the DAD section is informal phrasing; RFC 4862 uses "preferred" / "tentative" states. The meaning (address passed DAD) is correct.
- The post correctly distinguishes `::` (unspecified, /128) from `::/0` (default route / any destination), which is a common source of confusion.

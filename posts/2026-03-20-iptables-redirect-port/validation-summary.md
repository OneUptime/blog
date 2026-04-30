# Validation Summary: How to Redirect Traffic to a Different Port with iptables

## Status
validated

## Post Type
Guide

## Technologies Covered
- `iptables`
- Netfilter NAT (`REDIRECT`, `DNAT`)
- Linux networking
- `curl`
- `ss`

## Sources Consulted
- `iptables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Netfilter NAT HOWTO: https://netfilter.org/documentation/HOWTO/NAT-HOWTO-6.html
- Netfilter NAT HOWTO, Destination NAT onto the Same Network: https://netfilter.org/documentation/HOWTO/NAT-HOWTO-10.html
- Linux kernel IP sysctl documentation (`ip_forward`, `route_localnet`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local CLI help and translation checks: `iptables -j REDIRECT -h`, `iptables -j DNAT -h`, `iptables-translate`

## Issues Found
- The post used `REDIRECT --to-port`, while current `iptables` documentation presents `--to-ports`. I updated the examples to the documented form for consistency with current man pages.
- The `OUTPUT` examples matched all locally generated traffic to ports 80 and 443, which would also rewrite outbound HTTP/HTTPS requests to remote hosts. I scoped those rules with `-o lo` and adjusted the localhost example accordingly so the section does what it claims without overreaching.
- The localhost verification used `curl http://localhost:80`, which may resolve to IPv6 `::1` on some systems and bypass the IPv4 `iptables` rules shown in the post. I changed the example to `127.0.0.1`.
- The same-host `DNAT` example rewrote `PREROUTING` traffic to `127.0.0.1:8080`. Linux treats `127/8` specially, and `route_localnet` is disabled by default, so this is not a safe general recommendation for incoming traffic. I changed the example to DNAT to a specific local IP on the same host instead.
- The different-host `DNAT` example was presented as a standalone forwarding rule. I clarified inline that forwarding to another host also depends on IP forwarding and correct return-path routing.
- The removal section only showed deletion of the `PREROUTING` rule even though earlier examples also added `OUTPUT` rules. I added the matching `OUTPUT` deletion example.
- The closing sentence described iptables redirection as the "most lightweight" alternative, which is not a precise technical claim. I changed it to "a lightweight alternative."

## Review Notes
- The examples are IPv4 `iptables` examples. Equivalent IPv6 handling requires `ip6tables` or an `nftables` equivalent.
- The `nat` table is consulted when a packet creates a new connection, so rule changes affect new connections rather than already-established ones.

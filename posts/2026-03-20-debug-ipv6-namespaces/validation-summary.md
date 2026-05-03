# Validation Summary: How to Debug IPv6 Issues in Network Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux Network Namespaces (`ip netns`)
- iproute2 (`ip` command)
- IPv6 (addressing, NDP, routing)
- veth pairs
- tcpdump
- ip6tables / nftables (mentioned)

## Sources Consulted
- iproute2 / `ip-netns(8)` man page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-address(8)` man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-neighbour(8)` man page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`): https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4861 — Neighbor Discovery for IPv6 (NDP): https://datatracker.ietf.org/doc/html/rfc4861
- tcpdump man page: https://www.tcpdump.org/manpages/tcpdump.1.html
- iputils `ping` / `ping6` notes: https://github.com/iputils/iputils

## Issues Found
- **Broken conclusion sentence (missing words):** The conclusion read "uses standard Linux  commands with the  subcommand." with double spaces where the technology names had been dropped. Replaced with "uses standard Linux `ip` commands with the `netns` subcommand." This also fixed the slightly awkward "How to Debug IPv6 Issues..." being used as the sentence subject by rephrasing as "Debugging IPv6 issues in network namespaces..."

## Review Notes
- All `ip netns`, `ip link`, `ip -6 addr`, `ip -6 route`, and `ip -6 neigh` commands are syntactically and semantically correct.
- The example uses `2001:db8::/64` which is the RFC 3849 documentation prefix — appropriate for tutorials.
- `ping6` is technically deprecated upstream (merged into `ping` in iputils 20190324, March 2019) but remains available as a symlink/wrapper on virtually all current Linux distributions, so the examples still work as written. A future revision could prefer `ping -6` or just `ping <ipv6-addr>` for forward compatibility.
- In the "Full Setup Script", the `trap cleanup EXIT` is registered at the very end of the script, so cleanup will fire on script exit (including after the connectivity test) — that is the intended behavior for a transient lab, but readers wanting persistent namespaces should remove the trap.
- The veth pair is created in the host namespace and then both ends are immediately moved to namespaces (`ip link add` defaults to creating both peers in the current namespace). This is correct and matches standard practice.
- The `tcpdump -i veth1 ip6` example works inside the namespace because the interface name `veth1` is local to that namespace's network stack.

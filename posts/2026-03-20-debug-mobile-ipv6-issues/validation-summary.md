# Validation Summary: How to Debug Mobile IPv6 Issues

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Mobile IPv6 (MIPv6, RFC 6275)
- UMIP (`mip6d`) — Linux user-space MIPv6 implementation
- tcpdump (Mobility Header capture, IPv6-in-IPv6 capture)
- Wireshark (`mip6` display filter)
- iproute2 (`ip -6 neigh`, `ip -6 tunnel`, `ip -6 route`, `ip xfrm`, `ip link`)
- IPsec / strongSwan (`swanctl`)
- IPv6-in-IPv6 tunneling (RFC 2473, next-header 41)
- Proxy NDP for MIPv6 home agents
- systemd-journald (`journalctl`)

## Sources Consulted
- RFC 6275 — "Mobility Support in IPv6" (BU/BA, Mobility Header proto 135, status codes in Section 6.1.8)
- RFC 2473 — "Generic Packet Tunneling in IPv6" (next-header 41 for IPv6-in-IPv6, 40-byte overhead)
- RFC 4877 — "Mobile IPv6 Operation with IKEv2 and the Revised IPsec Architecture"
- IANA Protocol Numbers registry (135 = Mobility Header; 41 = IPv6 encapsulation)
- iproute2 man pages: `ip-tunnel(8)`, `ip-neighbour(8)`, `ip-xfrm(8)`, `ip-link(8)`, `ip-route(8)`
- UMIP project documentation (`mip6d.conf`, mip6d daemon flags)
- strongSwan `swanctl(8)` documentation
- tcpdump pcap-filter(7) syntax for `ip6 proto N`
- Wireshark display filter reference for `mip6`
- Linux kernel `Documentation/networking/ip-sysctl.txt` for `proxy_ndp`

## Issues Found
1. **Incorrect BA status code in the table.** Per RFC 6275 §6.1.8, status code **132** is "Not home subnet"; status **133** is "Not home agent for this mobile node". The post labelled "BA status 133 | Not home subnet" — corrected the code to **132** so it matches the cause/fix described in that row.
2. **`ip tunnel show` does not list IPv6 tunnels.** iproute2's `ip tunnel` object handles only IPv4 tunnel devices (sit/gre/ipip). MIPv6 uses `ip6tnl` (IPv6-in-IPv6) interfaces, which require the IPv6 family — changed `ip tunnel show` to `ip -6 tunnel show` in Step 4.

## Review Notes
- **`mip6d -n` to print the binding cache** (Step 3): UMIP's `mip6d` is a daemon and does not have a documented "query" mode for the binding cache; `-n` is typically a "do not detach / foreground" option in similar tooling. The standard way to inspect UMIP's binding cache is to send `SIGUSR1` to the running daemon (which dumps state to the debug log) and read the log. Left as-is because UMIP forks/distros vary and the surrounding `kill -USR1` step already covers the supported approach; consider clarifying in a future revision.
- **Tunnel interface name `mip6-tunnel`**: UMIP's kernel-created tunnels are typically named `ip6tnl1`, `ip6tnl2`, etc. The post uses `mip6-tunnel` as a placeholder; readers should substitute the actual interface name (`ip -6 tunnel show` or `ip link show type ip6tnl`).
- **Step 6 vs Step 7 MTU recommendation inconsistency**: the table suggests "Set tunnel MTU to 1280" (the IPv6 minimum, always safe) while the Step 7 example computes `1500 - 40 = 1460` (outer link MTU minus IPv6 header). Both are valid in different scenarios (1280 is the conservative floor), so this was left as-is.
- **`ip xfrm policy show | grep "proto 135"`**: depending on iproute2 version, the output may render the protocol as `proto mh` (named) rather than `proto 135` (numeric). If the grep returns nothing, retry with `grep -E "proto (135|mh)"`.
- The technical core (Mobility Header = IP proto 135, IPv6-in-IPv6 = next-header 41, 40-byte tunnel overhead, BA status 135 = sequence out of window, proxy NDP requirement on the HA, IPsec-protection of BU/BA per RFC 4877) is all consistent with the relevant RFCs.

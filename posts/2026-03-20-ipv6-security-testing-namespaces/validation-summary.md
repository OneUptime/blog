# Validation Summary: How to Use Network Namespaces for IPv6 Security Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux network namespaces
- iproute2 (`ip netns`, `ip link`, `ip address`, `ip route`, `ip neigh`)
- IPv6
- veth interfaces
- Neighbor Discovery Protocol (NDP)
- `tcpdump`
- OneUptime

## Sources Consulted
- Linux `network_namespaces(7)` man page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux `ip-netns(8)` man page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Linux `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `veth(4)` man page: https://man7.org/linux/man-pages/man4/veth.4.html
- Linux `ip-address(8)` man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- iputils `ping6(8)` / `ping(8)` man page: https://manpages.debian.org/testing/iputils-ping/ping6.8.en.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849
- OneUptime website link verification: https://oneuptime.com/
- Author GitHub profile link verification: https://github.com/nawazdhandala

## Issues Found
- The post used `ping6` as the primary invocation. I changed the examples to `ping -6`, which is the current iputils form; modern systems typically provide `ping6` only as a compatibility symlink to `ping`.
- The examples assigned IPv6 addresses and then immediately tested connectivity. I added `nodad` to the manual `ip -6 addr add` commands so the disposable lab setup does not race with IPv6 Duplicate Address Detection before the first ping.
- The prerequisites omitted `tcpdump` even though the verification section uses it. I added it as an optional prerequisite for the packet-capture example.
- The OneUptime monitoring guidance implied that namespace-assigned IPv6 addresses are directly monitorable on their own. I corrected this to require actual network reachability, such as via the host-side veth, a bridge, or routing.
- The conclusion contained broken command references and an over-broad claim that all IPv6 tools work identically inside namespaces. I corrected the command names and narrowed the claim to standard Linux networking tools executed in the target namespace context.

## Review Notes
- The example uses `2001:db8::/32`, which is the correct IPv6 documentation prefix per RFC 3849.
- The full setup script intentionally deletes the namespaces on exit. Readers who want to inspect the lab after the script finishes would need to remove or adjust the cleanup trap.

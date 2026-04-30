# Validation Summary: How to Create IPv6 Network Namespaces on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux network namespaces
- IPv6
- `iproute2` (`ip netns`, `ip link`, `ip -6 addr`)
- Virtual Ethernet (`veth`) pairs
- Linux `sysctl` network settings
- ICMPv6 connectivity testing with `ping`

## Sources Consulted
- `network_namespaces(7)` Linux man page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- `ip-netns(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `veth(4)` Linux man page: https://man7.org/linux/man-pages/man4/veth.4.html
- `ping(8)` Linux man page: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux kernel IPv6 documentation: https://docs.kernel.org/networking/ipv6.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The post manually added `::1/128` to `lo` inside the namespace. Linux already provides the IPv6 loopback address when IPv6 is enabled, so that command is unnecessary and can fail with `RTNETLINK answers: File exists`. I removed that command.
- The section titled "Enabling IPv6 in the Namespace" was really about enabling IPv6 forwarding and controlling Router Advertisement behavior. I renamed it to "Enabling IPv6 Forwarding in the Namespace" and clarified that `accept_ra=2` is needed when Router Advertisements must still be accepted after forwarding is enabled.
- The cleanup section deleted the namespace first and then told the reader to delete `veth0`. When a namespace is freed, virtual `veth` devices inside it are destroyed, and deleting one end of a `veth` pair removes its peer. I changed the cleanup order to delete `veth0` first and then delete the namespace.

## Review Notes
- The examples use `2001:db8::/32`, which is the documentation prefix reserved by RFC 3849. That is appropriate for a tutorial and works for local namespace testing, but it is not globally routable.
- `ping6` is still available as an alias in current `iputils`; current documentation centers on `ping` with `-6`.

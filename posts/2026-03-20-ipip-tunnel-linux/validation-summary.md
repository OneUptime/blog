# Validation Summary: How to Create an IPIP Tunnel on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- IPIP tunnels
- `iproute2`
- `systemd-networkd`
- `tcpdump`
- IPv4 routing

## Sources Consulted
- `ip-tunnel(8)` manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `pcap-filter(7)` manual page for `tcpdump` capture filter syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `systemd.netdev(5)` manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network(5)` manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Linux kernel IP sysctl documentation (`ip_forward`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers

## Issues Found
- The routed-subnet example added static routes to remote LANs but did not enable IPv4 forwarding on the tunnel endpoints. I added `sysctl -w net.ipv4.ip_forward=1` to the routing section because forwarding is required when the tunnel hosts act as routers between LANs.
- The `systemd-networkd` `.netdev` example was not fully self-contained. For tunnel netdevs, `systemd-networkd` normally expects the tunnel to be requested by an underlying `.network` file using `Tunnel=`, unless `Independent=yes` is set. I added `Independent=yes` to the `[Tunnel]` section so the shown `.netdev` and `.network` files work together as written.
- The conclusion implied that adding routes alone is sufficient for routing remote subnets. I updated the sentence to note that IPv4 forwarding must also be enabled when routing other subnets through the tunnel.

## Review Notes
- The `ip tunnel add ... mode ipip` commands, `ttl 255` usage, overlay addressing, and `tcpdump` protocol-4 capture examples are technically correct.
- `modprobe ipip` may be unnecessary on systems where IPIP support is built into the kernel or auto-loaded, but it is still a valid command.
- The `systemd-networkd` example shown is host-specific for `10.0.0.1` and `172.16.0.1/30`; the peer host would need the corresponding reversed values, just like the manual `ip tunnel` example earlier in the post.

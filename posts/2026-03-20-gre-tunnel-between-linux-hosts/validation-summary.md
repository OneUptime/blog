# Validation Summary: How to Create a GRE Tunnel Between Two Linux Hosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- GRE (Generic Routing Encapsulation)
- `iproute2`
- `systemd-networkd`
- IPv4 routing and forwarding

## Sources Consulted
- `ip-tunnel(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `systemd.netdev(5)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network(5)` Linux manual page: https://man7.org/linux/man-pages/man5/systemd.network.5.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 2784, Generic Routing Encapsulation (GRE): https://datatracker.ietf.org/doc/html/rfc2784

## Issues Found
- The post used `gre0` as the tunnel interface name. Linux reserves `gre0` as a kernel-created GRE device when the GRE module is loaded, so `ip tunnel add gre0 ...` can fail. I changed the examples to use `gre1`.
- The `systemd-networkd` example defined only a `.netdev` and a `.network` for the tunnel itself. Per `systemd.netdev(5)`, GRE tunnels are not created that way by default unless another `.network` requests them with `Tunnel=`. I added `Independent=yes` so the two-file example works as written.
- The topology and command comments called `10.0.0.1` and `10.0.0.2` "public" IPs even though they are RFC 1918 private addresses. I corrected those references to "underlay" IPs.
- The IP forwarding section did not make it clear that forwarding must be enabled on both tunnel endpoints for routed subnet-to-subnet traffic. I clarified that scope.
- The prerequisites did not mention that GRE uses IP protocol 47 and must be permitted by any firewall between the hosts. I added that requirement.

## Review Notes
- The `ip tunnel add ... ttl 255` syntax is valid and current. `iproute2` also supports GRE creation through `ip link add ... type gre`, but the post's `ip tunnel` form remains supported.
- GRE adds encapsulation overhead and can trigger MTU or Path MTU issues on some paths. The post is still technically correct without an MTU section, but that is a practical caveat worth considering in future revisions.

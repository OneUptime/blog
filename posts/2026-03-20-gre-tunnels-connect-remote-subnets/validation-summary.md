# Validation Summary: How to Use GRE Tunnels to Connect Remote Subnets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- GRE tunnels
- `iproute2`
- `iptables`
- `systemd-networkd`
- IPv4 routing

## Sources Consulted
- Linux `ip-tunnel(8)` manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux kernel IP sysctl documentation (`ip_forward`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.ietf.org/rfc/rfc2784.txt
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers
- `systemd.netdev(5)` documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network(5)` documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html

## Issues Found
- The introduction described GRE as a "site-to-site VPN" scenario. GRE is a tunneling/encapsulation mechanism, not an encrypted VPN by itself. I changed the wording to "site-to-site tunneling scenario" to avoid implying confidentiality or authentication that GRE does not provide.
- The host configuration section instructed adding a new default route on each LAN host. That is broader than necessary for reachability to the remote subnet and can conflict with an existing default route. I changed the examples to add specific routes for the remote LAN via the local router instead.
- The TCP MSS clamping example omitted `-t mangle`, while the documented `TCPMSS` example in `iptables-extensions(8)` uses the `mangle` table for this rule. I updated the command accordingly.
- The persistence note referenced an unspecified "GRE with systemd-networkd guide". I replaced that with an accurate note that persistent GRE tunnels and routes can be defined with `systemd-networkd` `.netdev` and `.network` files.
- The conclusion said no LAN host changes were required, which contradicted the host-routing section. I corrected the conclusion to reflect the actual requirement: no extra host changes are needed only when the Linux routers are already the hosts' default gateways.

## Review Notes
- GRE itself does not encrypt traffic. If confidentiality or peer authentication is required, GRE is commonly paired with another mechanism such as IPsec.
- The `iptables` examples are technically valid, but on many modern distributions they are implemented through the `iptables-nft` compatibility layer rather than the legacy backend.

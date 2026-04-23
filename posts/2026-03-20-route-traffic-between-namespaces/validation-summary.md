# Validation Summary: How to Route Traffic Between Network Namespaces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux network namespaces
- iproute2
- veth pairs
- IPv4 routing
- Linux IP forwarding
- sysctl
- ping

## Sources Consulted
- Linux `network_namespaces(7)` manual page: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux `ip-netns(8)` manual page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Linux `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html
- Local `iproute2` command help from `iproute2-6.1.0`
- Local `sysctl` command help from `procps-ng 4.0.4`
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The description said a "bridge or router namespace" could forward traffic between namespaces on different subnets. A Linux bridge is a layer-2 forwarding device and is not the routing component for different IPv4 subnets, so the description now says "router namespace or host router."
- The architecture diagram labeled the second namespace-side veth as `veth2`, but the commands create `veth1`. The diagram now uses `veth-r2-veth1`.
- The conclusion said the topology "mirrors" container runtime networking. That was too broad because many runtimes use bridges, host routing, NAT, or CNI-specific designs. The text now says the tutorial uses the same basic building blocks used by many container runtimes and CNI plugins.

## Review Notes
The command sequence is valid for an IPv4 routed namespace lab when run with sufficient privileges such as root or CAP_NET_ADMIN. The default routes in `ns1` and `ns2` are technically correct for this isolated topology; more specific routes to `10.0.2.0/24` and `10.0.1.0/24` would also work and would avoid using the router as a catch-all gateway.

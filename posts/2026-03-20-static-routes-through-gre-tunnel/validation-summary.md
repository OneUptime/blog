# Validation Summary: How to Add Static Routes Through a GRE Tunnel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux routing
- GRE tunnels
- iproute2 (`ip route`)
- systemd-networkd
- Netplan

## Sources Consulted
- iproute2 `ip route help` output from installed iproute2 6.1.0 and the ip-route(8) manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- IETF RFC 2784, Generic Routing Encapsulation (GRE): https://datatracker.ietf.org/doc/html/rfc2784
- Linux kernel IP sysctl documentation for forwarding behavior: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- systemd.network manual for `[Network]` and `[Route]` settings: https://www.freedesktop.org/software/systemd/man/253/systemd.network.html
- Netplan YAML reference for static routes and tunnel configuration: https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/

## Issues Found
- The route-all-traffic snippet added a default route after a normal host would already have one. Changed it to pin the GRE underlay endpoint route first and then use `ip route replace default via 172.16.0.2 dev gre0`.
- The route-all-traffic comment implied GRE is useful for privacy. GRE is encapsulation, not encryption, so the comment now says it is VPN-style routing and that GRE itself does not encrypt traffic.
- The Netplan persistence snippet placed `routes` under `vlans`, which is not the GRE tunnel structure. Changed it to a `network.tunnels.gre0` example with `mode: gre`, underlay `local`/`remote`, tunnel address, and route.
- The post used "tunnel endpoint IP" for the inside tunnel address, which could be confused with GRE underlay endpoints. Clarified this as the tunnel interface IP / far-end interface IP.

## Review Notes
- The remaining `ip route add <remote-subnet> via <tunnel-far-end-ip>` examples are valid when the tunnel interface has a connected route to the far-end tunnel IP, as shown by the `/30` tunnel addressing example.
- End-to-end internet routing through GRE still requires appropriate return routing and, for private source addresses, NAT or routed prefixes on the far side. GRE alone does not provide confidentiality.

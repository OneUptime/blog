# Validation Summary: How to Configure Proxy ARP on Linux for IPv4 Networks

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel networking (`/proc/sys/net/ipv4/conf/*/proxy_arp`)
- sysctl / `/etc/sysctl.d/` configuration
- iproute2 (`ip route`)
- iputils `arping`
- ARP protocol (RFC 826) and Proxy ARP (RFC 1027)
- OpenVPN / WireGuard usage patterns

## Sources Consulted
- Linux kernel documentation: `Documentation/networking/ip-sysctl.rst` — describes `proxy_arp` toggle under `/proc/sys/net/ipv4/conf/<iface>/`
- RFC 1027 — "Using ARP to Implement Transparent Subnet Gateways" (proxy ARP)
- RFC 826 — Address Resolution Protocol
- iputils `arping(8)` man page — `-I <interface>` flag and output format
- iproute2 `ip-route(8)` man page — `add <prefix> dev <iface>` and `add <prefix> via <gw>` syntax
- OpenVPN community wiki and WireGuard documentation on bridging/proxy ARP scenarios

## Issues Found
No technical issues found.

All commands, sysctl keys, kernel knob paths, and arping/ip route invocations are syntactically and semantically correct. The persistence pattern using `/etc/sysctl.d/99-proxy-arp.conf` plus `sysctl --system` matches modern Linux distribution conventions. The recommendation in the conclusion to also enable IP forwarding is accurate — without `net.ipv4.ip_forward=1`, proxy ARP responses succeed but the host will not actually forward the resulting traffic.

## Review Notes
- Minor presentational note (not a technical error, so not modified): the text describes Host A asking for `192.168.1.200` (classic same-subnet proxy ARP) while the mermaid diagram shows Host B as `192.168.2.100` (cross-subnet). Both are valid proxy ARP scenarios and the rest of the post consistently uses `192.168.2.100`, so the example still illustrates the mechanism correctly.
- The `proxy_arp` knob applies only to ARP requests received on the interface where it is enabled; readers configuring asymmetric topologies should be aware of this. The post's emphasis on enabling it on the LAN-facing interface aligns with this behavior.
- Linux also exposes `proxy_arp_pvlan` for private-VLAN-style behavior (responding even when the request and target are on the same interface). It is out of scope for this introductory post and not required for the scenarios described.
- For larger deployments, `arp` proxy entries via `ip neigh add proxy <ip> dev <iface>` provide per-IP control instead of the blanket `proxy_arp` toggle. This is a possible future extension but not an error in the current post.

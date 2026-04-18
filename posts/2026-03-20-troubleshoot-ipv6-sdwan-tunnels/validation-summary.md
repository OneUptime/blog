# Validation Summary: How to Troubleshoot IPv6 SD-WAN Tunnels

## Status
validated

## Post Type
Technical Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 networking (RFC 8200, RFC 8201)
- SD-WAN overlays (Cisco OMP, BGP-based)
- IPsec / StrongSwan (`ipsec statusall`, IKE)
- WireGuard (`wg show`)
- GRE over IPv6 (`ip6gre`) and IPIP6 tunnels
- VXLAN
- iproute2 (`ip -6 addr`, `ip -6 route`, `ip -6 tunnel`, `ip -6 rule`)
- iputils (`ping6`, `traceroute6`)
- ip6tables / nftables (MSS clamping)
- Linux sysctl (`net.ipv6.conf.*`)
- BIRD / FRRouting (`birdc`, `vtysh`)
- tcpdump for IPv6 / encrypted traffic

## Sources Consulted
- RFC 8200 (IPv6 specification) — IPv6 minimum MTU 1280
- RFC 8201 (Path MTU Discovery for IPv6) — PMTUD mandatory for IPv6
- iproute2 man pages (`ip-tunnel(8)`, `ip-route(8)`, `ip-rule(8)`)
- WireGuard protocol documentation (per-packet overhead breakdown)
- Linux kernel `Documentation/networking/ip-sysctl.txt` (`accept_ra_mtu`)
- StrongSwan documentation (ipsec starter vs swanctl)
- BIRD 2.x release notes (unified `birdc` replacing `birdc6`)
- nftables wiki (MSS clamping syntax)

## Issues Found

1. **`ip tunnel show` for IPv6 tunnels (line 51)** — `ip tunnel` defaults to IPv4 tunnel types (ipip/sit/gre). Listing `ip6gre0`/`ip6tnl` requires `ip -6 tunnel show`. Changed to `ip -6 tunnel show`.

2. **`birdc6` is BIRD 1.x only (line 73)** — BIRD 2.x (the current supported series since 2018) uses a unified `birdc` client. Updated to show `birdc` as primary with `birdc6` noted as legacy.

3. **Encapsulation overhead assumed IPv4 underlay without disclosure (lines 87-90)** — Values like "GRE: +24 bytes" and "WireGuard: +60 bytes" implicitly include a 20-byte IPv4 outer header. For IPv6 underlay the outer header is 40 bytes, so overhead is ~20 bytes higher. Added a clarifying note ("assuming IPv4 underlay; add +20 bytes for IPv6 underlay") and broke down the components of each overhead figure.

4. **`accept_ra_mtu` mislabeled as "Enable PMTU discovery" (lines 104-105)** — PMTUD is mandatory for IPv6 and cannot be toggled via sysctl. `net.ipv6.conf.all.accept_ra_mtu` actually controls whether the host honors the MTU option in Router Advertisements. Corrected the comment to reflect what the sysctl does and noted that PMTUD is always on per RFC 8201.

## Review Notes
- The post uses non-hex labels inside IPv6 placeholder addresses (e.g., `2001:db8:remote-wan::1`, `2001:db8:wan::gateway`). These are not literal IPv6 addresses; they are template placeholders meant to be substituted. This is a stylistic choice common in tutorials and was left as-is.
- `ping6` is preserved in iputils as a compatibility symlink but is superseded by the unified `ping` (which auto-detects IPv6). Not fixed since the tool still works on all current distros.
- The `-u strongswan` journalctl unit works on modern strongSwan (5.9+) packages; on older Debian/Ubuntu that ship only the legacy starter stack the unit is `strongswan-starter`. Since `ipsec statusall` in the post implies the legacy starter, readers on those distros may need to adjust the unit name. Left unchanged as the dominant modern unit name is `strongswan`.
- `ip -6 route show cache` still works on current kernels for PMTU entries; the IPv6 route cache was not fully removed the way the IPv4 route cache was.
- `ip6tables` is correct but deprecated in favor of nftables — the post already mixes both, which is acceptable during the transition.

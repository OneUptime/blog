# Validation Summary: How to Configure VXLAN MTU for Overlay Networks

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- VXLAN (Virtual Extensible LAN) overlay encapsulation
- Linux `iproute2` (`ip link`)
- Linux bridges
- iptables TCPMSS target (MSS clamping)
- ICMP / `ping` for path MTU testing
- systemd-networkd (`.network` units)
- Netplan (bridge configuration)

## Sources Consulted
- RFC 7348 — Virtual eXtensible Local Area Network (VXLAN): https://datatracker.ietf.org/doc/html/rfc7348 (especially Section 4 on frame format and Section 5 on MTU)
- `ip-link(8)` man page (iproute2)
- `iptables-extensions(8)` man page — TCPMSS target (`--set-mss`, `--clamp-mss-to-pmtu`)
- `ping(8)` man page (iputils) — `-s`, `-M do` flags
- `systemd.network(5)` man page — `[Link]` section, `MTUBytes=`, `[Network]` `Bridge=`
- Netplan reference — bridge configuration (`mtu`, `interfaces`)
- Linux kernel `drivers/net/vxlan/` (VXLAN_HEADROOM and MTU calculations)

## Issues Found

1. **Incorrect overhead breakdown in introduction.** The original text read:
   > "outer IP header (20 bytes) + outer UDP header (8 bytes) + VXLAN header (8 bytes) = 50 bytes total overhead"
   The arithmetic was wrong (20+8+8 = 36, not 50) and the breakdown was missing the 14-byte inner Ethernet header. Per RFC 7348, the 50-byte VXLAN overhead (with IPv4 outer) is composed of: outer IP (20) + outer UDP (8) + VXLAN (8) + inner Ethernet (14). I added the inner Ethernet header to the breakdown so the figures sum to 50.

2. **Mislabeled "outer Ethernet" in the calculation block.** The original text read:
   > "(14 outer Ethernet + 20 outer IP + 8 UDP + 8 VXLAN)"
   The 14-byte Ethernet header here is the **inner** Ethernet header — the L2 frame that VXLAN encapsulates. The outer Ethernet header sits on the physical wire and does not count against the IP-level MTU. Changed "outer Ethernet" to "inner Ethernet".

## Review Notes

- The 50-byte overhead figure is IPv4-specific. If the underlay is IPv6, the overhead is 70 bytes (40 outer IPv6 + 8 UDP + 8 VXLAN + 14 inner Ethernet), giving an overlay MTU of 1430. The post does not address this case, which is fine since IPv4 is the most common deployment.
- The ping `-s` math is correct: `ping -s 1422` produces a 1450-byte IP packet (20 IP + 8 ICMP + 1422 payload), exactly fitting the MTU. `ping -s 1452` produces 1480 bytes, exceeding the 1450 overlay MTU as intended.
- The MSS value of 1410 (= 1450 - 40) assumes no TCP options. With timestamps or other options, the effective payload is smaller; `--clamp-mss-to-pmtu` (used in the second iptables rule) is the more robust approach and is correctly demonstrated.
- The `iptables` examples use the legacy `iptables` command. On modern distros these may be backed by `iptables-nft`; the syntax shown is still valid. nftables-native equivalents exist but are out of scope for this post.
- The systemd-networkd snippet places `Bridge=br-overlay` under `[Network]`, which is correct. Note that `MTUBytes=` can also be set in a separate `.link` file matched by MAC, but the `[Link]` section of a `.network` file works too.

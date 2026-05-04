# Validation Summary: How to Configure MTU for Cloud VPN Connections (AWS, GCP, Azure)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Site-to-Site VPN
- GCP Cloud VPN (Classic and HA VPN)
- Azure VPN Gateway (Site-to-Site and Point-to-Site)
- IPsec ESP (with AES-GCM-128)
- iptables / TCPMSS target
- Linux `ip link` (iproute2)
- systemd-networkd
- NetworkManager (nmcli)
- Cisco IOS tunnel/IP MTU configuration
- ICMP ping for PMTU discovery

## Sources Consulted
- AWS Site-to-Site VPN User Guide — MTU recommendation of 1399 bytes (https://docs.aws.amazon.com/vpn/latest/s2svpn/)
- GCP Cloud VPN MTU documentation — 1460-byte recommendation (https://cloud.google.com/network-connectivity/docs/vpn/concepts/mtu-considerations)
- Microsoft Azure VPN Gateway / Point-to-Site documentation — TCP MSS clamping guidance around 1350
- RFC 4303 — IP Encapsulating Security Payload (ESP)
- RFC 4106 — Use of GCM in ESP (16-byte ICV, 8-byte IV)
- iptables-extensions(8) man page — TCPMSS target syntax (--set-mss, --clamp-mss-to-pmtu)
- iproute2 `ip-link(8)` man page — `mtu` argument
- systemd.network(5) — `[Link] MTUBytes=` directive
- nmcli connection settings — `ip-tunnel.mtu` property
- AWS EC2 documentation — ENA jumbo frame support (9001 MTU) on c5n/m5/t3 instances

## Issues Found
- **IPsec mode mislabeled as "transport mode"**: The overhead breakdown in the "IPsec VPN Overhead Calculation" section originally described "transport mode ESP with AES-GCM-128" with an "Original IP header (preserved or new)" entry. Site-to-site cloud VPNs (AWS, GCP, Azure) all use IPsec **tunnel mode**, not transport mode. Tunnel mode adds a new outer IP header rather than preserving the original. The numeric breakdown was consistent with tunnel mode, so I corrected the label to "tunnel mode ESP with AES-GCM-128" and updated the IP header line to "New outer IP header: 20 bytes". The rest of the overhead arithmetic remains accurate.

## Review Notes
- All MSS-clamping math is internally consistent: AWS MTU 1399 → MSS 1359, GCP MTU 1460 → MSS 1420, Azure MTU 1350 → MSS 1310 (each subtracting the standard 40 bytes for IPv4 + TCP headers).
- All ping payload calculations are correct: payload + 28 (IP 20 + ICMP 8) = expected MTU.
- The Azure MTU values (1350 for IKEv2/SSTP S2S, 1300 for OpenVPN P2S) are conservative compared to Microsoft's typical guidance, which expresses recommendations as TCP MSS clamping at 1350 (corresponding to MTU ~1400). The post's values still produce a working configuration with a safety margin and are commonly cited in community guidance, so no change was made.
- AWS's 1399-byte recommendation is more conservative than the raw ESP+AES-GCM math (1500 − 70 = 1430) because it accounts for additional padding/encryption variance and potential GRE encapsulation; this matches AWS's published recommendation.
- The c5n/m5/t3 jumbo frame note (9001 MTU on ENA) is correct, though jumbo frames only apply to intra-VPC and certain placement-group scenarios; the post does not need to elaborate further given its VPN focus.
- iptables, iproute2, systemd-networkd, and nmcli syntax are all valid and current.

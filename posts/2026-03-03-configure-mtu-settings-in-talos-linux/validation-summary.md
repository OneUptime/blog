# Validation Summary: How to Configure MTU Settings in Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Talos Linux (machine configuration v1alpha1)
- talosctl CLI
- Kubernetes CNI (Flannel, Calico)
- VXLAN overlay networking
- WireGuard VPN
- Linux network bonding (802.3ad / LACP)
- VLAN tagging
- ICMP / Path MTU Discovery (PMTUD)
- Cloud provider networking (AWS VPC, GCP VPC, Azure)
- `ping` (iputils) MTU testing

## Sources Consulted
- [Talos v1alpha1 Configuration Reference](https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/) — verified `mtu`, `vlanId`, `wireguard.*`, `bond.mode`, `bond.interfaces`, `dhcp`, and `routes.network/gateway` field names
- [AWS EC2 Network MTU docs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html) — confirmed 9001-byte jumbo frames default for VPC traffic and 1500 for internet-bound
- [Google Cloud VPC MTU docs](https://cloud.google.com/vpc/docs/mtu) — confirmed 1460-byte default and 8896-byte jumbo frame ceiling
- [Azure VM MTU docs](https://learn.microsoft.com/en-us/azure/virtual-network/how-to-virtual-machine-mtu) — confirmed 1500-byte default
- WireGuard MTU references (defguard, procustodibus) — confirmed 60-byte (IPv4) / 80-byte (IPv6) overhead and 1420 as a conservative tunnel MTU
- VXLAN encapsulation references (Arista, Packet Pushers) — confirmed 50-byte total overhead (14 outer Ethernet + 20 outer IP + 8 UDP + 8 VXLAN)

## Issues Found
No technical issues found.

All config snippets use valid Talos v1alpha1 schema fields (camelCase: `vlanId`, `privateKey`, `listenPort`, `publicKey`, `endpoint`, `allowedIPs`, `lacpRate` etc.). Numeric overhead values, MTU values, and the `ping -M do -s 8972` calculation (8972 + 8 ICMP + 20 IP = 9000) are correct. Cloud provider defaults match the current vendor docs. The `talosctl get links` and `talosctl patch machineconfig` commands are valid.

## Review Notes
- The shorthand "1500 minus VXLAN header" and "1500 minus WireGuard header" in the common-values list is a slight simplification — the subtracted value is the *total encapsulation overhead* (outer Ethernet + outer IP + UDP + VXLAN/WireGuard headers + auth tag), not just the inner protocol header. The numeric values (1450 and 1420) are correct, and the earlier prose sections explain the full breakdown accurately, so this is a minor cosmetic point only.
- 1420 is the conservative WireGuard MTU that accommodates IPv6 (1500 − 80); IPv4-only tunnels can use 1440. wg-quick picks a route-aware value if `mtu` is omitted, which is also worth knowing.
- AWS MTU note: 9001 applies within a single VPC; cross-region traffic and traffic through an internet gateway is capped at 1500. The post mentions inter-region but not internet-gateway specifically — accurate enough for the scope of the post.
- GCP jumbo frame ceiling is 8896, which the post states correctly. Note that the VPC MTU must be configured network-wide; per-VM MTU on its own won't enable jumbo frames if the VPC is still at 1460.
- Azure "Accelerated networking supports higher MTUs on some instance types" is broadly correct, though Azure's recommendation is generally to keep VM MTU at 1500 to avoid fragmentation penalties through the accelerated-networking path. Not incorrect, just worth keeping an eye on as Azure's networking story evolves.

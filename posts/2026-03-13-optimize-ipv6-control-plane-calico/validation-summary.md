# Validation Summary: How to Optimize IPv6 Control Plane in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.21+)
- Kubernetes (v1.21+)
- IPv6 networking
- MP-BGP (Multiprotocol BGP)
- BIRD routing daemon
- Felix agent
- Calico IPAM
- `calicoctl` CLI
- `ip` (iproute2) and `kubectl`

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPv6 IPAM documentation: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico BGPConfiguration reference (`serviceClusterIPs`, `serviceLoadBalancerIPs`)
- RFC 4193 (Unique Local IPv6 Unicast Addresses) for ULA prefix semantics
- BIRD routing daemon documentation (separate `birdcl`/`birdcl6` binaries used by Calico)
- Basic IPv6 subnetting math: 2^(128 - prefix) hosts per block

## Issues Found
1. **Incorrect IPv6 block size math**: The post stated `blockSize: 122` corresponds to "4 IPv6 IPs per block". This is wrong. A /122 has 6 host bits, which is 2^6 = 64 IP addresses (this is exactly why the Calico project picked /122 as the IPv6 IPAM default — it matches the IPv4 /26 default of 64 addresses per block). The "4 IPs" figure is for /126. Fixed the inline comment to read `/122 = 64 IPv6 IPs per block (Calico's IPv6 default)`. The neighboring comment `Use /120 (256 IPs)` was already correct (2^8 = 256).

## Review Notes
- `FelixConfiguration.spec.routeTableRange` (singular) used in Step 3 is supported but has been superseded by `routeTableRanges` (plural), which allows multiple ranges and an expanded index range (1–4294967295). Existing single-range usage still works, so this was not changed, but future readers may prefer the newer field.
- `FelixConfiguration.spec.ipv6Support` is a valid field and defaults vary; explicitly setting it to `true` is fine.
- The `fd00::/8` ULA reference is technically a subset of the RFC 4193 ULA range `fc00::/7` (the locally-assigned half where the `L` bit is set). This is widely used shorthand and not strictly inaccurate, so it was left as-is.
- `birdcl6` is correct for Calico's BIRD 1.x fork, which still runs separate IPv4/IPv6 daemons.
- The `ipipMode: Never` choice for IPv6 pools is correct — Calico's IP-in-IP encapsulation supports IPv4 only.
- `serviceClusterIPs` and `serviceLoadBalancerIPs` are valid `BGPConfiguration` fields for advertising service CIDRs via BGP.

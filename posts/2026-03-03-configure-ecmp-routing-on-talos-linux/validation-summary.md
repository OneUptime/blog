# Validation Summary: How to Configure ECMP Routing on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, `talosctl`)
- Linux kernel ECMP / `fib_multipath_hash_policy` / resilient nexthop groups
- BGP / FRRouting
- MetalLB (v1beta1 / v1beta2 CRDs)
- Cilium BGP (cilium.io/v2 BGPv2 API)
- Kubernetes

## Sources Consulted
- Linux kernel `Documentation/networking/ip-sysctl.rst` — https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel `Documentation/networking/nexthop-group-resilient.rst` — https://docs.kernel.org/networking/nexthop-group-resilient.html
- `ip-nexthop(8)` man page — https://man7.org/linux/man-pages/man8/ip-nexthop.8.html
- Talos networking resources docs — https://docs.siderolabs.com/talos/v1.8/learn-more/networking-resources/
- MetalLB API reference — https://metallb.universe.tf/apis/
- MetalLB advanced BGP configuration — https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- Cilium 1.18 release notes (BGPv1 deprecation) — https://github.com/cilium/cilium/releases/tag/v1.18.0-pre.1
- Cilium BGP control plane documentation — https://docs.cilium.io/en/stable/network/bgp-control-plane/

## Issues Found

1. **Incorrect description of `net.ipv4.fib_multipath_hash_policy` value 2.** The post claimed value 2 was "Hash based on Layer 3+4 plus the inner header for encapsulated traffic." Per the kernel docs, value 2 is "Layer 3, or inner Layer 3 if the packet is encapsulated" — Layer 4 information is not part of policy 2. Corrected the description, and added value 3 (custom hash via `fib_multipath_hash_fields`) for completeness.

2. **Resilient hashing section conflated two unrelated features.** The post implied that setting `fib_multipath_hash_policy: "1"` enables resilient ECMP. That sysctl only selects the hash policy — it has nothing to do with resilient ECMP. Resilient ECMP in Linux is configured through the nexthop API (`ip nexthop add ... type resilient`). Rewrote the section to show the actual `ip nexthop` commands and noted the kernel requirements (5.10+).

3. **Cilium `CiliumBGPPeeringPolicy` (cilium.io/v2alpha1) is deprecated and removed.** BGPv1 was deprecated in Cilium 1.18 and removed in 1.19. As of May 2026, current Cilium installations use the BGPv2 API on the `cilium.io/v2` group. Replaced the example with `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement` resources on `cilium.io/v2`.

## Review Notes

- MetalLB CRD apiVersions (`metallb.io/v1beta2` for `BGPPeer`, `metallb.io/v1beta1` for `IPAddressPool` and `BGPAdvertisement`) are current and correct.
- `talosctl get routes` is valid — `routes` is an alias for `RouteStatus` in the Talos resource API; `routespecs` is also available for the spec view.
- The FRRouting `maximum-paths` example and `show ip route` output format are accurate.
- The `net.netfilter.nf_conntrack_max` sysctl can occasionally fail at boot in Talos if the `nf_conntrack` module hasn't been loaded yet; in practice this usually works because conntrack is loaded by default, but readers should be aware that some sysctls in `machine.sysctls` depend on modules being present.
- `net.ipv6.fib_multipath_hash_policy` exists and follows the same 0/1/2/3 semantics as the IPv4 sysctl (with value 0 also hashing the IPv6 flow label).

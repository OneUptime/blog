# Validation Summary: How to Configure Multiple IP Addresses on a Single Interface in Talos

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (machine configuration v1alpha1)
- talosctl CLI
- Kubernetes (kubelet node IP configuration)
- IPv4 / IPv6 dual-stack networking
- MetalLB (referenced for load balancer context)
- Virtual IP (VIP) for HA control planes

## Sources Consulted
- Talos Linux v1alpha1 machine configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos Linux documentation portal: https://docs.siderolabs.com/talos/v1.7/
- talosctl command reference (gen config, patch machineconfig, get addresses)

## Issues Found

1. **Incorrect Kubernetes node IP configuration mechanism.**
   - The original post recommended setting the kubelet node IP via `machine.kubelet.extraArgs.node-ip`. While `extraArgs` is a generic kubelet flag passthrough, Talos provides a dedicated, supported field `machine.kubelet.nodeIP.validSubnets` for selecting the node IP from a node with multiple addresses. The dedicated field supports IPv4/IPv6 CIDR lists and exclusion syntax (`!` prefix), and is the documented Talos-native approach.
   - **Fix:** Replaced the `extraArgs: node-ip:` example with a `nodeIP.validSubnets:` example listing the desired subnet, and updated the surrounding prose to describe the `validSubnets` field and its exclusion syntax.

## Review Notes

- The `interface` field name (as opposed to `device`) is correct for the `machine.network.interfaces[]` list in Talos v1alpha1.
- The `vip.ip` field used in the high-availability section matches the documented schema (optional `equinixMetal` / `hcloud` sub-blocks exist but are not required for the static-IP example shown).
- Routes (`network` + `gateway`) and `addresses` (list of CIDR strings) are correct per the v1alpha1 schema.
- `talosctl get addresses` is a valid shorthand for the AddressStatus resource and will list interface addresses.
- The note that `talosctl patch machineconfig` patches replace list contents is accurate — strategic-merge behavior in Talos replaces unkeyed lists like `addresses`, so users must repeat existing entries when adding new ones.
- The MetalLB caveat is appropriately framed as background; the post correctly notes MetalLB normally manages service IPs dynamically rather than via static machine config.
- Version caveat: configuration was verified against Talos v1.7. Field names and behavior in the v1alpha1 schema have been stable across recent releases, but readers on much older or pre-release versions should consult their version's docs.

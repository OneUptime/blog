# Validation Summary: How to Set Up Site-to-Site VPN with WireGuard on Talos

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- WireGuard
- Kubernetes networking
- Cilium
- Site-to-site VPN routing

## Sources Consulted
- Talos WireGuard network documentation: https://docs.siderolabs.com/talos/v1.9/networking/wireguard-network
- Talos v1.12 WireguardConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/wireguardconfig
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos CLI reference for `talosctl patch`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Layer2VIPConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/layer2vipconfig
- Cilium Cluster Mesh requirements: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium native routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- WireGuard official quick start: https://www.wireguard.com/quickstart/

## Issues Found
- The Talos WireGuard snippets used `persistentKeepalive: 25`, which is not the Talos machine configuration field. Changed each peer to `persistentKeepaliveInterval: 25s`, matching the Talos duration field.
- The `talosctl patch machineconfig` examples used `--patch-file`, which is not the current documented flag. Changed the examples to use `--patch @file`.
- The post routed Kubernetes Service CIDRs as if they were ordinary subnets. Removed Service CIDRs from the topology, WireGuard allowed IPs, and static route examples, and clarified that cross-cluster service access needs CNI or multi-cluster service support.
- The verification commands used `talosctl ping`, which is not present in the current Talos CLI reference. Replaced those commands with WireGuard state inspection, route checks, and a temporary Kubernetes pod ping test.
- The Cilium example implied that Cilium would use the WireGuard tunnel directly and omitted `ipv4NativeRoutingCIDR`. Reworded the explanation and added `ipv4NativeRoutingCIDR: 10.244.0.0/16` for native routing across both PodCIDRs.
- The high availability section recommended identical active gateways and a Talos VIP for WireGuard gateway failover. Replaced that with active/passive guidance and clarified that Talos Layer 2 VIP is intended for Kubernetes API access on control plane nodes, not arbitrary WireGuard gateway failover.

## Review Notes
Talos v1.12 introduced newer network configuration documents such as `WireguardConfig` and `Layer2VIPConfig`. The post still uses the older `machine.network.interfaces` style used in existing Talos examples, but future updates should consider converting the WireGuard snippets to the newer multi-document network configuration format.

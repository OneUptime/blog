# Validation Summary: How to Set Up KubeSpan with NAT Traversal

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- KubeSpan
- WireGuard
- NAT traversal
- Talos machine configuration
- talosctl

## Sources Consulted
- Talos v1.13 KubeSpan documentation: https://docs.siderolabs.com/talos/v1.13/networking/kubespan
- Talos v1.13 Discovery Service documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/discovery
- Talos v1.13 release notes for KubeSpanConfig deprecation/change: https://github.com/siderolabs/talos/releases/tag/v1.13.0
- Talos KubeSpanEndpointsConfig reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/network/kubespanendpointsconfig/
- WireGuard technical paper: https://www.wireguard.com/papers/wireguard.pdf

## Issues Found
- The post used the older `.machine.network.kubespan` configuration shape throughout. Talos v1.13 introduced the standalone `KubeSpanConfig` document and deprecated the old field while keeping it backward-compatible, so the examples were updated to `apiVersion: v1alpha1`, `kind: KubeSpanConfig`.
- The NAT example implied endpoint filters could make a node advertise its router's public NAT IP. Filters only select local node addresses; inbound NAT mappings should be announced with `KubeSpanEndpointsConfig.extraAnnouncedEndpoints`. Added that document to the NAT example.
- The post used singular resource names such as `kubespanpeerstatus` and `kubespanendpoint`. Official docs use `kubespanpeerstatuses`, `kubespanpeerspecs`, and `kubespanendpoints`; commands were corrected.
- The troubleshooting section used `discoveredmembers`, but the current discovery documentation exposes membership through `talosctl get members`. Updated the command.
- The relay-node section claimed KubeSpan automatically routes traffic through a reachable node. Official docs describe KubeSpan as full-mesh WireGuard and do not document automatic third-node relay behavior. Reworded the section to explain that a public node is a reachable peer, not a generic relay for other failed peer links.
- The "all nodes behind NAT" scenario was too absolute. Talos documentation notes KubeSpan often works automatically even when nodes are behind firewalls, but direct connection may fail depending on timing and firewall/NAT behavior. Reworded the scenario accordingly.

## Review Notes
The old `.machine.network.kubespan` examples would still work for backward compatibility in Talos v1.13, but new documentation should prefer `KubeSpanConfig`. UDP port checks with `nc -zu` can be inconclusive for WireGuard because UDP services may not respond, but the command is still a reasonable coarse reachability test when interpreted carefully.

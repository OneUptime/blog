# Validation Summary: How to Configure the Talos Linux Firewall for Production

## Status
validated

## Post Type
Tutorial / Production Guide

## Technologies Covered
- Talos Linux (host ingress firewall)
- `NetworkDefaultActionConfig` / `NetworkRuleConfig` machine config documents
- `talosctl` CLI (apply-config, netstat, logs, etcd members, version)
- Kubernetes (kube-apiserver, kubelet, etcd, NodePort range)
- CNI plugins: Flannel (VXLAN), Cilium (VXLAN/health/Hubble), Calico (BGP/Typha)
- KubeSpan (WireGuard mesh)
- nftables (underlying firewall implementation)

## Sources Consulted
- Talos Ingress Firewall guide — https://www.talos.dev/v1.11/talos-guides/network/ingress-firewall/ (and the docs.siderolabs.com redirect target)
- Talos `NetworkRuleConfig` reference — https://www.talos.dev/v1.8/reference/configuration/network/networkruleconfig/
- Talos `NetworkRuleConfig` reference (v1.10) — https://www.talos.dev/v1.10/reference/configuration/network/networkruleconfig/
- Talos `talosctl` CLI reference — https://www.talos.dev/v1.10/reference/cli/
- Talos KubeSpan guide — https://www.talos.dev/v1.11/talos-guides/network/kubespan/ (confirmed default WireGuard port 51820)

## Issues Found

1. **Wrong YAML structure for firewall rules.** The post placed firewall configuration under a fabricated `machine.network.rules` block with nested `defaultAction` and `rules:` fields. Talos firewall is actually configured as **separate machine-config documents** (`NetworkDefaultActionConfig` and `NetworkRuleConfig`, both `apiVersion: v1alpha1`), one per rule, with fields at the document root (not nested). Rewrote every YAML example in the post — the basic structure block, the full production config, the worker-node config, the CNI snippets (Flannel/Cilium/Calico), the application-port snippets, and the emergency-open patch — to use the correct multi-document format.

2. **Wrong "Firewall Configuration Structure" description.** The post claimed the firewall is configured under `machine.network.kubespan` and `machine.network.rules`. Replaced this with an accurate description of the `NetworkDefaultActionConfig` / `NetworkRuleConfig` document model and noted that traffic on `lo`, `siderolink`, and `kubespan` interfaces is always allowed regardless of rules.

3. **Wrong KubeSpan default port.** The post listed port `51871` for KubeSpan in two places (the default-ports list and the `allow-kubespan` rule). Talos KubeSpan uses the standard WireGuard port `51820`. Corrected both.

4. **Invalid `talosctl` command.** The "Monitoring Blocked Traffic" section used `talosctl get netstat`, which is not a real subcommand (`get` is for typed resources, and `netstat` is not a resource type). Replaced with `talosctl netstat ... -lp`, which is the real command for showing listening sockets with process info.

## Review Notes

- The post applies firewall documents with `talosctl apply-config --patch @file.yaml --mode no-reboot`. This works, but for Talos firewall changes the official docs recommend `--mode=try` (auto-rolls back after a timeout) specifically to avoid locking yourself out. The current command is not wrong; readers who follow the post's own "Emergency Firewall Disable" advice will recover, but `--mode=try` is a safer default worth considering in a future revision.
- The `2379-2380` etcd port range is now expressed as a single port-range entry (`- 2379-2380`) rather than two separate ports; this matches Talos's `PortRanges` syntax used in the official docs.
- Talos versions: the documented firewall API has been stable from v1.5 onward through v1.11. All examples in the post are compatible with current (v1.10+/v1.11) Talos releases.
- ICMP protocol on `portSelector.protocol` is valid (alongside `tcp`, `udp`, `icmpv6`), so the ICMP rules in the post are correct.
- `talosctl etcd members` and `talosctl logs apid|etcd` are valid subcommands; no changes needed.

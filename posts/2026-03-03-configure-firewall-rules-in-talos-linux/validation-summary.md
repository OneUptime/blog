# Validation Summary: How to Configure Firewall Rules in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.6+ host ingress firewall)
- nftables (as the underlying rendering target)
- Kubernetes (port requirements, NodePort, NetworkPolicy)
- KubeSpan (WireGuard)
- talosctl CLI

## Sources Consulted
- Talos Ingress Firewall guide: https://docs.siderolabs.com/talos/v1.13/networking/ingress-firewall/ and source markdown at https://github.com/siderolabs/talos/blob/release-1.9/website/content/v1.9/talos-guides/network/ingress-firewall.md
- NetworkRuleConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/networkruleconfig
- NetworkDefaultActionConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/networkdefaultactionconfig
- Talos network connectivity (ports): https://docs.siderolabs.com/talos/v1.13/learn-more/talos-network-connectivity/
- Talos source constants for `KubeSpanDefaultPort`: https://github.com/siderolabs/talos/blob/main/pkg/machinery/constants/constants.go
- Talos CHANGELOG (introduction of the ingress firewall in v1.6): https://github.com/siderolabs/talos/blob/main/CHANGELOG.md
- Talos source `NfTablesChain` resource type: https://github.com/siderolabs/talos/blob/main/pkg/machinery/resources/network/nftables_chain.go

## Issues Found
1. **Entirely fictional configuration schema.** The post originally used `machine.network.nftablesRules` with nftables-style `match`/`verdict` rules organized into `table`/`chain`/`policy`. This is not a real Talos schema. The real ingress firewall is configured with two top-level documents appended to the machine config: `NetworkDefaultActionConfig` (with an `ingress: accept|block` field) and one or more `NetworkRuleConfig` documents (with `name`, `portSelector.ports`, `portSelector.protocol`, and an `ingress` list of `subnet`/`except`). All four YAML examples (basic, control plane, worker, output) were rewritten against the real schema using the official docs and the upstream `ingress-firewall.md`.

2. **Claim that Talos supports egress/output filtering is false.** The post had a full "Configuring Output Rules" section with `chain: output` and a `policy: drop`. Talos only ships an *ingress* firewall — there is no egress chain in `NetworkRuleConfig`. Replaced the section with an honest "What About Egress (Outbound) Filtering?" that points users to cloud security groups, an upstream firewall, or Kubernetes `NetworkPolicy` with a CNI that supports egress (Cilium/Calico).

3. **Fictional in-rule logging.** The "Logging Dropped Packets" section showed a `verdict: log prefix "DROPPED: " level info` rule. The Talos `NetworkRuleConfig` schema has no logging primitive (the `protocol` enum is `tcp|udp|icmp|icmpv6`, and rules only accept ingress subnets — no verdicts). Replaced the section with a "Debugging Dropped Traffic" section that documents the actual debugging path: inspect `talosctl get nftableschain -o yaml`, generate test traffic, or temporarily flip the default action with `--mode=try`.

4. **Wrong KubeSpan WireGuard port (51871 → 51820).** The Talos source (`KubeSpanDefaultPort` in `pkg/machinery/constants/constants.go`) is `51820`, which is also the IANA-registered WireGuard port. Fixed in both port tables.

5. **"Talos networkd service" is not a real component.** Talos does not use systemd-networkd or a service called `networkd`. Network configuration is handled by Talos's own COSI controllers (e.g. `NfTablesChainController`). Rewrote that sentence to say that Talos translates the declared rules into nftables rules rendered by Talos's own controllers.

6. **Default policy is not per-rule.** The original examples placed `policy: drop` inside each rule block. In reality the default action is a separate `NetworkDefaultActionConfig` document that applies cluster-wide for the node. All examples now use this structure.

7. **Missing context about always-allowed interfaces and ICMP rate-limit.** Added the documented behavior that traffic on `lo`, `siderolink`, and `kubespan` is always allowed, and that in `block` mode ICMP/ICMPv6 is allowed at 5 pps automatically and Kubernetes pod/service subnets are allowed for native-routing CNIs — so users do not write redundant rules.

8. **Recommended safer rollout path.** Added `talosctl apply-config --mode=try` to the apply steps and lockout-recovery section. This is the documented mitigation for accidentally locking the node out via firewall config.

## Review Notes
- The port table still lists `10257` (kube-controller-manager) and `10259` (kube-scheduler). These are accurate ports for those components, but in practice they bind to the localhost interface in most Talos setups, so they typically do not need a firewall rule. Left in place since the table is labeled "ports Talos Linux and Kubernetes require" rather than "ports that must be opened externally." A future revision could split "always required externally" vs "loopback-only" for clarity.
- The post does not call out that the ingress firewall lets you optionally bind rules to a CNI plugin extra rule for VXLAN/Geneve. Users running Calico (VXLAN 4789) or Cilium (VXLAN 8472, or Geneve 6081) should pick the port that matches their CNI mode — the post mentions Cilium/Flannel (8472) and Calico (4789) in an inline comment, which is sufficient.
- Talos v1.6 is the introduction version, confirmed via the upstream CHANGELOG ("Ingress Firewall: Talos Linux now supports configuring the ingress firewall rules"). No need to bump this; v1.6 is correct.
- The verification command `talosctl get nftableschain` is correct — the resource type is `NfTablesChains.net.talos.dev` as defined in `pkg/machinery/resources/network/nftables_chain.go`.

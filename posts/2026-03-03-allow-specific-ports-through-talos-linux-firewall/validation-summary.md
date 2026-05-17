# Validation Summary: How to Allow Specific Ports Through Talos Linux Firewall

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (NetworkRuleConfig, talosctl)
- Kubernetes (API server, etcd, kubelet, kube-controller-manager, kube-scheduler, NodePort services)
- Cilium CNI (cilium-health, Hubble, VXLAN, WireGuard)
- Calico CNI (BGP, Typha, VXLAN)
- MetalLB (memberlist, BGP)
- Prometheus / node_exporter

## Sources Consulted
- [Talos NetworkRuleConfig reference](https://docs.siderolabs.com/talos/v1.7/reference/configuration/network/networkruleconfig/)
- [Talos ingress firewall guide (v1.9)](https://www.talos.dev/v1.9/talos-guides/network/ingress-firewall/)
- [Talos configuration patches reference](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching)
- [Cilium Hubble setup documentation](https://docs.cilium.io/en/stable/observability/hubble/setup/) (port 4244 = Hubble Server, 4245 = Hubble Relay)

## Issues Found
1. **Incorrect NetworkRuleConfig schema (critical, repeated across every YAML example).** Every rule used a Kubernetes-style `spec:` wrapper with `protocol`/`ports` nested inside each `ingress` entry. The actual Talos schema has fields at the top level: `portSelector` (containing `ports` and a single `protocol`) and `ingress` (a list of `subnet` entries only). All ten YAML blocks were rewritten to the correct schema. Where the original example mixed TCP and UDP (Cilium, Calico, MetalLB, NodePorts, the combined "control-plane-all" example) the rule was split into multiple documents joined with `---`, since `portSelector.protocol` accepts only one protocol.
2. **Cilium port 4244 was labelled "Hubble relay".** Per Cilium documentation, 4244/tcp is the Hubble *Server* (4245/tcp is the Relay). Comment updated to "Hubble server (4244)".
3. **"Combining Rules Efficiently" section rewritten.** The original framed the strategy as collapsing many small documents into one, which is impossible given the one-protocol-per-document constraint. Replaced with an accurate explanation that you stitch multiple `NetworkRuleConfig` documents together with `---`, and provided a worked example.

## Review Notes
- Port reference table values were verified and are accurate (50000 apid, 50001 trustd, 6443 kube-apiserver, 2379/2380 etcd, 10250 kubelet, 10257 kube-controller-manager, 10259 kube-scheduler, 10249 kube-proxy metrics, 2381 etcd metrics, 9100 node_exporter, 4240 cilium-health, 8472 VXLAN, 51871 Cilium WireGuard, 4789 Calico VXLAN, 179 BGP, 5473 Typha, 7946 MetalLB memberlist, 30000-32767 NodePort).
- The post's opening claim that "the firewall adopts a default-deny stance" when `NetworkRuleConfig` documents are present is slightly misleading in isolation — the default action is configured by a separate `NetworkDefaultActionConfig` document. The wording was left as-is because rewriting it would require adding new content beyond fixing factual errors, but a future revision could clarify.
- `talosctl apply-config --config-patch @file` syntax shown in the "Applying Port Rules" section is valid.
- `talosctl get members` for testing Talos API connectivity is valid.

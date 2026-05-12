# Validation Summary: How to Secure Service Handling in Calico eBPF Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (eBPF data plane)
- Kubernetes Services (ClusterIP, NodePort, LoadBalancer, ExternalName)
- eBPF / BPF maps (NAT frontend/backend, affinity, conntrack)
- DSR (Direct Server Return)
- kubectl

## Sources Consulted
- Calico eBPF troubleshooting docs: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico eBPF enablement docs: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Felix source - `calico-bpf` cobra command tree: https://github.com/projectcalico/calico/tree/master/felix/cmd/calico-bpf/commands
- Calico Felix source - NAT subcommand definitions (including `nat aff`): https://github.com/projectcalico/calico/blob/master/felix/cmd/calico-bpf/commands/nat.go
- Calico Felix BPF proxy (kube-proxy port): https://github.com/projectcalico/calico/blob/master/felix/bpf/proxy/kube-proxy.go
- Tigera blog "Calico eBPF data plane deep dive": https://www.tigera.io/blog/calico-ebpf-data-plane-deep-dive/
- Kubernetes Services documentation (ExternalName semantics)

## Issues Found
1. **Incorrect command flag form for BPF NAT dump.** The post used `calico-node -bpf-nat-dump`, which is not a real flag. The Calico `calico-node` binary exposes the `calico-bpf` subcommand tree under a single `-bpf` flag, with subcommands such as `nat dump`. Replaced with `calico-node -bpf nat dump` to match the official `calico-bpf` cobra command tree (`felix/cmd/calico-bpf/commands/nat.go`).

2. **Incorrect command flag form for BPF affinity dump.** The post used `calico-node -bpf-affinity-dump`, which does not exist. There is no top-level `affinity` subcommand; the affinity table is dumped as a child of `nat` (`natAffDumpCmd` with `Use: "aff"`). Replaced with `calico-node -bpf nat aff`.

3. **Incorrect claim that Calico eBPF handles ExternalName services.** ExternalName services in Kubernetes are pure DNS CNAME records: they have no ClusterIP, no endpoints, and no data-plane action. Calico's eBPF proxy (which imports upstream `k8s.io/kubernetes/pkg/proxy` logic) skips ExternalName services and does not program any BPF NAT/affinity entries for them. Reworded the introduction to clarify that Calico eBPF handles ClusterIP, NodePort, and LoadBalancer services, and that ExternalName is excluded because it has no data-plane presence.

## Review Notes
- The Mermaid diagram uses `\n` line breaks inside node labels. This is a common Mermaid idiom and renders correctly in most renderers, but newer Mermaid versions prefer `<br/>` for in-label line breaks. Not a technical error, just a stylistic note for future updates.
- The post says eBPF service handling is "O(1)" - this is accurate for the per-packet lookup against the BPF NAT frontend hash map (vs. O(n) iptables chains), so it is left in place.
- The DSR description is accurate: in Calico DSR mode the reply path bypasses the ingress/load-balancer node, which removes the return SNAT hop.
- Prerequisites (Calico eBPF enabled, kube-proxy disabled) are correct preconditions for the dump commands to be meaningful.

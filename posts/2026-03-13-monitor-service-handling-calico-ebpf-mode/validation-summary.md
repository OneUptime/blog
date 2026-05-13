# Validation Summary: How to Monitor Service Handling in Calico eBPF Mode

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Calico (eBPF data plane)
- Kubernetes Services (ClusterIP, NodePort, LoadBalancer, ExternalName)
- BPF (NAT map, affinity map)
- kubectl
- DSR (Direct Server Return)
- Mermaid (diagram)

## Sources Consulted
- Calico "Troubleshoot eBPF mode" documentation: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico source: `felix/cmd/calico-bpf/commands/` directory in projectcalico/calico (master)
- Calico source: `felix/cmd/calico-bpf/commands/nat.go` — defines `dump`, `aff`, `set`, `del` as nat subcommands
- Kubernetes Services documentation (ExternalName service semantics)

## Issues Found

1. **Incorrect `calico-node -bpf` command syntax (NAT dump).** The post used `calico-node -bpf-nat-dump`, which is not a valid form. The `calico-bpf` tool uses subcommand syntax: `-bpf <subcommand> <action>`. Changed to `calico-node -bpf nat dump` to match the form documented in Tigera's troubleshooting guide and the source in `felix/cmd/calico-bpf/commands/nat.go`.

2. **Incorrect affinity dump command.** The post used `calico-node -bpf-affinity-dump`, which does not exist. There is no top-level `affinity` subcommand; the affinity table is dumped as a subcommand of `nat` (`aff`). Changed to `calico-node -bpf nat aff`, per the `affCmd` / `dumpAff()` definition in `felix/cmd/calico-bpf/commands/nat.go`.

3. **Incorrect claim that eBPF handles ExternalName services.** ExternalName services in Kubernetes are CNAME-style DNS aliases resolved by CoreDNS — they have no ClusterIP and do not traverse iptables/IPVS/eBPF in the data plane. Updated the introduction to clarify that eBPF handles ClusterIP, NodePort, and LoadBalancer services, and that ExternalName is resolved by CoreDNS.

## Review Notes
- The mermaid diagram uses `\n` for line breaks inside unquoted node labels. This works in most current mermaid versions but is fragile; future updates could wrap labels in quotes (e.g. `CIP["ClusterIP<br/>BPF NAT map<br/>DNAT to backend"]`) for broader compatibility. Left as-is since it is not a technical correctness issue.
- The "O(1) routing" phrasing in the conclusion is an approximation — eBPF service lookup is hash-map based (effectively O(1)) but real-world performance depends on map sizing and CPU. Accurate enough at the level of this post.
- The post does not pin a specific Calico version; the commands shown are valid for Calico 3.20+ where the BPF dataplane is mature. If the project later targets an older release, the commands should be re-verified.

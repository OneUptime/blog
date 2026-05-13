# Validation Summary: How to Optimize Service Handling in Calico eBPF Mode for Production

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Calico (Project Calico / Tigera)
- Calico eBPF dataplane
- Kubernetes Services (ClusterIP, NodePort, LoadBalancer, ExternalName)
- BPF NAT and affinity maps
- DSR (Direct Server Return) mode
- kubectl
- Mermaid (for the architecture diagram)

## Sources Consulted
- Tigera Calico docs — Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Project Calico source — `felix/cmd/calico-bpf/commands/nat.go` (cobra subcommand definitions for `nat dump`, `nat aff`): https://github.com/projectcalico/calico/blob/master/felix/cmd/calico-bpf/commands/nat.go
- Kubernetes Services documentation (ExternalName semantics): https://kubernetes.io/docs/concepts/services-networking/service/
- Calico eBPF dataplane overview docs (DSR, service handling)

## Issues Found
1. **Incorrect BPF NAT dump command syntax.** The post used `calico-node -bpf-nat-dump` (single hyphenated flag). The actual Calico CLI uses a cobra-style subcommand structure: `calico-node -bpf nat dump`. Fixed in the "Verify Service Type Handling" code block.

2. **Incorrect BPF affinity dump command syntax.** The post used `calico-node -bpf-affinity-dump`. There is no such flag; the affinity table is a child of the `nat` subcommand and is dumped via `calico-node -bpf nat aff`. Fixed in the "Configure Service Affinity" code block.

3. **ExternalName services are not handled by the eBPF dataplane.** The introduction claimed Calico eBPF mode handles "all Kubernetes service types - ClusterIP, NodePort, LoadBalancer, and ExternalName". ExternalName services have no ClusterIP and are resolved purely as CNAMEs by CoreDNS; they never appear in BPF NAT maps or pass through the eBPF service-handling path. Reworded the sentence to list only the dataplane service types (ClusterIP, NodePort, LoadBalancer) and added a clarifying parenthetical about ExternalName being DNS-only.

## Review Notes
- The remaining commands (`kubectl get svc ... -o jsonpath`, `kubectl patch`, `wget -O-`, `curl http://...`) are syntactically correct and use current, non-deprecated APIs.
- The `kubectl exec -n calico-system ds/calico-node` invocation matches the Tigera Operator install layout (DaemonSet named `calico-node` in the `calico-system` namespace). Manifest-based installs put the DaemonSet in `kube-system` instead; readers on that install style would need to adjust the namespace.
- The Mermaid diagram uses `\n` for line breaks inside node labels. This works in current Mermaid versions but the more portable form is `<br/>`. Not corrected because it renders fine and is a stylistic choice.
- The "O(1) routing" claim in the conclusion is a reasonable simplification: Calico's BPF NAT frontend/backend maps are hash-based and provide near-constant-time lookups in the common case.
- DSR mode description ("return bypasses LB node") is approximately right; more precisely, return traffic bypasses the *ingress* node that received the external request, going from the backend pod directly to the client.

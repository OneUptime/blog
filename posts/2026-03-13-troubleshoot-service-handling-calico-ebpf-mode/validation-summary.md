# Validation Summary: How to Troubleshoot Service Handling in Calico eBPF Mode

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes Services
- Kubernetes `kubectl`
- eBPF NAT and affinity maps

## Sources Consulted
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico Felix configuration reference - https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Kubernetes documentation: Service - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Project Calico source: `felix/cmd/calico-bpf/commands/nat.go` in https://github.com/projectcalico/calico

## Issues Found
- The introduction stated that ExternalName services are handled by Calico eBPF programs and maps. Kubernetes documents ExternalName as a DNS CNAME mapping with no proxying, so the wording was corrected to exclude ExternalName from BPF service routing.
- The NAT dump command used `calico-node -bpf-nat-dump`, which does not match the documented Calico BPF tool syntax. It was changed to `calico-node -bpf nat dump`.
- The affinity dump command used `calico-node -bpf-affinity-dump`, which does not match the Calico BPF NAT command structure. It was changed to `calico-node -bpf nat aff`, matching the Calico source command for dumping the affinity table.
- The LoadBalancer diagram implied that NodePort is always part of LoadBalancer service handling. Kubernetes supports disabling LoadBalancer NodePort allocation, so the diagram now says "optional NodePort."

## Review Notes
The examples assume a Linux Calico eBPF deployment with kube-proxy disabled or configured to avoid conflicts, which matches Calico eBPF guidance. The `kubectl exec TYPE/NAME` syntax is valid, but Calico's troubleshooting docs usually show executing into a specific `calico-node` pod name for node-specific inspection.

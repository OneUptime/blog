# Validation Summary: How to Validate Service Handling in Calico eBPF Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes Services
- Kubernetes kubectl
- eBPF maps and NAT

## Sources Consulted
- Calico documentation: Troubleshoot eBPF mode, including `calico-node -bpf` usage and NAT dump command: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Enabling the eBPF data plane, including kube-proxy replacement and DSR mode behavior: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: About Calico eBPF, including BPF service maps, sticky services, and connect-time load balancing: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Kubernetes documentation: Services, including ClusterIP, NodePort, LoadBalancer, and ExternalName behavior: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl reference: `kubectl exec` resource syntax: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec
- Project Calico source: `calico-node -bpf nat aff` command definition in `felix/cmd/calico-bpf/commands/nat.go`: https://github.com/projectcalico/calico/blob/f4767152d8d14d6b8eccebacd05ed4f4598d75dc/felix/cmd/calico-bpf/commands/nat.go

## Issues Found
- The description and introduction said Calico eBPF handles all service types, including ExternalName, using BPF programs and maps. Kubernetes ExternalName services are DNS CNAME mappings, not dataplane-forwarded services, so the text now focuses on dataplane-forwarded Service traffic and states that ExternalName is resolved by DNS.
- The conclusion claimed efficient O(1) routing for all Kubernetes service types. This was more absolute than the reviewed documentation supports and included DNS-only ExternalName semantics, so it was changed to efficient routing for dataplane-forwarded Kubernetes Service traffic.
- The NAT table command used `calico-node -bpf-nat-dump`, which is not the current documented syntax. It was changed to `calico-node -bpf nat dump`.
- The affinity map command used `calico-node -bpf-affinity-dump`, which does not match the current Calico BPF NAT command structure. It was changed to `calico-node -bpf nat aff`.
- The NodePort test selected the first node address, which can be a hostname or a non-routable address depending on cluster status ordering. It now selects the node's `InternalIP`.

## Review Notes
The post is technically relevant and the remaining examples are valid as illustrative commands, assuming the placeholder service and pod names exist and the test container has the requested HTTP client installed. DSR behavior is environment-dependent and may require cloud or network fabric support, as noted in Calico documentation.

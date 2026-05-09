# Validation Summary: How to Test Service Handling in Calico eBPF Mode with Live Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico eBPF data plane
- Kubernetes Services
- Kubernetes kube-proxy replacement
- eBPF NAT and affinity maps
- kubectl

## Sources Consulted
- Calico documentation: Troubleshoot eBPF mode, including `calico-node -bpf` usage and NAT dump command: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Enabling the eBPF data plane, kube-proxy replacement, and DSR mode: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: About Calico eBPF, service handling through BPF programs and maps, source IP preservation, DSR, and connect-time load balancing: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Kubernetes documentation: Services, NodePort, LoadBalancer, and ExternalName behavior: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: Virtual IPs and Service Proxies, including that service proxying applies to service types other than ExternalName: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Project Calico source code: `calico-bpf nat dump` and `calico-bpf nat aff` command implementation: https://github.com/projectcalico/calico

## Issues Found
- The post stated that Calico eBPF mode handles `ExternalName` services using BPF programs and maps. Kubernetes documents `ExternalName` as DNS alias behavior rather than virtual-IP service proxying, so I changed the wording to cover Kubernetes virtual-IP service types and clarified that `ExternalName` is not proxied through the service data plane.
- The Calico NAT dump command used the incorrect legacy-looking form `calico-node -bpf-nat-dump`. Current Calico documentation uses `calico-node -bpf nat dump`, so I updated the command.
- The affinity dump command used `calico-node -bpf-affinity-dump`, which does not match the current Calico command structure. The current Calico source exposes the affinity dump as `nat aff`, so I updated it to `calico-node -bpf nat aff`.
- The Calico troubleshooting examples used `kubectl exec` against `ds/calico-node`. Calico's official docs recommend running the `calico-node -bpf` tool inside a specific `calico-node` pod, so I added a `CALICO_NODE_POD` lookup before each BPF inspection command.
- The NodePort test selected the first node address regardless of address type. Kubernetes nodes can report multiple address types, so I changed the JSONPath to select the `InternalIP` address.
- The conclusion claimed efficient `O(1)` routing for all Kubernetes service types. Calico documents BPF map-based service handling, but not that broad algorithmic guarantee for every service type, so I changed the phrasing to "efficient map-based routing" for Kubernetes virtual-IP service types.

## Review Notes
None.

# Validation Summary: How to Migrate to Service Handling in Calico eBPF Mode Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes Services
- kube-proxy replacement
- eBPF NAT maps
- Direct Server Return (DSR)
- Kubernetes session affinity

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Felix configuration reference - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes documentation: Service concepts - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/

## Issues Found
- The post claimed that Calico eBPF handles ExternalName services using BPF programs and maps. Kubernetes documents ExternalName as DNS CNAME mapping with no proxying, so I changed the wording to limit BPF service traffic handling to ClusterIP, NodePort, and LoadBalancer services and noted that ExternalName is DNS-only.
- The Calico BPF NAT inspection command used `calico-node -bpf-nat-dump`, which is not the documented syntax. I changed it to `calico-node -bpf nat dump`.
- The post used `calico-node -bpf-affinity-dump` to verify session affinity. I could not verify that as a current documented Calico command, so I changed the verification step to use the documented `calico-node -bpf nat dump` command and describe it as checking BPF NAT programming.
- The DSR explanation implied LoadBalancer return traffic generally bypasses the load balancer node. Calico documents DSR for external service traffic such as NodePort and notes cloud load balancer caveats, so I narrowed the wording to external service traffic where the network supports DSR.
- The architecture diagram described LoadBalancer as always including NodePort. Kubernetes now supports omitting NodePort allocation for LoadBalancer services when the provider supports it, so I changed the diagram to say optional NodePort.
- The conclusion said eBPF provides O(1) routing for all Kubernetes service types. I changed it to avoid overclaiming and to refer to efficient Kubernetes service traffic handling without kube-proxy iptables rules.
- The map-capacity note said the BPF map must accommodate all service endpoints. Calico has separate NAT frontend and backend map capacities, so I clarified that frontend/backend maps must accommodate service ports and endpoints.

## Review Notes
The example commands assume the cluster uses the `calico-system` namespace and a `calico-node` DaemonSet addressable through `kubectl exec TYPE/NAME`, which is consistent with Kubernetes exec syntax but may differ for manifest-based Calico installs that use `kube-system`.

# Validation Summary: How to Map Kubernetes Services with Calico to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- Kubernetes kube-proxy
- Kubernetes EndpointSlices
- Calico Open Source
- Calico eBPF dataplane
- Calico NetworkPolicy
- Linux iptables
- Linux eBPF
- NodePort and Direct Server Return

## Sources Consulted
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/tasks/administer-cluster/enabling-endpointslices/
- Kubernetes v1.33 Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Calico eBPF overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico eBPF enablement and DSR documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico eBPF troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico service and network policy behavior documentation: https://docs.tigera.io/calico-cloud/tutorials/training/about-kubernetes-services
- Calico pre-DNAT policy documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat

## Issues Found
- The kube-proxy ClusterIP diagram described reverse DNAT as a POSTROUTING action. I changed this to say conntrack reverses NAT on the response path, which is more accurate and avoids pinning the reverse translation to the wrong chain.
- The Calico eBPF ClusterIP section claimed DNAT happens at the sending pod's TC egress hook and eliminates the kube-proxy conntrack entry. I changed this to describe Calico eBPF service handling with BPF programs and maps, and specifically connect-time load balancing for in-cluster TCP service connections, matching Calico's documentation.
- The headless service section said clients usually choose the first A record. I changed this to say selection depends on resolver and application behavior, since Kubernetes only exposes the endpoint records and does not require a first-record choice.
- The eBPF observation command used a raw `bpftool map dump name cali_v4_svc_ports` example. I replaced it with the documented `kubectl exec -n calico-system <calico-node-name> -- calico-node -bpf nat dump` command.
- The best-practices section recommended `kubectl get endpoints`. Since Kubernetes v1.33 deprecates the Endpoints API in favor of EndpointSlices, I changed it to `kubectl get endpointslice -l kubernetes.io/service-name=<service-name>`.
- The conclusion implied both kube-proxy and eBPF service handling simply perform DNAT. I adjusted it to distinguish kube-proxy DNAT from Calico eBPF service handling and connect-time load balancing.

## Review Notes
The remaining diagrams are simplified conceptual packet-flow diagrams. They are suitable for a troubleshooting guide, but real packet paths can vary by kernel, kube-proxy mode, Calico version, encapsulation mode, service protocol, and externalTrafficPolicy setting.

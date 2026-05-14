# Validation Summary: How to Map eBPF in Calico to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes Services and kube-proxy
- Linux eBPF, TC hooks, and BPF maps
- NodePort and Direct Server Return
- Prometheus metrics
- bpftool and calico-node eBPF diagnostics

## Sources Consulted
- Calico documentation: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes documentation: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes documentation: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/
- Local bpftool help output for `bpftool map` syntax.

## Issues Found
- The ClusterIP iptables path incorrectly stated that pod-to-ClusterIP traffic requires both DNAT and SNAT. Kubernetes documents that kube-proxy in iptables mode DNATs ClusterIP traffic without rewriting the client pod source IP. Updated the path and explanation accordingly.
- The service-flow explanation described Calico eBPF service handling only as TC egress DNAT. Calico documents BPF service maps and connect-time load balancing for in-cluster TCP traffic, with per-packet NAT only when connect-time load balancing is not used. Updated the diagram and wording to cover both paths.
- The same-node pod-to-pod diagram implied the receiver-side hook only checks established conntrack state. Calico applies workload ingress and egress policy on the relevant paths. Updated the diagram and prose to include both policy and conntrack checks.
- The runtime inspection commands used direct `bpftool` map-name probing for a specific Calico service map. Calico's documented troubleshooting interface is `calico-node -bpf` from a `calico-node` pod. Replaced the commands with documented `nat dump` and `conntrack dump` examples.
- The Prometheus metrics wording claimed map hit rates and program execution counts. Calico's documented Felix metrics cover dataplane update timing, failures, BPF endpoint counts, and related state, while program profiling and counters are available through `calico-node -bpf`. Updated this wording.
- The DSR best-practice note only mentioned upstream load balancers. Calico documents that DSR requires compatible underlying networking and that some cloud load balancer paths are incompatible because return traffic bypasses the original node. Updated the note to include that caveat.

## Review Notes
The post remains a simplified packet-path guide. Calico eBPF behavior can vary by protocol, service type, external service mode, tunnel mode, kernel support, and Felix configuration, so future revisions could make those assumptions explicit.

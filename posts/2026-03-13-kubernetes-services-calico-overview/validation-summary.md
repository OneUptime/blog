# Validation Summary: How to Understand Kubernetes Services with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- Kubernetes NetworkPolicy
- kube-proxy
- Calico network policy
- Calico eBPF data plane
- iptables/IPVS service routing
- ClusterIP, NodePort, LoadBalancer, and ExternalName Services

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes external LoadBalancer and source IP preservation documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Calico Kubernetes services training documentation: https://docs.tigera.io/calico-cloud/tutorials/training/about-kubernetes-services
- Calico eBPF data plane overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico eBPF enablement documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico service rules in policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico policy for services exposed as cluster IPs: https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico DNS/domain policy documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico Maglev load balancing documentation: https://docs.tigera.io/calico/latest/networking/configuring/add-maglev-load-balancing

## Issues Found
- The ExternalName table row implied that Calico policy can generally match on DNS. Kubernetes ExternalName Services only create DNS CNAME records and do not set up proxying. Calico Open Source policies remain IP/service based, while domain-based DNS policy is a Calico Enterprise/Cloud feature for egress. Updated the row to say policy applies to the resolved external traffic.
- The Calico eBPF ClusterIP section stated that service DNAT happens specifically at the sending pod's TC egress hook and that conntrack entries are eliminated. Current Calico documentation describes BPF maps, tc hooks, and connect-time load balancing for services, with service state in BPF maps rather than the kernel conntrack table. Reworded the section to avoid over-specifying a single hook and to describe the supported behavior accurately.
- The NetworkPolicy section described `from.ipBlock` matching on a ClusterIP as if the ClusterIP might be a source address. For backend ingress policy, the source is the client pod IP and the destination has already been translated to the selected backend pod IP. Clarified that ClusterIP matching is not reliable for pod-to-service policy and kept the recommendation to use pod selectors.
- The eBPF load balancing section claimed Calico eBPF implements the same load balancing algorithms as kube-proxy and that random selection is the default for ClusterIP Services. Calico documents Kubernetes Service semantics, BPF service maps, sticky services, and optional Maglev for external traffic, but not a blanket equivalence with kube-proxy algorithms. Reworded this to describe Service semantics and BPF-backed backend selection.
- The DSR statement did not mention that DSR must be enabled and requires compatible underlying networking. Added that caveat.
- Added a best-practice note that Calico service rules can be used when policy needs to reference Kubernetes Service names directly.

## Review Notes
The post is technically relevant and broadly correct after the targeted fixes. Future improvements could include a complete Kubernetes NetworkPolicy manifest around the YAML fragments and a short caveat that some Calico eBPF behavior depends on Calico version, installation method, and whether kube-proxy can be fully disabled in the chosen Kubernetes distribution.

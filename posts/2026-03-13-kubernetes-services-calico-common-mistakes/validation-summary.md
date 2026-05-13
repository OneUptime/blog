# Validation Summary: How to Avoid Common Mistakes with Kubernetes Services with Calico

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes NetworkPolicy
- Kubernetes EndpointSlices
- kube-proxy
- Calico
- Calico eBPF dataplane
- NodePort and ClusterIP service routing

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice deprecation guidance for Endpoints: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Calico Kubernetes services training documentation: https://docs.tigera.io/calico-cloud/tutorials/training/about-kubernetes-services
- Calico eBPF overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico eBPF enablement documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico service IP advertisement documentation: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips

## Issues Found
- The NetworkPolicy symptom for matching a Service ClusterIP as an ingress source incorrectly described the outcome as allowing all traffic. Kubernetes NetworkPolicy rules are additive allow rules, and the Service ClusterIP is not the source observed at the backend pod, so the rule fails to allow the intended traffic. Updated the symptom accordingly.
- The Calico eBPF and kube-proxy section described duplicate DNAT entries as the root issue. Calico's current documentation describes this as wasted resources and potential conflicts with kube-proxy iptables cleanup/flapping. Updated the explanation to match the official wording more closely.
- The NodePort SNAT fix implied that Calico eBPF requires DSR for source IP preservation. Calico eBPF service handling preserves external source IPs; DSR is an optional external service mode for direct server return that requires compatible networking. Updated the fix.
- The endpoint lag section used the legacy Endpoints API. Kubernetes v1.33 deprecates Endpoints for this use case and recommends EndpointSlices. Updated the section title, explanation, diagnostic command, and best-practice note to use EndpointSlices.
- The Service CIDR overlap section overstated that all traffic to any overlapping external IP would be routed to a random service backend. kube-proxy/eBPF service handling applies to allocated Service ClusterIPs. Updated the wording to specify the conflict when an external IP is also allocated as a Service ClusterIP.

## Review Notes
The remaining examples and commands are technically plausible for a Calico/Kubernetes environment. The kube-proxy disable command is appropriate for kubeadm-style clusters where kube-proxy is managed as a DaemonSet, but managed Kubernetes distributions may require provider-specific steps.

# Validation Summary: How to Fix Health Checks Failing After Enabling Calico Policies

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes liveness and readiness probes
- kubectl
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico host endpoints and workload endpoints

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Configure Liveness, Readiness and Startup Probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico host forwarded traffic documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/about-network-policy

## Issues Found
- The original post stated that Calico or Kubernetes default-deny pod NetworkPolicies block kubelet liveness and readiness probes unless a node CIDR ipBlock rule is added. This is not generally correct: Kubernetes documents probes as kubelet checks against the Pod IP, and Calico documents host-to-local-workload traffic as always allowed so kubelet liveness and readiness probes work. I updated the post to say that local kubelet probes should not normally be blocked by a namespace default-deny pod policy.
- The original examples treated node CIDR allows as the universal fix. I changed the examples to allow the actual health checker source CIDR, which is appropriate for external load balancers, monitoring systems, hostNetwork components, or other non-pod health check sources.
- The Calico GlobalNetworkPolicy example used destination ports without specifying a protocol. I added `protocol: TCP`, matching the TCP health check ports shown in the example.
- The broad "allow from host network" example allowed all ports from a node CIDR. I narrowed it to the actual health check source CIDR and health check port to avoid an unnecessarily broad ingress allow.
- The diagnosis, prevention, and conclusion sections were updated to focus on identifying the real health checker source and checking host endpoint, pre-DNAT, load balancer, monitoring, and probe configuration issues before adding CIDR-based rules.

## Review Notes
The corrected post remains a useful troubleshooting guide, but future improvements could add provider-specific examples for common load balancer health checker CIDRs. Those vary by platform and should be documented separately rather than generalized as node CIDRs.

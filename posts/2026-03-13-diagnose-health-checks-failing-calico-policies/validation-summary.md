# Validation Summary: How to Diagnose Health Checks Failing After Enabling Calico Policies

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes probes
- Kubernetes NetworkPolicy
- Calico network policy enforcement
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- kubectl
- calicoctl

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico documentation: Network policy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Protect Kubernetes nodes - https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico documentation: Host endpoints - https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The introduction referred broadly to "Calico NetworkPolicies" while the diagnostic commands and `ipBlock` guidance use Kubernetes NetworkPolicy syntax enforced by Calico. Updated the wording to say "Kubernetes NetworkPolicies enforced by Calico" and clarified that the `ipBlock` recommendation applies to Kubernetes NetworkPolicy.
- The symptoms listed `connection refused` as the example probe error for blocked traffic. A refused connection usually indicates that the target rejected the TCP connection, while policy drops more commonly appear as timeouts. Updated the example to timeout-style probe failures.
- The prevention section referenced Calico's `!` notation as a way to understand probe traffic origin. Calico selector negation is real, but it does not identify kubelet probe traffic origin. Replaced it with guidance to use IP-based source rules rather than pod or namespace selectors for kubelet probe traffic.

## Review Notes
The post is technically correct after the edits. The guidance is scoped to network probes such as HTTP, TCP, and gRPC probes; exec probes run inside the container and are not affected by ingress NetworkPolicy in the same way.

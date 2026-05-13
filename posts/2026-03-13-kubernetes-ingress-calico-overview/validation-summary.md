# Validation Summary: How to Understand Kubernetes Ingress with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes Services and externalTrafficPolicy
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico HostEndpoint policy
- Calico eBPF data plane

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Using Source IP tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico eBPF overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier

## Issues Found
- The default-open statement was too broad for Calico because configured HostEndpoints default to denying traffic unless policy, failsafe rules, or an allow profile permits it. I scoped the statement to workload endpoints and added a HostEndpoint caveat.
- The Calico rule action list omitted `Log`. I updated the action list to include `Log` and clarified that `Pass` continues evaluation to the next applicable tier or endpoint profiles.
- The GlobalNetworkPolicy ordering explanation implied all global policies automatically run before namespace policies. I changed it to say that `order: 100` runs before policies in the same tier with higher order values or no explicit order.
- The best-practice note about ordering mentioned only `order`. I updated it to mention both tiers and `order`.
- The conclusion referred to "pod-level rules"; I changed it to "workload endpoint rules" to align with Calico terminology.

## Review Notes
The YAML examples use current Kubernetes `networking.k8s.io/v1` NetworkPolicy and Calico `projectcalico.org/v3` APIs. The `externalTrafficPolicy: Local` and Calico eBPF source IP preservation statements match current Kubernetes and Calico documentation, with the usual cloud-provider caveat for LoadBalancer implementations.

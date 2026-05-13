# Validation Summary: How to Configure Zero Trust Network Policy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Kubernetes
- Calico `GlobalNetworkPolicy`
- Calico `NetworkPolicy`
- `kubectl exec`
- YAML

## Sources Consulted
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction stated that nothing is permitted by default. Calico allows all pod traffic when no policy applies, so this was changed to clarify that traffic is only restricted after default-deny policies are in place.
- The introduction claimed comprehensive logging of every traffic decision. Calico does not log every decision automatically; logging requires `Log` rules or related observability features. This was changed to describe optional `Log` rules.
- The global default-deny policy selected `all()` across the whole cluster, including system namespaces. Calico documentation warns this can break Kubernetes and Calico control-plane components, so the example now excludes common system namespaces with `namespaceSelector`.
- The DNS allow policy allowed all destinations on TCP/UDP port 53. This was narrowed to destinations matching the common kube-dns label, following Calico's documented default-deny example.
- The sample kubelet ingress allow rule was removed because a pod-focused zero trust policy should not present kubelet port 10250 as required workload traffic, and host endpoint policy requires separate host-endpoint considerations.
- The diagram and conclusion were updated to match the corrected non-system pod scope, DNS baseline, and explicit `Log` rule guidance.

## Review Notes
The examples assume the cluster uses the common `k8s-app == "kube-dns"` label for DNS pods. Some clusters may label DNS differently, so operators should confirm labels before applying the policy.

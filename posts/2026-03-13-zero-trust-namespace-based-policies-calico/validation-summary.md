# Validation Summary: Zero Trust Namespace Isolation with Calico Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico namespaceSelector and selector rules
- Kubernetes namespaces and namespace labels
- Kubernetes DNS / kube-dns
- kubectl exec

## Sources Consulted
- Calico documentation: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: NetworkPolicy resource reference and selector semantics - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Use namespace rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico documentation: Adopt a zero trust network model for security - https://docs.tigera.io/calico/latest/network-policy/adopt-zero-trust
- Kubernetes documentation: Well-known labels, `kubernetes.io/metadata.name` - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The original global default-deny policy used `selector: all()`, which would apply too broadly across the cluster and can include system workloads and host endpoints depending on the deployment. Calico's default-deny guidance recommends scoping global default deny policies away from system namespaces. Changed the policy to use `namespaceSelector: kubernetes.io/metadata.name not in {"calico-system", "kube-public", "kube-system", "tigera-operator"}`.
- The DNS allow policy allowed egress to any destination on TCP/UDP port 53. This was broader than the stated intent of allowing required system DNS traffic. Changed the DNS allow rules to target kube-dns in the `kube-system` namespace using `namespaceSelector` and `selector`.
- The DNS/system policy included an ingress rule for destination port 10250 labeled as kubelet traffic. Port 10250 is the kubelet API port on nodes, not a generic pod ingress requirement for namespace isolation. Removed that ingress rule so the example only permits the required DNS egress it describes.

## Review Notes
The remaining examples use valid Calico `projectcalico.org/v3` policy fields and valid `kubectl exec` syntax. The cross-namespace allow rules are intentionally examples; in a real cluster, destination selectors should usually be narrowed to specific workloads instead of `selector: all()` when teams know the exact application labels.

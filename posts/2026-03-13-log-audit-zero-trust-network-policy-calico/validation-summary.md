# Validation Summary: How to Log and Audit Zero Trust Network Policy in Calico

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
- Calico Open Source GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source getting started with Calico network policy: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes API access documentation: https://kubernetes.io/docs/concepts/security/controlling-access/
- Kubernetes ports and protocols reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/

## Issues Found
- The post claimed comprehensive logging for zero trust decisions, but the default-deny policy had no `Log` rules. Added `Log` followed by explicit `Deny` rules for both ingress and egress in the final `GlobalNetworkPolicy`, matching Calico's documented behavior that `Log` continues to the next rule while `Deny` is final.
- The introduction overstated Kubernetes pod default-deny behavior. Calico follows Kubernetes pod policy behavior unless a policy selects the workload, so the text now scopes the default-deny statement to the described policy stack.
- The system traffic example allowed ingress to port `10250` as "Kubelet" traffic on a workload-selected policy. Replaced it with egress allows for DNS and Kubernetes API access on TCP `443` and `6443`, which better matches pod egress requirements and Kubernetes API server defaults.
- The application allow rule specified a destination port without a protocol. Added `protocol: TCP` to make the example explicit and consistent with Calico examples for TCP service ports.
- The architecture diagram implied the high-order default-deny policy was evaluated before lower-order allow policies. Updated the diagram to show Calico's documented lowest-order-first evaluation model.

## Review Notes
The YAML block was parsed successfully as three documents after the fixes. The verification commands use valid `kubectl exec -n <namespace> <pod> -- <command>` syntax, but the pod names, service names, labels, namespaces, DNS behavior, and exact Kubernetes API destination constraints remain environment-specific and should be adapted before applying in a real cluster.

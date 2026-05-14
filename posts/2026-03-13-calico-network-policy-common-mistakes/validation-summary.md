# Validation Summary: How to Avoid Common Mistakes with Network Policy Fundamentals in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- `kubectl`
- `calicoctl`
- `jq`
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico network policy getting started guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The Calico explicit-deny example described the deny rule as loggable, but Calico logging requires a separate `Log` action before the terminal `Deny` action. I added an `action: Log` rule before `action: Deny` and adjusted the inline comment.
- The diagnostic command in the union semantics section claimed to find all policies selecting a pod, but the `jq` expression only handles a simple `spec.podSelector.matchLabels.app` case. I narrowed the command description and added a note to inspect empty `podSelector` and `matchExpressions` selectors.
- The `policyTypes` example said it created both deny-all ingress and deny-all egress even though the snippet included an ingress allow rule. I corrected the wording and replaced the placeholder ingress peer with a valid `podSelector` example.

## Review Notes
- `kubectl` and `calicoctl` were not installed in the local review environment, so CLI flag validation was performed against official command references instead of local `--help` output.
- The recommendation to use Calico `GlobalNetworkPolicy` for cross-namespace target coverage is valid, but namespaced Calico policies can still reference other namespaces in rule peers with `namespaceSelector`; the distinction is about which destination endpoints the policy resource selects.

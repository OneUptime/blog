# Validation Summary: How to Explain Network Policy Fundamentals in Calico to Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes NetworkPolicy
- Kubernetes Services and DNS
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source documentation: NetworkPolicy resource reference, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Get started with Calico network policy, https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico Open Source documentation: Use namespace rules in policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico Open Source documentation: Calico automatic labels, https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Open Source documentation: Get started with policy tiers, https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Open Source documentation: Use log rules to test network policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source documentation: StagedNetworkPolicy resource reference, https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The introduction overstated network policy as making every Kubernetes communication explicitly authorized. Kubernetes pods are default-allow until an applicable policy selects them, so the wording was changed to describe selected workloads and policy-controlled communication more precisely.
- The demo used a Calico `NetworkPolicy` in `backend-ns` with only `source.selector: app == 'frontend'`. In a namespaced Calico `NetworkPolicy`, a rule selector without `namespaceSelector` matches sources in the same namespace as the policy. I added `namespaceSelector: projectcalico.org/name == 'frontend-ns'` and updated the `kubectl exec` and service DNS examples to use `frontend-ns` and `backend-ns` consistently.
- The rule evaluation explanation described only simple top-to-bottom first-match behavior. Calico also evaluates policy by tier and policy order, and `Log` continues while `Allow` and `Deny` are final. I updated the diagram and conclusion to reflect this.
- The policy conflict answer described additive OR logic without distinguishing Kubernetes NetworkPolicy from Calico NetworkPolicy. I updated it to state that Kubernetes NetworkPolicy allows are additive, while Calico adds ordering and explicit deny actions.
- The prerequisites implied `calicoctl` was required for the shown demo, but the commands use `kubectl apply`. I clarified that `calicoctl` is only needed if the cluster manages Calico resources that way.

## Review Notes
- The post remains a conceptual teaching guide rather than a complete runnable lab. The referenced `deny-all-ingress.yaml` is not shown, so future improvements could include the exact deny-all policy manifest.

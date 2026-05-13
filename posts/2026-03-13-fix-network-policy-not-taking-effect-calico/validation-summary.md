# Validation Summary: How to Fix Network Policy Not Taking Effect in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico
- Calico GlobalNetworkPolicy
- Felix / calico-node
- kubectl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico policy tiers documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The `policyTypes` section implied that omitting `policyTypes` is generally a problem. Kubernetes defaults `policyTypes` to include `Ingress`, and includes `Egress` only when egress rules are present. Updated the text to clarify that explicit `policyTypes` is especially important for intended egress isolation without egress rules.
- The selector patch used a JSON Patch `replace` operation against `/spec/podSelector/matchLabels`, which fails if `matchLabels` is absent. Changed it to a merge patch so it works when adding or replacing the label selector map.
- The Calico `GlobalNetworkPolicy` snippet used `selector: ...`, which is not a valid Calico selector expression. Changed it to `selector: all()` so the snippet is syntactically valid.
- The Felix restart verification used `kubectl wait` with selectors immediately after deleting the pod, which can fail if the replacement pod has not been created yet. Replaced it with `kubectl rollout status daemonset/calico-node`, which matches the DaemonSet-managed calico-node deployment model.
- The verification test used `ping`. Kubernetes NetworkPolicy supports TCP, UDP, and SCTP rules, so ICMP ping is not a reliable test for Kubernetes NetworkPolicy enforcement. Replaced the test with an HTTP request from a BusyBox source pod to an nginx destination pod.
- The verification commands omitted the target namespace. Added `-n <namespace>` to the test pod, wait, exec, get, and cleanup commands so the test runs in the namespace where the policy applies.
- The prevention section referred to a "Resolved selector" from `kubectl describe networkpolicy`, which is not the standard wording in Kubernetes documentation. Updated it to say that `kubectl describe networkpolicy` shows how Kubernetes interpreted the policy.

## Review Notes
The post is technically relevant and accurate after the corrections. Future improvements could include a short reminder that Kubernetes NetworkPolicy is additive across matching policies and that Calico policy behavior can also depend on tiers, actions such as `Pass`, and whether the policy is Kubernetes NetworkPolicy, Calico NetworkPolicy, or Calico GlobalNetworkPolicy.

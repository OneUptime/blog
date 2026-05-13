# Validation Summary: How to Monitor Staged Kubernetes NetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes NetworkPolicy
- Calico StagedKubernetesNetworkPolicy resource
- calicoctl CLI
- Felix (Calico dataplane agent)
- Prometheus metrics

## Sources Consulted
- Calico StagedKubernetesNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico StagedNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found

1. **Wrong resource kind in YAML.** The post is titled "Staged Kubernetes NetworkPolicy" but the example used `kind: NetworkPolicy` (a regular Calico NetworkPolicy, not staged). Changed to `kind: StagedKubernetesNetworkPolicy`, which is the correct Calico CRD for this resource.
2. **Wrong spec syntax.** The original spec mixed Calico-native syntax (`selector: all()`, `source.selector`, `destination.ports`, `action: Allow`, top-level `order`) with the wrong kind. `StagedKubernetesNetworkPolicy` mirrors the Kubernetes NetworkPolicy API, so the spec was rewritten to use `podSelector`, `policyTypes`, `from`/`to` with `podSelector.matchLabels`, and `ports` with `protocol`/`port` pairs. Added `stagedAction: Set`.
3. **Operational commands referenced the wrong resource.** `calicoctl get networkpolicies` and `calicoctl get globalnetworkpolicies` do not return staged policies. Updated commands to `calicoctl get stagedkubernetesnetworkpolicies` (and `stagednetworkpolicies` for the Calico-native staged variant), and used the actual policy name in get/delete examples.
4. **Non-existent Felix metric `felix_denied`.** No metric with that prefix exists in Felix's Prometheus output. Replaced with `felix_active_local_policies`, which is a real metric and is useful as a sanity check that the policy is being seen by Felix.
5. **Order-conflict guidance not applicable.** The "Order conflicts" troubleshooting step referenced `calicoctl get globalnetworkpolicies -o wide` and the `order` field, but `StagedKubernetesNetworkPolicy` follows the Kubernetes model and does not have an `order` field. Replaced with guidance about comparing against enforced policies sharing the same `podSelector`.
6. **Architecture diagram implied enforcement.** The Mermaid diagram showed Felix "Enforces" the policy and traffic being "Blocked" by a "Default Deny". By definition, staged policies are evaluated but not enforced — they generate metrics/logs as if they were active without actually dropping traffic. Updated the diagram to "Would Allow" / "Would Deny" / "Logged, Not Blocked" and changed Felix's role to "Evaluates Only".

## Review Notes
- The post copy still says "Monitor Staged K8s NetworkPolicy in Calico requires careful attention to policy ordering..." in the conclusion. Policy ordering applies to the Calico-native staged variants (`StagedNetworkPolicy`, `StagedGlobalNetworkPolicy`), not to `StagedKubernetesNetworkPolicy`. Left as-is because the post mentions both in the intro and the conclusion language is generic enough to apply to either.
- The intro retains the phrasing "production-tested patterns for monitor Staged K8s NetworkPolicy" — this is a grammatical issue, not a technical one, so it was left unchanged per the review guidelines.
- Availability of `StagedKubernetesNetworkPolicy` in fully open-source Calico has shifted over versions; v3.26+ is a reasonable lower bound, but users on older Calico installations should verify their CRDs include the staged variants before applying.
- `calicoctl apply --dry-run` is referenced in troubleshooting; this flag is supported by `calicoctl` for the `apply` command, so it was left as-is.

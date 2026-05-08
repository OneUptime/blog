# Validation Summary: Fixing Namespace Selector Problems with Unlabeled Namespaces in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes namespaces and namespace labels
- Kubernetes kubectl commands
- Kyverno ClusterPolicy mutation and validation rules

## Sources Consulted
- Calico documentation: NetworkPolicy resource reference, including `namespaceSelector`, selector syntax, and rule fields: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: GlobalNetworkPolicy resource reference and namespace selection behavior: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Automatic labels, including `projectcalico.org/name` and Kubernetes `kubernetes.io/metadata.name`: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico documentation: Namespace rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Kubernetes documentation: Namespaces and the immutable `kubernetes.io/metadata.name` label: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes documentation: Well-known labels, annotations, and taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes documentation: Labels and selectors syntax: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kyverno documentation: Validate rules and `validate.failureAction`: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno documentation: Match and exclude resource filters, including `resources.names` and `resources.namespaces`: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kyverno documentation: Mutate rules and strategic merge patch behavior: https://kyverno.io/docs/policy-types/cluster-policy/mutate/

## Issues Found
- The validation-policy introduction said to use a ValidatingWebhook if Kyverno is not used, but the snippet was still a Kyverno `ClusterPolicy`. Changed the text to describe it as a Kyverno validation policy for enforcement instead of mutation.
- The Kyverno validation policy used top-level `spec.validationFailureAction: Enforce`. Current Kyverno examples place this setting under `validate.failureAction`; updated the manifest accordingly.
- The Kyverno validation policy excluded system Namespace objects using `resources.namespaces`. Namespace resources are cluster-scoped and should be matched by object name, so this was changed to `resources.names`.
- The rollout command watched events with `--field-selector reason=NetworkPolicyDrop`, but `NetworkPolicyDrop` is not a standard Kubernetes or Calico event reason. Replaced it with a general event watch plus Calico node log following for policy-related errors.

## Review Notes
- `kubectl` was not installed in the local workspace, so CLI options were checked against official Kubernetes documentation rather than local `kubectl --help` output.
- Calico supports using the Kubernetes-provided `kubernetes.io/metadata.name` namespace label in the same way as Calico's older `projectcalico.org/name` label, so the policy examples using that label are valid for current Calico and Kubernetes.

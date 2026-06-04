# Validation Summary: How to Implement Admission Control for Cost Governance and Resource Limits

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes admission control
- Kyverno ClusterPolicy validation rules
- Kubernetes Pods, PersistentVolumeClaims, ResourceQuota, and HorizontalPodAutoscaler
- kubectl namespace annotations
- Shell scripting

## Sources Consulted
- Kyverno Validate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno Preconditions and conditional operator documentation: https://kyverno.io/docs/policy-types/cluster-policy/preconditions/
- Kyverno JMESPath custom filters documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes node labels reference: https://kubernetes.io/docs/reference/node/node-labels/

## Issues Found
- The examples used `spec.validationFailureAction`, which Kyverno documents as deprecated. Updated all policies to use rule-level `validate.failureAction`.
- The pod-level CPU sum converted Kubernetes CPU quantities with `to_number()` and compared them to `4000`, which is not correct for values such as `500m`. Replaced this with Kyverno's quantity-aware `sum()` filter and a quantity comparison against `4`.
- The HPA resource-request rule claimed to verify the target Deployment's resource requests, but it only inspected HPA metrics. Updated the message so the rule accurately describes checking for at least one Resource metric.
- The node selector policy used a negation anchor in a way that would forbid the `node.kubernetes.io/instance-type` key regardless of value. Replaced it with deny conditions that block the listed expensive instance type prefixes.
- The cost estimation example used unsupported inline arithmetic in a Kyverno message and had no validate condition to trigger an audit result. Reworked it to surface an externally calculated `estimated-monthly-cost` annotation through an Audit deny rule.
- The ResourceQuota example converted CPU quantities with `to_number()` and used unsupported inline multiplication. Replaced this with a quantity comparison using Kyverno's `multiply()` filter.

## Review Notes
The post remains a practical Kyverno-focused guide. The examples are version-sensitive because Kyverno policy syntax continues to evolve; the corrected snippets follow the current documented `validate.failureAction` style. YAML snippets were parsed locally for syntax, but the Kyverno CLI was not available in the environment for live policy execution tests.

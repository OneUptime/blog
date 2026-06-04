# Validation Summary: How to Use Namespace Labels and Annotations for Policy Enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes namespaces, labels, annotations, ResourceQuota, LimitRange, and NetworkPolicy
- OPA Gatekeeper ConstraintTemplates and Constraints
- Kyverno ClusterPolicy validate and generate rules
- Kubernetes Python client
- Kubernetes client-go
- kube-state-metrics, PrometheusRule, and PromQL

## Sources Consulted
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Kyverno installation documentation: https://kyverno.io/docs/installation/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno generate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno match and exclude documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- Kubernetes client-go documentation: https://github.com/kubernetes/client-go
- kube-state-metrics documentation: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The Kyverno install command referenced `v1.10.0`, which is outdated for a current 2026 guide. Updated it to the currently documented tagged manifest version, `v1.16.2`.
- The Kyverno examples used top-level `spec.validationFailureAction: enforce`, which is deprecated in current Kyverno and uses the wrong casing for current examples. Moved enforcement to rule-level `validate.failureAction: Enforce`.
- Kyverno generate rules omitted generated resource `apiVersion` fields for `NetworkPolicy`, `LimitRange`, and `ResourceQuota`. Added `networking.k8s.io/v1` and `v1` as appropriate.
- The PCI network policy rule attempted to validate that NetworkPolicies exist by denying Namespace creation when `request.operation` is `CREATE`, which would block all matching PCI-DSS Namespace creates instead of verifying child NetworkPolicy resources. Replaced it with a Kyverno generate rule that creates a default-deny NetworkPolicy in matching namespaces.
- The Go snippet did not compile as written because it imported unused packages, used `time.Now()` without importing `time`, and ignored errors from `rest.InClusterConfig()` and `kubernetes.NewForConfig()`. Updated imports and error handling.

## Review Notes
- YAML snippets were parsed successfully after the fixes, and the Python snippet passed an AST syntax check.
- The Go toolchain is not installed in this workspace, so the Go snippet could not be compiled locally.
- The Prometheus alert assumes kube-state-metrics is configured to expose namespace labels through its metric labels allowlist; without that configuration, required Kubernetes labels may not appear as Prometheus labels.

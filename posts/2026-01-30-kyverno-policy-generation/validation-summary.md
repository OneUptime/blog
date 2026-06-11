# Validation Summary: How to Implement Kyverno Policy Generation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kyverno legacy `ClusterPolicy` generate rules
- Kyverno CEL-based `GeneratingPolicy`
- Kubernetes Namespaces, ConfigMaps, Secrets, NetworkPolicies, ResourceQuotas, LimitRanges, RoleBindings, and PodDisruptionBudgets
- Helm
- kubectl
- Prometheus Operator ServiceMonitor
- cert-manager managed TLS Secrets

## Sources Consulted
- Kyverno Generate Rules documentation: https://main.kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno Policy Types overview and deprecation schedule: https://kyverno.io/docs/policy-types/overview/
- Kyverno GeneratingPolicy documentation: https://kyverno.io/docs/policy-types/generating-policy/
- Kyverno Installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno Variables and JMESPath documentation: https://kyverno.io/docs/policy-types/cluster-policy/variables/
- Kyverno CLI `apply` reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kyverno Policy Reports guide: https://kyverno.io/docs/guides/reports/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Kyverno Helm install command used the old `replicaCount` value. Current Kyverno Helm documentation configures high availability per controller, so the command was updated to set `admissionController.replicas`, `backgroundController.replicas`, `cleanupController.replicas`, and `reportsController.replicas`.
- The post did not mention that `ClusterPolicy` is now a legacy policy type. Added a short note that the examples use legacy `ClusterPolicy` generate rules and that Kyverno v1.17+ deprecates `ClusterPolicy` in favor of CEL-based `GeneratingPolicy` for new policies.
- The JMESPath lookup for the `cost-center` label used an unquoted key containing a hyphen. Updated it to `metadata.labels.\"cost-center\"`, which is the correct form for special characters in Kyverno JMESPath expressions.
- The Deployment-to-PodDisruptionBudget and Service-to-ServiceMonitor examples templated `metadata.labels.app` without ensuring the trigger resource had an `app` label. Added `matchExpressions` requiring the `app` label to exist.
- The annotation-based precondition compared a potentially missing annotation directly to an empty string. Added a default `|| ''` so missing annotations do not incorrectly satisfy the `NotEquals` precondition.

## Review Notes
All YAML snippets parse successfully after the edits. The legacy `ClusterPolicy` examples remain functional in current Kyverno releases, but the post should eventually be migrated to full `GeneratingPolicy` examples before the planned Kyverno v1.20 removal of legacy policy APIs.

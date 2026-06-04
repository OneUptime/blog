# Validation Summary: How to Configure Kyverno Cleanup Policies for Resource Lifecycle Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kyverno
- Kyverno DeletingPolicy and NamespacedDeletingPolicy
- Kubernetes CEL expressions
- kubectl
- Prometheus and ServiceMonitor

## Sources Consulted
- Kyverno policy type overview: https://kyverno.io/docs/policy-types/overview/
- Kyverno DeletingPolicy documentation: https://kyverno.io/docs/policy-types/deleting-policy/
- Kyverno Cleanup Policy documentation: https://kyverno.io/docs/policy-types/cleanup-policy/
- Kyverno CEL libraries documentation: https://kyverno.io/docs/policy-types/cel-libraries/
- Kyverno metrics reference: https://kyverno.io/docs/reference/metrics/
- Kyverno monitoring guide: https://kyverno.io/docs/guides/monitoring/
- Kyverno DeletingPolicy CRD in the official Kyverno repository: https://github.com/kyverno/kyverno/blob/main/config/crds/policies.kyverno.io/policies.kyverno.io_deletingpolicies.yaml
- Kubernetes CEL reference: https://kubernetes.io/docs/reference/using-api/cel

## Issues Found
- The post used legacy `ClusterCleanupPolicy` and `CleanupPolicy` resources with `kyverno.io/v2alpha1`. Current Kyverno documentation marks cleanup policies as deprecated in Kyverno v1.18 and documents stable CEL-based `DeletingPolicy` and `NamespacedDeletingPolicy` resources under `policies.kyverno.io/v1`. Updated all policy examples to the stable API.
- The examples used legacy `match` / `exclude` blocks and JMESPath-style `conditions` with `target.*`. `DeletingPolicy` uses Kubernetes-style `matchConstraints`, optional selectors, and CEL boolean expressions over `object`. Rewrote every policy snippet to use documented `resourceRules`, `objectSelector`, `namespaceSelector`, and CEL `conditions`.
- The time-based examples used `time_since`, `time_now`, and an invalid one-argument `time_add('-7d')` expression. Replaced these with documented CEL time expressions using `time.now()`, `timestamp(...)`, and `duration(...)`.
- The temporary namespace command annotated `type=temporary` even though the policy matched it as a label. Split this into `kubectl label namespace ... type=temporary` and a separate `expires` annotation.
- The namespace-scoped example used a `last-used` label as a timestamp. RFC3339 timestamps are not valid Kubernetes label values because they contain colons, so this now uses a `last-used` annotation.
- The dry-run annotation `kyverno.io/cleanup-mode: "dryrun"` is not documented for cleanup or deleting policies. Replaced the section with API-server dry-run validation using `kubectl apply --dry-run=server`.
- The monitoring queries referenced non-documented metric names such as `kyverno_cleanup_controller_resources_deleted_total` and `kyverno_cleanup_controller_scan_duration_seconds_bucket`. Updated them to documented deleting-controller metrics: `kyverno_deleting_controller_deletedobjects_total` and `kyverno_deleting_controller_errors_total`.
- The ServiceMonitor example did not match the current Kyverno monitoring guide. Updated it to select Kyverno metrics services in the `kyverno` namespace with `targetPort: 8000` and `/metrics`.

## Review Notes
Deleting policies perform destructive actions and require the Kyverno cleanup controller to have `get`, `list`, `watch`, and `delete` permissions on each targeted resource type. The examples are now aligned with current Kyverno v1.18+ documentation, but operators should still test CEL expressions and RBAC in a staging cluster before applying them to production.

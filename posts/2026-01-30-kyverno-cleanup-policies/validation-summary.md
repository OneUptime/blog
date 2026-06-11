# Validation Summary: How to Build Kyverno Cleanup Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno deleting policies
- Kubernetes resource cleanup
- Kubernetes label selectors and namespace selectors
- CEL time expressions
- Kyverno CLI
- Prometheus alerting
- kubectl

## Sources Consulted
- Kyverno DeletingPolicy documentation: https://kyverno.io/docs/policy-types/deleting-policy/
- Kyverno Cleanup Policy documentation: https://kyverno.io/docs/policy-types/cleanup-policy/
- Kyverno CEL libraries documentation: https://kyverno.io/docs/policy-types/cel-libraries/
- Kyverno metrics reference: https://kyverno.io/docs/reference/metrics/
- Kyverno CLI `apply` reference: https://kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kubernetes CEL reference: https://kubernetes.io/docs/reference/using-api/cel/

## Issues Found
- The post used deprecated `CleanupPolicy` and `ClusterCleanupPolicy` resources under `kyverno.io/v2beta1`. Current Kyverno documentation marks cleanup policies as deprecated in Kyverno v1.18 and documents stable `DeletingPolicy` and `NamespacedDeletingPolicy` resources under `policies.kyverno.io/v1`. Updated the policy examples to the stable API.
- The examples used legacy `match` / `exclude` blocks and JMESPath-style `conditions` with `key`, `operator`, and `value`. Stable deleting policies use `matchConstraints` and CEL `conditions`. Rewrote selectors and conditions accordingly.
- Time-based examples used `time_since()` and `time_now()`, which are not the CEL syntax for stable deleting policies. Replaced them with `time.now()`, `timestamp(...)`, and `duration(...)`.
- The TTL example used a custom annotation named `cleanup.kyverno.io/ttl`. Kyverno documents `cleanup.kyverno.io/ttl` as a reserved label, so the example now uses labels.
- The monitoring examples referenced old or invalid metric names and broad controller log selectors. Updated Prometheus rules to use documented deleting-controller metrics: `kyverno_deleting_controller_deletedobjects_total` and `kyverno_deleting_controller_errors_total`, and changed log commands to target the cleanup controller label.
- The status-check commands used `cleanuppolicy`. Updated them to `deletingpolicy` and `namespaceddeletingpolicy`.

## Review Notes
- YAML snippets were parsed after editing; all 20 YAML blocks are syntactically valid.
- Deleting policies are destructive by design, so the article's guidance to test with narrow selectors and non-production resources remains important.

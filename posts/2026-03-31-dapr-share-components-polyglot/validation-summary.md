# Validation Summary: How to Share Dapr Components Across Polyglot Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Components (state stores, pub/sub, secret stores)
- Kubernetes (namespace scoping, pod annotations)
- Redis (as Dapr state store and pub/sub broker)
- HashiCorp Vault (as Dapr secret store)
- Kustomize (environment overlays)
- ArgoCD (GitOps deployment)
- Dapr CLI

## Sources Consulted
- Dapr Component Schema Reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Component Scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr CLI Components Command: https://docs.dapr.io/reference/cli/dapr-components/
- Dapr Redis State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis Pub/Sub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr HashiCorp Vault Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr Sidecar (daprd) Documentation: https://docs.dapr.io/operations/troubleshooting/common_issues/

## Issues Found

### Issue 1 (HIGH): `scopes` field incorrectly nested under `spec`
- **What was wrong:** In three YAML examples (payment-secrets component, statestore-v1, statestore-v2), the `scopes` field was indented under `spec`. According to the Dapr component schema, `scopes` is a root-level field — a sibling of `spec`, not a child of it.
- **What was changed:** Moved `scopes` to the root level (same indentation as `spec`) in all three occurrences.
- **Why:** If `scopes` is nested under `spec`, Dapr silently ignores it, meaning components would be accessible to ALL apps in the namespace instead of being restricted to the listed app IDs. This is a critical security concern for the payment-secrets example.

### Issue 2 (MEDIUM): Incorrect Dapr CLI flag for namespace
- **What was wrong:** The command `dapr components -k -n production` used `-n` which is the short form of `--name` (filters by component name), not `--namespace`.
- **What was changed:** Changed `-n production` to `--namespace production`.
- **Why:** The original command would search for a component named "production" rather than listing all components in the production namespace.

## Review Notes
- The `grep "component loaded"` pattern used for checking Dapr sidecar logs is a reasonable approximation but the exact log message format may vary between Dapr versions. Users should check actual daprd log output for the precise string.
- The Kustomize overlay example is a strategic merge patch pattern, which is correct for patching Dapr components but may replace the entire `metadata` array rather than merging individual items, depending on the Kustomize configuration. This is a Kustomize behavior nuance, not a Dapr issue.
- The ArgoCD Application manifest uses the older `spec.source` (singular) field rather than `spec.sources` (plural), which is correct for single-source applications.
- All component types (`state.redis`, `pubsub.redis`, `secretstores.hashicorp.vault`) are valid and current.
- The `apiVersion: dapr.io/v1alpha1` and `kind: Component` are correct for current Dapr versions.

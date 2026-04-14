# Validation Summary: How to Manage Dapr Configuration Across Multiple Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (namespaces, CRDs, kubectl)
- Dapr Component CRD (`dapr.io/v1alpha1` Component)
- Dapr Configuration CRD (`dapr.io/v1alpha1` Configuration)
- Dapr state stores (in-memory, Redis)
- Kubernetes Secrets (secretKeyRef)
- envsubst (environment variable substitution)
- Dapr CLI

## Sources Consulted
- Dapr Component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr In-memory State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-inmemory/
- Dapr Redis State Store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr secret references in components: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Configuration schema reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr tracing setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr CLI overview and command reference: https://docs.dapr.io/reference/cli/cli-overview/
- Dapr CLI components command reference: https://docs.dapr.io/reference/cli/dapr-components/
- Dapr annotations and arguments: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr component scopes: https://docs.dapr.io/operations/components/component-scopes/

## Issues Found

1. **`metric` should be `metrics` (plural) in Configuration CRD** — The Dapr Configuration spec uses `metrics` (plural), not `metric`. The field `spec.metric.enabled` was changed to `spec.metrics.enabled` to match the official schema documented at https://docs.dapr.io/reference/resource-specs/configuration-schema/.

2. **`dapr components validate -f` command does not exist** — The Dapr CLI has no `validate` subcommand under `dapr components` (or anywhere else). The `dapr components` command only lists running components. Replaced with `kubectl apply --dry-run=client -f` which is the standard way to validate Kubernetes resource manifests before applying them.

## Review Notes
- The `secretKeyRef` usage in the production statestore component is correct and will default to the Kubernetes secret store when no `auth.secretStore` is specified. This is standard for Kubernetes deployments, though non-Kubernetes environments would require an explicit `auth` block.
- The `${REDIS_HOST}` environment variable syntax is correctly presented as requiring external tooling (envsubst) rather than being a native Dapr feature. The post's explanation is accurate on this point.
- All Dapr apiVersions (`dapr.io/v1alpha1`) for both Component and Configuration kinds are current and correct.
- The `dapr.io/config` annotation and namespace-scoping claims are accurate per official documentation.

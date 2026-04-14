# Validation Summary: How to Version Dapr Component Specifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr component specifications (YAML)
- Dapr state store components (state.redis, state.postgresql v1 and v2)
- Kubernetes (kubectl commands for Dapr CRDs)
- Dapr CLI (dapr run)
- Git (GitOps versioning workflow)

## Sources Consulted
- Dapr component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr PostgreSQL v2 state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr secrets in components: https://docs.dapr.io/operations/components/component-secrets/
- Dapr application access control (scopes): https://docs.dapr.io/operations/components/component-scopes/

## Issues Found
No technical issues found.

## Review Notes
- The `scopes` field is shown as a standalone YAML snippet at the root indentation level, which is correct (it is a top-level field, not nested under `spec`). Readers unfamiliar with Dapr YAML structure might benefit from seeing it in context of a full component definition, but the snippet is not technically wrong.
- The `dapr run --app-id probe --log-level debug -- sleep 2 | grep "component registered"` command is a creative but unofficial debugging technique. It works in practice (the Dapr sidecar loads components during startup and debug logs show this activity), but the exact grep pattern may need adjustment depending on the Dapr version, as log message formats can vary.
- The `tablePrefix` metadata field is correctly shown only in the v2 PostgreSQL example. For v1, the equivalent field is `tableName` (not used in the post, which is fine since the v1 example doesn't reference it).
- The `secretKeyRef` pattern used for `connectionString` is a valid Dapr mechanism for referencing Kubernetes secrets in component metadata, documented in the general Dapr secrets documentation.
- PostgreSQL state store v1 and v2 use incompatible storage formats (JSONB vs BYTEA) and cannot share tables. The post's side-by-side migration approach is sound, though it does not mention this incompatibility explicitly.

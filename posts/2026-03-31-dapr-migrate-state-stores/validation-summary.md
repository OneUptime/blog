# Validation Summary: How to Migrate State Data Between Dapr State Stores

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Dapr (state management, sidecar, components)
- Dapr Python SDK (`dapr-client`)
- Dapr HTTP State API (`/v1.0/state/`)
- Redis (as source state store)
- PostgreSQL (as target state store, v2 component)
- Kubernetes (deployments, Jobs, Dapr CRDs)
- kubectl CLI
- redis-cli
- psql CLI

## Sources Consulted
- Dapr State Management API reference (https://docs.dapr.io/reference/api/state_api/)
- Dapr Redis state store component docs (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr PostgreSQL v2 state store component docs (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/)
- Dapr Python SDK GitHub repository and API reference (https://github.com/dapr/python-sdk)
- Dapr Component YAML spec (https://docs.dapr.io/operations/components/component-schema/)
- Dapr sidecar annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr state store key prefix behavior (https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/)

## Issues Found

### 1. Stop-the-world bash script: delimiter conflict with Dapr key format
**What was wrong:** The export step used `|` (single pipe) as a delimiter between key and value in `state_backup.txt`. Since Dapr stores Redis keys with `||` (double pipe) as the app-id separator (e.g., `myapp||order-001`), the import step's `IFS='|'` would incorrectly split the key — assigning only `myapp` to `$key` and `|order-001|somevalue` to `$value`.

**What was changed:** Replaced the `|` delimiter with a tab character (`\t`) using `printf '%s\t%s\n'` for export and `IFS=$'\t'` for import, avoiding collision with the `||` in key names.

### 2. Stop-the-world bash script: missing app-id prefix stripping
**What was wrong:** The export step wrote full Redis keys (e.g., `myapp||order-001`) to the backup file, and the import step sent these keys directly to the Dapr HTTP API. Since Dapr automatically prepends the app-id prefix when saving state, this would result in double-prefixed keys in the new store (e.g., `myapp||myapp||order-001`). The Python backfill script in Phase 2 correctly handled this with `key.split("||", 1)[1]`, but the bash script did not.

**What was changed:** Added a prefix-stripping step (`dapr_key="${key#*||}"`) in the export loop, so only the actual key name (without the app-id prefix) is written to the backup file and subsequently sent to the Dapr API.

## Review Notes
- The `redis-cli KEYS "myapp||*"` command in the Phase 3 validation step is a well-known performance concern in production Redis (it blocks the server while scanning all keys). For large datasets, `redis-cli --scan --pattern` would be safer. However, since this is presented as a one-time validation step rather than production code, it is acceptable in context.
- All Dapr component YAML, Python SDK usage, HTTP API endpoints, Kubernetes annotations, and kubectl commands are correct and current.
- The dual-write migration strategy is sound and follows established patterns for zero-downtime data migration.

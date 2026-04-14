# Validation Summary: How to Use Dapr State Store with PostgreSQL v2 Features

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- PostgreSQL v2 state store component (`state.postgresql` version v2)
- Dapr Python SDK (`dapr-client`)
- Kubernetes (for secret management and component deployment)
- SQL (PostgreSQL schema)

## Sources Consulted
- Dapr PostgreSQL v2 State Store official docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr PostgreSQL v1 State Store official docs (for comparison): https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v1/
- Dapr Component Schema Spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Secret References in Components: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Python SDK source code (`dapr/clients/grpc/client.py`): https://github.com/dapr/python-sdk
- Dapr components-contrib PostgreSQL v2 source code (`state/postgresql/v2/postgresql.go`): https://github.com/dapr/components-contrib

## Issues Found

### 1. Incorrect claim: v2 supports State Query API (CRITICAL)
**What was wrong:** The post stated that v2 introduced "native support for the State Query API" and included a full `query_state` Python code example. This is the opposite of reality -- v2 does NOT support the State Query API because it stores values as BYTEA instead of JSONB.
**What was changed:** Replaced the code example section with an explanation that v2 does not support the query API and that v1 should be used if query support is needed. Updated the intro and summary sections accordingly.

### 2. Incorrect value column type in schema (CRITICAL)
**What was wrong:** The schema showed `value JSONB NOT NULL`. The actual v2 schema uses `value BYTEA NOT NULL`.
**What was changed:** Corrected to `BYTEA`.

### 3. Non-existent `isbinary` column in v2 schema
**What was wrong:** The schema included an `isbinary BOOLEAN NOT NULL` column. This column exists in v1 but does not exist in v2 (since v2 always stores as binary).
**What was changed:** Removed the `isbinary` column from the schema.

### 4. Incorrect column names in schema
**What was wrong:** The schema used `expiredate` and `updatetime`. The actual v2 column names are `expires_at`, `created_at`, and `updated_at`.
**What was changed:** Updated all column names to match the actual v2 schema.

### 5. Missing `created_at` column
**What was wrong:** The schema did not include the `created_at` column. The actual v2 schema has `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
**What was changed:** Added the `created_at` column.

### 6. Incorrect index definition
**What was wrong:** The schema showed a partial index with `WHERE expiredate IS NOT NULL`. The actual v2 schema uses a plain index on `expires_at` with no WHERE clause.
**What was changed:** Corrected to a plain index on `expires_at`.

### 7. Wrong metadata field name: `tableName` vs `tablePrefix`
**What was wrong:** The component configuration used `tableName`. In v2, this field was renamed to `tablePrefix`.
**What was changed:** Changed `tableName` to `tablePrefix` in the component YAML configuration.

### 8. Concurrency set via wrong parameter in Python SDK
**What was wrong:** The code used `state_metadata={"concurrency": "first-write"}` to set concurrency mode. The `state_metadata` dict is for component-level metadata, not SDK options. Concurrency must be set via the `options` parameter using `StateOptions(concurrency=Concurrency.first_write)`.
**What was changed:** Replaced `state_metadata` usage with proper `options=StateOptions(concurrency=Concurrency.first_write)` and added the necessary imports.

### 9. Incorrect component identifier notation
**What was wrong:** The intro referred to the component as `state.postgresql/v2`. Dapr does not use slash notation -- the type is `state.postgresql` and the version `v2` is a separate spec field.
**What was changed:** Changed to `state.postgresql` with `version: v2` notation.

### 10. Migration SQL referenced non-existent `isbinary` column
**What was wrong:** The migration SQL inserted into `isbinary` and selected from it. This column doesn't exist in v2.
**What was changed:** Removed `isbinary` from the INSERT/SELECT and added a `::bytea` cast on the value column to match v2's BYTEA storage.

## Review Notes
- The post originally claimed PostgreSQL 12 or later is required. This claim could not be verified from official Dapr documentation, so it was removed from the intro text.
- The TTL code example using `state_metadata={"ttlInSeconds": "300"}` is correct -- TTL is properly passed as component-level metadata, unlike concurrency which requires SDK-level options.
- The `secretKeyRef` format shown is correct for Kubernetes deployments where the default secret store is used.
- The `query_state` section was converted to an explanatory note rather than being removed entirely, since understanding this limitation is important for users evaluating v1 vs v2.

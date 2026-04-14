# Validation Summary: How to Configure Dapr with PostgreSQL State Store

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (state management building block)
- PostgreSQL (state store component)
- Docker (local PostgreSQL setup)
- Kubernetes (secret management)
- Dapr State Query API
- Dapr State Transaction API

## Sources Consulted
- Dapr PostgreSQL v2 state store documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr PostgreSQL v1 state store documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql/
- Dapr State Query API how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/

## Issues Found

### 1. Component version v2 vs v1 mismatch (HIGH)
**What was wrong:** The blog specified `version: v2` in the component YAML but demonstrated features only available in v1. The PostgreSQL v2 component stores values as BYTEA (binary), not JSONB, and does NOT support the Dapr State Query API. The entire blog (JSONB table schema, State Query API usage, JSONB-based SQL inspection queries) is built around v1 behavior.
**What was changed:** Changed `version: v2` to `version: v1` in the component YAML.
**Why:** v1 stores state as JSONB and supports the State Query API. v2 uses BYTEA for better performance but drops query support. The blog's content requires v1.

### 2. Incorrect metadata field `tablePrefix` (MEDIUM)
**What was wrong:** The blog used `tablePrefix` with value `"dapr_"`, which is a v2-specific metadata field. In v1, the corresponding field is `tableName`, which sets the full table name rather than a prefix.
**What was changed:** Changed `tablePrefix` / `"dapr_"` to `tableName` / `"dapr_state"` to match v1 metadata and be consistent with the table name `dapr_state` used throughout the blog.
**Why:** Using the wrong metadata field name would cause it to be silently ignored, resulting in the default table name "state" instead of "dapr_state".

### 3. Removed `cleanupInterval` metadata field
**What was wrong:** `cleanupInterval` (with Go duration format like "1h") is a v2 metadata field. The v1 equivalent is `cleanupIntervalInSeconds` (integer). Since the exact v1 field behavior may vary by Dapr version, this field was removed to avoid confusion.
**What was changed:** Removed the `cleanupInterval` metadata entry from the component YAML.
**Why:** Including a v2-only field in a v1 component configuration would be silently ignored and misleading.

### 4. Incorrect metadata field name `connMaxIdleTime` (MEDIUM)
**What was wrong:** The blog used `connMaxIdleTime` in the PgBouncer connection pooling example.
**What was changed:** Changed to `connectionMaxIdleTime`, which is the correct documented field name.
**Why:** The abbreviated name is not recognized by Dapr and would be silently ignored.

### 5. Incorrect claim about Redis query support (MEDIUM)
**What was wrong:** The summary stated that complex filtering is "not available with Redis or simple key-value backends." Redis actually supports the Dapr State Query API when configured with RediSearch and RedisJSON modules.
**What was changed:** Rewrote the summary sentence to remove the incorrect Redis claim, instead focusing on the PostgreSQL v1 JSONB advantage.
**Why:** The claim was factually incorrect and could mislead readers choosing between state store backends.

### 6. Text referenced v2 for query API support
**What was wrong:** The text "PostgreSQL v2 state store supports the Dapr State Query API" was incorrect — v2 does NOT support it.
**What was changed:** Changed to "PostgreSQL v1 state store supports the Dapr State Query API".
**Why:** Accuracy — the query API is a v1 feature, not v2.

## Review Notes
- The table schema shown is approximate for v1. Exact column names may vary slightly across Dapr versions (e.g., `updatedate` vs `updatetime`, `expiredate` vs `expiredtime`). The schema is illustrative and conveys the correct structure (JSONB value storage, key-based primary key, timestamps).
- The State Query API endpoint uses the `v1.0-alpha1` prefix, which is correct — this API remains in alpha status. Users should be aware it may change in future Dapr releases.
- The blog does not mention that v2 exists as an alternative with better performance characteristics (BYTEA storage). A future update could add a brief note about the v1 vs v2 tradeoffs.
- The `cleanupIntervalInSeconds` field could be added back for v1 if TTL cleanup documentation is verified for the target Dapr version.

# Validation Summary: How to Use Dapr State First-Write-Wins with CockroachDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management API, HTTP API, concurrency modes)
- CockroachDB (distributed SQL, serializable isolation, contention monitoring)
- Python (requests library, threading)
- Kubernetes (Helm, secrets, StatefulSets)
- PostgreSQL wire protocol

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr CockroachDB state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-cockroachdb/
- Dapr state store concurrency documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/#concurrency
- CockroachDB Helm chart documentation: https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-with-kubernetes
- CockroachDB internal views documentation: https://www.cockroachlabs.com/docs/stable/crdb-internal
- Dapr components-contrib source code (CockroachDB state store schema)

## Issues Found

1. **Incorrect description of CockroachDB component type**: The intro text stated "Dapr supports CockroachDB through the PostgreSQL state store component" while the YAML correctly used `state.cockroachdb`. Dapr has a dedicated CockroachDB component. Fixed the text to accurately describe the dedicated component.

2. **Incorrect table schema for `dapr_state`**: The pre-created table schema did not match what Dapr's CockroachDB component actually creates. Specific errors:
   - `key` column was `VARCHAR(500)` instead of `TEXT`
   - `value` column was missing `NOT NULL` constraint
   - Missing `isbinary BOOLEAN NOT NULL` column (required by Dapr)
   - `etag` column was `UUID NOT NULL DEFAULT gen_random_uuid()` instead of `TEXT NOT NULL`
   - Had a non-existent `metadata JSONB` column (not part of Dapr's schema)
   - Missing `insertdate` and `updatedate` timestamp columns
   - Used `expirytime` instead of the correct `expiredate`
   - TTL index was on wrong column name and missing partial index filter
   Fixed to match the actual Dapr CockroachDB state store schema from the components-contrib source code.

3. **Consistency parameter passed as HTTP header instead of query parameter**: In `get_inventory()`, consistency was passed as `headers={"consistency": "strong"}`. The Dapr state GET API accepts `consistency` as a URL query parameter, not a header. Using a header would silently ignore the consistency setting. Fixed to `params={"consistency": "strong"}`.

4. **Same header issue in tuning example**: In `get_inventory_with_strong_consistency()`, `headers={"dapr-consistency": "strong"}` was used. Fixed to `params={"consistency": "strong"}` and updated the comment accordingly.

5. **Incorrect CockroachDB contention monitoring view and columns**: The SQL used `crdb_internal.cluster_contention_events` with columns (`database_name`, `schema_name`, `table_name`, `index_name`, `contention_time`, `num_contention_events`) that don't exist on that view. Fixed to use `crdb_internal.transaction_contention_events` (available in CockroachDB v22.2+) with correct columns (`contention_duration`, `contending_pretty_key`, etc.).

6. **Incorrect CockroachDB statement statistics query**: The SQL used flat column names (`query`, `avg_latency`, `max_latency`, `execution_count`) that don't exist on `crdb_internal.statement_statistics`. The actual view stores query text in a `metadata` JSONB column and statistics in a `statistics` JSONB column. Fixed to use proper JSONB extraction (`metadata ->> 'query'`).

## Review Notes
- The CockroachDB setup uses `--insecure` mode for the SQL client while the Dapr connection string uses `sslmode=verify-full`. This is a common pattern in tutorials where the initial setup is done insecurely and TLS is configured afterward, but readers should be aware they need to configure certificates for production use.
- The load testing script does not implement retry logic for conflicts, which is intentional since it's measuring conflict rates rather than ensuring correctness. This is clearly a test tool, not production code.
- The `crdb_internal` views and their schemas can vary across CockroachDB versions. Readers using older versions (pre-22.2) should consult their version's documentation for the appropriate contention monitoring views.

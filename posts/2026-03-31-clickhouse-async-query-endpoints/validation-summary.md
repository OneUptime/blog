# Validation Summary: How to Build Async Query Endpoints for ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, `generateUUIDv4`, `LowCardinality`, `DateTime`, `today()`)
- Node.js / Express.js
- `@clickhouse/client` (Node.js client, inferred from `query_params` / `format` / `result.json()` usage)
- `uuid` npm package (v4)
- bash, curl, jq for the client-side examples

## Sources Consulted
- ClickHouse SQL reference (functions, types, MergeTree): https://clickhouse.com/docs/en/sql-reference
- ClickHouse `generateUUIDv4()`: https://clickhouse.com/docs/en/sql-reference/functions/uuid-functions
- ClickHouse `LowCardinality`: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse `today()` and Date arithmetic: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- `@clickhouse/client` Node.js client docs: https://clickhouse.com/docs/en/integrations/language-clients/javascript
- Express.js docs: https://expressjs.com/
- `uuid` npm package: https://www.npmjs.com/package/uuid
- MDN HTTP status codes (202, 409): https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

## Issues Found
No technical issues found.

## Review Notes
- The SQL block is labeled as a ClickHouse table but the adjacent comment suggests "PostgreSQL or Redis in production"; this is aspirational guidance rather than an error. The snippet compiles as valid ClickHouse DDL as-is.
- The `query_text`, `result_rows`, and `error_message` columns defined in the ClickHouse DDL are not populated by the Express example (which uses the in-memory `Map`). This is consistent with the post's note that in-memory storage is a demo and real production would persist to the table or a dedicated store.
- The Express handler fires `runQueryAsync` without `await` — this is intentional fire-and-forget for the 202 Accepted pattern and is correct for the async API described.
- HTTP 409 for "query not yet complete" is defensible but some designs prefer 202 Accepted with the current status. Both are acceptable; the post's choice is not incorrect.
- `result.json()` on the `@clickhouse/client` response returns an array for row-oriented formats like `JSONEachRow`, so `data.length` as the row count is correct.
- For production readiness, the post correctly recommends replacing the in-memory `Map` and mentions Bull / BullMQ for queue management — both are current, maintained libraries.

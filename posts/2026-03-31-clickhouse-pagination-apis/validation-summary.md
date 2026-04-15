# Validation Summary: How to Implement Pagination in ClickHouse APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, parameterized queries, `toDate()`, `count()`, `today()` functions)
- @clickhouse/client (official ClickHouse Node.js client)
- Node.js / Express.js (API route handlers)
- Cursor-based pagination and offset pagination patterns

## Sources Consulted
- ClickHouse official documentation on LIMIT/OFFSET: https://clickhouse.com/docs/en/sql-reference/statements/select/limit
- ClickHouse parameterized queries documentation: https://clickhouse.com/docs/en/interfaces/cli#cli-queries-with-parameters
- @clickhouse/client Node.js client API — cross-referenced with existing blog post in this repo (`posts/2026-01-21-clickhouse-connect-python-nodejs-go/README.md`) which demonstrates the same `client.query()`, `query_params`, `format`, and `.json()` API surface
- ClickHouse date/time functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
1. **Comment URL mismatch (line 65):** The inline comment said `// GET /api/events?cursor=...` but the Express route was registered at `/api/events/stream`. Fixed the comment to `// GET /api/events/stream?cursor=...` so it matches the actual route path.

## Review Notes
- The ClickHouse parameterized query syntax (`{name:Type}`) is used correctly throughout, with appropriate types (`Date`, `UInt32`, `UInt64`, `DateTime`).
- The `@clickhouse/client` API usage (`client.query()`, `query_params`, `format: 'JSONEachRow'`, `result.json()`) is correct and consistent with the official Node.js client.
- The cursor-based pagination logic correctly implements the composite cursor pattern `(event_time, event_id)` with proper tuple comparison for DESC ordering.
- `parseInt(cursorId)` could lose precision for UInt64 values exceeding `Number.MAX_SAFE_INTEGER` (2^53 - 1), but this is a JavaScript limitation and acceptable for typical event ID ranges. Worth noting for extremely large datasets.
- The `data.length === limit` heuristic for `has_more` can produce a false positive on the last page if it happens to contain exactly `limit` rows. This is a well-known and accepted trade-off in cursor pagination, not an error.
- The `count()` query in offset pagination runs in parallel with the data query via `Promise.all`, which is a good performance practice.

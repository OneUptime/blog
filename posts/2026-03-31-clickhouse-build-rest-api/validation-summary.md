# Validation Summary: How to Build a REST API on Top of ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface)
- Node.js
- Express
- `@clickhouse/client` (official ClickHouse JS client)
- dotenv
- TypeScript (dev dependencies listed, though code samples are JS)

## Sources Consulted
- Official ClickHouse JS client repository: https://github.com/ClickHouse/clickhouse-js
- Official ClickHouse JavaScript client docs: https://clickhouse.com/docs/integrations/javascript
- ClickHouse parameterized query syntax documentation (`{name:Type}` placeholders with `query_params`)

## Issues Found
- **Deprecated/removed `host` connection option.** The post initialized the client with `host: process.env.CLICKHOUSE_HOST`, but in current versions of `@clickhouse/client` (v1.0.0+) the connection option was renamed to `url`. Using `host` is no longer supported in the current package. Changed to `url: process.env.CLICKHOUSE_URL || 'http://localhost:8123'` to match the official documentation.

## Review Notes
- The parameterized query syntax (`{paramName:Type}` with `query_params`) is correct per official docs.
- `request_timeout` and `max_open_connections` are valid client options.
- `format: 'JSONEachRow'` returns an array of row objects from `result.json()`; `format: 'JSON'` returns an object containing `data`, `meta`, `rows`, and `statistics` — both usages in the post are consistent with this behavior.
- The `BETWEEN {start_date:DateTime} AND {end_date:DateTime}` parameter usage is valid for ClickHouse.
- The curl example uses `+` for spaces in the query string, which is a valid encoding for `application/x-www-form-urlencoded` query strings.
- Minor inconsistency (not an error): TypeScript/`@types/express`/`ts-node` are installed as dev dependencies in the Setup section, but the code samples are plain JavaScript (`.js`). Either the TS dependencies can be dropped or the samples could be converted to TS; this is a style choice, not a technical error.
- `uniq()` provides an approximate distinct count; `uniqExact()` would be used if exact counts are required. Acceptable for summary metrics.

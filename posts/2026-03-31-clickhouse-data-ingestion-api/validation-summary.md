# Validation Summary: How to Set Up a ClickHouse Data Ingestion API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface on port 8123)
- ClickHouse async inserts
- ClickHouse Buffer table engine
- JSONEachRow format
- curl
- Node.js with `@clickhouse/client`

## Sources Consulted
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse async insert docs: https://clickhouse.com/docs/en/optimize/asynchronous-inserts
- ClickHouse Buffer table engine: https://clickhouse.com/docs/en/engines/table-engines/special/buffer
- ClickHouse JSONEachRow format: https://clickhouse.com/docs/en/interfaces/formats#jsoneachrow
- `@clickhouse/client` Node.js client docs: https://clickhouse.com/docs/en/integrations/language-clients/nodejs
- curl manual (`man curl`) for `-G` / `--data-binary` interaction

## Issues Found

1. **Broken curl command for per-request async insert settings.** The original example combined `-X POST` with `-G -d 'query=...'` and `--data-binary '...'`. Per curl's documentation, `-G` causes all data supplied via `-d`, `--data`, `--data-binary`, or `--data-urlencode` to be appended to the URL as a query string instead of being sent as the request body. That meant the JSON payload would end up in the URL and the POST request body would be empty, so the insert would never receive data. Fixed by removing the `-G -d` construction and folding the `query` parameter directly into the URL query string alongside `async_insert` and `wait_for_async_insert`, keeping `--data-binary` to send the JSON payload in the body.

2. **Deprecated `host` option in the Node.js client config.** The `@clickhouse/client` v1.x configuration uses `url` as the preferred connection option; `host` is a legacy alias. Updated `createClient({ host: ... })` to `createClient({ url: ... })` to match current documentation.

## Review Notes
- The Buffer engine parameter list `(database, table, num_layers, min_time, max_time, min_rows, max_rows, min_bytes, max_bytes)` is correct and matches the official engine signature.
- The async insert settings (`async_insert`, `wait_for_async_insert`, `async_insert_max_data_size`, `async_insert_busy_timeout_ms`) are all valid ClickHouse server/session settings. Byte-sized settings do accept human-readable suffixes like `'10M'` in ClickHouse.
- The Node.js example assumes a helper `readBody(req)` function exists; this is noted implicitly but not defined. Not a technical error for an illustrative snippet.
- The Buffer table engine is useful for bursty traffic but the official ClickHouse docs now generally recommend async inserts over Buffer tables for most new use cases. The post correctly presents both as options.

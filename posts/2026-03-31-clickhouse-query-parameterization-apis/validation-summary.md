# Validation Summary: How to Implement Query Parameterization for ClickHouse APIs

## Status
validated

## Post Type
Tutorial / Security Guide

## Technologies Covered
- ClickHouse HTTP interface (parameterized queries)
- @clickhouse/client (Node.js)
- clickhouse-connect (Python)
- clickhouse-go (Go native driver)
- SQL injection prevention techniques

## Sources Consulted
- ClickHouse HTTP Interface Documentation — https://clickhouse.com/docs/en/interfaces/http
- @clickhouse/client GitHub repository — https://github.com/ClickHouse/clickhouse-js
- clickhouse-connect Python client documentation — https://clickhouse.com/docs/en/integrations/python
- clickhouse-go driver GitHub repository — https://github.com/ClickHouse/clickhouse-go

## Issues Found

1. **Node.js `createClient` option name**: The `host` option in `createClient({ host: 'http://localhost:8123' })` is deprecated in the @clickhouse/client package. Changed to `url`, which is the current API: `createClient({ url: 'http://localhost:8123' })`.

2. **Go driver placeholder syntax**: The original code used `?` positional placeholders with `conn.Query()`, which is only valid for the `database/sql` standard interface, not the native ClickHouse Go driver. The native driver uses `{name:Type}` named placeholders with `clickhouse.Named()` arguments. Updated the example to use named parameters: `clickhouse.Named("event_type", eventType)`, etc.

3. **Summary section inaccuracy**: The summary paragraph incorrectly stated Go uses `?` placeholders. Updated to accurately describe the parameter-passing mechanism for each client: `query_params` (Node.js), `parameters` (Python), and `clickhouse.Named` (Go).

## Review Notes
- The HTTP interface curl example uses `--data-urlencode` for passing `param_*` values in the POST body. While this works in practice, the official ClickHouse documentation more commonly demonstrates `-F` (multipart form) or URL query string parameters. The current approach is functional but not the canonical documented pattern.
- The Python example correctly caps the limit with `min(limit, 10000)`, which is a good defensive practice.
- The dynamic column/table name allowlist pattern is a sound security recommendation.

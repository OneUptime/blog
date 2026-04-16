# Validation Summary: How to Use ClickHouse HTTP Interface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface on port 8123 / HTTPS 8443)
- curl
- Python `requests` library
- Bash / shell scripting
- Output formats: JSON, JSONEachRow, CSV, CSVWithNames, TSV, Parquet
- Gzip compression (request/response)
- ClickHouse parameterized queries (`param_*` URL parameters)
- ClickHouse async inserts (`async_insert`, `wait_for_async_insert`)
- ClickHouse `/ping` endpoint
- ClickHouse OpenSSL `config.xml` for HTTPS
- SQL: `MergeTree`, `LowCardinality`, `DateTime`, `KILL QUERY`

## Sources Consulted
- ClickHouse HTTP Interface docs: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse Formats docs: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse KILL QUERY statement docs: https://clickhouse.com/docs/en/sql-reference/statements/kill
- ClickHouse settings (async_insert, max_execution_time, max_memory_usage) docs

## Issues Found
1. **Invalid `kill_query=1` URL parameter** (original "Query ID and Cancellation" section).
   - The post showed `curl 'http://localhost:8123/?kill_query=1&query_id=my-etl-job-001'` as a way to cancel a running query. No such URL parameter exists in the ClickHouse HTTP interface; the only documented parameter in that space is `replace_running_query`, which replaces (not cancels) queries sharing a `query_id`.
   - **Fix**: Replaced with the canonical `KILL QUERY WHERE query_id='...'` SQL statement sent over HTTP, matching ClickHouse's documented kill mechanism.

## Review Notes
- The listed ClickHouse version in the sample `SELECT version()` output (`24.3.1.2672`) is an older LTS build; the example still holds, but a reader running a current release (25.x) will see a different string. Left as-is since it's illustrative output, not a claim about the current release.
- `X-ClickHouse-User` / `X-ClickHouse-Key` header names and the `user` / `password` / `database` URL parameters are verified against the official HTTP interface documentation.
- The `/ping` endpoint returning `Ok.` with HTTP 200 and a trailing newline is accurate per the docs.
- The `param_<name>=value` URL parameter prefix mapped to `{name: Type}` placeholders is correctly described.
- `async_insert=1&wait_for_async_insert=0` is a valid combination of documented settings.
- The HTTPS `config.xml` snippet uses real elements (`https_port`, `openSSL/server/certificateFile`, `privateKeyFile`, `verificationMode`). `verificationMode: none` is shown as an illustrative minimal setup; production deployments should use a stricter verification mode.
- The Python example imports `json` inside the loop, which works but is stylistically unusual; not a technical error, so left unchanged per the "fix only technical issues" directive.

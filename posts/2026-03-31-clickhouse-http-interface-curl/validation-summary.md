# Validation Summary: How to Use ClickHouse HTTP Interface with cURL

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse HTTP interface
- cURL
- HTTP Basic Authentication
- ClickHouse output formats (JSON, TSV, CSV, JSONEachRow)
- ClickHouse query parameters (`param_` prefix)
- HTTP gzip compression

## Sources Consulted
- ClickHouse HTTP Interface docs: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse Formats docs: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse Queries with Parameters: https://clickhouse.com/docs/en/interfaces/cli#cli-queries-with-parameters

## Issues Found
1. **Compression example was incomplete.** The original example used only `Accept-Encoding: gzip`, but ClickHouse requires the `enable_http_compression=1` URL parameter (or user setting) to actually compress the response body. Without it, the server returns an uncompressed response regardless of the `Accept-Encoding` header. Added `enable_http_compression=1` to the URL and a short sentence clarifying the requirement.

## Review Notes
- Port 8123 default, `/ping` returning `Ok.`, URL-parameter auth, HTTP Basic auth, `default_format`, `database` URL parameter, the `param_`/`{name:Type}` parameterized-query syntax, and the INSERT-with-FORMAT-in-URL pattern all match the official ClickHouse docs.
- The `SELECT version()` and `numbers(N)` table function used in examples are current and correct.
- For production use, the post could optionally note that `Content-Encoding: gzip` (for compressed POST bodies) behaves independently of `enable_http_compression` — but this is beyond the scope of the tutorial and not an error.

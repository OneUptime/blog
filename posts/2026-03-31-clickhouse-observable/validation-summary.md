# Validation Summary: How to Use ClickHouse with Observable

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (HTTP API, SQL, MergeTree engine, query cache, CORS configuration)
- Observable (notebooks, reactive cells, Inputs, Generators)
- Observable Plot (lineY, areaY, barX, ruleY, text marks)
- D3.js (SVG creation, scaleSequential, heatmap rendering)
- JavaScript (fetch API, async/await, NDJSON parsing)
- Node.js (Express, http-proxy-middleware v3)

## Sources Consulted
- ClickHouse HTTP Interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse `compress` vs `enable_http_compression` settings: https://clickhouse.com/docs/en/operations/settings/settings#enable_http_compression
- ClickHouse SQL reference (CREATE USER, GRANT, CREATE SETTINGS PROFILE, MergeTree, TTL): https://clickhouse.com/docs/en/sql-reference
- ClickHouse query cache settings: https://clickhouse.com/docs/en/operations/query-cache
- Observable Plot API reference: https://observablehq.com/plot/
- Observable Inputs API: https://observablehq.com/framework/inputs/select
- D3.js API reference (d3.create, scaleSequential, interpolateBlues): https://d3js.org/
- http-proxy-middleware v3 API: https://github.com/chimurai/http-proxy-middleware

## Issues Found
1. **`compress=1` should be `enable_http_compression=1` in the fetch client** (Line 27): The `compress=1` parameter tells ClickHouse to compress the response using its internal compression format (LZ4 with ClickHouse-specific framing), which is not standard HTTP compression. A browser's `fetch` API cannot decompress this format, resulting in garbled/unparseable responses. Changed to `enable_http_compression=1`, which instructs ClickHouse to use standard HTTP compression (gzip, deflate, br) based on the browser's `Accept-Encoding` header, which browsers handle transparently.

## Review Notes
- The interactive country query uses direct string interpolation (`'${selectedCountry}'`) which is a SQL injection risk in general. In this specific case, the values are constrained by a select input with predefined options, and the post recommends a proxy for production, so it is acceptable for a tutorial context. However, readers should be cautioned against using this pattern with free-text user input.
- The user creation uses `plaintext_password`, which works but is less secure than `sha256_password`. Acceptable for a tutorial demonstrating the concept.
- The CORS configuration, MergeTree table setup, Observable Plot API usage, D3 heatmap code, and http-proxy-middleware v3 `on.proxyReq` syntax are all correct and current.
- ClickHouse array indexing (1-based) in the INSERT statement is correctly handled with `1 + number % N`.
- ClickHouse's `/` operator returns Float64 even for integer operands, so the bounce_rate calculation is correct (unlike PostgreSQL where integer/integer truncates).

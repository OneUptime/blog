# Validation Summary: How to Use External Tables for Query Optimization in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface, SQL)
- ClickHouse External Data / External Tables
- ClickHouse Temporary Tables (Memory engine)
- ClickHouse Dictionaries (HTTP source)
- clickhouse-driver (Python)
- curl

## Sources Consulted
- ClickHouse External Data docs: https://clickhouse.com/docs/engines/table-engines/special/external-data
- ClickHouse HTTP Interface docs: https://clickhouse.com/docs/interfaces/http
- ClickHouse CREATE DICTIONARY sources: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources
- ClickHouse CREATE TABLE (Temporary Tables): https://clickhouse.com/docs/sql-reference/statements/create/table
- clickhouse-driver features: https://clickhouse-driver.readthedocs.io/en/latest/features.html

## Issues Found

1. **First curl example used `--get` with `--data-binary @-`**, which converts the request to GET and URL-encodes the stdin data into the query string. This breaks external data passing, since external data must be sent via POST body. Also, `--data-urlencode` for `_format` and `_structure` is redundant and not canonical.
   - **Fix:** Removed `--get` and `--data-urlencode`, moved `filter_ids_format` and `filter_ids_structure` into the URL query string (the canonical ClickHouse pattern per the External Data docs). The `--data-binary @-` now correctly POSTs the TSV data in the body.

2. **Second curl example used `--form` fields for `target_ids_format` and `target_ids_structure`.** Per the ClickHouse HTTP docs, `name_format` and `name_structure` must be passed as URL query parameters, not as multipart form parts. Only the data file itself is sent as a form field.
   - **Fix:** Moved `target_ids_format` and `target_ids_structure` into the URL query string; kept the file upload via `--form`.

3. **`CREATE DICTIONARY` HTTP source used `FORMAT CSV` (unquoted).** The official docs consistently use a single-quoted string literal for the format name: `FORMAT 'CSV'` / `FORMAT 'CSVWithNames'`.
   - **Fix:** Changed `FORMAT CSV` to `FORMAT 'CSV'`.

## Review Notes
- `CREATE TEMPORARY TABLE ... ENGINE = Memory` is technically redundant since Memory is the default engine for temporary tables, but it is not wrong and is useful as documentation for readers.
- The `clickhouse-driver` Python example is correct: `structure` as a list of `(name, type)` tuples and `data` as a list of row dicts matches the library's API.
- The `system.query_log` columns referenced (`query`, `query_duration_ms`, `read_rows`, `memory_usage`, `type`, `event_date`, `event_time`) are all valid.
- Temporary tables can be joined/filtered but are not replicated and live only for the session — worth noting for readers intending to use them in Distributed contexts, though outside the scope of this post.

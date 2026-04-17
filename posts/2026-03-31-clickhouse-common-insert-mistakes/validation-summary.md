# Validation Summary: Common ClickHouse INSERT Mistakes and How to Fix Them

## Status
validated

## Post Type
Tutorial / Reference (a list of common mistakes with corrective code examples)

## Technologies Covered
- ClickHouse (SQL INSERTs, async inserts, distributed tables, replicated tables)
- ClickHouse HTTP interface
- curl
- gzip compression

## Sources Consulted
- [ClickHouse HTTP Interface](https://clickhouse.com/docs/en/interfaces/http)
- [ClickHouse Settings Reference](https://clickhouse.com/docs/en/operations/settings/settings)
- [ClickHouse Distributed Table Engine](https://clickhouse.com/docs/engines/table-engines/special/distributed)
- [Asynchronous Data Inserts in ClickHouse (official blog)](https://clickhouse.com/blog/asynchronous-data-inserts-in-clickhouse)

## Issues Found
- **Mistake 5 (HTTP curl examples)**: Both curl commands were syntactically broken. They used `--data-binary "INSERT INTO events FORMAT CSV"` together with shell stdin redirection (`< data.csv`) or a piped `gzip` stream. With `--data-binary` taking an explicit string, curl ignores stdin entirely, so neither example would have actually transmitted the CSV payload. Replaced both with the canonical ClickHouse HTTP pattern: pass the `INSERT ... FORMAT CSV` statement via the `?query=` URL parameter and stream the data through `--data-binary @data.csv` (uncompressed) or `--data-binary @-` (compressed via pipe).

## Review Notes
- `async_insert_busy_timeout_ms` shown in Mistake 2 is now an alias for `async_insert_busy_timeout_max_ms` in current ClickHouse versions. The example still works because the alias is preserved, but newer code may want to prefer the explicit `_max_ms`/`_min_ms` settings.
- `insert_distributed_sync` in Mistake 3 has been renamed to `distributed_foreground_insert` in recent ClickHouse releases. The original name continues to work as an alias, so the example remains valid.
- Mistake 1's "at least 1,000 rows or 1 MB" recommendation is on the conservative end of ClickHouse's guidance; some official docs/blog posts now recommend 10,000+ rows per batch for high-throughput workloads. The given threshold is not wrong, just a safe minimum.
- For Mistake 5's compressed-payload example to be accepted, the server must have `enable_http_compression = 1` (it can also be passed per-request via the URL). This caveat is not mentioned in the post but does not make the example incorrect — only the syntax was broken, which is now fixed.

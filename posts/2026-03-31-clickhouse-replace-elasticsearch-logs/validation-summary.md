# Validation Summary: How to Replace Elasticsearch with ClickHouse for Log Analytics

## Status
validated

## Post Type
Migration Guide / Tutorial

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, codecs, TTL, DateTime64)
- Elasticsearch (as the source system being replaced)
- elasticdump (data export tool)
- Fluent Bit (log shipper HTTP output plugin)
- Vector (ClickHouse sink)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse official docs — compression codecs: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse official docs — MergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse official docs — TTL: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse official docs — DateTime64: https://clickhouse.com/docs/sql-reference/data-types/datetime64
- ClickHouse official docs — Interval type: https://clickhouse.com/docs/sql-reference/data-types/special-data-types/interval
- ClickHouse official docs — Aggregate function combinators (countIf): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse official docs — Map type: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse official docs — JSONEachRow format: https://clickhouse.com/docs/interfaces/formats/JSONEachRow
- ClickHouse official docs — Inserting data: https://clickhouse.com/docs/guides/inserting-data
- Fluent Bit docs — HTTP output plugin: https://docs.fluentbit.io/manual/data-pipeline/outputs/http
- Fluent Bit docs — Scheduling and retries: https://docs.fluentbit.io/manual/administration/scheduling-and-retries
- Vector source code and docs — ClickHouse sink (confirmed as built-in stable sink)
- elasticdump GitHub repository: https://github.com/elasticsearch-dump/elasticsearch-dump

## Issues Found
- **Fluent Bit `header` directive casing**: The config used lowercase `header` while all other directives in the block (`Name`, `Match`, `Host`, `Port`, `URI`, `Format`, `Retry_Limit`) were capitalized, and the official Fluent Bit docs use `Header`. While Fluent Bit's classic-mode config keys are case-insensitive so it would still work, the inconsistent casing was fixed to `Header` for consistency with the rest of the config block and the official documentation.

## Review Notes
- The Vector configuration is labeled with a `text` code fence. While not incorrect, using `toml` would provide proper syntax highlighting since Vector config is TOML.
- The `SETTINGS index_granularity = 8192` in the CREATE TABLE statement is the default value, making it redundant. However, including it explicitly is reasonable in a tutorial context to make the setting visible to readers.
- The `Map(String, String)` type with a CODEC is valid but ClickHouse's newer JSON type may offer better performance for semi-structured attributes in observability use cases, as it stores subcolumns independently. This is a future improvement consideration, not an error.
- The `now()` function returns DateTime (DateTime32), not DateTime64, but ClickHouse implicitly promotes it when comparing against DateTime64 columns, so the queries work correctly.

# Validation Summary: How to Use DeltaLake Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (DeltaLake table engine, `deltaLakeLocal` table function, named collections, `system.query_log`)
- Delta Lake (transaction log `_delta_log`, Parquet files, snapshot versions)
- Amazon S3 (as Delta Lake storage backend)
- SQL (ClickHouse dialect)

## Sources Consulted
- [DeltaLake table engine — ClickHouse Docs](https://clickhouse.com/docs/engines/table-engines/integrations/deltalake)
- [deltaLake table function — ClickHouse Docs](https://clickhouse.com/docs/sql-reference/table-functions/deltalake)
- [PR #85295: Delta lake: supports reads at specific snapshot version](https://github.com/ClickHouse/ClickHouse/pull/85295)
- [PR #91818: Fix delta lake setting delta_lake_snapshot_version](https://github.com/ClickHouse/ClickHouse/pull/91818)
- [PR #79781: Add support for querying local filesystem-mounted delta tables via `deltaLakeLocal`](https://github.com/ClickHouse/ClickHouse/pull/79781)
- [ClickHouse Release 25.9 notes](https://clickhouse.com/blog/clickhouse-release-25-09)
- [Consuming the Delta Lake CDF for CDC — ClickHouse Blog](https://clickhouse.com/blog/consuming-delta-lake-change-data-feed-cdc)
- [system.query_log — ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/query_log)

## Issues Found

1. **Incorrect time travel setting name and version.** The post stated that "ClickHouse 24.1+ supports the `delta_lake_version` setting." The actual setting is named `delta_lake_snapshot_version` and was introduced in ClickHouse 25.x (PR #85295 merged August 2025; bug fix backport to 25.9 via PR #91818). Changed the prose to "ClickHouse 25.9+ supports the `delta_lake_snapshot_version` setting" and updated the `SETTINGS` clause to use `delta_lake_snapshot_version = 5`.

2. **Incorrect named-collection syntax.** The post used `ENGINE = DeltaLake(named_collection = my_s3, url = '...')`, which is not valid ClickHouse syntax. Named collections are referenced positionally with optional keyword overrides. Rewrote as `ENGINE = DeltaLake(my_s3, url = 's3://my-data-lake/orders/')`, matching the documented pattern used across ClickHouse integration engines.

3. **Local Delta Lake example used the wrong interface.** The post showed `ENGINE = DeltaLake('/var/lib/clickhouse/user_files/orders/')` for local filesystem data. The `DeltaLake` table engine only supports S3, GCS, and Azure per the official docs; local filesystem Delta Lake tables are read via the `deltaLakeLocal` table function (PR #79781). Replaced the example with a `SELECT ... FROM deltaLakeLocal(...)` query and adjusted the surrounding prose accordingly.

4. **Invalid filter on `system.query_log.tables`.** The original monitoring query used `tables LIKE '%delta_orders%'`. The `tables` column is an `Array(LowCardinality(String))`, and `LIKE` is not defined on arrays in ClickHouse. Replaced with `has(tables, 'default.delta_orders')`, which is the idiomatic ClickHouse way to test array membership.

## Review Notes
- The `Prerequisites` section lists "ClickHouse 23.3 or later." The engine actually landed in 22.11 as read-only, but 23.3 is a safe lower bound given subsequent stability fixes and named-collection support, so this was left unchanged.
- `DESCRIBE TABLE` in ClickHouse returns columns named `name`, `type`, `default_type`, `default_expression`, `comment`, `codec_expression`, and `ttl_expression`. The post shows illustrative `Column | Type | Comment` headers in a `text` block, which is a cosmetic summary rather than literal CLI output; left as-is since it is not presented as verbatim terminal output.
- Writes to Delta Lake via the ClickHouse engine are supported starting in v25.10 per the upstream docs; the post's claim that the engine is read-only is accurate for earlier versions but will become dated for users on 25.10+. Worth noting in a future revision.
- `PREWHERE` pushdown behavior on the `DeltaLake` engine has been improved incrementally (e.g., partition pruning in PR #78486). The performance tip is directionally correct for recent versions.

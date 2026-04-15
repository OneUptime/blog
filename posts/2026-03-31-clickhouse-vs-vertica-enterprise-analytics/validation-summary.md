# Validation Summary: ClickHouse vs Vertica for Enterprise Analytics

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- ClickHouse (columnar OLAP database)
- Vertica (enterprise MPP columnar database)
- SQL (ClickHouse dialect)
- Compression codecs (ZSTD, LZ4, DoubleDelta, Gorilla)
- ClickHouse MergeTree engine
- ClickHouse RBAC (SETTINGS PROFILE)

## Sources Consulted
- ClickHouse documentation: date functions (`toYear`, `toYYYYMM`) - https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation: aggregate functions (`quantile`) - https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse documentation: column codecs (DoubleDelta, Gorilla, ZSTD) - https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse documentation: `CREATE SETTINGS PROFILE` - https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse documentation: `LowCardinality` type - https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse licensing (Apache 2.0) - https://github.com/ClickHouse/ClickHouse/blob/master/LICENSE
- Vertica documentation: Resource Pools and workload management - https://www.vertica.com/docs/latest/HTML/Content/Authoring/AdministratorsGuide/ResourceManager/ResourcePools.htm
- Vertica Community Edition limits (3 nodes / 1TB) - https://www.vertica.com/landing-page/start-your-free-trial-today/
- Vertica history: HP acquisition (2011), Micro Focus, OpenText acquisition (2023)

## Issues Found
- **`wlm_query_params` incorrectly attributed to Vertica (line 66)**: The post stated Vertica has "resource pools, priority queuing, and wlm_query_params." The term `wlm_query_params` is an Amazon Redshift WLM (Workload Management) concept, not a Vertica feature. Vertica's workload management is built around resource pools, query prioritization (via resource pool priority settings), and query budgeting. Changed to "resource pools, query prioritization, and query budgeting."

## Review Notes
- All ClickHouse SQL examples are syntactically correct and use current, non-deprecated features.
- The `quantile(0.95)(order_value)` syntax correctly uses ClickHouse's parametric aggregate function notation.
- The codec chains (DoubleDelta + ZSTD for timestamps, Gorilla + ZSTD for floats) are idiomatic ClickHouse usage.
- The `CREATE SETTINGS PROFILE` statement is valid ClickHouse RBAC syntax.
- The Vertica history (MIT origins, HP, Micro Focus, OpenText) is accurate.
- The Community Edition limits (3 nodes / 1TB) are correct.
- The comparison is balanced and the "when to choose" recommendations are reasonable.

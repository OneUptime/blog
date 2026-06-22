# Validation Summary: How to Design ClickHouse Table Schemas for Time-Series Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- MergeTree table engines
- Time-series schema design
- Partitioning
- ORDER BY and primary keys
- LowCardinality, Map, DateTime, DateTime64, Decimal, Enum, and numeric data types
- Compression codecs
- Data skipping indexes
- TTL rules
- ClickHouse system tables

## Sources Consulted
- ClickHouse MergeTree table engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse primary key and query optimization guide: https://clickhouse.com/docs/optimize/query-optimization
- ClickHouse partitioning key best practices: https://clickhouse.com/docs/optimize/partitioning-key
- ClickHouse LowCardinality data type documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse Map data type documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse DateTime and DateTime64 data type documentation: https://clickhouse.com/docs/sql-reference/data-types/datetime and https://clickhouse.com/docs/sql-reference/data-types/datetime64
- ClickHouse Decimal data type documentation: https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse data compression and codec documentation: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse data skipping indexes documentation: https://clickhouse.com/docs/optimize/skipping-indexes and https://clickhouse.com/docs/optimize/skipping-indexes/examples
- ClickHouse TTL guide: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse CREATE TABLE statement documentation: https://clickhouse.com/docs/sql-reference/statements/create/table

## Issues Found
- The TTL example showed two alternative table-level `TTL` clauses inside one `CREATE TABLE` statement. ClickHouse supports a table-level TTL clause at the end of the table definition, with multiple TTL rules combined in that clause when needed. I changed the first TTL into the active example and commented the second alternative so the snippet is syntactically coherent.
- The ORDER BY verification explanation said ClickHouse could locate the "exact data range instantly." MergeTree primary indexes are sparse and work at granule/range level, so I changed this to "narrow the data ranges efficiently."
- The "Too Many Columns in ORDER BY" example claimed a long key causes "poor compression." ClickHouse documentation notes that additional primary-key columns can improve compression, while long primary keys can increase insert cost and memory use. I updated the comment to describe the real tradeoff.

## Review Notes
No further blocking technical issues found. Some recommendations remain workload-dependent, especially partition granularity, codec choice, and skip-index usefulness; the post already frames these as design choices to validate against query patterns.

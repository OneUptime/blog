# Validation Summary: How to Run Your First ClickHouse Benchmark

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- clickhouse-benchmark (built-in benchmarking tool)
- clickhouse-client
- ClickBench (standard benchmark dataset)
- system.query_log (ClickHouse system table)

## Sources Consulted
- ClickHouse official documentation for clickhouse-benchmark: https://clickhouse.com/docs/en/operations/utilities/clickhouse-benchmark
- ClickBench GitHub repository: https://github.com/ClickHouse/ClickBench
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found
1. **Incorrect dataset size claim**: The post stated ClickBench has "100GB of web analytics data." The dataset actually contains ~100 million rows. The compressed CSV is ~16 GB and the uncompressed CSV is ~70 GB. Changed to "100 million rows of web analytics data."

2. **Incorrect ClickBench queries URL**: The post referenced `https://raw.githubusercontent.com/ClickHouse/ClickBench/main/queries.sql`, which does not exist. The ClickBench repo organizes queries by database system in subdirectories. Changed to `https://raw.githubusercontent.com/ClickHouse/ClickBench/main/clickhouse/queries.sql`.

3. **Incorrect syntax for passing ClickHouse settings**: The post used `-- --max_threads=8` with a `--` separator to pass ClickHouse settings to clickhouse-benchmark. The official documentation shows that settings are passed as regular flags (e.g., `--max_threads=8`) without a `--` separator. Removed the extraneous `--` separator.

## Review Notes
- The sample output shown is a simplified/prettified representation. The actual clickhouse-benchmark output shows latency in seconds (not milliseconds) and uses a different format (e.g., `50.000%    0.148 sec.` rather than `p50=28.1`). This is acceptable since the post labels it as "Sample output" and the intent is illustrative, but readers running the tool will see a different format.
- The CREATE TABLE statement uses `...` as a placeholder for remaining columns, which is appropriate for a tutorial to avoid overwhelming the reader, but readers will need to refer to the full ClickBench schema for the actual table definition.

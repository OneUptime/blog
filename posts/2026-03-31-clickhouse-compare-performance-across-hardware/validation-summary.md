# Validation Summary: How to Compare ClickHouse Performance Across Hardware

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (clickhouse-client, clickhouse-benchmark, clickhouse-local)
- ClickBench dataset (hits_compatible)
- Linux hardware inspection utilities (lscpu, free, df, lsblk)
- Bash scripting
- SQL (ClickHouse system tables)

## Sources Consulted
- ClickHouse official documentation — `system.metric_log` schema (https://clickhouse.com/docs/en/operations/system-tables/metric_log)
- ClickHouse client documentation — CLI flags and settings (https://clickhouse.com/docs/en/interfaces/cli)
- `clickhouse-benchmark` documentation (https://clickhouse.com/docs/en/operations/utilities/clickhouse-benchmark)
- `clickhouse-local` documentation (https://clickhouse.com/docs/en/operations/utilities/clickhouse-local)
- ClickBench repository and datasets.clickhouse.com (https://github.com/ClickHouse/ClickBench)

## Issues Found
1. **Invalid dataset URL**: The post referenced `https://datasets.clickhouse.com/hits_compatible/hits_10m.csv.gz`, which returns HTTP 404. ClickBench publishes the full 100M-row file as `hits.csv.gz` (and `.tsv.gz`, `.json.gz`, `.parquet` variants); there is no 10M preset. Fixed by replacing with `hits.csv.gz` and updating the subsequent `gunzip`/`INSERT` lines to match.
2. **Incorrect `system.metric_log` column names**: The SQL query referenced bare `OSCPUVirtualTimeMicroseconds` and `MemoryTracking`. In `system.metric_log`, ProfileEvents are stored with a `ProfileEvent_` prefix and CurrentMetrics with a `CurrentMetric_` prefix. Fixed to `ProfileEvent_OSCPUVirtualTimeMicroseconds` and `CurrentMetric_MemoryTracking`.
3. **Invalid `--` separator before settings**: Both the thread-count sweep and memory sweep used `-- --max_threads=$THREADS` / `-- --max_memory_usage=...`. `clickhouse-client` accepts ClickHouse settings directly as long options (`--max_threads=N`), and the extra `--` separator is not valid syntax. Removed the separator in both loops.
4. **Comment/flag mismatch**: The benchmark snippet had a comment "Run 3 iterations per query, take median" above `--iterations 30`. Updated the comment to reflect 30 iterations so it matches the actual flag.

## Review Notes
- `clickhouse local` and `clickhouse-local` are both valid invocation forms (subcommand and symlink of the same binary). No change needed.
- `--time` / `-t` on `clickhouse-client` is valid and prints elapsed time to stderr in non-interactive mode — correct as used.
- `--format Null` is a valid output format that discards output (useful for benchmarking) — correct as used.
- The comparison numbers (GB/s, cost/month) are illustrative examples and not verifiable as absolute truth, but they are within realistic ranges for the hardware tiers cited.
- Schema definition in the CREATE TABLE example is elided with `(...)` — readers will need to supply a real schema (e.g., the ClickBench `hits` schema) when running this themselves.

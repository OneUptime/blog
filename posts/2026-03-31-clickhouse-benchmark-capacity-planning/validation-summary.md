# Validation Summary: How to Benchmark Before Capacity Planning for ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server, client, benchmark tool)
- Docker
- S3 table function
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse clickhouse-benchmark docs: https://clickhouse.com/docs/operations/utilities/clickhouse-benchmark
- ClickHouse s3 table function docs: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse random functions docs: https://clickhouse.com/docs/sql-reference/functions/random-functions
- ClickHouse operators docs: https://clickhouse.com/docs/sql-reference/operators
- ClickHouse Benchmark.cpp source: https://github.com/ClickHouse/ClickHouse/blob/master/programs/benchmark/Benchmark.cpp
- ClickHouse Docker image: https://hub.docker.com/r/clickhouse/clickhouse-server

## Issues Found
1. **Multiple `--query` flags in clickhouse-benchmark** — The original example passed two `--query` flags to `clickhouse-benchmark`. The tool's `--query` option is defined as `value<std::string>()` (single value, not multitoken), so only the last `--query` would actually be benchmarked. Fixed by switching to the standard stdin heredoc pattern (`<<EOF ... EOF`), which is the documented approach for benchmarking multiple queries.

## Review Notes
- The "Sample output" block for `clickhouse-benchmark` is a simplified/illustrative format, not the tool's literal output (which prints per-endpoint lines plus full percentile rows 0%–99.99% in seconds). It is clearly labeled as "Sample output" and is acceptable as a didactic summary.
- The scaling math ("50/10 = 5x more concurrency → 10 nodes") is a rough linear-scaling approximation that also implicitly assumes the p95 latency target will be met with more nodes. The post acknowledges this caveat with "(adjust with actual core scaling tests)".
- `now() - rand() % 86400` is correct — `%` has higher precedence than `-` in ClickHouse, so this evaluates as `now() - (rand() % 86400)` producing a DateTime up to 24 h in the past.
- The `s3('url', 'KEY', 'SECRET', 'Parquet')` positional form is valid per the s3 table function signature.
- `clickhouse/clickhouse-server:latest` is a valid published image; for production benchmarks users should pin to a specific tag matching production, which the post implicitly recommends ("same ClickHouse version").

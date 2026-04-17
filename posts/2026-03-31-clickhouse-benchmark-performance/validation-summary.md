# Validation Summary: How to Benchmark ClickHouse Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- `clickhouse-benchmark` CLI tool
- `clickhouse-client` CLI tool
- ClickHouse system tables (`system.parts`, `system.query_log`)
- SQL (ClickHouse dialect)
- Linux `/proc/sys/vm/drop_caches` for page cache flushing

## Sources Consulted
- [clickhouse-benchmark documentation](https://clickhouse.com/docs/en/operations/utilities/clickhouse-benchmark)
- [system.parts documentation](https://clickhouse.com/docs/en/operations/system-tables/parts)
- [ClickHouse tests/performance README](https://github.com/ClickHouse/ClickHouse/blob/master/tests/performance/README.md)
- [ClickHouse perf.py source](https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/tests/performance/scripts/perf.py)

## Issues Found
1. **Incorrect `--delay` description**: The post described `--delay` as "seconds between iterations (default 1)". Per official docs, the flag is the interval in seconds between intermediate reports (default 1, set 0 to disable), not the delay between query iterations. Corrected.
2. **Invalid `system.parts` column**: The insert-throughput query referenced `bytes_compressed_on_disk`, which does not exist in `system.parts`. The correct column for total on-disk part size is `bytes_on_disk` (with `data_compressed_bytes` being the compressed-data-only measurement). Changed to `bytes_on_disk` to match the `formatReadableSize` intent of "total on-disk size".
3. **Incorrect `perf.py` invocation and framing**: The post claimed `python3 perf.py --run-benchmarks` run from `ClickHouse/tests/performance` executes the "Star Schema Benchmark". This is wrong on three counts: (a) the script lives at `tests/performance/scripts/perf.py`, (b) no `--run-benchmarks` flag exists — the script takes a positional XML test-description file and flags like `--runs`, and (c) these are ClickHouse's own XML-defined performance tests, not the Star Schema Benchmark. Rewrote the example to show the correct path, dependency install, and a real invocation against an XML test file.

## Review Notes
- The `SYSTEM DROP MARK CACHE` and `SYSTEM DROP UNCOMPRESSED CACHE` statements are valid ClickHouse commands.
- The `system.query_log` columns (`query`, `query_duration_ms`, `type`, `event_time`) are correct.
- The `clickhouse-benchmark` flags `--iterations`, `--concurrency`, and `--randomize` are all valid.
- The piping of SQL into `clickhouse-benchmark` via `echo` or `cat` is the standard documented usage.
- The insert example uses `now() - rand() % 86400` — note `rand()` returns a `UInt32`, so the modulo works, but readers should be aware the arithmetic produces a `DateTime` in the past day.

# Validation Summary: How to Use clickhouse-benchmark Tool

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- clickhouse-benchmark CLI utility
- Bash shell usage (pipes, redirection)
- ClickHouse query settings (max_threads)

## Sources Consulted
- [ClickHouse Docs: clickhouse-benchmark](https://clickhouse.com/docs/operations/utilities/clickhouse-benchmark)
- Community examples of clickhouse-benchmark output (ChistaData, Altinity, Sentry engineering blog posts)

## Issues Found
1. **Incorrect `--duration` flag.** The post used `--duration 60` for time-limited runs. ClickHouse's official flag is `--timelimit` (alias `-t`). Changed `--duration 60` to `--timelimit 60` in the "Running a Duration-Based Test" section.
2. **Incorrect `-- --max_threads=N` separator syntax.** The post used a bare `--` separator before `--max_threads=N`. Per the official documentation, session settings are passed directly as `--<setting>=VALUE` flags on the `clickhouse-benchmark` command, with no `--` separator. Removed the stray `--` separator in the two `max_threads` examples.
3. **Unrealistic output format.** The "Output Format" section showed percentiles in `ms` and only 7 percentile rows, and omitted `result RPS` / `result MiB/s` from the summary line. The real tool prints latencies in `sec.`, shows 14 percentile rows (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 99.9, 99.99), and includes `result RPS` and `result MiB/s` in the summary. Updated the sample output to reflect the actual format.

## Review Notes
- The `< queries.sql` stdin redirection pattern is correct; when `--query` is omitted, `clickhouse-benchmark` reads queries from stdin (one per line, terminated by `;`).
- All other flags (`--iterations`, `--concurrency`, `--query`, `--host`, `--port`, `--user`, `--password`, `--database`) are correct and match the current ClickHouse documentation.
- The Summary paragraph's mention of "duration" is generic prose (not referring to the flag name), so no change was needed there.

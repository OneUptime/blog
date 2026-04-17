# Validation Summary: How to Use clickhouse-benchmark for Load Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (database)
- `clickhouse-benchmark` CLI utility
- ClickHouse SQL (`system.processes`, `system.query_log`, query cache settings)
- Bash shell scripting (pipes, redirection, heredocs)
- Python 3 (for generating INSERT query fixtures)
- `jq` (mentioned originally — section reworked, see Issues)

## Sources Consulted
- Official ClickHouse utility reference: https://clickhouse.com/docs/en/operations/utilities/clickhouse-benchmark
- ClickHouse source: `programs/benchmark/Benchmark.cpp` on GitHub (https://github.com/ClickHouse/ClickHouse/blob/master/programs/benchmark/Benchmark.cpp) — boost::program_options declarations for actual flag names/aliases
- ClickHouse packaging manifest: `packages/clickhouse-client.yaml` (confirms `clickhouse-benchmark` ships in `clickhouse-client`)
- ClickHouse query cache docs: https://clickhouse.com/docs/en/operations/query-cache (verified `use_query_cache`, `query_cache_ttl` setting names)
- ClickHouse system tables docs (verified `system.processes` / `system.query_log` columns)

## Issues Found
1. **`--query-file` flag does not exist.** The post used `--query-file /tmp/bench_queries.sql` in four places. `clickhouse-benchmark` only accepts queries via stdin or via `--query` / `-q`. Replaced each occurrence with stdin redirection (`< /tmp/bench_queries.sql`) and updated the "Running from a Query File" lead-in to say queries are read from stdin. Also removed the `--query-file` row from the Key Flags table.
2. **`--json` flag does not exist.** The "JSON Output for Automated Processing" section showed `--json` producing a JSON file to be parsed with `jq '.statistics.query_time_percentiles'`. `clickhouse-benchmark` does not emit JSON — grepping the source produced zero matches for any `json` option. Renamed the section to "Capturing Output for Automated Processing" and replaced the example with the correct pattern: the utility writes reports to stderr, so redirecting `2>` captures them. Also removed the `--json` row from the Key Flags table.
3. **`--continue-on-errors` (with hyphens) is not accepted.** The flag is declared in the source as `ignore-error,continue_on_errors` — i.e., the canonical name is `--ignore-error` and the alias uses underscores: `--continue_on_errors`. Boost::program_options does not normalize hyphens to underscores, so `--continue-on-errors` would be rejected. Changed to `--continue_on_errors` in the Stress Testing example and in the Key Flags table (added a note that it is an alias of `--ignore-error`).
4. **Key Flags table cleanup.** While correcting 1–3, added rows for `--query`/`-q` (inline query, the correct alternative to a query file) and `--randomize` (a real, useful option), keeping the table the same size.

## Review Notes
- The "Comparing Two Configurations" section uses `echo "…" | clickhouse-benchmark … --query="…"`. When `--query` is supplied, stdin is ignored, so the `echo` on the left of the pipe is redundant. This is not technically wrong (it still runs the `--query` value at the configured concurrency) so it was left as-is, but the author could simplify by dropping the `echo | ` prefix.
- The post's sample output shows a percentile line at `99.990%`. The real utility also emits `99.900%` and `99.990%` lines; this is consistent.
- `use_query_cache` and `query_cache_ttl` are real ClickHouse settings (query cache was introduced in 23.1). They only function on ClickHouse 23.1+; readers on older versions will see `Unknown setting` errors. Not called out in the post — acceptable given the post targets current ClickHouse.
- `clickhouse-benchmark`'s `--iterations 0` default (run forever) is correctly documented. The post's `/usr/bin/clickhouse-benchmark` path assumes a Debian/RPM install; on other setups the binary could live elsewhere. Minor, left as-is.
- The Python INSERT generator writes one statement per line, which matches `clickhouse-benchmark`'s one-query-per-line stdin format — correct.

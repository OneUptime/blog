# Validation Summary: How to Calculate `pg_stat_statements` Rates Without False Spikes After Statistics Resets

## Status

validated

## Post Type

Operational monitoring guide

## Technologies Covered

- PostgreSQL 16, 17, and 18
- `pg_stat_statements` and `pg_stat_statements_info`
- PostgreSQL SQL window functions and timestamp functions
- Prometheus counters, gauges, labels, `rate()`, and `increase()`
- Reset-aware per-query performance monitoring

## Sources Consulted

- [PostgreSQL 18 `pg_stat_statements` documentation](https://www.postgresql.org/docs/18/pgstatstatements.html)
- [PostgreSQL 17 `pg_stat_statements` documentation](https://www.postgresql.org/docs/17/pgstatstatements.html)
- [PostgreSQL 16 `pg_stat_statements` documentation](https://www.postgresql.org/docs/16/pgstatstatements.html)
- [PostgreSQL 17 release notes](https://www.postgresql.org/docs/17/release-17.html)
- [PostgreSQL date/time functions](https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)
- [PostgreSQL `pg_database` catalog](https://www.postgresql.org/docs/18/catalog-pg-database.html)
- [PostgreSQL cumulative statistics behavior](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL `compute_query_id` configuration](https://www.postgresql.org/docs/18/runtime-config-statistics.html#GUC-COMPUTE-QUERY-ID)
- [PostgreSQL window functions](https://www.postgresql.org/docs/17/functions-window.html)
- [Upstream PostgreSQL 18 `pg_stat_statements` source](https://github.com/postgres/postgres/blob/REL_18_STABLE/contrib/pg_stat_statements/pg_stat_statements.c)
- [Prometheus `rate()` and `increase()` functions](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus data model and time-series identity](https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels)
- [Prometheus staleness behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/#labels)
- [Prometheus instrumentation and label-cardinality guidance](https://prometheus.io/docs/practices/instrumentation/#do-not-overuse-labels)

## Issues Found

- The post treated `pg_stat_statements` as database-local and instructed collectors to query every database, which would duplicate server-wide rows. It now instructs collectors to sample once per PostgreSQL instance and joins `pg_database` through `s.dbid` instead of incorrectly labeling every row with `current_database()`.
- `clock_timestamp()` could assign different times to rows from one collection statement. It was replaced with `statement_timestamp()` so one scrape has one timestamp, and the post now says to collect the one-row `pg_stat_statements_info` view separately so module telemetry is retained when no statement entries exist.
- The collector privilege requirement was missing. The post now requires a superuser or privileges of `pg_read_all_stats`, because otherwise other users' `queryid` values are null and unrelated rows can collapse into the same series partition.
- The rate SQL described continuity generations later in the post but did not store or partition by one, and ordering by wall-clock time could hide a clock regression or make timestamp ties nondeterministic. The example is now explicitly PostgreSQL 17+, stores a monotonic `scrape_seq` and non-null `generation`, orders by the sequence, and partitions by the generation.
- The disappearance rule did not distinguish an entry absent from a successful scrape from a wholly failed scrape. The generation conditions now make that distinction while still allowing an explicitly permitted whole-scrape gap to use the real elapsed time.
- Before PostgreSQL 17, an entry can be evicted and recreated between scrapes without an observed absence or counter decrease. The post now advises rejecting all legacy per-entry deltas for an interval in which the global `dealloc` value changes when false rates are unacceptable.
- The initial reset list omitted the documented behavior when `pg_stat_statements.save` is disabled. It now notes that statistics are also lost across a restart in that configuration.
- The Prometheus discussion overstated `rate()` reset handling. It now explains that `rate()` calculates across an observed decrease, cannot detect reset-and-rebound, and cannot distinguish a recreated entry that reuses the same label set; it prescribes an epoch label or collector-validated rate gauge for strict continuity.
- The post called per-query labels bounded and keyed query-text metadata by `queryid` alone. It now notes that `pg_stat_statements.max` bounds current entries rather than Prometheus series accumulated over time, requires an explicit cardinality budget, and keys text by the complete entry identity and generation.

## Review Notes

- After correction, the SQL is syntactically and dimensionally valid for PostgreSQL 17 and later when the installed extension schema exposes `stats_since`.
- PostgreSQL 16 and earlier cannot automatically detect every selective reset that rebounds between scrapes; the post correctly retains the requirement for out-of-band reset telemetry or conservative invalidation.
- With the default `pg_stat_statements.save = on`, a clean restart can preserve statement statistics. Starting a new collector generation at every restart remains a safe, conservative policy.
- All external documentation links in the post resolved to the intended official PostgreSQL and Prometheus pages.

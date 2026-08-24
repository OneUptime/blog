# Validation Summary: How to Bound `mysqld_exporter` Query-Digest Cardinality with Statement Limits and Time Windows

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- MySQL Performance Schema
- Prometheus Community `mysqld_exporter` 0.19.0
- Prometheus and PromQL
- MySQL SQL and status/system variables
- Query digests and time-series cardinality

## Sources Consulted

- [Prometheus Community `mysqld_exporter` v0.19.0 release notes](https://github.com/prometheus/mysqld_exporter/releases/tag/v0.19.0)
- [`perf_schema.eventsstatements` collector source in `mysqld_exporter` v0.19.0](https://github.com/prometheus/mysqld_exporter/blob/v0.19.0/collector/perf_schema_events_statements.go)
- [`mysqld_exporter` v0.19.0 README and supported versions](https://github.com/prometheus/mysqld_exporter/blob/v0.19.0/README.md)
- [MySQL 8.4 statement digests and normalization](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-digests.html)
- [MySQL 8.4 statement summary tables and digest-row lifecycle](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)
- [MySQL 8.4 Performance Schema system variables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-system-variables.html)
- [MySQL 8.4 Performance Schema status variables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-status-variables.html)
- [MySQL 8.4 Performance Schema persistence behavior](https://dev.mysql.com/doc/refman/8.4/en/performance-schema.html)
- [MySQL 8.0.28 release notes for `SUM_CPU_TIME`](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-28.html)
- [MySQL 8.4 `SHOW STATUS` syntax](https://dev.mysql.com/doc/refman/8.4/en/show-status.html)
- [MySQL 8.4 `SHOW VARIABLES` syntax](https://dev.mysql.com/doc/refman/8.4/en/show-variables.html)
- [Prometheus metric relabeling configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus staleness behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [Prometheus storage and retention](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus `rate()`, `increase()`, and counter-reset handling](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus aggregation operators, including `count()`](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)
- [Prometheus automatically generated scrape metrics, including `scrape_series_added`](https://prometheus.io/docs/concepts/jobs_instances/)

## Issues Found

- The configuration used `exclude_schemas` without identifying its minimum exporter version. Added that the flag requires `mysqld_exporter` 0.19.0 or later because it was introduced in that release and older binaries reject it.
- The metric-relabeling paragraph said dropping `digest_text` could reduce “payload,” which could incorrectly imply a smaller exporter response. Clarified that metric relabeling occurs after scraping: it can reduce stored and remote-written label bytes and downstream exposure, but not the exporter's HTTP response.
- The MySQL full-table behavior referred imprecisely to a row whose “digest fields” are null. Replaced this with the documented behavior: the catch-all row has `SCHEMA_NAME` and `DIGEST` set to `NULL`.
- The retention discussion implied that disappeared series remain active until retention. Clarified that Prometheus marks them stale for instant queries while retaining their historical samples until retention cleanup.
- The post implied that PromQL `count()` could measure newly observed series. Clarified that `count(...)` measures currently queryable series and that the target-level `scrape_series_added` metric provides the approximate number of new series in a scrape.
- The counter-reset guidance implied that a decrease could become a spike even when using reset-aware PromQL. Replaced it with accurate guidance that `rate()` and `increase()` adjust for detectable counter resets, with known restart or truncation windows excluded only when exact interval accounting is required.
- The version caveat could imply that version-gated fields control whether metric series are emitted. Clarified the narrower implementation behavior: the collector selects `SUM_CPU_TIME` only for Oracle MySQL 8.0.28 or later.

## Review Notes

- All SQL queries and `SHOW` statements are syntactically valid for MySQL 8.4.
- The v0.19.0 collector source confirms the three stated defaults, repeatable schema exclusion, built-in schema exclusions, strict `LAST_SEEN` freshness filter, cumulative `SUM_TIMER_WAIT` ranking, row limit, and `schema`/`digest`/`digest_text` labels.
- On the older-MySQL and MariaDB collector path, the current exporter still emits lock-time and CPU-time series with zero values and emits zero latency-quantile samples because it does not read those source fields on that path.
- `COUNT(DISTINCT SCHEMA_NAME)` follows SQL null semantics and does not count a `NULL` no-default-schema or catch-all bucket as a distinct schema.
- The post's collector-source link follows the mutable `main` branch. Pinning documentation links to the deployed exporter tag would improve long-term reproducibility, but the existing link is valid.

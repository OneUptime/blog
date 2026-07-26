# Validation Summary: How to Diagnose Slow Queries with the Slow Log, Performance Schema, and PMM

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Percona Server for MySQL 5.7, 8.0, and 8.4
- MySQL 8.4
- MySQL slow query log
- Percona Server extended slow query log
- MySQL Performance Schema
- Percona Monitoring and Management (PMM) 3 Query Analytics
- Percona Toolkit `pt-query-digest`
- MySQL `EXPLAIN FORMAT=TREE` and `EXPLAIN ANALYZE`

## Sources Consulted

- [Percona Server for MySQL 8.4: Slow query log](https://docs.percona.com/percona-server/8.4/slow-extended.html)
- [PMM 3: Connect MySQL databases to PMM](https://docs.percona.com/percona-monitoring-and-management/3/install-pmm/install-pmm-client/connect-database/mysql/mysql.html)
- [PMM 3: Add databases with pmm-admin](https://docs.percona.com/percona-monitoring-and-management/3/use/commands/pmm-admin/add.html)
- [PMM 3: About Query Analytics](https://docs.percona.com/percona-monitoring-and-management/3/use/qan/index.html)
- [PMM 3: QAN Stored metrics](https://docs.percona.com/percona-monitoring-and-management/3/use/qan/QAN-stored-metrics.html)
- [PMM 3: QAN Stored metrics Details panel](https://docs.percona.com/percona-monitoring-and-management/3/use/qan/panels/details.html)
- [PMM 3: Stored metrics for MySQL](https://docs.percona.com/percona-monitoring-and-management/3/use/qan/mysql.html)
- [PMM 3: Data handling in PMM](https://docs.percona.com/percona-monitoring-and-management/3/reference/personal_data_handling.html)
- [PMM 3 source: QAN analytics service](https://github.com/percona/pmm/tree/main/qan-api2/services/analytics)
- [PMM 3: Percona Server for MySQL 5.7 End-Of-Life](https://docs.percona.com/percona-monitoring-and-management/3/advisors/checks/mysql_version_eol_57.html)
- [MySQL 8.4: The Slow Query Log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)
- [MySQL 8.4: Server System Variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html)
- [MySQL 8.4: Using System Variables](https://dev.mysql.com/doc/refman/8.4/en/using-system-variables.html)
- [MySQL 8.4: Performance Schema Statement Digests and Sampling](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-digests.html)
- [MySQL 8.4: Performance Schema Statement Event Tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-tables.html)
- [MySQL 8.4: The events_statements_current Table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-current-table.html)
- [MySQL 8.4: Statement Summary Tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)
- [MySQL 8.4: EXPLAIN Statement](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [Percona Toolkit: pt-query-digest](https://docs.percona.com/percona-toolkit/pt-query-digest.html)

## Issues Found

- The safety warning referred to running `EXPLAIN ANALYZE` on a write statement. In MySQL 8.4, `EXPLAIN ANALYZE` accepts and executes a `SELECT`, while ordinary `EXPLAIN` supports the listed data-changing statements. Changed the warning to cover an unknown or potentially expensive `SELECT` in production.
- The runtime slow-log example did not explain that `long_query_time` and `min_examined_row_limit` are session as well as global variables. Added that `SET GLOBAL` supplies values to new sessions and does not update existing pooled connections.
- `slow_query_log_always_write_time` was set to the same one-second value as `long_query_time`. Because this variable exempts qualifying queries from `log_slow_rate_limit`, the configuration would bypass sampling for every query eligible by execution time. Raised the unconditional threshold to 10 seconds and documented that it must remain above `long_query_time` for sampling to take effect.
- The Performance Schema section described summaries as having “bounded history.” Digest statistics are cumulative until reset, but the summary table has a bounded number of digest rows and aggregates new unmatched digests into a `DIGEST IS NULL` row when full. Corrected the explanation and added the catch-all-row check.
- The current-statements query was introduced as showing general waits, but its `LOCK_TIME` column measures table-lock time. Narrowed the description accordingly.
- The slow-log interpretation table combined `Lock_time` with InnoDB record-lock wait. Split them because slow-log `Lock_time` is not the InnoDB row-lock-wait metric; Percona's extended `InnoDB_rec_lock_wait` field is the appropriate row-lock evidence.
- PMM QAN stores and exposes p99 rather than a general set of latency percentiles. Replaced the broad percentile instruction with average, p99, and maximum latency.

## Review Notes

- The SQL timer conversions are correct: Performance Schema statement timers are normalized to picoseconds, so dividing `SUM_TIMER_WAIT` by `1e12` yields seconds and dividing `AVG_TIMER_WAIT` by `1e9` yields milliseconds.
- The `pmm-admin add mysql` syntax, `--query-source=slowlog`, and `--size-slow-logs=1GiB` option are current for PMM 3. The PMM agent needs file access for the slow-log source, and its monitoring account needs the documented privileges.
- Percona currently recommends the slow query log as the PMM query source for Percona Server 5.7, 8.0, and 8.4. PMM recommends using only one query source in normal operation.
- Performance Schema and slow-log examples can be truncated or absent depending on configured buffers, query length, query volume, prepared-statement behavior, and PMM query-example privacy controls.
- Percona Server for MySQL 5.7 is end-of-life. Its inclusion is accurate for PMM source selection, but readers should migrate production deployments to a supported release.

# How to Diagnose Slow Queries with the Slow Log, Performance Schema, and PMM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Slow Query Log, Performance Schema, PMM

Description: Use Percona Server's slow log, Performance Schema, and PMM Query Analytics as complementary evidence to find expensive query patterns and prove fixes.

---

A slow-query investigation needs both a workload ranking and a query-level explanation. Percona Server provides three complementary views:

- the slow query log captures detailed completed-query events, including literal examples;
- Performance Schema aggregates statements and waits in memory with no log-file lifecycle;
- Percona Monitoring and Management (PMM) Query Analytics retains and visualizes query fingerprints over time.

Choose one PMM query source per service in normal operation. Percona's PMM documentation recommends the slow log for Percona Server 5.7, 8.0, and 8.4 because it offers richer detail; Performance Schema has lower file-management overhead but often hides prepared-statement literals.

## First Define "Slow"

Record the incident window, endpoint, expected latency, concurrency, and whether the problem is:

- one statement with high elapsed time;
- a fast statement executed millions of times;
- lock or metadata wait time;
- a regression after a plan, schema, or data-volume change;
- cluster-wide saturation.

Do not begin by running `EXPLAIN ANALYZE` on an unknown or potentially expensive `SELECT` in production. Capture and classify first.

## Enable a Controlled Slow Log

For a targeted diagnostic window:

```sql
SET GLOBAL log_output = 'FILE';
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;
SET GLOBAL min_examined_row_limit = 100;
```

`long_query_time` and `min_examined_row_limit` have both global and session values. Changing the global values affects sessions opened afterward, not existing pooled connections; set the session values through the application or reconnect those clients if the diagnostic window must include them.

Confirm:

```sql
SHOW GLOBAL VARIABLES
WHERE Variable_name IN (
  'slow_query_log',
  'slow_query_log_file',
  'log_output',
  'long_query_time',
  'min_examined_row_limit'
);
```

`log_output=FILE` is important for PMM. Percona documents that Query Analytics ignores the `mysql.slow_log` table.

Percona Server's extended slow log can add:

```ini
[mysqld]
log_slow_verbosity=full
log_slow_rate_type=query
log_slow_rate_limit=100
slow_query_log_always_write_time=10
```

Sampling reduces overhead at high QPS: a rate limit of 100 logs approximately one in 100 eligible queries when the rate type is `query`, while `slow_query_log_always_write_time=10` exempts queries longer than 10 seconds from sampling. Keep this threshold above `long_query_time`; otherwise, every query eligible by time bypasses sampling. Validate the exact semantics on your installed release and make thresholds match the investigation.

Avoid leaving `long_query_time=0` globally without sizing disk and overhead. PMM's example uses it to capture all queries, but that is an explicit observability trade-off. Rotate the file through PMM's `--size-slow-logs` setting or a tested server/log-management procedure.

## Rank Query Digests in Performance Schema

Performance Schema can show expensive patterns even when no slow log was enabled during the incident, provided statement instrumentation and the statement-digest consumer were enabled:

```sql
SELECT
  DIGEST_TEXT,
  COUNT_STAR,
  ROUND(SUM_TIMER_WAIT / 1e12, 2) AS total_seconds,
  ROUND(AVG_TIMER_WAIT / 1e9, 2) AS avg_ms,
  SUM_ROWS_EXAMINED,
  SUM_ROWS_SENT,
  SUM_CREATED_TMP_DISK_TABLES,
  SUM_NO_INDEX_USED,
  FIRST_SEEN,
  LAST_SEEN
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = 'app'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;
```

This answers a different question from "what had the highest average latency?" A 5 ms query called ten million times can consume more capacity than one 5-second report.

Also inspect current statements and their table-lock time:

```sql
SELECT THREAD_ID, EVENT_NAME, TIMER_WAIT, LOCK_TIME,
       ROWS_EXAMINED, ROWS_SENT, SQL_TEXT
FROM performance_schema.events_statements_current
WHERE SQL_TEXT IS NOT NULL
ORDER BY TIMER_WAIT DESC;
```

Performance Schema summaries are cumulative, and the digest table has a bounded number of rows. Record the server uptime, take interval deltas, check whether unmatched digests are accumulating in the `DIGEST IS NULL` catch-all row, and understand whether a restart or table truncation reset the statistics.

## Read Each Slow-Log Entry as Evidence

Percona's extended format includes useful fields:

- `Query_time` versus `Lock_time`;
- `Rows_examined` versus `Rows_sent`;
- temporary tables and on-disk temporary tables;
- full scan, full join, filesort, and merge-pass flags;
- InnoDB page reads, read wait, record-lock wait, and queue wait;
- connection ID and schema.

Interpret combinations:

| Evidence | Likely direction |
| --- | --- |
| High `Rows_examined`, tiny `Rows_sent` | Poor selectivity, missing/unused index, late filtering |
| High `Lock_time` | Table-lock contention |
| High InnoDB record-lock wait | Blocking transaction or hot rows |
| `Tmp_table_on_disk=Yes` | Large grouping/sort, row width, or temp-memory limit |
| High InnoDB read wait | Cache miss or storage latency |
| Full join | Missing usable join predicate/index |
| High calls, modest latency | Optimize or cache the high-volume fingerprint |

Use `pt-query-digest` on a copy of the log to rank fingerprints by total response time, calls, average, and tail values:

```bash
pt-query-digest /var/log/mysql/slow.log > /tmp/slow-report.txt
```

Protect the report: literal values can contain personal or confidential data.

## Use PMM to Correlate Query and System Behavior

Register the service with one query source, for example:

```bash
pmm-admin add mysql \
  --username=pmm \
  --password='from-secret-store' \
  --query-source=slowlog \
  --size-slow-logs=1GiB \
  production-mysql
```

In Query Analytics:

1. select the exact incident window;
2. rank by load/total time, not average alone;
3. compare calls, rows examined, rows sent, and average, p99, and maximum latency;
4. correlate with CPU, disk latency, buffer-pool reads, connections, and locks;
5. compare the same fingerprint before and after the suspected change.

Prepared statements often appear with `?` placeholders in Performance Schema. The slow log can retain literals and may allow PMM to provide examples that make `EXPLAIN` practical. Apply PMM's query-example controls according to your privacy requirements.

## Explain the Captured Query Safely

Reproduce with representative parameter values on a staging or read-only environment:

```sql
EXPLAIN FORMAT=TREE
SELECT ...;

EXPLAIN ANALYZE
SELECT ...;
```

`EXPLAIN ANALYZE` executes the statement. Use it only when execution is safe and controlled. Compare estimated versus actual rows, access paths, loops, sort/temp behavior, and time by iterator.

Before adding an index, check:

- existing composite indexes and leftmost prefixes;
- implicit casts or functions on indexed columns;
- data skew and stale statistics;
- whether the query selects so much of the table that a scan is rational;
- write, storage, and buffer-pool cost of the new index.

Then test one change at a time and rerun the same workload.

## Close the Loop

For every fix, retain:

- query digest and representative example;
- incident window and PMM link;
- before/after plan;
- before/after calls, total time, p95/p99, and rows examined;
- schema/statistics change and rollback;
- production confirmation over a comparable load window.

Restore diagnostic settings to their approved baseline. Keep a sustainable always-on source—usually a sampled file slow log for Percona Server or Performance Schema when file management and literal capture are unacceptable.

The tools are most effective together: Performance Schema discovers workload shape, the slow log gives detailed events, and PMM adds time-series ranking and correlation.

## Official Documentation

- [Percona Server 8.4 extended slow query log](https://docs.percona.com/percona-server/8.4/slow-extended.html)
- [PMM 3: connect and configure MySQL query sources](https://docs.percona.com/percona-monitoring-and-management/3/install-pmm/install-pmm-client/connect-database/mysql/mysql.html)
- [MySQL 8.4 slow query log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)
- [MySQL 8.4 statement summary tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)
- [Percona Toolkit pt-query-digest](https://docs.percona.com/percona-toolkit/pt-query-digest.html)

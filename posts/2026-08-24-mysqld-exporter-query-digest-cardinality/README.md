# How to Bound `mysqld_exporter` Query-Digest Cardinality with Statement Limits and Time Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, mysqld_exporter, Prometheus, Query Digests, Metrics Cardinality

Description: Bound Prometheus series from MySQL statement digests by understanding exporter limits, freshness filters, digest normalization, and the remaining sources of time-series churn.

---

The `perf_schema.eventsstatements` collector in Prometheus Community's `mysqld_exporter` turns rows from `events_statements_summary_by_digest` into labeled time series. It is disabled by default for good reason: a busy fleet can expose many schemas and digests, and each combination creates several metrics.

The collector provides three useful bounds, but none is a complete cardinality policy on its own.

## Configure the collector deliberately

The exporter defaults currently include a 250-row statement limit, a 86,400-second time limit, and a 120-character digest-text limit. Make the choices explicit so an upgrade or copied deployment does not silently change the intended budget:

```text
--collect.perf_schema.eventsstatements
--collect.perf_schema.eventsstatements.limit=100
--collect.perf_schema.eventsstatements.timelimit=900
--collect.perf_schema.eventsstatements.digest_text_limit=80
--collect.perf_schema.eventsstatements.exclude_schemas=tenant_scratch
```

Repeat `exclude_schemas` for additional application schemas. The collector already excludes `mysql`, `performance_schema`, and `information_schema`.

Read the flags precisely:

- `limit` caps rows returned in a scrape after ordering by total statement timer;
- `timelimit` keeps rows whose `LAST_SEEN` is newer than `NOW() - INTERVAL ... SECOND`;
- `digest_text_limit` truncates the exported text label;
- `exclude_schemas` removes selected schemas before ranking.

The time limit is a freshness filter, not a rolling aggregation window. Counters in an eligible digest row still cover that row's lifetime since its summary was created or reset. A 15-minute time limit does not mean “work performed in the last 15 minutes.”

## Know which labels create series

The collector labels statement metrics with schema, digest, and digest text. MySQL normalizes literals in a digest—values such as strings and numbers become parameter markers—but identifiers remain significant. Per-tenant table or schema names, generated SQL shapes, and changing identifier lists can therefore create many digests.

Truncating digest text reduces label bytes; it does not reduce the number of distinct digest labels. Dropping the text label in metric relabeling can reduce payload and exposure, but distinct digest hashes and schemas still create distinct series.

Estimate the source population before enabling the collector:

```sql
SELECT COUNT(*) AS digest_rows,
       COUNT(DISTINCT SCHEMA_NAME) AS schemas,
       MIN(FIRST_SEEN) AS oldest_first_seen,
       MAX(LAST_SEEN) AS newest_last_seen
FROM performance_schema.events_statements_summary_by_digest;

SELECT SCHEMA_NAME,
       COUNT(*) AS digest_rows
FROM performance_schema.events_statements_summary_by_digest
GROUP BY SCHEMA_NAME
ORDER BY digest_rows DESC
LIMIT 20;
```

Also check whether MySQL itself is losing new digest rows:

```sql
SHOW GLOBAL STATUS LIKE 'Performance_schema_digest_lost';
SHOW GLOBAL VARIABLES LIKE 'performance_schema_digests_size';
```

`performance_schema_digests_size` sets the maximum number of digest summary rows and is configured at server startup. When the table has no room for another digest, MySQL aggregates unrepresented statements into a row whose digest fields are `NULL` and increments `Performance_schema_digest_lost`. Making the table smaller is therefore a lossy source-side bound, not a free optimization.

## Budget for churn, not only one scrape

With a limit of 100, one target exposes at most 100 selected digest rows in one scrape, but the top 100 can change from scrape to scrape. Prometheus retains old series until they age out under the server's retention policy. A rotating workload can thus create far more than 100 series over a day.

Estimate an upper budget as:

```text
targets × distinct selected schema/digest pairs over retention
        × metrics emitted per digest
```

Measure `count` of active and newly observed series in Prometheus rather than assuming the row limit is the final number. Test with production-like SQL diversity and the actual scrape interval.

## Choose limits from the monitoring objective

A useful rollout sequence is:

1. exclude system, migration, scratch, and intentionally high-churn schemas;
2. start with a short freshness horizon and a small row limit;
3. retain the digest hash and only as much normalized text as responders need;
4. monitor exporter scrape duration, response size, Prometheus head series, and digest loss;
5. raise the limit only when missing lower-ranked queries has a demonstrated operational cost.

The collector sorts by cumulative `SUM_TIMER_WAIT`, so a historically expensive digest can dominate whenever it remains fresh. Use rates of the exported counters for dashboards and reset-aware alerting. A digest-table truncation removes its rows, and a server restart rebuilds Performance Schema state; reject intervals across either boundary rather than turning a decrease into a spike. MySQL does not evict an existing digest row merely because `performance_schema_digests_size` is full: it aggregates unrepresented statements into the `NULL` digest row and increments `Performance_schema_digest_lost`.

For investigations that require full fidelity, query Performance Schema on demand or export samples to a system designed for high-cardinality traces. Prometheus is best used for a stable, bounded operational view.

## Treat query text as sensitive

Although MySQL digest text replaces literals, identifiers and SQL structure can still reveal customer names, internal table names, or business operations. Restrict the exporter's database account and metrics endpoint, encrypt transport, and evaluate whether `digest_text` should leave the database network at all.

Pin and test an exporter release. The current upstream exporter documents MySQL 5.6 or later, but collector fields are version-gated; for example, CPU-related statement fields are available only on MySQL versions that expose them. Unknown flags can prevent startup, so validate the exact binary rather than copying flags from another release.

## Official Documentation

- [Prometheus Community `mysqld_exporter`](https://github.com/prometheus/mysqld_exporter)
- [`perf_schema.eventsstatements` collector source and flags](https://github.com/prometheus/mysqld_exporter/blob/main/collector/perf_schema_events_statements.go)
- [MySQL Performance Schema statement digests](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-digests.html)
- [MySQL statement digest summary table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)
- [MySQL Performance Schema system variables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-system-variables.html)
- [MySQL Performance Schema status variables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-status-variables.html)

## Conclusion

Bound `mysqld_exporter` statement series with schema exclusions, a small ranked row limit, and a short `LAST_SEEN` horizon, while remembering that the horizon does not reset counters and the selected set can rotate. Monitor MySQL digest loss and Prometheus series churn so a source-side bound does not become hidden observability loss.

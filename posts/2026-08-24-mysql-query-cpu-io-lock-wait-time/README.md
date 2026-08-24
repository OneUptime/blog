# How to Separate MySQL Query CPU Time from I/O and Lock Wait Time with Performance Schema Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Query Profiling, CPU Time, Wait Events

Description: Decompose MySQL statement latency with version-aware CPU timers, table-lock measurements, nested wait events, and explicit limits on what Performance Schema can attribute.

---

A statement's elapsed time is not its CPU time. It can spend time executing on CPU, reading files, waiting for a lock or latch, sleeping for scheduling, or inside work that is not instrumented.

Performance Schema exposes each of these through different event families. The safe approach is to keep elapsed, CPU, table-lock, and nested-wait measurements separate—not to invent “I/O time” by subtracting one counter from another.

## Start with version and instrumentation

`CPU_TIME` in statement events was added in MySQL 8.0.28. On supported versions it represents thread CPU time in picoseconds; older versions do not have the column. Inventory the server before deploying a query:

```sql
SELECT VERSION();

SELECT NAME, ENABLED
FROM performance_schema.setup_consumers
WHERE NAME LIKE 'events_statements%'
   OR NAME LIKE 'events_stages%'
   OR NAME LIKE 'events_waits%'
ORDER BY NAME;

SELECT NAME, ENABLED, TIMED
FROM performance_schema.setup_instruments
WHERE NAME LIKE 'statement/%'
   OR NAME LIKE 'stage/%'
   OR NAME LIKE 'wait/io/%'
   OR NAME LIKE 'wait/lock/%'
ORDER BY NAME;

SELECT *
FROM performance_schema.performance_timers
WHERE TIMER_NAME = 'THREAD_CPU';
```

MySQL added the separate `events_statements_cpu` consumer with the CPU fields, and it is disabled by default. A version that has `SUM_CPU_TIME` can therefore still report no useful CPU data until that consumer is enabled. Enable it only after measuring the cost:

```sql
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME = 'events_statements_cpu';
```

An enabled consumer cannot supply timing for an instrument whose `TIMED` value is `NO`, and available timer types can vary by platform. Conversely, enabling every detailed wait and long-history consumer can add overhead and memory use. Turn on the smallest useful set and benchmark it on the target version and workload.

## Compare statement-level timers

On MySQL 8.0.28 or later, digest summaries provide a low-cardinality first pass:

```sql
SELECT SCHEMA_NAME,
       DIGEST,
       LEFT(DIGEST_TEXT, 160) AS digest_text,
       COUNT_STAR,
       SUM_TIMER_WAIT / 1000000000000 AS elapsed_seconds,
       SUM_CPU_TIME / 1000000000000 AS cpu_seconds,
       SUM_LOCK_TIME / 1000000000000 AS table_lock_seconds,
       SUM_ROWS_EXAMINED,
       SUM_ROWS_SENT
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST IS NOT NULL
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 50;
```

All three timer sums are in picoseconds. Use interval deltas and reject decreases caused by restart or truncation. If a digest disappears from collection and later returns, start a new local series epoch rather than bridging the missing interval. Divide delta sums by delta `COUNT_STAR` for weighted per-execution averages; never average the already aggregated averages across rows.

The fields have different scopes:

- `SUM_TIMER_WAIT` is statement elapsed time;
- `SUM_CPU_TIME` is CPU consumed by the statement's thread on supported versions;
- `SUM_LOCK_TIME` is time waiting for table locks, based on the server's table-lock measurement.

`SUM_LOCK_TIME` is not total lock latency. InnoDB record locks, metadata locks, and internal synchronization appear through other instruments and may not be fully represented by that field.

## Use wait summaries to find the resource class

Global wait summaries show which instrumented resources consumed time across the server:

```sql
SELECT EVENT_NAME,
       COUNT_STAR,
       SUM_TIMER_WAIT / 1000000000000 AS wait_seconds,
       AVG_TIMER_WAIT / 1000000000000 AS avg_wait_seconds,
       MAX_TIMER_WAIT / 1000000000000 AS max_wait_seconds
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'wait/io/%'
   OR EVENT_NAME LIKE 'wait/lock/%'
   OR EVENT_NAME LIKE 'wait/synch/%'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 50;
```

This answers which resource classes are expensive globally. File, table, account, host, and user summary tables provide other groupings. They do not automatically attribute every wait to a query digest.

Calculate rates or interval time shares from counter deltas. A lifetime `SUM_TIMER_WAIT` mostly describes the server's history, and a high count of tiny waits can be less important than a few large waits.

## Preserve the event nesting chain

Raw history tables carry `THREAD_ID`, `EVENT_ID`, `NESTING_EVENT_ID`, and `NESTING_EVENT_TYPE`. A directly nested wait can be joined to its parent statement:

```sql
SELECT s.THREAD_ID,
       s.EVENT_ID AS statement_event_id,
       s.DIGEST,
       w.EVENT_NAME AS wait_event,
       SUM(w.TIMER_WAIT) / 1000000000000 AS wait_seconds
FROM performance_schema.events_statements_history_long AS s
JOIN performance_schema.events_waits_history_long AS w
  ON w.THREAD_ID = s.THREAD_ID
 AND w.NESTING_EVENT_TYPE = 'STATEMENT'
 AND w.NESTING_EVENT_ID = s.EVENT_ID
GROUP BY s.THREAD_ID, s.EVENT_ID, s.DIGEST, w.EVENT_NAME
ORDER BY wait_seconds DESC;
```

This deliberately finds only waits whose immediate parent is the statement. A wait may instead be nested under a stage, which is then nested under the statement. Exact attribution must traverse that hierarchy and must sample before the fixed-size history buffers overwrite either side. Thread IDs and event IDs are not durable identifiers across server restarts.

For active incidents, join the `current` statement, stage, and wait tables and inspect `data_lock_waits` and `metadata_locks`. For long-term monitoring, prefer bounded per-digest statement counters plus resource-level wait counters; use event traces only for a sampled diagnostic window.

## Avoid invalid arithmetic

Do not calculate:

```text
I/O time = elapsed time - CPU time - LOCK_TIME
```

The residual can contain scheduling delay, synchronization, network backpressure, stage time, uninstrumented work, and measurement differences. Some timers can also have unavailable values or differing parent/child semantics. Report observed I/O waits directly from I/O instruments and label unattributed elapsed time as unattributed rather than as disk latency.

A useful dashboard plots, over the same interval:

- statement count, elapsed time, and CPU time by bounded digest;
- table-lock time by digest;
- I/O, lock, and synchronization wait time by event class;
- InnoDB data-lock and metadata-lock waiters;
- operating-system CPU, block-device latency, and filesystem activity;
- query latency from the application or trace layer.

Raw `SQL_TEXT`, digest text, users, and object names can be sensitive. Restrict Performance Schema access and redact or aggregate before exporting them to a shared backend.

## Official Documentation

- [MySQL Performance Schema statement event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-current-table.html)
- [MySQL Performance Schema statement summary tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)
- [MySQL Performance Schema wait event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-wait-tables.html)
- [MySQL Performance Schema wait summary tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-wait-summary-tables.html)
- [MySQL Performance Schema event timing](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-timing.html)
- [MySQL Performance Schema consumers](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-consumer-configurations.html)
- [MySQL Performance Schema option and variable reference](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-option-variable-reference.html)

## Conclusion

Keep MySQL statement elapsed time, thread CPU time, table-lock time, and observed nested waits as separate measurements. Use version-gated digest counters for trends, wait summaries for resource classes, and short-lived event hierarchies for attribution—while leaving uninstrumented residual time explicitly unattributed.

# Why the MySQL Slow Query Log Is Not a Live Lock-Wait Trace-and What to Collect from Performance Schema Instead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Slow Query Log, Lock Waits, Database Monitoring

Description: Diagnose lock-bound MySQL statements by combining completion-oriented slow-log evidence, statement events, live lock relationships, and selectively enabled wait instrumentation.

---

MySQL's slow query log is useful for finding statements whose execution is slow. It is not a complete record of statements that made an application wait.

On MySQL 8.0.27 and earlier, slow-log qualification used a post-lock timestamp rather than statement start, excluding initial table-lock acquisition and storage-engine-reported data-lock wait time. MySQL 8.0.28 changed qualification to use elapsed time from statement start, so on current releases a lock wait can cause a statement to exceed `long_query_time`. The MySQL 8.4 Reference Manual still carries the older initial-lock wording, but the 8.0.28 fix and current server implementation use the start-based check. MySQL writes an entry only after the statement has executed, so entries are completion-oriented and log order can differ from statement start order.

## Understand what the slow log can prove

Check the active global values rather than assuming a configuration file was loaded:

```sql
SHOW GLOBAL VARIABLES
WHERE Variable_name IN (
  'slow_query_log',
  'long_query_time',
  'min_examined_row_limit',
  'log_queries_not_using_indexes'
);
```

`long_query_time` and `min_examined_row_limit` also have session scope. Their global values are defaults for new sessions, so an existing application connection can use different values.

The `Query_time` in a slow-log entry is calculated from statement start, even on releases where initial table-lock time was excluded from qualification. Starting with MySQL 8.0.28, `Lock_time` accumulates waits on SQL table and data locks. The log still does not identify live waiter/blocker relationships or capture client-side queueing. Statements filtered by `min_examined_row_limit`, administrative-statement settings, or the log's other rules are absent too.

Treat the slow log as one signal: it answers which completed statements met its logging policy, not which client requests waited longest end to end.

## Keep a bounded statement history

Performance Schema statement events expose timer, SQL, error, row, and nesting information independently of slow-log qualification. Inspect the relevant consumers first:

```sql
SELECT NAME, ENABLED
FROM performance_schema.setup_consumers
WHERE NAME IN (
  'global_instrumentation',
  'thread_instrumentation',
  'statements_digest',
  'events_statements_current',
  'events_statements_history',
  'events_statements_history_long',
  'events_stages_current',
  'events_stages_history',
  'events_stages_history_long',
  'events_waits_current',
  'events_waits_history',
  'events_waits_history_long'
);
```

Enable only the history needed for the investigation and size it deliberately. The per-thread `events_statements_history` table is short and loses events when a thread ends. `events_statements_history_long` is global but is still a fixed-size, in-memory ring buffer, not a durable audit log.

For example, recent completed statements can be ranked by elapsed time:

```sql
SELECT THREAD_ID,
       EVENT_ID,
       CURRENT_SCHEMA,
       DIGEST,
       LEFT(DIGEST_TEXT, 160) AS digest_text,
       TIMER_WAIT / 1000000000000 AS elapsed_seconds,
       LOCK_TIME / 1000000000000 AS lock_seconds,
       ROWS_EXAMINED,
       MYSQL_ERRNO
FROM performance_schema.events_statements_history_long
WHERE EVENT_NAME LIKE 'statement/sql/%'
  AND TIMER_END IS NOT NULL
ORDER BY TIMER_WAIT DESC
LIMIT 50;
```

Performance Schema timers are reported in picoseconds. `LOCK_TIME` is accumulated SQL table- and data-lock wait time, computed in microseconds and normalized to picoseconds. Since MySQL 8.0.28, it includes InnoDB row-lock waits. It is not a universal total for metadata locks, I/O, synchronization, and every other wait beneath a statement.

## Capture the blocking relationship while it exists

Statement history shows that a request was slow; lock tables show who is blocking it now. MySQL's `sys.innodb_lock_waits` view joins InnoDB lock and transaction data into an operational view:

```sql
SELECT wait_started,
       wait_age,
       locked_table,
       locked_index,
       waiting_pid,
       LEFT(waiting_query, 200) AS waiting_query,
       blocking_pid,
       LEFT(blocking_query, 200) AS blocking_query
FROM sys.innodb_lock_waits
ORDER BY wait_age_secs DESC;
```

For table metadata locks, use the separate view:

```sql
SELECT object_schema,
       object_name,
       waiting_pid,
       waiting_lock_type,
       waiting_lock_duration,
       waiting_query_secs,
       LEFT(waiting_query, 200) AS waiting_query,
       blocking_pid,
       blocking_lock_type,
       blocking_lock_duration
FROM sys.schema_table_lock_waits
ORDER BY waiting_query_secs DESC;
```

The underlying Performance Schema lock tables are `data_locks`, `data_lock_waits`, and `metadata_locks`. Polling the `sys` views every few seconds during an incident is convenient, but each row describes a transient relationship. Export blocker ID, waiter ID, lock object, wait age, transaction age, and normalized statement identity before the wait disappears.

Do not automatically execute the generated kill statements exposed by the `sys` views. Validate ownership, transaction impact, replication role, and retry behavior first.

## Attribute waits selectively

Wait-event tables can record file I/O, table, metadata, synchronization, socket, and other waits nested beneath statements. Check that the relevant wait and stage consumers are enabled and that the corresponding instruments are enabled and timed:

```sql
SELECT NAME, ENABLED, TIMED
FROM performance_schema.setup_instruments
WHERE NAME LIKE 'wait/io/%'
   OR NAME LIKE 'wait/lock/%'
   OR NAME LIKE 'wait/synch/%'
   OR NAME LIKE 'stage/%'
ORDER BY NAME;
```

Correlate `THREAD_ID`, `EVENT_ID`, `NESTING_EVENT_ID`, and `NESTING_EVENT_TYPE`. A wait can be immediately nested under a stage rather than directly under the statement, so a one-level join can omit it. Preserve the nesting chain when exact attribution matters.

Instrumentation has cost and the history tables overwrite old rows. Enable a narrow set of instruments, measure overhead under realistic load, and export aggregates rather than scraping every raw event indefinitely.

## Build an alert that covers slow-log gaps

A practical lock-wait alert combines:

- the oldest current InnoDB and table metadata lock wait;
- the number of waiters by blocker and locked object;
- blocking transaction age and whether it is idle;
- application request or pool-checkout latency;
- recent statement elapsed time and normalized digest;
- slow-log rate as supporting, not exclusive, evidence.

Alert on a sustained wait age or a growing blocking fan-out, not merely one short lock conflict. Retain a compact incident sample containing timestamps and stable thread/event identifiers. Raw SQL and bind values can contain credentials or personal data, so prefer digests, restrict access, and apply a documented redaction policy before export.

Version the collector with MySQL. Performance Schema columns, `sys` views, and defaults differ across releases, and historical ring-buffer sizes are startup-controlled. Test the exact queries against each supported server version.

## Official Documentation

- [MySQL slow query log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)
- [MySQL 8.0.28 release notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-28.html)
- [MySQL 8.0.28 lock-time fix](https://github.com/mysql/mysql-server/commit/3e7f875a8e3068c8d5b55f6ca566629f3e302a54)
- [Performance Schema statement event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-current-table.html)
- [Performance Schema wait event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-wait-tables.html)
- [Performance Schema consumer configuration](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-consumer-configurations.html)
- [Performance Schema lock tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-lock-tables.html)
- [MySQL `sys.innodb_lock_waits`](https://dev.mysql.com/doc/refman/8.4/en/sys-innodb-lock-waits.html)
- [MySQL `sys.schema_table_lock_waits`](https://dev.mysql.com/doc/refman/8.4/en/sys-schema-table-lock-waits.html)

## Conclusion

The slow query log is completion-only and policy-filtered. MySQL 8.0.27 and earlier used a post-lock timestamp that excluded initial table-lock acquisition and storage-engine-reported data-lock wait time from `long_query_time` qualification, while MySQL 8.0.28 and later measure from statement start. Diagnose lock-bound latency with bounded Performance Schema statement history, live InnoDB and table metadata lock relationships, and selectively timed wait events, then correlate those signals with application latency before deciding which transaction to interrupt.

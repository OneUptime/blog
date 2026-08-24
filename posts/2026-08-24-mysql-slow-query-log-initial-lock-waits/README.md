# Why the MySQL Slow Query Log Misses Initial Lock Waits—and What to Collect from Performance Schema Instead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Slow Query Log, Lock Waits, Database Monitoring

Description: Detect lock-bound MySQL statements that the slow query log can miss by combining statement events, live lock relationships, and selectively enabled wait instrumentation.

---

MySQL's slow query log is useful for finding statements whose execution is slow. It is not a complete record of statements that made an application wait.

For slow-log qualification, MySQL starts measuring execution time only after a statement has acquired its initial table locks. A statement can therefore spend longer than `long_query_time` waiting to begin, execute quickly once admitted, and never qualify. MySQL also writes an entry only after the statement finishes and releases its locks, so log order is not execution order.

## Understand what the slow log can prove

Check the effective global settings rather than assuming a configuration file was loaded:

```sql
SHOW GLOBAL VARIABLES
WHERE Variable_name IN (
  'slow_query_log',
  'long_query_time',
  'min_examined_row_limit',
  'log_queries_not_using_indexes'
);
```

The `Query_time` in a slow-log entry covers execution after the initial lock acquisition. `Lock_time` can still describe lock time recorded for a statement that made it into the log, but it does not make the log an admission-latency trace. Statements filtered by `min_examined_row_limit`, administrative-statement settings, or the log's other rules are absent too.

Treat the slow log as one signal: it answers which completed statements met its logging policy, not which client requests waited longest end to end.

## Keep a bounded statement history

Performance Schema statement events expose timer, SQL, error, row, and nesting information independently of slow-log qualification. Inspect the relevant consumers first:

```sql
SELECT NAME, ENABLED
FROM performance_schema.setup_consumers
WHERE NAME IN (
  'events_statements_current',
  'events_statements_history',
  'events_statements_history_long',
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
       LOCK_TIME / 1000000000000 AS table_lock_seconds,
       ROWS_EXAMINED,
       MYSQL_ERRNO
FROM performance_schema.events_statements_history_long
WHERE EVENT_NAME LIKE 'statement/sql/%'
  AND TIMER_END IS NOT NULL
ORDER BY TIMER_WAIT DESC
LIMIT 50;
```

Performance Schema timers are reported in picoseconds. `LOCK_TIME` is the time waiting for table locks and is normalized from the server's microsecond measurement. It is not a universal total for InnoDB row locks, metadata locks, and every wait beneath a statement.

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

For metadata locks, use the separate view:

```sql
SELECT object_schema,
       object_name,
       waiting_pid,
       waiting_lock_type,
       waiting_lock_duration,
       LEFT(waiting_query, 200) AS waiting_query,
       blocking_pid,
       blocking_lock_type,
       blocking_lock_duration
FROM sys.schema_table_lock_waits
ORDER BY waiting_query_secs DESC;
```

The underlying Performance Schema sources are `data_locks`, `data_lock_waits`, and `metadata_locks`. Polling the `sys` views every few seconds during an incident is convenient, but each row describes a transient relationship. Export blocker ID, waiter ID, lock object, wait age, transaction age, and normalized statement identity before the wait disappears.

Do not automatically execute the generated kill statements exposed by the `sys` views. Validate ownership, transaction impact, replication role, and retry behavior first.

## Attribute waits selectively

Wait-event tables can record file I/O, table, metadata, synchronization, socket, and other waits nested beneath statements. Check that both the instrument and its consumer are enabled and timed:

```sql
SELECT NAME, ENABLED, TIMED
FROM performance_schema.setup_instruments
WHERE NAME LIKE 'wait/io/%'
   OR NAME LIKE 'wait/lock/%'
ORDER BY NAME;
```

Correlate `THREAD_ID`, `EVENT_ID`, `NESTING_EVENT_ID`, and `NESTING_EVENT_TYPE`. A wait can be immediately nested under a stage rather than directly under the statement, so a one-level join can omit it. Preserve the nesting chain when exact attribution matters.

Instrumentation has cost and the history tables overwrite old rows. Enable a narrow set of instruments, measure overhead under realistic load, and export aggregates rather than scraping every raw event indefinitely.

## Build an alert that catches the blind spot

A practical lock-wait alert combines:

- the oldest current InnoDB and metadata lock wait;
- the number of waiters by blocker and locked object;
- blocking transaction age and whether it is idle;
- application request or pool-checkout latency;
- recent statement elapsed time and normalized digest;
- slow-log rate as supporting, not exclusive, evidence.

Alert on a sustained wait age or a growing blocking fan-out, not merely one short lock conflict. Retain a compact incident sample containing timestamps and stable thread/event identifiers. Raw SQL and bind values can contain credentials or personal data, so prefer digests, restrict access, and apply a documented redaction policy before export.

Version the collector with MySQL. Performance Schema columns, `sys` views, and defaults differ across releases, and historical ring-buffer sizes are startup-controlled. Test the exact queries against each supported server version.

## Official Documentation

- [MySQL slow query log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)
- [Performance Schema statement event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-current-table.html)
- [Performance Schema wait event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-wait-tables.html)
- [Performance Schema consumer configuration](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-consumer-configurations.html)
- [Performance Schema lock tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-lock-tables.html)
- [MySQL `sys.innodb_lock_waits`](https://dev.mysql.com/doc/refman/8.4/en/sys-innodb-lock-waits.html)
- [MySQL `sys.schema_table_lock_waits`](https://dev.mysql.com/doc/refman/8.4/en/sys-schema-table-lock-waits.html)

## Conclusion

The slow query log deliberately excludes the time spent acquiring initial locks from its execution-time threshold. Catch that blind spot with bounded Performance Schema statement history, live InnoDB and metadata lock relationships, and selectively timed wait events, then correlate those signals with application latency before deciding which transaction to interrupt.

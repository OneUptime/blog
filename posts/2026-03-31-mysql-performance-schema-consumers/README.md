# How to Configure Performance Schema Consumers in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Consumer, Monitoring, Database

Description: Learn how to configure Performance Schema consumers in MySQL to control which event tables are populated and reduce monitoring overhead.

---

Consumers in MySQL's Performance Schema determine where collected event data is stored. While instruments define what gets measured, consumers define where the data flows. Disabling consumers reduces memory usage and I/O without disabling instruments entirely - giving you fine-grained control over the monitoring pipeline.

## Understanding the Consumer Hierarchy

Consumers follow a dependency chain. A consumer only collects data if all consumers above it in the hierarchy are also enabled:

```text
global_instrumentation
  |-- thread_instrumentation
  |     |-- events_waits_current
  |     |     `-- events_waits_history
  |     |           `-- events_waits_history_long
  |     |-- events_stages_current
  |     |     `-- events_stages_history
  |     |           `-- events_stages_history_long
  |     |-- events_statements_current
  |     |     `-- events_statements_history
  |     |           `-- events_statements_history_long
  |     `-- events_transactions_current
  |           `-- events_transactions_history
  |                 `-- events_transactions_history_long
  `-- statements_digest
```

## Viewing Current Consumer Configuration

```sql
SELECT NAME, ENABLED
FROM performance_schema.setup_consumers
ORDER BY NAME;
```

Typical output:

```text
+----------------------------------+---------+
| NAME                             | ENABLED |
+----------------------------------+---------+
| events_stages_current            | NO      |
| events_stages_history            | NO      |
| events_stages_history_long       | NO      |
| events_statements_current        | YES     |
| events_statements_history        | YES     |
| events_statements_history_long   | NO      |
| events_transactions_current      | YES     |
| events_transactions_history      | YES     |
| events_transactions_history_long | NO      |
| events_waits_current             | NO      |
| events_waits_history             | NO      |
| events_waits_history_long        | NO      |
| global_instrumentation           | YES     |
| statements_digest                | YES     |
| thread_instrumentation           | YES     |
+----------------------------------+---------+
```

## Enabling and Disabling Consumers

To enable statement history for all threads:

```sql
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN (
  'events_statements_current',
  'events_statements_history',
  'events_statements_history_long'
);
```

To enable wait event tracking:

```sql
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME LIKE 'events_waits%';
```

To disable stage tracking to reduce overhead:

```sql
UPDATE performance_schema.setup_consumers
SET ENABLED = 'NO'
WHERE NAME LIKE 'events_stages%';
```

## Configuring Consumers Permanently

Add consumer settings to `my.cnf` so they persist across restarts:

```bash
[mysqld]
performance-schema-consumer-events-statements-current=ON
performance-schema-consumer-events-statements-history=ON
performance-schema-consumer-events-statements-history-long=ON
performance-schema-consumer-statements-digest=ON
performance-schema-consumer-global-instrumentation=ON
performance-schema-consumer-thread-instrumentation=ON

# Disable high-overhead consumers
performance-schema-consumer-events-waits-current=OFF
performance-schema-consumer-events-stages-current=OFF
```

Restart MySQL after changes:

```bash
sudo systemctl restart mysqld
```

## What Each Consumer Controls

**statements_digest** - Populates `events_statements_summary_by_digest`. Essential for identifying slow query patterns by normalized SQL text.

**events_statements_current** - Populates `events_statements_current`. Shows currently executing statements.

**events_statements_history** - Keeps the last 10 statements per thread in `events_statements_history`.

**events_statements_history_long** - Keeps a global rolling buffer of recent statements. Higher memory use.

**events_waits_current** - Tracks what each thread is currently waiting for (locks, I/O, etc.).

**thread_instrumentation** - Master switch for per-thread event collection. Disabling this stops all current/history consumers.

## Recommended Production Configuration

A lightweight setup that captures statement statistics without per-event overhead:

```sql
-- Minimum useful set for query analysis
UPDATE performance_schema.setup_consumers SET ENABLED = 'NO';

UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN (
  'global_instrumentation',
  'thread_instrumentation',
  'statements_digest',
  'events_statements_current',
  'events_statements_history'
);
```

## Summary

Performance Schema consumers control which event tables receive data in MySQL. They form a hierarchy where parent consumers must be enabled for child consumers to work. Use the `setup_consumers` table to enable or disable consumers at runtime, or configure them permanently via `my.cnf`. A minimal configuration with statement digest and current statement consumers provides most of the diagnostic value at low overhead.

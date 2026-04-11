# How to Use setup_consumers Table in MySQL Performance Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Consumer, Configuration, Monitoring

Description: Learn how to configure MySQL Performance Schema consumers using the setup_consumers table to control which event history tables receive collected data.

---

## Overview

While `setup_instruments` controls what MySQL measures, `setup_consumers` controls where the collected data is stored. Consumers are the destination tables that receive event records. Disabling unnecessary consumers reduces memory usage and overhead without disabling instrumentation entirely.

## Viewing All Consumers

```sql
SELECT NAME, ENABLED
FROM performance_schema.setup_consumers
ORDER BY NAME;
```

A typical output shows consumers like:

```text
events_stages_current             | YES
events_stages_history             | NO
events_stages_history_long        | NO
events_statements_current         | YES
events_statements_history         | YES
events_statements_history_long    | NO
events_transactions_current       | YES
events_transactions_history       | NO
events_transactions_history_long  | NO
events_waits_current              | YES
events_waits_history              | NO
events_waits_history_long         | NO
global_instrumentation            | YES
thread_instrumentation            | YES
statements_digest                 | YES
```

## Consumer Hierarchy

Consumers form a dependency hierarchy. A child consumer only collects data if its parent is also enabled:

```text
global_instrumentation
  |-- thread_instrumentation
  |     |-- events_waits_current
  |     |     |-- events_waits_history
  |     |     |-- events_waits_history_long
  |     |-- events_stages_current
  |     |     |-- events_stages_history
  |     |     |-- events_stages_history_long
  |     |-- events_statements_current
  |     |     |-- events_statements_history
  |     |     |-- events_statements_history_long
  |     |-- events_transactions_current
  |           |-- events_transactions_history
  |           |-- events_transactions_history_long
  |-- statements_digest
```

## Enabling History Tables for Investigation

When troubleshooting, enable history consumers to capture more data:

```sql
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN (
  'events_statements_history_long',
  'events_waits_history_long',
  'events_stages_history_long'
);
```

## Disabling Consumers to Reduce Overhead

For production with minimal overhead:

```sql
-- Keep only what's essential
UPDATE performance_schema.setup_consumers
SET ENABLED = 'NO'
WHERE NAME IN (
  'events_waits_history',
  'events_waits_history_long',
  'events_stages_history',
  'events_stages_history_long'
);
```

## Enabling All Consumers for Full Diagnostics

```sql
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES';
```

## Making Consumer Configuration Persistent

Add to `my.cnf` to persist across restarts:

```text
[mysqld]
performance_schema_consumer_events_statements_history=ON
performance_schema_consumer_events_statements_history_long=ON
performance_schema_consumer_statements_digest=ON
```

## Checking Which Consumers Feed Which Tables

```sql
-- statements_digest consumer feeds this table:
SELECT COUNT(*) FROM performance_schema.events_statements_summary_by_digest;

-- events_statements_history_long consumer feeds:
SELECT COUNT(*) FROM performance_schema.events_statements_history_long;
```

## Summary

The `setup_consumers` table determines which Performance Schema history and summary tables are populated. By enabling only the consumers you need, you can balance diagnostic coverage against memory and CPU overhead. For production monitoring, keep `statements_digest` and `events_statements_history` enabled. For active investigations, also enable the `_history_long` variants to capture a larger event window.

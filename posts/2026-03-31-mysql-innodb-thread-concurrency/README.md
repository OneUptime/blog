# How to Configure InnoDB Thread Concurrency in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Performance, Concurrency, Configuration

Description: Learn how to configure InnoDB thread concurrency in MySQL to prevent thread thrashing and optimize throughput under high connection loads.

---

InnoDB uses a concurrency ticket system to limit the number of threads simultaneously executing inside InnoDB. When too many threads compete for shared resources, performance degrades due to contention. The thread concurrency settings help InnoDB manage this by queuing excess threads rather than letting them all compete at once.

## Understanding InnoDB Concurrency Control

InnoDB has a built-in concurrency throttle controlled by `innodb_thread_concurrency`. When this limit is reached, additional threads wait in a queue. Each admitted thread gets a number of "tickets" (`innodb_concurrency_tickets`) that allow it to re-enter InnoDB without waiting.

```sql
-- View current concurrency settings
SHOW GLOBAL VARIABLES LIKE 'innodb_thread%';
SHOW GLOBAL VARIABLES LIKE 'innodb_concurrency%';
SHOW GLOBAL VARIABLES LIKE 'innodb_adaptive%';
```

```text
+------------------------------+-------+
| Variable_name                | Value |
+------------------------------+-------+
| innodb_thread_concurrency    | 0     |
| innodb_thread_sleep_delay    | 10000 |
| innodb_concurrency_tickets   | 5000  |
| innodb_adaptive_max_sleep_delay | 150000 |
+------------------------------+-------+
```

## Setting Thread Concurrency

`innodb_thread_concurrency = 0` means unlimited concurrency (the default). This works well for most systems with fewer than 32 CPUs.

```sql
-- Set a limit of 2x CPU cores (common recommendation)
SET GLOBAL innodb_thread_concurrency = 32;

-- Disable concurrency control (unlimited)
SET GLOBAL innodb_thread_concurrency = 0;
```

As a starting point, set `innodb_thread_concurrency` to 2 times the number of CPU cores. For example, on a 16-core server:

```text
[mysqld]
innodb_thread_concurrency=32
```

## Tuning Concurrency Tickets

The tickets parameter controls how long a thread can stay in InnoDB between checks:

```sql
-- Increase tickets to reduce scheduling overhead for long queries
SET GLOBAL innodb_concurrency_tickets = 5000;
```

More tickets mean fewer context switches but longer wait times for queued threads. For OLTP with many short queries, lower tickets (500-1000) improve fairness.

## Thread Sleep Settings

When a thread cannot enter InnoDB, it sleeps briefly before retrying:

```sql
-- Microseconds a thread sleeps while waiting to enter InnoDB
SET GLOBAL innodb_thread_sleep_delay = 10000;

-- Adaptive sleep delay upper bound (microseconds)
SET GLOBAL innodb_adaptive_max_sleep_delay = 150000;
```

With `innodb_adaptive_max_sleep_delay` set (non-zero), InnoDB automatically adjusts sleep delay based on the queue size. Leave this enabled for most workloads.

## Monitoring Thread Contention

```sql
-- Check for InnoDB synchronization waits
SELECT EVENT_NAME, COUNT_STAR, SUM_TIMER_WAIT / 1e9 AS total_ms
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'wait/synch/mutex/innodb%'
   OR EVENT_NAME LIKE 'wait/synch/sxlock/innodb%'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- Check current thread states
SELECT STATE, COUNT(*) AS count
FROM information_schema.PROCESSLIST
GROUP BY STATE
ORDER BY count DESC;
```

Threads stuck waiting to enter InnoDB indicate the concurrency limit is too low. You can also check `SHOW ENGINE INNODB STATUS` and look for "queries in queue" in the SEMAPHORES section.

## When to Increase vs. Decrease the Limit

Increase `innodb_thread_concurrency` when:
- You have many CPUs and threads are queuing unnecessarily
- Throughput drops but CPU utilization is low

Decrease the limit when:
- You see high CPU with low throughput (thrashing)
- Many threads are in contention for the same data

## Summary

`innodb_thread_concurrency` limits simultaneous threads inside InnoDB to prevent CPU thrashing. The default of 0 (unlimited) works for most systems. For high-concurrency environments, start with 2 x CPU count and tune based on monitoring. Use `innodb_concurrency_tickets` to balance fairness vs. overhead. Monitor `PROCESSLIST` for threads stuck waiting on concurrency.

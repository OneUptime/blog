# How to Configure InnoDB Spin Wait Settings in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Spin Wait, Performance

Description: Learn how InnoDB spin waits work for mutex and rw-lock contention, and how to tune spin loop delay and spin rounds to balance CPU usage and latency.

---

## What Are Spin Waits?

When InnoDB threads need to acquire a mutex or read-write lock that is already held, they do not immediately block on an OS semaphore. Instead, they briefly spin - looping in a busy-wait - on the assumption that the lock will be released very soon. Spinning avoids the high cost of an OS context switch for short contentions.

If the lock is not acquired within the spin budget, the thread yields the CPU and eventually suspends on an OS wait.

```text
Thread wants lock
  |
  v
Spin loop (busy-wait, max innodb_sync_spin_loops iterations)
  Each iteration: random delay of 0..innodb_spin_wait_delay-1 * innodb_spin_wait_pause_multiplier PAUSE instructions
  |
  +-- Lock acquired --> continue
  |
  +-- Loops exhausted --> OS wait (suspend on semaphore)
```

## Key Configuration Variables

```sql
SHOW VARIABLES LIKE 'innodb_spin%';
SHOW VARIABLES LIKE 'innodb_sync%';
```

```text
innodb_spin_wait_delay         - upper bound for random delay (in PAUSE instructions) per spin iteration
innodb_spin_wait_pause_multiplier - multiplier for PAUSE instructions per round
innodb_sync_spin_loops         - max spin rounds before OS sleep
```

Default values (MySQL 8.0):

```text
innodb_spin_wait_delay         = 6
innodb_spin_wait_pause_multiplier = 50
innodb_sync_spin_loops         = 30
```

## Tuning for Low-Core vs. High-Core Systems

On a machine with few CPU cores, spinning wastes CPU that other threads could use. Reduce spin loops:

```text
[mysqld]
innodb_sync_spin_loops = 10
innodb_spin_wait_delay = 2
```

On high-core NUMA systems with many parallel queries, slightly longer spins can reduce OS scheduler overhead:

```text
[mysqld]
innodb_sync_spin_loops = 50
innodb_spin_wait_delay = 10
```

## Monitoring Spin Waits

```sql
-- OS waits vs. spin rounds via SHOW ENGINE INNODB STATUS
SHOW ENGINE INNODB STATUS\G
-- Look for the SEMAPHORES section (MySQL 8.0):
-- RW-shared spins 4, rounds 8, OS waits 4
-- RW-excl spins 2, rounds 60, OS waits 2
-- RW-sx spins 0, rounds 0, OS waits 0
-- For mutex-specific stats, use:
SHOW ENGINE INNODB MUTEX;

-- Or via Performance Schema
SELECT event_name,
       count_star,
       sum_timer_wait / 1e9 AS total_wait_sec
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE event_name LIKE 'wait/synch/mutex/innodb/%'
ORDER BY sum_timer_wait DESC
LIMIT 10;
```

## Interpreting the SEMAPHORES Section

```text
In MySQL 8.0, the SEMAPHORES section shows RW-lock statistics:

RW-shared spins X, rounds Y, OS waits Z
RW-excl spins X, rounds Y, OS waits Z
RW-sx spins X, rounds Y, OS waits Z
Spin rounds per wait: N.NN RW-shared, N.NN RW-excl, N.NN RW-sx

- X (spins) = total times a thread tried to acquire a held rw-lock
- Y (rounds) = total spin rounds across all waits
- Z (OS waits) = times the spin budget was exhausted and thread suspended

For mutex statistics, use SHOW ENGINE INNODB MUTEX.

If OS waits / spins > 0.1 (more than 10% of waits go to OS):
  -> Significant contention; review hot code paths or increase innodb_buffer_pool_instances
```

## Example: Diagnosing Buffer Pool Mutex Contention

```sql
-- Find hot mutexes
SELECT event_name, count_star, sum_timer_wait / 1e9 AS wait_sec
FROM performance_schema.events_waits_summary_by_instance
WHERE event_name LIKE '%buf_pool%'
ORDER BY sum_timer_wait DESC;
```

If buffer pool mutex contention is high, increase instances:

```text
[mysqld]
innodb_buffer_pool_instances = 16
```

## Dynamic Adjustment

Both `innodb_spin_wait_delay` and `innodb_sync_spin_loops` can be changed at runtime:

```sql
SET GLOBAL innodb_spin_wait_delay = 4;
SET GLOBAL innodb_sync_spin_loops = 20;
```

Monitor `SHOW ENGINE INNODB STATUS` before and after to measure the impact.

## Summary

InnoDB spin waits let threads avoid expensive OS context switches by busy-waiting for locks for a short window controlled by `innodb_sync_spin_loops` and `innodb_spin_wait_delay`. On low-core systems, reduce spin loops to avoid CPU starvation. On high-core servers, moderate spinning lowers OS scheduler overhead. Monitor the ratio of OS waits to spin waits in SHOW ENGINE INNODB STATUS to determine if tuning is needed.

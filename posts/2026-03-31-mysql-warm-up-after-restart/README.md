# How to Handle MySQL Warm-Up After a Restart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Buffer Pool, Performance, Warm-Up

Description: Learn how to warm up MySQL InnoDB buffer pool after a restart to restore peak performance quickly using buffer pool dump and restore features.

---

## The MySQL Cold Start Problem

When MySQL restarts, the InnoDB buffer pool is empty. All data must be read from disk rather than memory. For a large production database with a multi-GB working set, this means:
- Queries that normally complete in milliseconds take seconds
- Disk I/O spikes to maximum IOPS
- Error rate and latency SLAs may be breached for 15-60 minutes after restart

Warm-up reduces this cold-start period by pre-loading the buffer pool with the pages MySQL was using before the restart.

## InnoDB Buffer Pool Dump and Load

MySQL can save and restore the list of pages in the buffer pool. This is the most effective warm-up strategy:

**Enable automatic dump on shutdown and load on startup:**

```ini
[mysqld]
innodb_buffer_pool_dump_at_shutdown = ON
innodb_buffer_pool_load_at_startup = ON
innodb_buffer_pool_dump_pct = 25
```

`innodb_buffer_pool_dump_pct = 25` saves the 25% most recently accessed pages. A higher percentage means more complete warm-up but longer startup time.

**Manually trigger a dump before planned restarts:**

```sql
SET GLOBAL innodb_buffer_pool_dump_now = ON;
```

Verify the dump file was created:

```bash
ls -lh /var/lib/mysql/ib_buffer_pool
```

**Manually trigger a load after restart:**

```sql
SET GLOBAL innodb_buffer_pool_load_now = ON;
```

Monitor load progress:

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Innodb_buffer_pool_load_status',
  'Innodb_buffer_pool_dump_status'
);
```

## Checking Warm-Up Progress

The buffer pool hit rate reflects warm-up progress. Query it every 30 seconds after restart:

```sql
SELECT
  ROUND(
    (SUM(HIT_RATE) / COUNT(*)) / 10, 2
  ) AS avg_hit_rate_pct
FROM information_schema.INNODB_BUFFER_POOL_STATS;
```

Note: The `HIT_RATE` column returns a value per 1000 page accesses (0-1000), so dividing by 10 converts it to a percentage.

A healthy warm hit rate is 99%+. During warm-up, this starts lower and climbs as pages are loaded.

## Pre-Warming with a Query Script

If you cannot use buffer pool dump (e.g., after a crash), run a script that SELECT-scans hot tables to load their pages into memory:

```sql
-- Force InnoDB to read all index pages for hot tables
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;

-- Scan recent data that is likely to be queried
SELECT COUNT(*) FROM orders
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

`COUNT(*)` forces MySQL to scan the index without returning full rows to the client, loading pages into the buffer pool efficiently.

## Gradual Traffic Ramp

In load-balanced environments, do not send full production traffic to a restarted MySQL server until it is warmed up. Use a health check that verifies buffer pool hit rate:

```python
import mysql.connector

def is_warm(threshold_pct: float = 90.0) -> bool:
    conn = mysql.connector.connect(
        host="localhost", user="monitor", password="secret"
    )
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ROUND(AVG(HIT_RATE) / 10, 2) AS hit_rate
        FROM information_schema.INNODB_BUFFER_POOL_STATS
    """)
    hit_rate = cursor.fetchone()[0] or 0
    conn.close()
    return hit_rate >= threshold_pct

# Only mark healthy once warm
if is_warm(90.0):
    print("Ready to serve traffic")
else:
    print("Still warming up")
```

Register this check in your load balancer health endpoint to delay traffic until the buffer pool is sufficiently warm.

## Tuning innodb_buffer_pool_dump_pct

For large buffer pools (64+ GB), saving 100% of pages takes significant time and disk space. Tune based on your working set size:

```sql
SET GLOBAL innodb_buffer_pool_dump_pct = 50;
SET GLOBAL innodb_buffer_pool_dump_now = ON;
```

Start with 25% and increase if post-restart performance is still inadequate after load.

## Summary

Warm up MySQL after a restart using `innodb_buffer_pool_dump_at_shutdown` and `innodb_buffer_pool_load_at_startup` to persist and reload the working set. Trigger a manual dump before planned restarts and monitor load progress with `Innodb_buffer_pool_load_status`. For load-balanced setups, delay traffic to restarted instances until the buffer pool hit rate reaches 90%+ by using a custom health check.

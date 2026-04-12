# How to Handle Long-Running ALTER TABLE Operations in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ALTER TABLE, Performance, Schema Migration

Description: Learn how to monitor, throttle, and safely manage long-running ALTER TABLE operations in MySQL to minimize production impact.

---

Some `ALTER TABLE` operations on large tables can take hours. Understanding how to monitor progress, control impact, and safely interrupt or resume them is essential for production environments.

## Why ALTER TABLE Takes Long

Operations requiring a full table copy are slow because MySQL:
1. Creates a temporary copy of the table with the new schema
2. Copies every row
3. Rebuilds all indexes
4. Renames the copy to replace the original

For a 100 GB table with millions of rows, this can take hours.

## Checking If an ALTER is Running

```sql
SELECT ID, USER, TIME, STATE, INFO
FROM   information_schema.PROCESSLIST
WHERE  INFO LIKE 'ALTER%'
   OR  STATE LIKE '%copy%'
   OR  STATE LIKE '%alter%';
```

## Monitoring Progress With Performance Schema

```sql
SELECT
    EVENT_NAME,
    WORK_COMPLETED,
    WORK_ESTIMATED,
    ROUND(WORK_COMPLETED / WORK_ESTIMATED * 100, 1) AS pct_complete
FROM performance_schema.events_stages_current
JOIN performance_schema.threads USING (THREAD_ID)
WHERE EVENT_NAME LIKE '%stage/innodb/alter%';
```

## Checking Replication Lag During ALTER

```sql
-- On a replica
SHOW REPLICA STATUS\G
-- Look at Seconds_Behind_Source
```

If replication lag spikes, consider pausing the alter with pt-osc or gh-ost instead of a native ALTER.

## Safely Killing a Long ALTER

```sql
-- Find the process ID
SHOW PROCESSLIST;

-- Kill it (MySQL will rollback and leave the table intact)
KILL 12345;
```

After killing a `COPY` algorithm alter, MySQL rolls back the temporary table. The original table is unaffected. An `INPLACE` alter that has not completed the final swap is also safe to kill.

## Preventing Metadata Lock Waits

An ALTER waits for a metadata lock if any open transaction holds the table. Set a timeout:

```sql
SET lock_wait_timeout = 30;
ALTER TABLE orders ADD COLUMN notes TEXT NULL;
```

If the lock is not acquired within 30 seconds, the ALTER fails cleanly instead of blocking indefinitely.

## Using pt-osc With Throttling for Long Migrations

```bash
pt-online-schema-change \
    --host=127.0.0.1 \
    --user=appuser \
    --password=secret \
    --alter="MODIFY COLUMN body LONGTEXT NOT NULL" \
    --chunk-size=500 \
    --sleep=0.1 \
    --max-load="Threads_running=25" \
    --critical-load="Threads_running=50" \
    --execute \
    D=myapp,t=events
```

`--max-load` pauses the tool when server load is high. `--critical-load` aborts it.

## Scheduling During Low-Traffic Windows

For alters that cannot run online, schedule them during maintenance windows:

```bash
# Run at 2 AM on Sunday using cron (uses ~/.my.cnf for credentials)
0 2 * * 0 mysql --defaults-file=/root/.my.cnf myapp -e "ALTER TABLE large_table MODIFY COLUMN col BIGINT NOT NULL;"
```

## Summary

Monitor long-running ALTERs with `PROCESSLIST` and `performance_schema.events_stages_current`. Set `lock_wait_timeout` to prevent indefinite metadata lock waits. Killing an in-progress ALTER is safe - MySQL rolls back the temporary table. For minimal production impact, use pt-osc or gh-ost with `--max-load` throttling instead of native ALTER for large tables.

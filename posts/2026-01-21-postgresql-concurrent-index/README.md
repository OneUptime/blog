# How to Create Indexes Concurrently in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Indexes, CONCURRENTLY, Zero Downtime, Performance

Description: A guide to creating PostgreSQL indexes without blocking queries using CONCURRENTLY, including best practices and troubleshooting.

---

Standard index creation locks the table. CONCURRENTLY allows index creation without blocking reads or writes.

## Standard vs Concurrent Index Creation

```sql
-- Standard (blocks writes)
CREATE INDEX idx_users_email ON users(email);

-- Concurrent (no blocking)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

## How It Works

```
Standard Index:
1. Lock table (ACCESS EXCLUSIVE)
2. Scan table, build index
3. Release lock

Concurrent Index:
1. Scan table (snapshot 1)
2. Build initial index
3. Scan again for changes (snapshot 2)
4. Merge changes
5. Mark index valid
```

## Best Practices

### Set Statement Timeout

```sql
-- Prevent long-running index builds from being killed
SET statement_timeout = 0;
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### Check Progress (PostgreSQL 12+)

```sql
SELECT
    relname,
    phase,
    blocks_total,
    blocks_done,
    ROUND(100.0 * blocks_done / NULLIF(blocks_total, 0), 2) AS pct_done
FROM pg_stat_progress_create_index;
```

### Handle Failures

```sql
-- If concurrent index fails, it's left INVALID
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE NOT indisvalid;

-- Drop invalid index and retry
DROP INDEX CONCURRENTLY idx_users_email;
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

## Reindex Concurrently

```sql
-- Rebuild index without locking (PostgreSQL 12+)
REINDEX INDEX CONCURRENTLY idx_users_email;

-- Rebuild all indexes on table
REINDEX TABLE CONCURRENTLY users;
```

## Limitations

- Takes longer than standard creation
- Cannot be run in a transaction
- Requires more resources (two scans)
- Can fail and leave invalid index

## Unique Index Considerations

```sql
-- Concurrent unique index
CREATE UNIQUE INDEX CONCURRENTLY idx_users_email_unique ON users(email);

-- May fail if duplicates exist during creation
-- Clean up duplicates first
```

## Monitoring

```sql
-- Check index creation progress
SELECT * FROM pg_stat_progress_create_index;

-- Check for blocking
SELECT * FROM pg_locks WHERE relation = 'users'::regclass;
```

## Conclusion

Always use CONCURRENTLY for index operations on production tables. Monitor progress and handle failures gracefully.

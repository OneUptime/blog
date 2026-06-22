# How to Add Columns Without Long Locks in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Schema Change, Zero Downtime, DDL, Migration

Description: A guide to adding columns to PostgreSQL tables without long blocking operations, covering safe operations and multi-step migration strategies.

---

Adding columns briefly locks tables and can block queries if the operation rewrites or scans a large table. This guide covers safe techniques for zero-downtime column additions.

## Safe Operations (Short Lock, No Rewrite)

### Add Nullable Column

```sql
-- Metadata-only change with a brief ACCESS EXCLUSIVE lock
ALTER TABLE users ADD COLUMN nickname VARCHAR(100);
```

### Add Column with Default (PostgreSQL 11+)

```sql
-- Fast in PostgreSQL 11+ for non-volatile defaults
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Older versions required table rewrite
```

## Dangerous Operations

### Add NOT NULL Without Default

```sql
-- AVOID: Fails on existing rows because the new column would be NULL
ALTER TABLE users ADD COLUMN age INTEGER NOT NULL;
```

### Add Column with Volatile Default

```sql
-- AVOID: Rewrites table
ALTER TABLE users ADD COLUMN observed_at TIMESTAMP DEFAULT clock_timestamp();
-- Add the column first, backfill it, then add the default separately
```

## Safe Migration Pattern

### Step 1: Add Nullable Column

```sql
ALTER TABLE users ADD COLUMN new_status VARCHAR(20);
```

### Step 2: Backfill Data (Batched)

```sql
-- Backfill in batches
UPDATE users SET new_status = 'active'
WHERE id BETWEEN 1 AND 10000 AND new_status IS NULL;

UPDATE users SET new_status = 'active'
WHERE id BETWEEN 10001 AND 20000 AND new_status IS NULL;
```

### Step 3: Add NOT NULL Constraint

```sql
-- Add constraint with NOT VALID (no scan)
ALTER TABLE users ADD CONSTRAINT users_status_not_null
    CHECK (new_status IS NOT NULL) NOT VALID;

-- Validate separately with a weaker lock
ALTER TABLE users VALIDATE CONSTRAINT users_status_not_null;

-- Or make column NOT NULL (scans table)
ALTER TABLE users ALTER COLUMN new_status SET NOT NULL;
```

## Check Lock Status

```sql
-- Monitor locks during migration
SELECT
    locktype,
    relation::regclass,
    mode,
    granted,
    pid
FROM pg_locks
WHERE relation = 'users'::regclass;
```

## Best Practices

1. **Add nullable columns** - Metadata-only, with only a brief lock
2. **Backfill in batches** - Avoid long transactions
3. **Use NOT VALID constraints** - Add without scanning
4. **Validate separately** - During low traffic
5. **Test on staging** - Verify lock behavior

## Conclusion

PostgreSQL 11+ allows most column additions without table rewrites, though `ALTER TABLE` still takes a brief lock. Use nullable columns and multi-step migrations for safe schema evolution.

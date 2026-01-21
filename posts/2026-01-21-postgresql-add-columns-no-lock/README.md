# How to Add Columns Without Locking in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Schema Changes, Zero Downtime, DDL, Migrations

Description: A guide to adding columns to PostgreSQL tables without blocking queries, covering safe operations and multi-step migration strategies.

---

Adding columns can lock tables and block queries. This guide covers safe techniques for zero-downtime column additions.

## Safe Operations (No Lock)

### Add Nullable Column

```sql
-- Instant, no lock (PostgreSQL 11+)
ALTER TABLE users ADD COLUMN nickname VARCHAR(100);
```

### Add Column with Default (PostgreSQL 11+)

```sql
-- Instant in PostgreSQL 11+
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Older versions required table rewrite
```

## Dangerous Operations

### Add NOT NULL Without Default

```sql
-- AVOID: Requires table scan
ALTER TABLE users ADD COLUMN age INTEGER NOT NULL;
-- This will fail on existing rows anyway
```

### Add Column with Volatile Default

```sql
-- AVOID: Rewrites table
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
-- Use DEFAULT CURRENT_TIMESTAMP instead
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

-- Validate in background
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

1. **Add nullable columns** - Always safe
2. **Backfill in batches** - Avoid long transactions
3. **Use NOT VALID constraints** - Add without scanning
4. **Validate separately** - During low traffic
5. **Test on staging** - Verify lock behavior

## Conclusion

PostgreSQL 11+ allows most column additions without table locks. Use nullable columns and multi-step migrations for safe schema evolution.

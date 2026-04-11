# How to Roll Back a Failed Schema Migration in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Rollback, Schema Migration, Recovery

Description: Learn strategies for rolling back failed MySQL schema migrations, from manual reversal scripts to tool-assisted undo operations with Flyway and Liquibase.

---

Schema migrations can fail partway through, leaving the database in an inconsistent state. Having a rollback strategy before you start a migration is as important as the migration itself.

## The Golden Rule: Always Write a Rollback Script

Before running any migration, write its inverse. Keep them paired in version control:

```sql
-- migrate: V5__add_priority_to_orders.sql
ALTER TABLE orders
    ADD COLUMN priority TINYINT NOT NULL DEFAULT 0,
    ADD KEY idx_priority (priority);

-- rollback: V5__rollback_add_priority.sql
ALTER TABLE orders
    DROP KEY idx_priority,
    DROP COLUMN priority;
```

## Using Transactions for DML Migrations

DDL statements (ALTER TABLE, CREATE TABLE) are not transactional in MySQL. However, DML migrations can be wrapped in transactions:

```sql
START TRANSACTION;

UPDATE users SET role = 'viewer' WHERE role = 'guest';

-- If something goes wrong, roll back:
-- ROLLBACK;

-- If everything looks good, commit:
COMMIT;
```

## Flyway Rollback

Flyway community edition requires manual undo scripts. Flyway Teams supports `flyway undo`:

```sql
-- U5__add_priority_to_orders.sql (undo migration)
ALTER TABLE orders DROP KEY idx_priority, DROP COLUMN priority;
```

```bash
# Apply undo for the last applied version
flyway undo
```

Without Flyway Teams, execute the rollback SQL manually and then delete or reclassify the failed migration entry:

```sql
DELETE FROM flyway_schema_history WHERE version = '5';
```

## Liquibase Rollback

Liquibase supports rollback if rollback blocks are defined in the changeset:

```bash
# Roll back the last 1 changeset
liquibase rollback-count --count=1

# Roll back to a tag
liquibase rollback --tag=v1.0
```

## Manual Rollback for Failed ALTER TABLE

If an ALTER TABLE failed midway (e.g., killed or disk full), check whether the original table is intact:

```sql
-- Verify the table schema is as expected
DESCRIBE orders;
SHOW CREATE TABLE orders\G

-- If a temp table was left behind, remove it
DROP TABLE IF EXISTS `_orders_new`;
```

## Handling a Failed NOT NULL Migration

A common failure scenario: converting a column to NOT NULL when existing rows have NULLs.

```sql
-- This fails if any row has a NULL email
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL;

-- Rollback: revert the column to nullable
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL;

-- Fix the data first
UPDATE users SET email = CONCAT('unknown_', id, '@example.com') WHERE email IS NULL;

-- Then re-run the migration
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL;
```

## Smoke Test Before Rollback

Before rolling back, verify whether the migration actually applied:

```sql
-- Check if the column exists
SELECT COUNT(*) FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'myapp'
  AND TABLE_NAME   = 'orders'
  AND COLUMN_NAME  = 'priority';
```

## Summary

Always write rollback scripts paired with each migration before executing. DDL is not transactional - rely on paired rollback scripts for ALTER TABLE. Flyway and Liquibase both support undo operations with paid tiers or explicit undo changesets. After a failed migration, verify the table state before running the rollback to avoid double-applying the inverse.

# How to Rename Tables and Columns Safely in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Schema Changes, Zero Downtime, DDL, Migrations

Description: A guide to safely renaming PostgreSQL tables and columns without downtime, covering strategies for backward compatibility.

---

Renaming tables and columns requires careful planning to avoid breaking applications. This guide covers safe renaming strategies.

## Simple Renames (Quick)

### Rename Table

```sql
-- Instant operation, but breaks queries using old name
ALTER TABLE old_name RENAME TO new_name;
```

### Rename Column

```sql
-- Instant, breaks queries using old column name
ALTER TABLE users RENAME COLUMN old_column TO new_column;
```

## Zero-Downtime Strategy

### For Tables

```sql
-- Step 1: Create view with old name
ALTER TABLE users RENAME TO users_v2;
CREATE VIEW users AS SELECT * FROM users_v2;

-- Step 2: Update application to use new name

-- Step 3: Drop view when ready
DROP VIEW users;
```

### For Columns

```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN new_name VARCHAR(100);

-- Step 2: Copy data
UPDATE users SET new_name = old_name WHERE new_name IS NULL;

-- Step 3: Add trigger for new writes
CREATE OR REPLACE FUNCTION sync_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.new_name := NEW.old_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_column_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION sync_column();

-- Step 4: Update application to use new column

-- Step 5: Remove old column and trigger
DROP TRIGGER sync_column_trigger ON users;
ALTER TABLE users DROP COLUMN old_name;
```

## Using Views for Compatibility

```sql
-- Create compatibility view
CREATE VIEW old_table_name AS
SELECT
    id,
    email,
    new_column_name AS old_column_name
FROM new_table_name;

-- Grant permissions
GRANT SELECT ON old_table_name TO app_user;
```

## Rename with Dependencies

```sql
-- Check dependencies first
SELECT
    dependent_ns.nspname AS dependent_schema,
    dependent_view.relname AS dependent_view
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_namespace AS dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
WHERE pg_depend.refobjid = 'users'::regclass;

-- Recreate dependent views after rename
```

## Foreign Keys

```sql
-- Foreign keys update automatically
-- But check constraint names
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE confrelid = 'old_table'::regclass;
```

## Best Practices

1. **Use views for transition** - Maintain compatibility
2. **Update application first** - If possible
3. **Batch column changes** - Minimize deployments
4. **Check dependencies** - Views, functions, triggers
5. **Test thoroughly** - Staging environment
6. **Document changes** - Clear migration notes

## Conclusion

Rename tables and columns safely using views and multi-step migrations. Plan for backward compatibility during the transition period.

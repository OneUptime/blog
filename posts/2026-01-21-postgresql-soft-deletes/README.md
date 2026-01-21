# How to Implement Soft Deletes in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Soft Deletes, Data Management, Audit, Recovery

Description: A guide to implementing soft deletes in PostgreSQL, covering design patterns, queries, and best practices for logical deletion.

---

Soft deletes mark records as deleted without removing them, enabling recovery and audit trails. This guide covers implementation patterns.

## Basic Implementation

### Table Structure

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for filtering
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;
```

### Soft Delete Operation

```sql
-- Soft delete
UPDATE users SET deleted_at = NOW() WHERE id = 123;

-- Query active records only
SELECT * FROM users WHERE deleted_at IS NULL;
```

## View for Active Records

```sql
-- Create view for convenience
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

-- Query using view
SELECT * FROM active_users WHERE email LIKE '%@company.com';
```

## Automatic Filtering with RLS

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy to hide deleted records
CREATE POLICY hide_deleted ON users
    FOR SELECT
    USING (deleted_at IS NULL);

-- Admin can see all
CREATE POLICY admin_see_all ON users
    FOR SELECT
    TO admin_role
    USING (true);
```

## Trigger for Soft Delete

```sql
-- Convert DELETE to soft delete
CREATE OR REPLACE FUNCTION soft_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET deleted_at = NOW() WHERE id = OLD.id;
    RETURN NULL;  -- Prevent actual delete
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_soft_delete
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION soft_delete_trigger();
```

## Restore Deleted Records

```sql
-- Restore single record
UPDATE users SET deleted_at = NULL WHERE id = 123;

-- Restore records deleted in last hour
UPDATE users SET deleted_at = NULL
WHERE deleted_at > NOW() - INTERVAL '1 hour';
```

## Hard Delete (Purge)

```sql
-- Permanently delete old soft-deleted records
DELETE FROM users
WHERE deleted_at IS NOT NULL
AND deleted_at < NOW() - INTERVAL '90 days';
```

## Foreign Key Considerations

```sql
-- Cascading soft deletes
CREATE OR REPLACE FUNCTION cascade_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders SET deleted_at = NOW()
    WHERE user_id = NEW.id AND NEW.deleted_at IS NOT NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_cascade_delete
    AFTER UPDATE OF deleted_at ON users
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION cascade_soft_delete();
```

## Query Patterns

```sql
-- Include deleted records (admin view)
SELECT * FROM users;  -- Without RLS

-- Only deleted records
SELECT * FROM users WHERE deleted_at IS NOT NULL;

-- Recently deleted
SELECT * FROM users
WHERE deleted_at > NOW() - INTERVAL '7 days'
ORDER BY deleted_at DESC;
```

## Best Practices

1. **Add deleted_at index** - Filter performance
2. **Use views or RLS** - Consistent filtering
3. **Consider cascading** - Related records
4. **Implement purge policy** - Don't keep forever
5. **Unique constraints** - Handle carefully
6. **Document behavior** - Clear for developers

## Handling Unique Constraints

```sql
-- Option 1: Partial unique index (active only)
CREATE UNIQUE INDEX idx_users_email_active
ON users(email) WHERE deleted_at IS NULL;

-- Option 2: Include deleted_at in constraint
CREATE UNIQUE INDEX idx_users_email_unique
ON users(email, COALESCE(deleted_at, '1970-01-01'));
```

## Conclusion

Soft deletes provide data recovery and audit capabilities. Implement with proper indexing, consistent filtering, and a purge strategy for old records.

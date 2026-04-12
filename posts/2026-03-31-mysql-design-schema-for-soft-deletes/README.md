# How to Design a Schema for Soft Deletes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Soft Delete, Schema Design, Data Retention

Description: Learn how to implement soft deletes in MySQL with a deleted_at timestamp, covering index strategies, query patterns, and restoration.

---

Soft deletes mark rows as deleted rather than physically removing them. This preserves history, enables recovery, and satisfies compliance requirements. The standard implementation uses a `deleted_at` timestamp column.

## Adding Soft Delete to a Table

```sql
CREATE TABLE users (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email      VARCHAR(255) NOT NULL,
    name       VARCHAR(150) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_email_active (email, deleted_at)
);
```

Note the compound unique key on `(email, deleted_at)`: this allows the same email to be reused after soft deletion because each deleted row has a unique timestamp. However, MySQL treats multiple NULLs as distinct in a unique index, so this constraint does **not** prevent two active rows (both with `deleted_at = NULL`) from having the same email. To enforce email uniqueness among active rows, use application-level checks or a generated column approach.

## Performing a Soft Delete

```sql
UPDATE users
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = 42;
```

## Querying Only Active Rows

All queries must include the soft-delete filter:

```sql
SELECT id, email, name
FROM   users
WHERE  deleted_at IS NULL;
```

## Using a View to Simplify Queries

```sql
CREATE VIEW active_users AS
SELECT id, email, name, created_at
FROM   users
WHERE  deleted_at IS NULL;
```

Application code can query `active_users` without repeating the filter.

## Restoring a Soft-Deleted Row

```sql
UPDATE users
SET deleted_at = NULL
WHERE id = 42;
```

## Index Strategy

Without a proper index, every query scans all rows including soft-deleted ones. Use a partial-index equivalent through a filtered approach:

```sql
-- Standard index - still scans deleted rows
KEY idx_email (email);

-- Better: compound index that MySQL can use for IS NULL lookups
KEY idx_active_email (deleted_at, email);
```

With `deleted_at` first, queries like `WHERE deleted_at IS NULL AND email = ?` can use the index efficiently.

## Handling Unique Constraints After Soft Delete

A user soft-deleted and then re-registered needs a unique email slot. One option is to set `deleted_at` to a non-NULL sentinel like the deleted timestamp, and use application logic to check:

```sql
-- Check if email exists in active rows before inserting
SELECT COUNT(*) FROM users
WHERE email = 'alice@example.com'
  AND deleted_at IS NULL;
```

## Purging Old Soft-Deleted Rows

```sql
-- Permanently delete rows soft-deleted more than 1 year ago
DELETE FROM users
WHERE deleted_at < NOW() - INTERVAL 1 YEAR;
```

## Summary

Implement soft deletes by adding a nullable `deleted_at` DATETIME column and filtering `WHERE deleted_at IS NULL` in all queries. Use a view to enforce the filter automatically. Create compound indexes with `deleted_at` as the leading column for efficient active-row lookups. Schedule periodic purges to prevent unbounded growth of deleted rows.

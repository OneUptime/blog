# How to Implement Soft Deletes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema, Pattern, Data, Index

Description: Learn how to implement soft deletes in MySQL using a deleted_at column to preserve data while hiding logically deleted records from queries.

---

## What Are Soft Deletes?

Soft deletes mark records as deleted without physically removing them from the database. Instead of `DELETE FROM users WHERE id = 1`, you set a `deleted_at` timestamp column. The record remains in the table for audit history, foreign key integrity, and potential restoration.

## Schema Design

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_deleted_at (deleted_at)
);
```

The `deleted_at` column is `NULL` for active records and holds the deletion timestamp for soft-deleted records.

## Basic Operations

```sql
-- Soft delete a user
UPDATE users
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = 42;

-- Restore a soft-deleted user
UPDATE users
SET deleted_at = NULL
WHERE id = 42;

-- Query only active records
SELECT * FROM users WHERE deleted_at IS NULL;

-- Query only deleted records
SELECT * FROM users WHERE deleted_at IS NOT NULL;

-- Query all records (active and deleted)
SELECT * FROM users;
```

## Using Views to Simplify Queries

Create a view that automatically filters out deleted records:

```sql
CREATE VIEW active_users AS
SELECT id, email, name, created_at, updated_at
FROM users
WHERE deleted_at IS NULL;

-- Application queries always use the view
SELECT * FROM active_users WHERE email = 'john@example.com';
```

## Enforcing Unique Constraints with Soft Deletes

A common problem: you want unique emails, but soft-deleted users should not block re-registration. MySQL does not support conditional unique indexes natively, but you can work around this:

```sql
-- Option 1: Use a generated column for conditional uniqueness
ALTER TABLE users
    ADD COLUMN active_email VARCHAR(255) GENERATED ALWAYS AS
        (IF(deleted_at IS NULL, email, NULL)) STORED,
    ADD UNIQUE INDEX uq_active_email (active_email);
-- active_email holds the email for active records and NULL for deleted ones.
-- MySQL allows multiple NULLs in unique indexes, so deleted records
-- never conflict, while active records are enforced as unique.

-- Note: A composite unique index on (email, deleted_at) does NOT work
-- for this purpose because NULL != NULL in MySQL unique indexes,
-- meaning multiple active rows (deleted_at IS NULL) with the same
-- email would all be allowed.

-- Option 2: Mutate the email on soft delete to avoid conflicts
UPDATE users
SET deleted_at = CURRENT_TIMESTAMP,
    email = CONCAT(email, '_deleted_', UNIX_TIMESTAMP())
WHERE id = 42;
```

## Cascading Soft Deletes with Triggers

```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10,2),
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Trigger to cascade soft delete to orders when user is soft-deleted
DELIMITER $$
CREATE TRIGGER soft_delete_user_orders
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        UPDATE orders
        SET deleted_at = NEW.deleted_at
        WHERE user_id = NEW.id
          AND deleted_at IS NULL;
    END IF;
END$$
DELIMITER ;
```

## Index Strategy for Performance

```sql
-- Partial index workaround using generated column
ALTER TABLE users
    ADD COLUMN is_deleted TINYINT(1) GENERATED ALWAYS AS
        (IF(deleted_at IS NULL, 0, 1)) STORED,
    ADD INDEX idx_active_email (is_deleted, email);

-- Efficient query for active users by email
SELECT * FROM users
WHERE is_deleted = 0
  AND email = 'john@example.com';
```

## Scheduled Cleanup

```sql
-- Hard-delete records soft-deleted more than 90 days ago
DELETE FROM users
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL 90 DAY;
```

## Summary

Soft deletes in MySQL provide a safety net for data deletion by using a `deleted_at` timestamp column instead of physical removal. This pattern preserves audit history and enables recovery while keeping active record queries clean through views. The key challenges - unique constraint handling and index performance - are solvable with composite indexes, generated columns, and triggers for cascade behavior.

# How to Handle MySQL Schema Design Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema, Design, Normalization, Best Practice

Description: Learn MySQL schema design best practices covering data types, normalization, indexes, foreign keys, and audit columns to build databases that scale and stay maintainable.

---

Schema design decisions made at the start of a project shape performance, maintainability, and migration complexity for the lifetime of the application. A well-designed MySQL schema uses appropriate data types, proper normalization, strategic indexes, and enforces referential integrity.

## Choose the Right Data Types

Oversized columns waste storage and slow down comparisons. Use the smallest type that correctly represents the data:

```sql
-- Bad: uses VARCHAR for boolean and INT for a two-value status
is_active VARCHAR(10),  -- stores 'true' or 'false'
account_type INT,       -- stores 0 or 1

-- Good
is_active    TINYINT(1) NOT NULL DEFAULT 1,
account_type TINYINT UNSIGNED NOT NULL DEFAULT 0,
price        DECIMAL(10,2) NOT NULL,   -- never FLOAT for money
name         VARCHAR(200) NOT NULL,    -- not TEXT unless you need >65535 chars
description  TEXT,
created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
```

## Always Define a Primary Key

Every table needs a primary key. For most tables, use a `BIGINT UNSIGNED AUTO_INCREMENT`:

```sql
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
```

Expose a UUID to external systems while using the integer `id` internally for joins:

```sql
id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
uuid CHAR(36) NOT NULL DEFAULT (UUID()),
UNIQUE KEY uq_uuid (uuid)
```

## Enforce Referential Integrity with Foreign Keys

Foreign keys prevent orphaned rows and document relationships:

```sql
CREATE TABLE orders (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX idx_customer_id (customer_id)
);
```

InnoDB automatically creates an index on the foreign key column if one does not already exist. Defining it explicitly, as shown above, gives you control over the index name and makes the schema self-documenting.

## Index for Your Query Patterns

Add indexes based on actual query patterns, not guesses:

```sql
-- Single column for simple equality filters
ALTER TABLE orders ADD INDEX idx_status (status);

-- Composite for combined filters - leftmost column must match the leading WHERE clause
ALTER TABLE orders ADD INDEX idx_status_created (status, created_at);

-- Covering index for a frequent query that reads specific columns
ALTER TABLE orders ADD INDEX idx_covering (status, created_at, id, total_amount);
```

Do not add indexes speculatively. Each index increases write overhead and storage.

## Add Audit Columns to Every Table

```sql
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

For soft deletes:

```sql
deleted_at DATETIME DEFAULT NULL,
INDEX idx_deleted_at (deleted_at)
```

Filter active records with `WHERE deleted_at IS NULL`.

## Use Consistent Character Set and Collation

Define the character set and collation at the schema level to avoid inconsistencies:

```sql
CREATE DATABASE myapp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

`utf8mb4` supports the full Unicode range including emoji. `utf8` in MySQL is a 3-byte subset and cannot store 4-byte Unicode characters.

## Document with COMMENT

```sql
CREATE TABLE subscriptions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'Internal PK',
  customer_id BIGINT UNSIGNED NOT NULL,
  plan_code   VARCHAR(50) NOT NULL COMMENT 'Values: free, starter, pro, enterprise',
  expires_at  DATETIME COMMENT 'NULL means no expiry (lifetime plan)'
) COMMENT='Customer subscription records. One active row per customer.';
```

## Summary

Good MySQL schema design combines choosing the smallest accurate data types, enforcing referential integrity with FK constraints and matching indexes, adding audit timestamps to every table, using utf8mb4 throughout, and documenting intent with COMMENT. These decisions taken together produce schemas that are fast, self-documenting, and safe to evolve with migration tooling.

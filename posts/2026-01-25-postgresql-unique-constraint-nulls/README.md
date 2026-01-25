# How to Create Unique Constraints with NULL Values in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Unique Constraints, NULL Values, Indexes, Database Design

Description: Learn how to handle NULL values in PostgreSQL unique constraints. This guide covers partial indexes, NULLS NOT DISTINCT, and practical patterns for enforcing uniqueness with optional fields.

---

Unique constraints in PostgreSQL behave differently with NULL values than many developers expect. By default, PostgreSQL treats each NULL as distinct from every other NULL, allowing multiple rows with NULL in a unique column. This guide explains the behavior and provides solutions for different uniqueness requirements.

## Default NULL Behavior in Unique Constraints

In PostgreSQL, NULL represents an unknown value. Two unknown values are not considered equal, so unique constraints allow multiple NULLs.

```sql
-- Create a table with a unique constraint
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE
);

-- These inserts all succeed (multiple NULLs allowed)
INSERT INTO users (email, phone) VALUES ('alice@example.com', NULL);
INSERT INTO users (email, phone) VALUES ('bob@example.com', NULL);
INSERT INTO users (email, phone) VALUES ('charlie@example.com', NULL);

-- Verify: multiple rows with NULL phone
SELECT * FROM users;
-- id | email               | phone
-- ---+---------------------+-------
-- 1  | alice@example.com   | NULL
-- 2  | bob@example.com     | NULL
-- 3  | charlie@example.com | NULL
```

This is the SQL standard behavior: NULL is never equal to anything, including another NULL.

## PostgreSQL 15+: NULLS NOT DISTINCT

PostgreSQL 15 introduced the `NULLS NOT DISTINCT` option, which treats NULLs as equal for uniqueness purposes.

```sql
-- Create table with NULLS NOT DISTINCT
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    badge_number VARCHAR(20) UNIQUE NULLS NOT DISTINCT
);

-- First NULL succeeds
INSERT INTO employees (name, badge_number) VALUES ('Alice', NULL);

-- Second NULL fails (only one NULL allowed)
INSERT INTO employees (name, badge_number) VALUES ('Bob', NULL);
-- ERROR: duplicate key value violates unique constraint "employees_badge_number_key"

-- Add NULLS NOT DISTINCT to existing constraint
ALTER TABLE employees DROP CONSTRAINT employees_badge_number_key;
ALTER TABLE employees ADD CONSTRAINT employees_badge_number_key
    UNIQUE NULLS NOT DISTINCT (badge_number);
```

## Partial Unique Indexes for Pre-PostgreSQL 15

Before PostgreSQL 15, use partial indexes to achieve similar behavior.

```sql
-- Table without special constraint
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    social_security VARCHAR(11)
);

-- Partial index: unique among non-null values only
CREATE UNIQUE INDEX idx_contacts_ssn_not_null
ON contacts (social_security)
WHERE social_security IS NOT NULL;

-- Multiple NULLs still allowed
INSERT INTO contacts (name, social_security) VALUES ('Alice', NULL);
INSERT INTO contacts (name, social_security) VALUES ('Bob', NULL);  -- OK

-- But non-null values must be unique
INSERT INTO contacts (name, social_security) VALUES ('Charlie', '123-45-6789');
INSERT INTO contacts (name, social_security) VALUES ('Dave', '123-45-6789');
-- ERROR: duplicate key value violates unique constraint
```

## Allowing Only One NULL

To allow exactly one NULL value (treating NULL as a valid unique value):

```sql
-- Pre-PostgreSQL 15: Combine two partial indexes
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    driver_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(20)
);

-- Index for non-null uniqueness
CREATE UNIQUE INDEX idx_license_not_null
ON licenses (license_number)
WHERE license_number IS NOT NULL;

-- Index to allow only one NULL (constant value for all NULLs)
CREATE UNIQUE INDEX idx_license_one_null
ON licenses ((true))
WHERE license_number IS NULL;

-- First NULL succeeds
INSERT INTO licenses (driver_name, license_number) VALUES ('Alice', NULL);

-- Second NULL fails
INSERT INTO licenses (driver_name, license_number) VALUES ('Bob', NULL);
-- ERROR: duplicate key value violates unique constraint "idx_license_one_null"

-- Non-null values work as expected
INSERT INTO licenses (driver_name, license_number) VALUES ('Charlie', 'DL123456');
INSERT INTO licenses (driver_name, license_number) VALUES ('Dave', 'DL789012');
```

## Composite Unique Constraints with NULLs

The behavior gets more complex with multi-column unique constraints.

```sql
-- Default behavior: NULLs make rows distinct
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    color VARCHAR(50),
    size VARCHAR(10),
    UNIQUE (product_id, color, size)
);

-- All these succeed (NULL makes each row distinct)
INSERT INTO product_variants (product_id, color, size) VALUES (1, 'Red', 'M');
INSERT INTO product_variants (product_id, color, size) VALUES (1, 'Red', NULL);
INSERT INTO product_variants (product_id, color, size) VALUES (1, 'Red', NULL);  -- Also succeeds!

-- PostgreSQL 15+ solution
CREATE TABLE product_variants_v2 (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    color VARCHAR(50),
    size VARCHAR(10),
    UNIQUE NULLS NOT DISTINCT (product_id, color, size)
);

-- Pre-15 solution: COALESCE with sentinel value
CREATE UNIQUE INDEX idx_variants_unique
ON product_variants (product_id, COALESCE(color, '___NULL___'), COALESCE(size, '___NULL___'));
```

## Pattern: Unique Constraint with Optional Field

A common scenario is a unique constraint that ignores NULLs but enforces uniqueness otherwise.

```sql
-- Example: Users can optionally link social accounts
CREATE TABLE user_social_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    platform VARCHAR(50) NOT NULL,
    social_id VARCHAR(100)  -- NULL if not connected
);

-- Each user can have one entry per platform
-- social_id must be unique per platform when set
CREATE UNIQUE INDEX idx_user_platform
ON user_social_links (user_id, platform);

CREATE UNIQUE INDEX idx_social_id_unique
ON user_social_links (platform, social_id)
WHERE social_id IS NOT NULL;

-- User 1 on Twitter, not connected
INSERT INTO user_social_links (user_id, platform, social_id)
VALUES (1, 'twitter', NULL);

-- User 2 on Twitter, also not connected (allowed)
INSERT INTO user_social_links (user_id, platform, social_id)
VALUES (2, 'twitter', NULL);

-- User 1 connects their Twitter
UPDATE user_social_links
SET social_id = '@alice'
WHERE user_id = 1 AND platform = 'twitter';

-- User 2 tries to use the same Twitter handle
UPDATE user_social_links
SET social_id = '@alice'
WHERE user_id = 2 AND platform = 'twitter';
-- ERROR: duplicate key value violates unique constraint
```

## Handling NULLs in Foreign Keys

Unique constraints with NULLs affect foreign key references.

```sql
-- Parent table with unique constraint
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE
);

INSERT INTO categories (code) VALUES ('ELEC'), ('FURN'), (NULL);

-- Child table referencing the unique column
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    category_code VARCHAR(10) REFERENCES categories(code)
);

-- This works because NULL doesn't need to match
INSERT INTO products (name, category_code) VALUES ('Widget', NULL);

-- This also works (matches existing NULL in categories)
-- Wait, no! Foreign key to NULL column requires special handling
-- NULL in FK is always valid (means "no reference")
INSERT INTO products (name, category_code) VALUES ('Gadget', NULL);  -- OK

-- Match must be exact for non-null values
INSERT INTO products (name, category_code) VALUES ('Laptop', 'ELEC');  -- OK
INSERT INTO products (name, category_code) VALUES ('Chair', 'INVALID');  -- ERROR
```

## Unique Constraint Validation Query

Check for potential violations before adding a unique constraint.

```sql
-- Find duplicate values (excluding NULLs)
SELECT email, COUNT(*)
FROM users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- Find all duplicates including how NULLs would behave
SELECT
    email,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE email IS NOT NULL) AS non_null_count,
    COUNT(*) FILTER (WHERE email IS NULL) AS null_count
FROM users
GROUP BY email
HAVING COUNT(*) > 1 OR (email IS NULL AND COUNT(*) > 1);

-- Check if NULLS NOT DISTINCT would cause violations
SELECT phone, COUNT(*)
FROM users
GROUP BY phone
HAVING COUNT(*) > 1;  -- Includes NULL group
```

## Migration Patterns

Safely add unique constraints to existing tables.

```sql
-- Step 1: Identify violations
WITH duplicates AS (
    SELECT
        social_security,
        COUNT(*) AS cnt,
        array_agg(id ORDER BY id) AS duplicate_ids
    FROM contacts
    WHERE social_security IS NOT NULL
    GROUP BY social_security
    HAVING COUNT(*) > 1
)
SELECT * FROM duplicates;

-- Step 2: Fix duplicates (example: keep the first, clear others)
UPDATE contacts c
SET social_security = NULL
WHERE c.id IN (
    SELECT unnest(duplicate_ids[2:])  -- All but first
    FROM (
        SELECT array_agg(id ORDER BY id) AS duplicate_ids
        FROM contacts
        WHERE social_security IS NOT NULL
        GROUP BY social_security
        HAVING COUNT(*) > 1
    ) sub
);

-- Step 3: Add the constraint
CREATE UNIQUE INDEX idx_contacts_ssn
ON contacts (social_security)
WHERE social_security IS NOT NULL;
```

## Performance Considerations

Partial indexes are smaller and faster than full indexes.

```sql
-- Check index size
SELECT
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- Partial index is smaller when many NULLs exist
CREATE TABLE sparse_data (
    id SERIAL PRIMARY KEY,
    optional_code VARCHAR(50)
);

-- Insert data with 90% NULLs
INSERT INTO sparse_data (optional_code)
SELECT CASE WHEN random() < 0.1 THEN 'CODE' || i ELSE NULL END
FROM generate_series(1, 100000) i;

-- Compare full index vs partial index sizes
CREATE UNIQUE INDEX idx_full ON sparse_data (optional_code);
CREATE UNIQUE INDEX idx_partial ON sparse_data (optional_code)
WHERE optional_code IS NOT NULL;

-- The partial index will be significantly smaller
```

Understanding NULL behavior in unique constraints prevents data integrity surprises. Choose the appropriate technique based on your PostgreSQL version and specific requirements for handling missing values in unique columns.

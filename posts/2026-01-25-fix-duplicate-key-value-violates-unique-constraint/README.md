# How to Fix 'duplicate key value violates unique constraint' in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Unique Constraint, SQL, Error Handling

Description: Learn how to diagnose and fix the 'duplicate key value violates unique constraint' error in PostgreSQL. This guide covers common causes, prevention strategies, and practical solutions.

---

The "duplicate key value violates unique constraint" error is one of the most common PostgreSQL errors you will encounter. It occurs when you try to insert or update a row with a value that already exists in a column (or combination of columns) that has a unique constraint. While the error message is straightforward, the underlying causes and solutions can vary significantly.

---

## Understanding the Error

When PostgreSQL throws this error, it looks something like this:

```
ERROR: duplicate key value violates unique constraint "users_email_key"
DETAIL: Key (email)=(john@example.com) already exists.
```

The error tells you three important things:
1. Which constraint was violated (`users_email_key`)
2. Which column(s) caused the issue (`email`)
3. What value triggered the conflict (`john@example.com`)

---

## Common Causes

### 1. Explicit Duplicate Inserts

The simplest case is trying to insert a row that already exists.

```sql
-- First insert succeeds
INSERT INTO users (id, email, name) VALUES (1, 'john@example.com', 'John');

-- Second insert fails - email already exists
INSERT INTO users (id, email, name) VALUES (2, 'john@example.com', 'Johnny');
-- ERROR: duplicate key value violates unique constraint "users_email_key"
```

### 2. Sequence Out of Sync

A very common cause is when the primary key sequence gets out of sync with existing data. This often happens after bulk imports or manual data fixes.

```sql
-- Check if sequence is out of sync
SELECT
    last_value,
    (SELECT MAX(id) FROM users) as max_id
FROM users_id_seq;

-- If max_id > last_value, inserts will fail
-- Output might show:
-- last_value | max_id
-- 100        | 150
```

### 3. Race Conditions in Concurrent Inserts

When multiple transactions try to insert the same unique value simultaneously, one will succeed and the others will fail.

```sql
-- Transaction 1
BEGIN;
INSERT INTO users (email, name) VALUES ('new@example.com', 'User A');
-- Transaction pauses here

-- Transaction 2 (concurrent)
BEGIN;
INSERT INTO users (email, name) VALUES ('new@example.com', 'User B');
-- This will wait or fail depending on timing
```

### 4. Bulk Import Conflicts

When importing data from external sources, duplicates in the source data or conflicts with existing records are common.

```sql
-- Attempting to import data with duplicates
COPY users (id, email, name) FROM '/path/to/users.csv' WITH CSV HEADER;
-- Fails if any email already exists or if CSV contains duplicate emails
```

---

## Solutions

### Solution 1: Fix Out-of-Sync Sequences

This is the most common fix for primary key conflicts.

```sql
-- Reset sequence to the correct value
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users), true);

-- Verify the fix
SELECT
    last_value,
    (SELECT MAX(id) FROM users) as max_id
FROM users_id_seq;
-- last_value and max_id should match

-- You can also use pg_get_serial_sequence to get the sequence name dynamically
SELECT setval(
    pg_get_serial_sequence('users', 'id'),
    (SELECT COALESCE(MAX(id), 0) FROM users),
    true
);
```

### Solution 2: Use ON CONFLICT (Upsert)

PostgreSQL 9.5+ supports upsert operations with the `ON CONFLICT` clause.

```sql
-- Insert or update if email exists
INSERT INTO users (email, name, updated_at)
VALUES ('john@example.com', 'John Updated', NOW())
ON CONFLICT (email)
DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = EXCLUDED.updated_at;

-- Insert or do nothing if duplicate
INSERT INTO users (email, name)
VALUES ('john@example.com', 'John')
ON CONFLICT (email) DO NOTHING;

-- Check if insert happened
-- Returns 0 rows affected if conflict occurred
```

### Solution 3: Handle Conflicts in Application Code

For applications that need to handle duplicates gracefully:

```python
# Python example with psycopg2
import psycopg2
from psycopg2 import errors

def insert_user(conn, email, name):
    """Insert user with duplicate handling"""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, name)
                VALUES (%s, %s)
                RETURNING id
                """,
                (email, name)
            )
            user_id = cur.fetchone()[0]
            conn.commit()
            return {"status": "created", "id": user_id}

    except errors.UniqueViolation as e:
        conn.rollback()
        # Extract which constraint was violated
        constraint_name = e.diag.constraint_name

        if constraint_name == "users_email_key":
            return {"status": "duplicate", "field": "email"}
        else:
            return {"status": "duplicate", "constraint": constraint_name}
```

### Solution 4: Check Before Insert

When you need to provide user-friendly feedback:

```sql
-- Check if email exists before attempting insert
DO $$
DECLARE
    existing_id INTEGER;
BEGIN
    -- Try to find existing user
    SELECT id INTO existing_id
    FROM users
    WHERE email = 'john@example.com';

    IF existing_id IS NOT NULL THEN
        RAISE NOTICE 'User already exists with id: %', existing_id;
    ELSE
        INSERT INTO users (email, name)
        VALUES ('john@example.com', 'John');
        RAISE NOTICE 'User created successfully';
    END IF;
END $$;
```

### Solution 5: Use Advisory Locks for Race Conditions

When dealing with high-concurrency scenarios:

```sql
-- Use advisory lock to prevent race conditions
-- The lock is based on a hash of the email
DO $$
DECLARE
    email_text TEXT := 'newuser@example.com';
    lock_id BIGINT;
BEGIN
    -- Generate a lock ID from the email
    lock_id := hashtext(email_text);

    -- Acquire advisory lock (waits if another transaction holds it)
    PERFORM pg_advisory_xact_lock(lock_id);

    -- Now safe to check and insert
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = email_text) THEN
        INSERT INTO users (email, name) VALUES (email_text, 'New User');
    END IF;

    -- Lock is automatically released at transaction end
END $$;
```

---

## Bulk Import Strategies

### Using ON CONFLICT with COPY

Since `COPY` does not support `ON CONFLICT` directly, use a staging table:

```sql
-- Create a temporary staging table
CREATE TEMP TABLE users_staging (LIKE users INCLUDING ALL);

-- Import data into staging table
COPY users_staging (email, name) FROM '/path/to/users.csv' WITH CSV HEADER;

-- Insert from staging, handling conflicts
INSERT INTO users (email, name)
SELECT email, name FROM users_staging
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Clean up
DROP TABLE users_staging;
```

### Identifying Duplicates Before Import

```sql
-- Find duplicates within the import file itself
SELECT email, COUNT(*) as count
FROM users_staging
GROUP BY email
HAVING COUNT(*) > 1;

-- Find conflicts with existing data
SELECT s.email, u.id as existing_id
FROM users_staging s
JOIN users u ON s.email = u.email;
```

---

## Prevention Strategies

### 1. Use Proper Constraints

Define constraints clearly so errors are descriptive:

```sql
-- Named constraint is easier to debug
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_username_unique UNIQUE (username)
);
```

### 2. Use GENERATED ALWAYS for IDs

Prevent manual ID assignment issues:

```sql
-- PostgreSQL 10+
CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE
);

-- Attempting to manually set ID will error unless OVERRIDING SYSTEM VALUE is used
INSERT INTO users (id, email) VALUES (1, 'test@example.com');
-- ERROR: cannot insert into column "id"
```

### 3. Implement Idempotent Operations

Design operations that can be safely retried:

```sql
-- Idempotent insert using a client-provided idempotency key
CREATE TABLE operations (
    idempotency_key UUID PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    operation_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert operation only if idempotency key is new
INSERT INTO operations (idempotency_key, user_id, operation_type)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 1, 'payment')
ON CONFLICT (idempotency_key) DO NOTHING;
```

---

## Debugging Tips

### Find All Unique Constraints on a Table

```sql
SELECT
    con.conname AS constraint_name,
    array_agg(att.attname) AS columns
FROM pg_constraint con
JOIN pg_attribute att
    ON att.attnum = ANY(con.conkey)
    AND att.attrelid = con.conrelid
WHERE con.contype = 'u'  -- 'u' for unique constraints
    AND con.conrelid = 'users'::regclass
GROUP BY con.conname;
```

### Check for Near-Duplicates

Sometimes duplicates are caused by trailing spaces or case differences:

```sql
-- Find potential duplicates with case-insensitive matching
SELECT LOWER(email), COUNT(*)
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- Find emails with trailing/leading whitespace
SELECT id, email, LENGTH(email)
FROM users
WHERE email != TRIM(email);
```

---

## Conclusion

The "duplicate key value violates unique constraint" error is usually straightforward to fix once you identify the cause. The most common solutions are:

- Reset out-of-sync sequences for primary key conflicts
- Use `ON CONFLICT` clauses for upsert operations
- Implement proper error handling in application code
- Use staging tables for bulk imports

Remember that unique constraints are there to protect your data integrity. Rather than working around them, ensure your application logic respects these constraints from the start.

---

*Need to monitor your PostgreSQL database health? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring with alerting for constraint violations, slow queries, and connection issues.*

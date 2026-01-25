# How to Reset Primary Key Sequence in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SQL, Sequences, Primary Key, SERIAL, Database Administration

Description: Learn how to reset and synchronize primary key sequences in PostgreSQL after data imports, deletions, or migrations. This guide covers SERIAL columns, identity columns, and manual sequence management.

---

PostgreSQL uses sequences to generate auto-incrementing primary key values. When you import data with explicit IDs or delete records, the sequence can become out of sync with the actual data. This leads to duplicate key errors on the next insert. Understanding how to reset sequences is essential for database maintenance.

## Understanding PostgreSQL Sequences

When you create a table with SERIAL or IDENTITY columns, PostgreSQL automatically creates a sequence object.

```sql
-- Creating a table with SERIAL primary key
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100)
);

-- PostgreSQL automatically creates:
-- 1. A sequence named 'users_id_seq'
-- 2. A default value: nextval('users_id_seq')
-- 3. A NOT NULL constraint on the id column

-- View the sequence associated with the table
SELECT pg_get_serial_sequence('users', 'id');
-- Result: public.users_id_seq
```

## Finding the Current Sequence Value

Before resetting, check the current state of your sequence and data.

```sql
-- Get the current value of the sequence (last value returned)
SELECT currval('users_id_seq');
-- Note: currval only works after nextval has been called in the session

-- Get the next value that will be returned (without incrementing)
SELECT last_value FROM users_id_seq;

-- Get the maximum id currently in the table
SELECT MAX(id) FROM users;

-- Compare sequence value with actual maximum id
SELECT
    last_value AS sequence_value,
    (SELECT MAX(id) FROM users) AS max_id,
    last_value - (SELECT MAX(id) FROM users) AS difference
FROM users_id_seq;
```

## Resetting Sequence to Match Data

The most common operation is syncing the sequence with the maximum existing ID.

```sql
-- Method 1: setval with max(id) + 0
-- Sets sequence so next call returns max(id) + 1
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0));

-- Method 2: setval with explicit next value
-- The third parameter 'false' means the next nextval() returns this value
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);

-- Method 3: setval to return specific next value
-- If max(id) is 100, this makes next insert get id = 101
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
```

## Handling Empty Tables

When the table is empty, you need to handle the NULL from MAX() appropriately.

```sql
-- Reset sequence for potentially empty table
-- COALESCE ensures we don't pass NULL to setval
SELECT setval(
    'users_id_seq',
    COALESCE((SELECT MAX(id) FROM users), 0) + 1,
    false  -- false means next nextval returns this exact value
);

-- Alternative: restart the sequence from 1
ALTER SEQUENCE users_id_seq RESTART WITH 1;
```

## Resetting All Sequences in a Schema

After a large data migration, you might need to reset multiple sequences.

```sql
-- Function to reset all sequences in a schema
CREATE OR REPLACE FUNCTION reset_all_sequences(schema_name TEXT DEFAULT 'public')
RETURNS TABLE(sequence_name TEXT, new_value BIGINT) AS $$
DECLARE
    seq_record RECORD;
    table_name TEXT;
    column_name TEXT;
    max_val BIGINT;
BEGIN
    -- Loop through all sequences in the schema
    FOR seq_record IN
        SELECT
            s.relname AS seq_name,
            t.relname AS tab_name,
            a.attname AS col_name
        FROM pg_class s
        JOIN pg_namespace n ON n.oid = s.relnamespace
        JOIN pg_depend d ON d.objid = s.oid
        JOIN pg_class t ON t.oid = d.refobjid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
        WHERE s.relkind = 'S'
            AND n.nspname = schema_name
    LOOP
        -- Get max value from the table
        EXECUTE format(
            'SELECT COALESCE(MAX(%I), 0) FROM %I.%I',
            seq_record.col_name,
            schema_name,
            seq_record.tab_name
        ) INTO max_val;

        -- Reset the sequence
        EXECUTE format(
            'SELECT setval(%L, $1)',
            schema_name || '.' || seq_record.seq_name
        ) USING max_val;

        sequence_name := seq_record.seq_name;
        new_value := max_val;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Use the function to reset all sequences
SELECT * FROM reset_all_sequences('public');
```

## Working with IDENTITY Columns

PostgreSQL 10 introduced IDENTITY columns as the SQL standard way to define auto-increment columns.

```sql
-- Create table with IDENTITY column
CREATE TABLE products (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100)
);

-- Insert data
INSERT INTO products (name) VALUES ('Widget'), ('Gadget');

-- Check the sequence
SELECT pg_get_serial_sequence('products', 'id');

-- Reset IDENTITY column sequence
ALTER TABLE products ALTER COLUMN id RESTART WITH 100;

-- Or sync with existing data
SELECT setval(
    pg_get_serial_sequence('products', 'id'),
    (SELECT MAX(id) FROM products)
);
```

## Fixing Duplicate Key Errors

When you see "duplicate key value violates unique constraint", the sequence is behind the data.

```sql
-- Scenario: Imported data with explicit IDs
INSERT INTO users (id, username, email) VALUES
    (100, 'alice', 'alice@example.com'),
    (101, 'bob', 'bob@example.com'),
    (102, 'charlie', 'charlie@example.com');

-- Next auto-insert fails because sequence is at 1
INSERT INTO users (username, email) VALUES ('dave', 'dave@example.com');
-- ERROR: duplicate key value violates unique constraint "users_pkey"

-- Fix: Reset sequence to max(id)
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Now inserts work correctly
INSERT INTO users (username, email) VALUES ('dave', 'dave@example.com');
-- Successfully inserts with id = 103
```

## Resetting Sequence to a Specific Value

Sometimes you need to set a sequence to a predetermined value.

```sql
-- Reset to specific value (next insert gets 1000)
ALTER SEQUENCE users_id_seq RESTART WITH 1000;

-- Or using setval (next insert gets 1001)
SELECT setval('users_id_seq', 1000);

-- setval with false flag (next insert gets 1000)
SELECT setval('users_id_seq', 1000, false);
```

## Checking Sequence Ownership

Sequences can become orphaned from their tables. Verify ownership is correct.

```sql
-- View sequence details including owner table
SELECT
    seq.relname AS sequence_name,
    tab.relname AS owned_by_table,
    att.attname AS owned_by_column
FROM pg_class seq
JOIN pg_namespace ns ON ns.oid = seq.relnamespace
LEFT JOIN pg_depend dep ON dep.objid = seq.oid AND dep.deptype = 'a'
LEFT JOIN pg_class tab ON tab.oid = dep.refobjid
LEFT JOIN pg_attribute att ON att.attrelid = tab.oid AND att.attnum = dep.refobjsubid
WHERE seq.relkind = 'S'
    AND ns.nspname = 'public';

-- Set sequence ownership (if orphaned)
ALTER SEQUENCE users_id_seq OWNED BY users.id;
```

## Sequence Parameters

Sequences have configurable parameters that affect their behavior.

```sql
-- View all sequence parameters
SELECT * FROM pg_sequences WHERE sequencename = 'users_id_seq';

-- Modify sequence parameters
ALTER SEQUENCE users_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    START WITH 1
    CACHE 1
    NO CYCLE;

-- Sequence with caching (better performance, potential gaps)
ALTER SEQUENCE users_id_seq CACHE 20;
```

## Handling Partitioned Tables

Partitioned tables share sequences across partitions.

```sql
-- Create partitioned table with shared sequence
CREATE TABLE events (
    id BIGSERIAL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50),
    PRIMARY KEY (id, event_date)
) PARTITION BY RANGE (event_date);

-- Create partitions
CREATE TABLE events_2025 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE events_2026 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- All partitions use the same sequence
SELECT pg_get_serial_sequence('events', 'id');

-- Reset works the same way
SELECT setval(
    pg_get_serial_sequence('events', 'id'),
    (SELECT MAX(id) FROM events)
);
```

## Preventing Sequence Issues

Adopt practices that minimize sequence synchronization problems.

```sql
-- Use COPY with sequence sync for bulk imports
BEGIN;

-- Temporarily disable trigger that uses sequence
ALTER TABLE users DISABLE TRIGGER ALL;

-- Import data with explicit IDs
COPY users (id, username, email) FROM '/path/to/data.csv' CSV;

-- Reset sequence after import
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Re-enable triggers
ALTER TABLE users ENABLE TRIGGER ALL;

COMMIT;
```

## Monitoring Sequence Usage

Track sequence utilization to prevent exhaustion.

```sql
-- Check sequence capacity usage
SELECT
    sequencename,
    last_value,
    max_value,
    ROUND(100.0 * last_value / max_value, 2) AS percent_used
FROM pg_sequences
WHERE schemaname = 'public';

-- Alert if sequence is over 80% used
SELECT sequencename
FROM pg_sequences
WHERE last_value > max_value * 0.8;
```

Properly managing sequences ensures smooth insert operations and prevents duplicate key errors. Always reset sequences after bulk data operations, and consider automating the reset process as part of your data migration scripts.

# How to Check if Table Exists in a Schema in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SQL, Schema, Database Administration, DDL, Information Schema

Description: Learn multiple methods to check if a table exists in PostgreSQL before creating or modifying it. This guide covers information_schema, pg_catalog, and conditional DDL techniques.

---

Before creating tables, running migrations, or building dynamic SQL, you often need to check whether a table already exists. PostgreSQL provides several ways to query table existence, each with different trade-offs. This guide covers all the approaches and when to use each one.

## Using information_schema.tables

The `information_schema` is the SQL standard way to query database metadata. It works across different database systems.

```sql
-- Check if a specific table exists in the public schema
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'users'
);

-- Returns true or false

-- Get more details about the table
SELECT
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name = 'users';
```

The `table_type` column distinguishes between base tables and views:
- `BASE TABLE` for regular tables
- `VIEW` for views
- `FOREIGN` for foreign tables

## Using pg_catalog.pg_tables

The `pg_tables` view provides PostgreSQL-specific table information and is slightly faster than information_schema.

```sql
-- Check table existence using pg_tables
SELECT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'users'
);

-- List all tables in a schema
SELECT tablename, tableowner, hasindexes, hasrules, hastriggers
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Using pg_class Directly

For maximum performance, query `pg_class` directly. This is what the views above ultimately query.

```sql
-- Fastest method: query pg_class with pg_namespace
SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
        AND c.relname = 'users'
        AND c.relkind = 'r'  -- 'r' = ordinary table
);

-- relkind values:
-- 'r' = ordinary table
-- 'i' = index
-- 'S' = sequence
-- 'v' = view
-- 'm' = materialized view
-- 'c' = composite type
-- 't' = TOAST table
-- 'f' = foreign table
-- 'p' = partitioned table
```

## Using to_regclass()

The `to_regclass()` function provides the simplest syntax for existence checks.

```sql
-- Returns the OID of the table, or NULL if it doesn't exist
SELECT to_regclass('public.users');

-- Use in a boolean context
SELECT to_regclass('public.users') IS NOT NULL AS table_exists;

-- Works with search_path if you omit schema
SELECT to_regclass('users');  -- Uses current search_path
```

## Conditional Table Creation

Use `CREATE TABLE IF NOT EXISTS` to avoid errors when the table might already exist.

```sql
-- Create only if table doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100)
);

-- This statement succeeds whether or not the table exists
-- If it exists, PostgreSQL raises a NOTICE but no error
```

## Conditional Table Dropping

Similarly, use `IF EXISTS` when dropping tables.

```sql
-- Drop only if table exists
DROP TABLE IF EXISTS temp_data;

-- Drop multiple tables conditionally
DROP TABLE IF EXISTS temp_data, staging_users, old_logs;

-- Cascade to drop dependent objects
DROP TABLE IF EXISTS users CASCADE;
```

## Checking in PL/pgSQL Functions

Dynamic operations in functions often require existence checks.

```sql
-- Function that creates a table if it doesn't exist
CREATE OR REPLACE FUNCTION ensure_table_exists(
    schema_name TEXT,
    table_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = schema_name
            AND table_name = ensure_table_exists.table_name
    ) INTO table_exists;

    IF NOT table_exists THEN
        -- Create the table dynamically
        EXECUTE format(
            'CREATE TABLE %I.%I (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )',
            schema_name,
            table_name
        );
        RETURN false;  -- Table was created
    END IF;

    RETURN true;  -- Table already existed
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT ensure_table_exists('public', 'audit_log');
```

## Checking Multiple Tables

When you need to verify several tables exist:

```sql
-- Check multiple tables at once
SELECT
    table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = 'public' AND t.table_name = required.table_name
    ) AS exists
FROM (VALUES ('users'), ('orders'), ('products'), ('inventory')) AS required(table_name);

-- Function to check if all required tables exist
CREATE OR REPLACE FUNCTION all_tables_exist(table_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    missing_tables TEXT[];
BEGIN
    SELECT array_agg(t.table_name)
    INTO missing_tables
    FROM unnest(table_names) AS t(table_name)
    WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND tables.table_name = t.table_name
    );

    IF missing_tables IS NOT NULL THEN
        RAISE NOTICE 'Missing tables: %', missing_tables;
        RETURN false;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT all_tables_exist(ARRAY['users', 'orders', 'products']);
```

## Schema-Qualified Checks

Always specify the schema to avoid search_path ambiguity.

```sql
-- Check in a specific schema
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'reporting'
        AND table_name = 'monthly_summary'
);

-- Check across all schemas
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'users'
ORDER BY table_schema;

-- Check in multiple schemas
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('public', 'staging', 'archive')
    AND table_name = 'users';
```

## Checking for Views and Materialized Views

The methods above can distinguish between tables and views.

```sql
-- Check specifically for views
SELECT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public'
        AND table_name = 'active_users'
);

-- Check for materialized views
SELECT EXISTS (
    SELECT 1
    FROM pg_matviews
    WHERE schemaname = 'public'
        AND matviewname = 'sales_summary'
);

-- Check for any relation (table, view, or matview)
SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
        AND c.relname = 'users'
        AND c.relkind IN ('r', 'v', 'm', 'p', 'f')
);
```

## Temporary Tables

Temporary tables require special handling because they exist in a special schema.

```sql
-- Create a temporary table
CREATE TEMP TABLE temp_results (id INTEGER, value TEXT);

-- Check if temp table exists (it's in pg_temp schema)
SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname LIKE 'pg_temp%'
        AND c.relname = 'temp_results'
);

-- Or use to_regclass (handles temp tables automatically)
SELECT to_regclass('temp_results') IS NOT NULL;
```

## Partitioned Tables

Check for partitioned tables and their partitions.

```sql
-- Check if a partitioned table exists
SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
        AND c.relname = 'events'
        AND c.relkind = 'p'  -- 'p' = partitioned table
);

-- List all partitions of a table
SELECT
    child.relname AS partition_name,
    pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'events';
```

## Performance Comparison

Different methods have different performance characteristics.

```sql
-- Benchmark setup
EXPLAIN ANALYZE SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
);

EXPLAIN ANALYZE SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'users'
);

EXPLAIN ANALYZE SELECT to_regclass('public.users') IS NOT NULL;

-- to_regclass is typically fastest for single table checks
-- pg_tables is good for listing multiple tables
-- information_schema is best for portability
```

Choose the method that matches your needs: `to_regclass()` for simple checks in PostgreSQL-specific code, `information_schema` for portable SQL, and direct `pg_class` queries when you need maximum performance or detailed metadata.

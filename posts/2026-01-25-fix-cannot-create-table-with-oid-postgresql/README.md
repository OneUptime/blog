# How to Fix "cannot create a table with OID" Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, OID, Migration, Upgrade, SQL

Description: Learn how to resolve "cannot create a table with OID" errors in PostgreSQL. This guide covers why OIDs were deprecated, how to migrate legacy applications, and modern alternatives.

---

The "cannot create a table with OID" error occurs when you try to create a table with Object Identifiers (OIDs) in PostgreSQL 12 or later. OIDs were deprecated in PostgreSQL 12 and the ability to create tables with OIDs was removed entirely. This guide will help you understand why this happened and how to migrate your legacy code.

---

## Understanding the Error

When you encounter this error, it looks like:

```sql
CREATE TABLE my_table (
    name TEXT
) WITH (OIDS = TRUE);
-- ERROR: tables declared WITH OIDS are not supported

-- Or when restoring a backup:
pg_restore: error: could not execute query: ERROR: tables declared WITH OIDS are not supported
```

This error indicates that your SQL code or backup contains the deprecated `WITH OIDS` clause.

---

## What Are OIDs?

Object Identifiers (OIDs) were system-assigned unique identifiers for each row in a table. They were a legacy feature from PostgreSQL's early days.

```sql
-- In PostgreSQL 11 and earlier, you could do:
CREATE TABLE old_table (
    name TEXT
) WITH (OIDS = TRUE);

-- Each row would have a hidden 'oid' column
SELECT oid, name FROM old_table;
-- oid   | name
-- 16384 | Alice
-- 16385 | Bob
```

### Why OIDs Were Removed

1. **Storage overhead**: Each OID consumed 4 bytes per row
2. **Wraparound issues**: OIDs could wrap around after 4 billion rows
3. **Not truly unique**: OIDs were only unique within a table, not across tables
4. **Modern alternatives**: SERIAL and IDENTITY columns are superior

---

## Solutions

### Solution 1: Remove WITH OIDS from SQL Scripts

If you have SQL scripts that create tables with OIDs, remove the clause:

```sql
-- Before (PostgreSQL 11 and earlier)
CREATE TABLE customers (
    name VARCHAR(100),
    email VARCHAR(255)
) WITH (OIDS = TRUE);

-- After (PostgreSQL 12 and later)
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,  -- Use SERIAL instead of OIDs
    name VARCHAR(100),
    email VARCHAR(255)
);

-- Or use IDENTITY (PostgreSQL 10+)
CREATE TABLE customers (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255)
);
```

### Solution 2: Fix pg_dump Backup Files

If you have a backup file that contains `WITH OIDS`:

```bash
# Method 1: Use sed to remove WITH OIDS
sed -i 's/WITH (OIDS[^)]*)//' backup.sql
sed -i 's/WITH OIDS//' backup.sql

# Method 2: Use grep to find affected lines first
grep -n "WITH.*OIDS" backup.sql

# Method 3: Use pg_dump with newer options
# The --no-oids flag was default in older versions
pg_dump --no-oids -F p dbname > backup.sql
```

### Solution 3: Migrate a Database with OID-dependent Code

If your application code references OIDs:

```sql
-- Step 1: Add a proper primary key column
ALTER TABLE legacy_table ADD COLUMN id SERIAL;

-- Step 2: If you need to preserve OID values, copy them first
-- (Only works if migrating from PostgreSQL 11)
ALTER TABLE legacy_table ADD COLUMN legacy_oid INTEGER;
UPDATE legacy_table SET legacy_oid = oid;

-- Step 3: Set the new column as primary key
ALTER TABLE legacy_table ADD PRIMARY KEY (id);

-- Step 4: Create index on legacy_oid if needed for lookups
CREATE INDEX idx_legacy_oid ON legacy_table (legacy_oid);
```

### Solution 4: Update Application Code

Replace OID references with proper primary keys:

```python
# Before: Using OID (no longer works in PostgreSQL 12+)
def get_inserted_oid(cursor):
    cursor.execute("INSERT INTO users (name) VALUES ('Alice')")
    return cursor.lastrowid  # This returned OID

# After: Using RETURNING clause
def get_inserted_id(cursor):
    cursor.execute("""
        INSERT INTO users (name)
        VALUES ('Alice')
        RETURNING id
    """)
    return cursor.fetchone()[0]

# After: Using SERIAL or IDENTITY
def insert_user(conn, name):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO users (name)
            VALUES (%s)
            RETURNING id
        """, (name,))
        user_id = cur.fetchone()[0]
        conn.commit()
        return user_id
```

```java
// Java JDBC: Using RETURNING
String sql = "INSERT INTO users (name) VALUES (?) RETURNING id";
try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
    pstmt.setString(1, "Alice");
    ResultSet rs = pstmt.executeQuery();
    if (rs.next()) {
        long userId = rs.getLong("id");
    }
}

// Alternative: Using getGeneratedKeys()
String sql = "INSERT INTO users (name) VALUES (?)";
try (PreparedStatement pstmt = conn.prepareStatement(sql,
        Statement.RETURN_GENERATED_KEYS)) {
    pstmt.setString(1, "Alice");
    pstmt.executeUpdate();
    ResultSet rs = pstmt.getGeneratedKeys();
    if (rs.next()) {
        long userId = rs.getLong(1);
    }
}
```

---

## Migration Script for Legacy Databases

Here is a comprehensive script to migrate a database from OID-based to modern primary keys:

```sql
-- migration_from_oids.sql
-- Migrate tables that relied on OIDs to use proper primary keys

DO $$
DECLARE
    tbl RECORD;
    has_pk BOOLEAN;
BEGIN
    -- Find all tables in the public schema
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- Check if table already has a primary key
        SELECT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = tbl.tablename::regclass
            AND contype = 'p'
        ) INTO has_pk;

        IF NOT has_pk THEN
            RAISE NOTICE 'Adding primary key to table: %', tbl.tablename;

            -- Add serial primary key column
            EXECUTE format('ALTER TABLE %I ADD COLUMN id SERIAL PRIMARY KEY',
                tbl.tablename);
        END IF;
    END LOOP;
END;
$$;

-- Verify all tables now have primary keys
SELECT
    t.tablename,
    CASE WHEN c.conname IS NOT NULL THEN 'Yes' ELSE 'No' END AS has_pk
FROM pg_tables t
LEFT JOIN pg_constraint c ON c.conrelid = t.tablename::regclass AND c.contype = 'p'
WHERE t.schemaname = 'public';
```

---

## Handling pg_restore Errors

When restoring backups from older PostgreSQL versions:

```bash
#!/bin/bash
# restore_legacy_backup.sh

BACKUP_FILE="$1"
DB_NAME="$2"

if [[ -z "$BACKUP_FILE" || -z "$DB_NAME" ]]; then
    echo "Usage: $0 <backup_file> <database_name>"
    exit 1
fi

# Create temporary modified backup
TEMP_FILE=$(mktemp)

if [[ "$BACKUP_FILE" == *.sql ]]; then
    # Plain SQL format
    echo "Removing WITH OIDS from SQL backup..."
    sed 's/WITH (OIDS[^)]*)//' "$BACKUP_FILE" | \
    sed 's/WITH OIDS//' > "$TEMP_FILE"

    # Restore modified backup
    psql -d "$DB_NAME" -f "$TEMP_FILE"
else
    # Custom or directory format
    # Use pg_restore with error handling
    echo "Restoring custom format backup..."
    pg_restore -d "$DB_NAME" --no-owner --no-privileges \
        --disable-triggers "$BACKUP_FILE" 2>&1 | \
        grep -v "WITH OIDS"

    # Note: Some errors may need manual intervention
fi

rm -f "$TEMP_FILE"
echo "Restore completed. Check for any remaining errors."
```

---

## Creating Tables Without OIDs (Modern Approach)

### Using SERIAL

```sql
-- SERIAL creates a sequence automatically
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert and get the generated ID
INSERT INTO users (name, email)
VALUES ('Alice', 'alice@example.com')
RETURNING id;
```

### Using IDENTITY (PostgreSQL 10+)

```sql
-- IDENTITY is the SQL standard approach
CREATE TABLE orders (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- GENERATED BY DEFAULT allows manual ID specification
CREATE TABLE products (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2)
);

-- Insert with auto-generated ID
INSERT INTO orders (user_id, total) VALUES (1, 99.99) RETURNING id;

-- Insert with manual ID (only with GENERATED BY DEFAULT)
INSERT INTO products (id, name, price)
OVERRIDING SYSTEM VALUE
VALUES (1000, 'Special Product', 49.99);
```

### Using UUID

```sql
-- For distributed systems, UUIDs avoid ID conflicts
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE distributed_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert with auto-generated UUID
INSERT INTO distributed_events (event_type, payload)
VALUES ('user_signup', '{"user_id": 123}')
RETURNING id;
-- Returns: 550e8400-e29b-41d4-a716-446655440000
```

---

## Checking for OID Usage

Before upgrading to PostgreSQL 12+, check for OID dependencies:

```sql
-- Find tables that were created with OIDs
-- (Run on PostgreSQL 11 or earlier)
SELECT
    n.nspname AS schema,
    c.relname AS table_name,
    c.relhasoids AS has_oids
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
AND c.relhasoids = true
AND n.nspname NOT IN ('pg_catalog', 'information_schema');

-- Find code that references OID column
-- Search your application codebase for:
-- - References to 'oid' column
-- - Use of lastrowid or similar
-- - Direct OID comparisons
```

---

## Summary of Changes by PostgreSQL Version

| Version | OID Status |
|---------|-----------|
| PostgreSQL 7.x-11 | OIDs available, WITH OIDS supported |
| PostgreSQL 12 | WITH OIDS removed, OIDs deprecated |
| PostgreSQL 14 | System tables no longer use OIDs |

---

## Conclusion

The "cannot create a table with OID" error is a sign that you are working with legacy code that needs updating. The fix involves:

1. **Remove WITH OIDS** from CREATE TABLE statements
2. **Use SERIAL or IDENTITY** columns for auto-incrementing IDs
3. **Update application code** to use RETURNING instead of OID
4. **Modify backup files** before restoring to PostgreSQL 12+

Modern PostgreSQL provides better alternatives to OIDs that are more reliable, standards-compliant, and do not have the limitations of the old OID system.

---

*Need to monitor your PostgreSQL database migrations? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring including schema change tracking, migration alerts, and version compatibility checks.*

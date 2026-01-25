# How to Use COPY Command for Bulk Import in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, COPY, Bulk Import, Data Loading, Performance, ETL

Description: Learn how to use PostgreSQL's COPY command for efficient bulk data import. This guide covers file formats, error handling, performance optimization, and real-world import strategies.

---

The COPY command is PostgreSQL's fastest method for bulk data loading. While INSERT statements work fine for small amounts of data, COPY can load millions of rows in seconds by bypassing the SQL parser and writing directly to the table. This guide covers everything you need to know about using COPY effectively.

---

## COPY vs INSERT Performance

To understand why COPY matters, consider this comparison:

```sql
-- INSERT: One row at a time (slow)
-- 1 million rows might take 10+ minutes
INSERT INTO users (id, name, email) VALUES (1, 'User 1', 'user1@example.com');
INSERT INTO users (id, name, email) VALUES (2, 'User 2', 'user2@example.com');
-- ... repeat 1 million times

-- COPY: Bulk load (fast)
-- 1 million rows typically takes seconds
COPY users (id, name, email) FROM '/path/to/users.csv' WITH CSV HEADER;
```

The performance difference is typically 10-100x faster with COPY.

---

## Basic COPY Syntax

### Importing Data

```sql
-- Basic CSV import
COPY table_name FROM '/path/to/file.csv' WITH CSV HEADER;

-- Import specific columns
COPY users (name, email) FROM '/path/to/users.csv' WITH CSV HEADER;

-- Import from stdin (useful in scripts)
COPY users (name, email) FROM STDIN WITH CSV;
John,john@example.com
Jane,jane@example.com
\.
```

### Exporting Data

```sql
-- Export to CSV
COPY users TO '/path/to/export.csv' WITH CSV HEADER;

-- Export specific columns
COPY (SELECT name, email FROM users WHERE active = true)
TO '/path/to/active_users.csv' WITH CSV HEADER;
```

---

## File Format Options

### CSV Format

```sql
-- Standard CSV with header
COPY users FROM '/path/to/users.csv' WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ',',
    QUOTE '"',
    ESCAPE '"',
    NULL ''
);

-- CSV with custom delimiter (tab-separated)
COPY users FROM '/path/to/users.tsv' WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER E'\t'
);

-- CSV with semicolon delimiter (common in European locales)
COPY users FROM '/path/to/users.csv' WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ';'
);
```

### Text Format (Default)

```sql
-- Text format uses tab delimiter by default
COPY users FROM '/path/to/users.txt' WITH (
    FORMAT text,
    DELIMITER E'\t',
    NULL '\N'
);
```

### Binary Format

```sql
-- Binary format is fastest but not human-readable
COPY users TO '/path/to/users.bin' WITH (FORMAT binary);
COPY users FROM '/path/to/users.bin' WITH (FORMAT binary);
```

---

## Using \copy in psql

The `\copy` command runs on the client side, which is useful when:
- You do not have superuser access
- The file is on your local machine, not the server

```sql
-- \copy runs client-side
\copy users FROM '/local/path/to/users.csv' WITH CSV HEADER;

-- Equivalent to COPY but from client perspective
\copy users TO '/local/path/to/export.csv' WITH CSV HEADER;
```

### Key Differences

| Feature | COPY | \copy |
|---------|------|-------|
| File location | Server filesystem | Client filesystem |
| Permissions | Requires superuser | Regular user OK |
| Performance | Slightly faster | Network overhead |
| Use case | Server scripts | Interactive/remote |

---

## Handling Data Quality Issues

### Skip Errors with ON_ERROR (PostgreSQL 17+)

```sql
-- Skip rows with errors
COPY users FROM '/path/to/users.csv'
WITH (FORMAT csv, HEADER true, ON_ERROR 'ignore');
```

### Pre-Import Data Validation

```sql
-- Create staging table for validation
CREATE TEMP TABLE users_staging (
    id TEXT,  -- Use TEXT to catch non-integer values
    name TEXT,
    email TEXT,
    created_at TEXT
);

-- Import into staging table
COPY users_staging FROM '/path/to/users.csv' WITH CSV HEADER;

-- Identify problematic rows
SELECT * FROM users_staging
WHERE id !~ '^\d+$'  -- ID is not a number
   OR email !~ '^[^@]+@[^@]+\.[^@]+$'  -- Invalid email format
   OR created_at !~ '^\d{4}-\d{2}-\d{2}';  -- Invalid date format

-- Insert valid rows into target table
INSERT INTO users (id, name, email, created_at)
SELECT
    id::INTEGER,
    name,
    email,
    created_at::TIMESTAMP
FROM users_staging
WHERE id ~ '^\d+$'
  AND email ~ '^[^@]+@[^@]+\.[^@]+$';

-- Clean up
DROP TABLE users_staging;
```

### Handle Duplicate Keys

```sql
-- Create staging table
CREATE TEMP TABLE orders_staging (LIKE orders INCLUDING ALL);

-- Import to staging
COPY orders_staging FROM '/path/to/orders.csv' WITH CSV HEADER;

-- Insert with conflict handling
INSERT INTO orders
SELECT * FROM orders_staging
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = NOW();

-- Or skip duplicates
INSERT INTO orders
SELECT * FROM orders_staging
ON CONFLICT (id) DO NOTHING;
```

---

## Performance Optimization

### Disable Indexes During Import

```sql
-- For large imports, temporarily disable indexes
-- Get current indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'large_table';

-- Drop non-essential indexes
DROP INDEX idx_large_table_name;
DROP INDEX idx_large_table_date;

-- Perform the import
COPY large_table FROM '/path/to/data.csv' WITH CSV HEADER;

-- Recreate indexes
CREATE INDEX idx_large_table_name ON large_table (name);
CREATE INDEX idx_large_table_date ON large_table (created_at);

-- Update statistics
ANALYZE large_table;
```

### Disable Triggers During Import

```sql
-- Disable triggers
ALTER TABLE large_table DISABLE TRIGGER ALL;

-- Perform import
COPY large_table FROM '/path/to/data.csv' WITH CSV HEADER;

-- Re-enable triggers
ALTER TABLE large_table ENABLE TRIGGER ALL;
```

### Adjust Configuration for Bulk Load

```sql
-- Temporarily increase memory settings
SET maintenance_work_mem = '1GB';
SET work_mem = '256MB';

-- Disable synchronous commit for speed (less durable)
SET synchronous_commit = 'off';

-- Perform import
COPY large_table FROM '/path/to/data.csv' WITH CSV HEADER;

-- Reset settings
RESET maintenance_work_mem;
RESET work_mem;
RESET synchronous_commit;
```

### Use UNLOGGED Tables for Intermediate Data

```sql
-- Create unlogged table for staging (no WAL overhead)
CREATE UNLOGGED TABLE staging_data (
    id SERIAL,
    data JSONB
);

-- Fast import
COPY staging_data (data) FROM '/path/to/data.csv' WITH CSV;

-- Process and move to permanent table
INSERT INTO permanent_data
SELECT * FROM staging_data
WHERE data->>'status' = 'active';

-- Clean up
DROP TABLE staging_data;
```

---

## Importing Different Data Types

### JSON/JSONB Data

```sql
-- Table with JSONB column
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_data JSONB
);

-- CSV with JSON in a column
-- File content: id,event_data
-- 1,"{""type"":""click"",""page"":""/home""}"
COPY events (id, event_data) FROM '/path/to/events.csv'
WITH (FORMAT csv, HEADER true);

-- Or use a staging table
CREATE TEMP TABLE events_raw (id INT, event_data TEXT);
COPY events_raw FROM '/path/to/events.csv' WITH CSV HEADER;
INSERT INTO events SELECT id, event_data::JSONB FROM events_raw;
```

### Array Data

```sql
-- Table with array column
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT,
    tags TEXT[]
);

-- CSV format for arrays uses curly braces
-- File content: id,name,tags
-- 1,Laptop,"{electronics,computers}"
COPY products FROM '/path/to/products.csv' WITH CSV HEADER;
```

### Date and Timestamp

```sql
-- Specify date format if non-standard
CREATE TEMP TABLE dates_raw (id INT, date_str TEXT);
COPY dates_raw FROM '/path/to/dates.csv' WITH CSV HEADER;

-- Convert with to_date or to_timestamp
INSERT INTO events (id, event_date)
SELECT id, to_date(date_str, 'DD/MM/YYYY')
FROM dates_raw;
```

---

## Python Script for Bulk Import

```python
# bulk_import.py
# Efficient bulk import using COPY with psycopg2
import psycopg2
from io import StringIO
import csv

def bulk_import_from_list(conn, table_name, columns, data):
    """
    Bulk import data using COPY
    data: list of tuples or lists
    """
    # Create a file-like object in memory
    buffer = StringIO()
    writer = csv.writer(buffer)

    # Write data to buffer
    for row in data:
        writer.writerow(row)

    # Reset buffer position
    buffer.seek(0)

    # Use COPY for fast import
    with conn.cursor() as cur:
        cur.copy_expert(
            f"COPY {table_name} ({', '.join(columns)}) FROM STDIN WITH CSV",
            buffer
        )
    conn.commit()

def bulk_import_from_file(conn, table_name, filepath, has_header=True):
    """
    Bulk import directly from file
    """
    with conn.cursor() as cur:
        with open(filepath, 'r') as f:
            if has_header:
                # Skip header line
                header = f.readline()
                columns = header.strip().split(',')
                cur.copy_expert(
                    f"COPY {table_name} ({', '.join(columns)}) FROM STDIN WITH CSV",
                    f
                )
            else:
                cur.copy_from(f, table_name, sep=',')
    conn.commit()

# Example usage
if __name__ == "__main__":
    conn = psycopg2.connect("postgresql://user:pass@localhost/mydb")

    # Import from list
    data = [
        (1, "Alice", "alice@example.com"),
        (2, "Bob", "bob@example.com"),
        (3, "Charlie", "charlie@example.com"),
    ]
    bulk_import_from_list(conn, "users", ["id", "name", "email"], data)

    # Import from file
    bulk_import_from_file(conn, "products", "/path/to/products.csv")

    conn.close()
```

---

## Shell Script for Automated Import

```bash
#!/bin/bash
# import_data.sh
# Automated data import with preprocessing

DB_HOST="localhost"
DB_NAME="mydb"
DB_USER="postgres"
INPUT_FILE="$1"
TABLE_NAME="$2"

# Validate input
if [[ -z "$INPUT_FILE" || -z "$TABLE_NAME" ]]; then
    echo "Usage: $0 <input_file> <table_name>"
    exit 1
fi

# Check file exists
if [[ ! -f "$INPUT_FILE" ]]; then
    echo "Error: File not found: $INPUT_FILE"
    exit 1
fi

# Count lines for progress
TOTAL_LINES=$(wc -l < "$INPUT_FILE")
echo "Importing $TOTAL_LINES lines into $TABLE_NAME"

# Create timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup existing data
echo "Creating backup..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c \
    "COPY $TABLE_NAME TO '/tmp/${TABLE_NAME}_backup_${TIMESTAMP}.csv' WITH CSV HEADER"

# Import new data
echo "Importing data..."
START_TIME=$(date +%s)

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<EOF
BEGIN;

-- Disable triggers for faster import
ALTER TABLE $TABLE_NAME DISABLE TRIGGER ALL;

-- Perform import
\copy $TABLE_NAME FROM '$INPUT_FILE' WITH CSV HEADER

-- Re-enable triggers
ALTER TABLE $TABLE_NAME ENABLE TRIGGER ALL;

-- Update statistics
ANALYZE $TABLE_NAME;

COMMIT;
EOF

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Import completed in $DURATION seconds"
echo "Rows imported: $((TOTAL_LINES - 1))"  # Subtract header
```

---

## Best Practices

1. **Always use staging tables** for untrusted data sources
2. **Disable indexes and triggers** for large imports, then recreate/re-enable
3. **Use UNLOGGED tables** for intermediate processing
4. **Validate data** before importing to the final table
5. **Handle duplicates** with ON CONFLICT or staging tables
6. **Monitor progress** for very large imports
7. **Run ANALYZE** after large imports to update statistics

---

## Conclusion

The COPY command is essential for efficient data loading in PostgreSQL. By using the techniques in this guide, you can import millions of rows in seconds while handling data quality issues and maintaining database integrity. Remember to always test your import process with a subset of data before running it on your full dataset.

---

*Need to monitor your PostgreSQL data imports? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring including import job tracking, table size alerts, and performance metrics.*

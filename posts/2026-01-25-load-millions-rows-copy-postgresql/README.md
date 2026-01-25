# How to Load Millions of Rows with COPY in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Performance, Data Import, ETL, Bulk Loading

Description: Learn how to efficiently load millions of rows into PostgreSQL using the COPY command, including optimization techniques for parallel loading, transaction management, and index handling.

---

When you need to load millions of rows into PostgreSQL, INSERT statements are painfully slow. The COPY command is purpose-built for bulk loading and can be 10-100x faster. This guide covers everything from basic usage to advanced techniques for loading data at scale.

## Why COPY is Fast

Regular INSERTs incur overhead for each row:
- Parse the SQL statement
- Plan the query
- Execute the insert
- Write to WAL
- Update indexes

COPY bypasses most of this overhead by streaming data directly into the table with minimal per-row processing.

## Basic COPY Syntax

### Loading from a File

```sql
-- Load CSV file into a table
COPY customers (id, name, email, created_at)
FROM '/var/lib/postgresql/data/customers.csv'
WITH (FORMAT csv, HEADER true);

-- Load tab-delimited file
COPY orders FROM '/path/to/orders.tsv' WITH (FORMAT text, DELIMITER E'\t');

-- Load with custom null representation
COPY products FROM '/path/to/products.csv'
WITH (FORMAT csv, HEADER true, NULL 'NULL');
```

### Loading from STDIN

Useful when piping data from another process:

```bash
# Pipe data directly into PostgreSQL
cat customers.csv | psql -d mydb -c "COPY customers FROM STDIN WITH (FORMAT csv, HEADER true)"

# Decompress and load in one step
gunzip -c customers.csv.gz | psql -d mydb -c "COPY customers FROM STDIN WITH (FORMAT csv, HEADER true)"
```

### Exporting with COPY TO

```sql
-- Export to file
COPY (SELECT * FROM customers WHERE created_at > '2025-01-01')
TO '/tmp/recent_customers.csv'
WITH (FORMAT csv, HEADER true);

-- Export to stdout for piping
COPY customers TO STDOUT WITH (FORMAT csv, HEADER true);
```

## Speed Optimization Techniques

### 1. Drop Indexes Before Loading

Indexes slow down bulk inserts significantly. Drop them and recreate after loading:

```sql
-- Save index definitions
SELECT indexdef
FROM pg_indexes
WHERE tablename = 'large_table';

-- Drop indexes
DROP INDEX idx_large_table_column1;
DROP INDEX idx_large_table_column2;

-- Load data
COPY large_table FROM '/path/to/data.csv' WITH (FORMAT csv);

-- Recreate indexes (use CONCURRENTLY for production)
CREATE INDEX idx_large_table_column1 ON large_table(column1);
CREATE INDEX idx_large_table_column2 ON large_table(column2);
```

### 2. Disable Triggers During Load

Triggers on INSERT can slow loading dramatically:

```sql
-- Disable all triggers on the table
ALTER TABLE large_table DISABLE TRIGGER ALL;

-- Load data
COPY large_table FROM '/path/to/data.csv' WITH (FORMAT csv);

-- Re-enable triggers
ALTER TABLE large_table ENABLE TRIGGER ALL;
```

### 3. Use Unlogged Tables for Intermediate Data

Unlogged tables skip WAL writes, making them much faster but not crash-safe:

```sql
-- Create unlogged staging table
CREATE UNLOGGED TABLE staging_customers (LIKE customers INCLUDING ALL);

-- Load into staging
COPY staging_customers FROM '/path/to/customers.csv' WITH (FORMAT csv);

-- Transform and insert into production table
INSERT INTO customers
SELECT * FROM staging_customers
WHERE email IS NOT NULL;

-- Drop staging table
DROP TABLE staging_customers;
```

### 4. Adjust WAL Settings for Loading

Temporarily reduce WAL overhead:

```sql
-- Increase checkpoint distance (apply to session or system)
SET checkpoint_timeout = '30min';
SET max_wal_size = '10GB';

-- Reduce WAL level for this session
SET synchronous_commit = off;

-- Load data
COPY large_table FROM '/path/to/data.csv' WITH (FORMAT csv);

-- Reset to defaults
RESET synchronous_commit;
```

### 5. Use Binary Format

Binary COPY is faster than text for numeric-heavy data:

```sql
-- Export in binary format
COPY numbers_table TO '/path/to/data.bin' WITH (FORMAT binary);

-- Import binary data
COPY numbers_table FROM '/path/to/data.bin' WITH (FORMAT binary);
```

Binary format is PostgreSQL-specific and not human-readable, but it is faster and more compact.

## Parallel Loading Strategies

COPY itself is single-threaded, but you can parallelize by splitting data.

### Split File Approach

```bash
# Split a large CSV into chunks (skip header handling for simplicity)
split -l 1000000 large_file.csv chunk_

# Load chunks in parallel
for f in chunk_*; do
    psql -d mydb -c "COPY customers FROM STDIN WITH (FORMAT csv)" < "$f" &
done
wait
```

### Parallel Loading with Table Partitioning

Partitioned tables allow parallel loading into different partitions:

```sql
-- Create partitioned table
CREATE TABLE events (
    id BIGSERIAL,
    event_date DATE NOT NULL,
    event_type TEXT,
    payload JSONB
) PARTITION BY RANGE (event_date);

-- Create monthly partitions
CREATE TABLE events_2025_01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE events_2025_02 PARTITION OF events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

Load into partitions simultaneously:

```bash
# Load January data
psql -d mydb -c "COPY events FROM '/data/events_2025_01.csv' WITH (FORMAT csv)" &

# Load February data in parallel
psql -d mydb -c "COPY events FROM '/data/events_2025_02.csv' WITH (FORMAT csv)" &

wait
```

### Using pg_bulkload Extension

For extreme performance, pg_bulkload is a community extension that provides even faster loading:

```bash
# Install pg_bulkload (varies by OS)
sudo apt-get install postgresql-16-pg-bulkload

# Load data
pg_bulkload -d mydb -i /path/to/data.csv -O customers
```

## Handling Errors During Load

### Log Errors to a Separate Table (PostgreSQL 17+)

```sql
-- Create error logging table
CREATE TABLE import_errors (
    error_time TIMESTAMP DEFAULT now(),
    table_name TEXT,
    row_data TEXT,
    error_message TEXT
);

-- Load with error handling
COPY customers FROM '/path/to/data.csv'
WITH (FORMAT csv, ON_ERROR log, LOG_VERBOSITY verbose);
```

### Pre-Validate Data Before Loading

```sql
-- Create staging table for validation
CREATE TEMP TABLE staging_customers (
    id TEXT,  -- Use TEXT to accept any input
    name TEXT,
    email TEXT,
    created_at TEXT
);

-- Load everything as text
COPY staging_customers FROM '/path/to/data.csv' WITH (FORMAT csv, HEADER true);

-- Find invalid rows
SELECT * FROM staging_customers
WHERE id !~ '^\d+$'  -- id should be numeric
   OR email !~ '@'   -- basic email validation
   OR created_at !~ '^\d{4}-\d{2}-\d{2}';

-- Load valid rows with type casting
INSERT INTO customers (id, name, email, created_at)
SELECT
    id::INTEGER,
    name,
    email,
    created_at::TIMESTAMP
FROM staging_customers
WHERE id ~ '^\d+$'
  AND email ~ '@';
```

## Memory and Performance Tuning

### Optimize work_mem for Sorting

If your COPY is followed by index creation:

```sql
-- Increase memory for index building
SET maintenance_work_mem = '2GB';

COPY large_table FROM '/path/to/data.csv' WITH (FORMAT csv);
CREATE INDEX ON large_table(column1);

RESET maintenance_work_mem;
```

### Monitor Progress

PostgreSQL 14+ shows COPY progress:

```sql
-- In another session, monitor the COPY operation
SELECT
    relname,
    command,
    type,
    bytes_processed,
    bytes_total,
    tuples_processed
FROM pg_stat_progress_copy;
```

## Complete Loading Script

Here is a production-ready script for loading large datasets:

```bash
#!/bin/bash
# bulk_load.sh - Production bulk loading script

DB_NAME="mydb"
TABLE_NAME="customers"
DATA_FILE="/path/to/customers.csv"

echo "Starting bulk load at $(date)"

# Step 1: Save and drop indexes
psql -d $DB_NAME -c "
    SELECT indexdef INTO TEMP TABLE saved_indexes
    FROM pg_indexes WHERE tablename = '$TABLE_NAME';
"

psql -d $DB_NAME -c "
    SELECT 'DROP INDEX ' || indexname || ';'
    FROM pg_indexes
    WHERE tablename = '$TABLE_NAME' AND indexname NOT LIKE '%_pkey'
" -t | psql -d $DB_NAME

# Step 2: Disable triggers
psql -d $DB_NAME -c "ALTER TABLE $TABLE_NAME DISABLE TRIGGER ALL;"

# Step 3: Tune settings and load
psql -d $DB_NAME << EOF
SET synchronous_commit = off;
SET maintenance_work_mem = '2GB';
\timing on
COPY $TABLE_NAME FROM '$DATA_FILE' WITH (FORMAT csv, HEADER true);
\timing off
EOF

# Step 4: Re-enable triggers
psql -d $DB_NAME -c "ALTER TABLE $TABLE_NAME ENABLE TRIGGER ALL;"

# Step 5: Recreate indexes
echo "Recreating indexes..."
psql -d $DB_NAME -c "
    SELECT indexdef FROM saved_indexes
" -t | psql -d $DB_NAME

# Step 6: Update statistics
psql -d $DB_NAME -c "ANALYZE $TABLE_NAME;"

echo "Bulk load completed at $(date)"
```

## Benchmarks

Here are rough numbers for loading 10 million rows (varies by hardware):

| Method | Time | Notes |
|--------|------|-------|
| Individual INSERTs | 45 min | One INSERT per row |
| Batched INSERTs (1000 rows) | 8 min | Multi-row INSERT |
| COPY (default) | 2 min | Basic COPY |
| COPY (no indexes) | 45 sec | Indexes dropped first |
| COPY (unlogged table) | 25 sec | No WAL writes |

The difference is dramatic. For any bulk load over a few thousand rows, COPY should be your default choice.

## Summary

Key takeaways for fast bulk loading:

1. **Always use COPY** instead of INSERT for bulk loads
2. **Drop indexes** before loading, recreate after
3. **Disable triggers** during the load
4. **Consider unlogged tables** for intermediate staging
5. **Parallelize** by splitting data across partitions or files
6. **Monitor progress** using pg_stat_progress_copy
7. **Run ANALYZE** after loading to update statistics

With these techniques, PostgreSQL handles multi-million row loads efficiently, making it viable for ETL pipelines and data warehouse loading scenarios.

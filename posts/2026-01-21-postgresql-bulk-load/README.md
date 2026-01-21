# How to Bulk Load Data into PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Bulk Load, COPY, ETL, Performance, Data Import

Description: A guide to efficiently bulk loading data into PostgreSQL using COPY, pg_bulkload, and optimization techniques for large data imports.

---

Bulk loading is essential for data migrations and ETL processes. This guide covers efficient techniques for loading large datasets.

## COPY Command (Fastest)

### Basic COPY

```sql
-- From file
COPY users FROM '/path/to/users.csv' WITH (FORMAT csv, HEADER true);

-- From STDIN
COPY users FROM STDIN WITH (FORMAT csv);

-- To file (export)
COPY users TO '/path/to/export.csv' WITH (FORMAT csv, HEADER true);
```

### COPY Options

```sql
-- Full options
COPY users FROM '/path/to/data.csv' WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ',',
    QUOTE '"',
    ESCAPE '"',
    NULL '',
    ENCODING 'UTF8'
);
```

### From Compressed File

```bash
# Using pipe
zcat data.csv.gz | psql -c "COPY users FROM STDIN WITH (FORMAT csv)"

# Or
gunzip -c data.csv.gz | psql -d myapp -c "COPY users FROM STDIN CSV HEADER"
```

## Optimization Techniques

### Disable Indexes During Load

```sql
-- Drop indexes before load
DROP INDEX idx_users_email;

-- Load data
COPY users FROM '/path/to/data.csv' CSV HEADER;

-- Recreate indexes after
CREATE INDEX idx_users_email ON users(email);
```

### Disable Triggers

```sql
-- Disable triggers
ALTER TABLE users DISABLE TRIGGER ALL;

-- Load data
COPY users FROM '/path/to/data.csv' CSV HEADER;

-- Re-enable triggers
ALTER TABLE users ENABLE TRIGGER ALL;
```

### Increase Maintenance Memory

```sql
SET maintenance_work_mem = '1GB';
```

### Disable WAL for Initial Load

```conf
# For initial load only (data loss risk!)
# postgresql.conf
wal_level = minimal
max_wal_senders = 0
```

### Unlogged Tables

```sql
-- Faster but not crash-safe
CREATE UNLOGGED TABLE temp_import (LIKE users);
COPY temp_import FROM '/path/to/data.csv' CSV HEADER;
INSERT INTO users SELECT * FROM temp_import;
DROP TABLE temp_import;
```

## Batch Inserts

### Multi-Value INSERT

```sql
-- Batch inserts (1000x faster than single inserts)
INSERT INTO users (name, email) VALUES
    ('User 1', 'user1@example.com'),
    ('User 2', 'user2@example.com'),
    ('User 3', 'user3@example.com');
```

### From Application

```python
# Python psycopg example
import psycopg

with psycopg.connect("dbname=myapp") as conn:
    with conn.cursor() as cur:
        # Use COPY for best performance
        with cur.copy("COPY users (name, email) FROM STDIN") as copy:
            for user in users:
                copy.write_row((user.name, user.email))
```

## pg_bulkload (External Tool)

```bash
# Install pg_bulkload
sudo apt install postgresql-16-pg-bulkload

# Load data
pg_bulkload -d myapp -i data.csv -O users
```

## Parallel Loading

```bash
# Split file and load in parallel
split -l 1000000 data.csv data_part_

# Load each part
for f in data_part_*; do
    psql -c "COPY users FROM '$f' CSV" &
done
wait
```

## Best Practices

1. **Use COPY** - Fastest method
2. **Drop indexes** - Recreate after load
3. **Disable triggers** - If safe
4. **Batch operations** - Not single inserts
5. **Increase memory** - maintenance_work_mem
6. **Use transactions** - For atomicity

## Conclusion

COPY is the fastest method for bulk loading. Optimize by disabling indexes and triggers during load, then rebuilding after completion.

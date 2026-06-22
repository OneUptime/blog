# How to Implement Data Archival in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Data Archival, Partitioning, Storage, Data Management

Description: A guide to implementing data archival strategies in PostgreSQL for managing historical data and optimizing storage.

---

Data archival moves old data to separate storage, improving query performance and reducing storage costs. This guide covers implementation strategies.

## Archival Strategies

### Separate Archive Tables

```sql
-- Archive table structure
CREATE TABLE orders_archive (LIKE orders INCLUDING ALL);

-- Move old data
WITH moved_rows AS (
    DELETE FROM orders
    WHERE created_at < NOW() - INTERVAL '1 year'
    RETURNING *
)
INSERT INTO orders_archive
SELECT * FROM moved_rows;
```

### Partitioning for Auto-Archival

```sql
-- Partitioned table
CREATE TABLE events (
    id SERIAL,
    event_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2025_01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Detach old partition for archive
ALTER TABLE events DETACH PARTITION events_2024_01;

-- Move to archive schema
ALTER TABLE events_2024_01 SET SCHEMA archive;
```

### Archive to Separate Database

```bash
# Export archive data

pg_dump -t orders_archive myapp > orders_archive.sql

# Import to archive database
psql archive_db < orders_archive.sql
```

## Automated Archival

```sql
-- Archival function
CREATE OR REPLACE FUNCTION archive_old_orders()
RETURNS BIGINT AS $$
DECLARE
    archived_count BIGINT;
BEGIN
    WITH moved_rows AS (
        DELETE FROM orders
        WHERE created_at < NOW() - INTERVAL '1 year'
        RETURNING *
    ),
    inserted_rows AS (
        INSERT INTO orders_archive
        SELECT * FROM moved_rows
        RETURNING 1
    )
    SELECT COUNT(*) INTO archived_count
    FROM inserted_rows;

    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule('archive-orders', '0 2 1 * *',
    'SELECT archive_old_orders()');
```

## Compression

```sql
-- Use TOAST compression for large variable-width columns
-- lz4 requires PostgreSQL to be built with LZ4 support
ALTER TABLE orders_archive
    ALTER COLUMN notes SET COMPRESSION lz4;

-- Move archive tables to lower-cost storage
CREATE TABLESPACE archive_space
    LOCATION '/mnt/archive';

ALTER TABLE orders_archive SET TABLESPACE archive_space;
```

## Best Practices

1. **Define retention policy** - How long to keep active
2. **Use partitioning** - Easier archival
3. **Compress archived data** - Save storage
4. **Keep access patterns** - Archive queries may differ
5. **Test restoration** - Can you get data back?

## Conclusion

Implement data archival to manage database growth. Use partitioning for automated archival and compression for storage efficiency.

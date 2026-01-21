# How to Implement Table Partitioning in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Partitioning, Performance, Database Design, Scaling

Description: A comprehensive guide to implementing table partitioning in PostgreSQL, covering range, list, and hash partitioning with practical examples for time-series data and large tables.

---

Table partitioning divides large tables into smaller, more manageable pieces while maintaining a single logical table interface. This improves query performance, simplifies maintenance, and enables efficient data lifecycle management. This guide covers all PostgreSQL partitioning strategies.

## Prerequisites

- PostgreSQL 10+ (native partitioning)
- Large tables that would benefit from partitioning
- Understanding of your data access patterns

## Why Partition?

### Benefits

1. **Query Performance**: Partition pruning skips irrelevant partitions
2. **Maintenance**: VACUUM, REINDEX run on smaller chunks
3. **Data Management**: Easy archival by dropping old partitions
4. **Parallel Operations**: Operations can run on partitions concurrently
5. **Storage Tiering**: Different partitions on different tablespaces

### When to Partition

- Tables larger than available RAM
- Time-series data with date-based queries
- Data with natural categorization (region, tenant)
- Need to archive/delete old data efficiently

## Partitioning Types

### Range Partitioning

Best for: Time-series data, sequential values

```sql
-- Create partitioned table
CREATE TABLE orders (
    id BIGSERIAL,
    customer_id INT NOT NULL,
    total DECIMAL(10,2),
    status VARCHAR(20),
    created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE orders_2025_q1 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE orders_2025_q2 PARTITION OF orders
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

CREATE TABLE orders_2025_q3 PARTITION OF orders
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

CREATE TABLE orders_2025_q4 PARTITION OF orders
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');

CREATE TABLE orders_2026_q1 PARTITION OF orders
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

### List Partitioning

Best for: Categorical data, regions, status values

```sql
-- Create partitioned table
CREATE TABLE customers (
    id SERIAL,
    name VARCHAR(100),
    email VARCHAR(255),
    region VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY LIST (region);

-- Create partitions for each region
CREATE TABLE customers_na PARTITION OF customers
    FOR VALUES IN ('US', 'CA', 'MX');

CREATE TABLE customers_eu PARTITION OF customers
    FOR VALUES IN ('UK', 'DE', 'FR', 'ES', 'IT');

CREATE TABLE customers_apac PARTITION OF customers
    FOR VALUES IN ('JP', 'CN', 'AU', 'IN', 'SG');

-- Default partition for unmatched values
CREATE TABLE customers_other PARTITION OF customers
    DEFAULT;
```

### Hash Partitioning

Best for: Even distribution, no natural partition key

```sql
-- Create partitioned table
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid(),
    user_id INT NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY HASH (user_id);

-- Create hash partitions
CREATE TABLE sessions_p0 PARTITION OF sessions
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE sessions_p1 PARTITION OF sessions
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);

CREATE TABLE sessions_p2 PARTITION OF sessions
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);

CREATE TABLE sessions_p3 PARTITION OF sessions
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

## Multi-Level Partitioning

Combine partitioning strategies:

```sql
-- Partition by range, then by list
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- Create range partition
CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01')
    PARTITION BY LIST (event_type);

-- Create sub-partitions
CREATE TABLE events_2026_01_click PARTITION OF events_2026_01
    FOR VALUES IN ('click', 'view', 'scroll');

CREATE TABLE events_2026_01_purchase PARTITION OF events_2026_01
    FOR VALUES IN ('purchase', 'refund', 'cart');

CREATE TABLE events_2026_01_other PARTITION OF events_2026_01
    DEFAULT;
```

## Indexes on Partitioned Tables

### Global Indexes (PostgreSQL 11+)

```sql
-- Index defined on parent applies to all partitions
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Unique index requires partition key
CREATE UNIQUE INDEX idx_orders_id_created ON orders(id, created_at);
```

### Partition-Local Indexes

```sql
-- Create index on specific partition
CREATE INDEX idx_orders_2026_q1_status ON orders_2026_q1(status);
```

### Primary Keys

```sql
-- Primary key must include partition key
ALTER TABLE orders ADD PRIMARY KEY (id, created_at);
```

## Partition Management

### Add New Partition

```sql
-- Add future partition
CREATE TABLE orders_2026_q2 PARTITION OF orders
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
```

### Detach Partition

```sql
-- Detach for archiving (keeps data)
ALTER TABLE orders DETACH PARTITION orders_2025_q1;

-- Now can move, archive, or drop
-- Move to archive schema
ALTER TABLE orders_2025_q1 SET SCHEMA archive;

-- Or drop
DROP TABLE orders_2025_q1;
```

### Attach Existing Table as Partition

```sql
-- Create table matching partition structure
CREATE TABLE orders_2024_q4 (LIKE orders INCLUDING ALL);

-- Add constraint (required for attachment)
ALTER TABLE orders_2024_q4 ADD CONSTRAINT partition_check
    CHECK (created_at >= '2024-10-01' AND created_at < '2025-01-01');

-- Attach as partition
ALTER TABLE orders ATTACH PARTITION orders_2024_q4
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
```

### Split Partition

```sql
-- Detach original
ALTER TABLE orders DETACH PARTITION orders_2025_q1;

-- Create new smaller partitions
CREATE TABLE orders_2025_01 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE orders_2025_02 PARTITION OF orders
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE orders_2025_03 PARTITION OF orders
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Move data
INSERT INTO orders SELECT * FROM orders_2025_q1;

-- Drop old partition
DROP TABLE orders_2025_q1;
```

## Automatic Partition Management

### Create Partitions Automatically (pg_partman)

```sql
-- Install pg_partman extension
CREATE EXTENSION pg_partman;

-- Set up automatic partitioning
SELECT partman.create_parent(
    p_parent_table := 'public.orders',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3
);

-- Configure retention
UPDATE partman.part_config
SET retention = '12 months',
    retention_keep_table = false
WHERE parent_table = 'public.orders';

-- Run maintenance (schedule this)
SELECT partman.run_maintenance();
```

### Simple Partition Creation Script

```sql
-- Function to create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(
    table_name TEXT,
    partition_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := table_name || '_' || TO_CHAR(start_date, 'YYYY_MM');

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Create partitions
SELECT create_monthly_partition('orders', '2026-01-01'::DATE);
SELECT create_monthly_partition('orders', '2026-02-01'::DATE);
SELECT create_monthly_partition('orders', '2026-03-01'::DATE);
```

## Query Optimization

### Partition Pruning

```sql
-- Enable partition pruning
SET enable_partition_pruning = on;

-- Query only scans relevant partitions
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE created_at >= '2026-01-01'
  AND created_at < '2026-02-01';
```

Output shows pruning:
```
Seq Scan on orders_2026_01 orders  (cost=...)
  Filter: (created_at >= '2026-01-01' AND created_at < '2026-02-01')
```

### Ensure Partition Key in WHERE

```sql
-- Good: Includes partition key
SELECT * FROM orders
WHERE customer_id = 123
  AND created_at >= '2026-01-01'
  AND created_at < '2026-02-01';

-- Bad: No partition key - scans all partitions
SELECT * FROM orders
WHERE customer_id = 123;
```

### Aggregations Across Partitions

```sql
-- Parallel execution across partitions
SET max_parallel_workers_per_gather = 4;

EXPLAIN ANALYZE
SELECT DATE(created_at), COUNT(*)
FROM orders
WHERE created_at >= '2025-01-01'
GROUP BY DATE(created_at);
```

## Migrating to Partitioned Tables

### Migration Strategy

```sql
-- 1. Create new partitioned table
CREATE TABLE orders_new (
    LIKE orders INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 2. Create partitions
CREATE TABLE orders_new_2026_01 PARTITION OF orders_new
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- ... more partitions

-- 3. Copy data (in batches for large tables)
INSERT INTO orders_new
SELECT * FROM orders
WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01';

-- 4. Rename tables
BEGIN;
ALTER TABLE orders RENAME TO orders_old;
ALTER TABLE orders_new RENAME TO orders;
COMMIT;

-- 5. Drop old table after verification
DROP TABLE orders_old;
```

### Online Migration with Triggers

```sql
-- 1. Create partitioned table
CREATE TABLE orders_partitioned (...) PARTITION BY RANGE (created_at);

-- 2. Create trigger for new data
CREATE OR REPLACE FUNCTION redirect_to_partitioned()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO orders_partitioned VALUES (NEW.*);
    RETURN NULL;  -- Don't insert into original
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_redirect
    BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION redirect_to_partitioned();

-- 3. Migrate historical data in batches

-- 4. Switch over
```

## Maintenance

### VACUUM Partitions

```sql
-- Vacuum specific partition
VACUUM ANALYZE orders_2026_01;

-- Vacuum all partitions (via parent)
VACUUM ANALYZE orders;
```

### Reindex Partitions

```sql
-- Reindex specific partition
REINDEX TABLE orders_2026_01;

-- Reindex concurrently
REINDEX TABLE CONCURRENTLY orders_2026_01;
```

### Check Partition Sizes

```sql
SELECT
    child.relname AS partition,
    pg_size_pretty(pg_relation_size(child.oid)) AS size,
    pg_relation_size(child.oid) AS size_bytes
FROM pg_inherits
JOIN pg_class parent ON parent.oid = pg_inherits.inhparent
JOIN pg_class child ON child.oid = pg_inherits.inhrelid
WHERE parent.relname = 'orders'
ORDER BY child.relname;
```

## Best Practices

### Partition Sizing

- Aim for partitions between 10GB-100GB
- Too many small partitions add overhead
- Too few large partitions reduce benefits

### Choosing Partition Key

1. **Most common filter** - Usually in WHERE clause
2. **Even distribution** - Avoid skewed partitions
3. **Natural boundaries** - Time, region, category

### Retention Management

```sql
-- Create retention procedure
CREATE OR REPLACE FUNCTION drop_old_partitions(
    table_name TEXT,
    retention_months INT
) RETURNS VOID AS $$
DECLARE
    partition RECORD;
    cutoff DATE;
BEGIN
    cutoff := CURRENT_DATE - (retention_months || ' months')::INTERVAL;

    FOR partition IN
        SELECT child.relname
        FROM pg_inherits
        JOIN pg_class parent ON parent.oid = pg_inherits.inhparent
        JOIN pg_class child ON child.oid = pg_inherits.inhrelid
        WHERE parent.relname = table_name
    LOOP
        -- Extract date from partition name and compare
        -- (implementation depends on naming convention)
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Conclusion

Table partitioning is essential for managing large PostgreSQL tables:

1. **Choose strategy** based on query patterns
2. **Include partition key** in queries for pruning
3. **Automate management** with pg_partman or scripts
4. **Monitor partition sizes** and adjust as needed
5. **Plan retention** for data lifecycle management

Proper partitioning dramatically improves performance for large tables while simplifying maintenance and data management.

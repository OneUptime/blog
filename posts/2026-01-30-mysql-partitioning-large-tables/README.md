# How to Create MySQL Partitioning for Large Tables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MySQL, Database, Performance, Partitioning

Description: Implement table partitioning in MySQL for managing large datasets with range, list, and hash partitioning strategies for improved query performance.

---

When your MySQL tables grow to millions or billions of rows, queries slow down, maintenance becomes painful, and backups take forever. Table partitioning splits a large table into smaller, more manageable pieces while keeping it logically as one table. This guide walks through implementing partitioning strategies that actually work in production.

## What Is Table Partitioning?

Partitioning divides a table's data into separate physical segments based on rules you define. MySQL stores each partition as a separate file, but your application queries the table as if it were a single unit. The database engine automatically routes queries to the relevant partitions.

Benefits of partitioning include:

- Faster queries when partition pruning eliminates irrelevant data
- Easier maintenance since you can work on individual partitions
- Efficient data archival by dropping old partitions instead of deleting rows
- Parallel operations on different partitions
- Smaller index sizes per partition

## Partition Types Overview

MySQL supports four main partition types. Each serves different use cases.

| Partition Type | Best For | Key Requirement |
|----------------|----------|-----------------|
| RANGE | Time-series data, date-based queries | Continuous ranges of values |
| LIST | Categorical data, geographic regions | Discrete sets of values |
| HASH | Even data distribution | Integer expression |
| KEY | Similar to HASH but uses MySQL's internal hashing | Any column type |

## Prerequisites

Before creating partitioned tables, verify your MySQL version supports partitioning.

Check if partitioning is enabled in your MySQL installation:

```sql
-- Check MySQL version and partitioning support
SELECT VERSION();

-- Verify the partition plugin is active
SHOW PLUGINS;

-- Look for 'partition' with status 'ACTIVE'
SELECT
    PLUGIN_NAME,
    PLUGIN_STATUS
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_NAME = 'partition';
```

Partitioning requirements to keep in mind:

- The partition key must be part of every unique key (including primary key)
- Foreign keys are not supported on partitioned tables
- Full-text indexes are not supported (until MySQL 5.7.6+)
- Spatial columns cannot be used as partition keys

## RANGE Partitioning

RANGE partitioning assigns rows to partitions based on column values falling within specified ranges. This works well for time-series data where you query recent records more often than old ones.

### Creating a RANGE Partitioned Table

Here we create an orders table partitioned by year. Each partition holds one year of data:

```sql
CREATE TABLE orders (
    order_id INT NOT NULL AUTO_INCREMENT,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    PRIMARY KEY (order_id, order_date)
)
PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

The `pmax` partition catches any rows with dates beyond your defined ranges. Without it, inserts with future dates would fail.

### RANGE COLUMNS Partitioning

For partitioning directly on DATE or DATETIME columns without using functions, use RANGE COLUMNS:

```sql
CREATE TABLE sales_log (
    log_id BIGINT NOT NULL AUTO_INCREMENT,
    sale_date DATE NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    revenue DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (log_id, sale_date)
)
PARTITION BY RANGE COLUMNS (sale_date) (
    PARTITION p_2024_q1 VALUES LESS THAN ('2024-04-01'),
    PARTITION p_2024_q2 VALUES LESS THAN ('2024-07-01'),
    PARTITION p_2024_q3 VALUES LESS THAN ('2024-10-01'),
    PARTITION p_2024_q4 VALUES LESS THAN ('2025-01-01'),
    PARTITION p_2025_q1 VALUES LESS THAN ('2025-04-01'),
    PARTITION p_2025_q2 VALUES LESS THAN ('2025-07-01'),
    PARTITION p_2025_q3 VALUES LESS THAN ('2025-10-01'),
    PARTITION p_2025_q4 VALUES LESS THAN ('2026-01-01'),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

RANGE COLUMNS offers better partition pruning because the optimizer can work directly with the column type.

## LIST Partitioning

LIST partitioning groups rows based on membership in discrete value sets. Use this when your data naturally falls into categories.

### Creating a LIST Partitioned Table

This example partitions customer data by geographic region:

```sql
CREATE TABLE customers (
    customer_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    region_code CHAR(2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id, region_code)
)
PARTITION BY LIST COLUMNS (region_code) (
    PARTITION p_north_america VALUES IN ('US', 'CA', 'MX'),
    PARTITION p_europe VALUES IN ('UK', 'DE', 'FR', 'ES', 'IT'),
    PARTITION p_asia VALUES IN ('JP', 'CN', 'KR', 'IN', 'SG'),
    PARTITION p_oceania VALUES IN ('AU', 'NZ'),
    PARTITION p_other VALUES IN ('BR', 'AR', 'ZA', 'AE')
);
```

Unlike RANGE, LIST partitioning has no MAXVALUE equivalent. You must explicitly define all possible values, or inserts with undefined values will fail.

### Handling Unknown Values in LIST Partitions

Add a catch-all partition for new or unexpected values:

```sql
-- First, create with a placeholder for unknown regions
CREATE TABLE customers_v2 (
    customer_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    region_id SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (customer_id, region_id)
)
PARTITION BY LIST (region_id) (
    PARTITION p_north_america VALUES IN (1, 2, 3),
    PARTITION p_europe VALUES IN (10, 11, 12, 13, 14),
    PARTITION p_asia VALUES IN (20, 21, 22, 23, 24),
    PARTITION p_unknown VALUES IN (0, 99)
);
```

## HASH Partitioning

HASH partitioning distributes data evenly across a specified number of partitions using a modulus operation. This prevents hotspots when no natural partitioning column exists.

### Creating a HASH Partitioned Table

Distribute user sessions across 8 partitions based on user ID:

```sql
CREATE TABLE user_sessions (
    session_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    session_data JSON,
    PRIMARY KEY (session_id, user_id)
)
PARTITION BY HASH (user_id)
PARTITIONS 8;
```

MySQL calculates the partition using `user_id MOD 8`. With 8 partitions, data spreads relatively evenly assuming user IDs are sequential or random.

### LINEAR HASH Partitioning

LINEAR HASH uses a different algorithm that makes adding and removing partitions faster, though distribution may be slightly less even:

```sql
CREATE TABLE event_log (
    event_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
)
PARTITION BY LINEAR HASH (user_id)
PARTITIONS 16;
```

## KEY Partitioning

KEY partitioning is similar to HASH but uses MySQL's internal hashing function. It can work with non-integer columns and automatically uses the primary key if no column is specified.

### Creating a KEY Partitioned Table

Partition a table using a string column:

```sql
CREATE TABLE api_keys (
    api_key VARCHAR(64) NOT NULL,
    client_id INT NOT NULL,
    permissions JSON,
    rate_limit INT NOT NULL DEFAULT 1000,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    PRIMARY KEY (api_key)
)
PARTITION BY KEY (api_key)
PARTITIONS 10;
```

When no column is specified, KEY partitioning uses the primary key:

```sql
CREATE TABLE cache_entries (
    cache_key VARCHAR(255) NOT NULL,
    cache_value MEDIUMBLOB,
    ttl INT NOT NULL DEFAULT 3600,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cache_key)
)
PARTITION BY KEY ()
PARTITIONS 12;
```

## Partition Pruning

Partition pruning is the optimization that makes partitioning worthwhile. When a query's WHERE clause matches the partition key, MySQL scans only relevant partitions instead of the entire table.

### Verifying Partition Pruning with EXPLAIN

Check which partitions a query will access:

```sql
-- This query only scans the p2025 partition
EXPLAIN SELECT * FROM orders
WHERE order_date BETWEEN '2025-01-01' AND '2025-12-31';

-- Check the 'partitions' column in the output
EXPLAIN PARTITIONS SELECT * FROM orders
WHERE YEAR(order_date) = 2025;
```

Sample output showing partition pruning in action:

```
+----+-------------+--------+------------+------+---------------+------+
| id | select_type | table  | partitions | type | possible_keys | rows |
+----+-------------+--------+------------+------+---------------+------+
|  1 | SIMPLE      | orders | p2025      | ALL  | NULL          | 1000 |
+----+-------------+--------+------------+------+---------------+------+
```

### Queries That Enable Pruning

Partition pruning works with these operators on the partition key:

```sql
-- Equality
SELECT * FROM orders WHERE order_date = '2025-06-15';

-- Range comparisons
SELECT * FROM orders WHERE order_date >= '2025-01-01';
SELECT * FROM orders WHERE order_date < '2025-07-01';
SELECT * FROM orders WHERE order_date BETWEEN '2025-01-01' AND '2025-06-30';

-- IN lists
SELECT * FROM orders WHERE YEAR(order_date) IN (2024, 2025);
```

### Queries That Prevent Pruning

Avoid these patterns that force full table scans:

```sql
-- Functions on the partition column (except when matching the partition expression)
SELECT * FROM orders WHERE MONTH(order_date) = 6;

-- OR conditions with non-partition columns
SELECT * FROM orders WHERE order_date = '2025-01-01' OR status = 'pending';

-- Comparing partition column to another column
SELECT * FROM orders WHERE order_date = shipped_date;
```

## Managing Partitions

### Adding New Partitions

Add a partition to a RANGE partitioned table. First, you need to reorganize the MAXVALUE partition:

```sql
-- Split the pmax partition to add a new year
ALTER TABLE orders REORGANIZE PARTITION pmax INTO (
    PARTITION p2027 VALUES LESS THAN (2028),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

For tables without a MAXVALUE partition:

```sql
ALTER TABLE orders ADD PARTITION (
    PARTITION p2027 VALUES LESS THAN (2028)
);
```

### Dropping Partitions

Remove old data instantly by dropping entire partitions. This is much faster than DELETE statements:

```sql
-- Drop the 2022 partition (deletes all 2022 data)
ALTER TABLE orders DROP PARTITION p2022;

-- Verify the partition is gone
SELECT PARTITION_NAME, TABLE_ROWS
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_NAME = 'orders';
```

Warning: DROP PARTITION permanently deletes all data in that partition. Always backup first.

### Reorganizing Partitions

Merge multiple partitions into one:

```sql
-- Merge Q1 and Q2 partitions into a single H1 partition
ALTER TABLE sales_log REORGANIZE PARTITION p_2024_q1, p_2024_q2 INTO (
    PARTITION p_2024_h1 VALUES LESS THAN ('2024-07-01')
);
```

Split one partition into multiple:

```sql
-- Split yearly partition into quarterly
ALTER TABLE orders REORGANIZE PARTITION p2025 INTO (
    PARTITION p2025_q1 VALUES LESS THAN (2025) + INTERVAL 3 MONTH,
    PARTITION p2025_q2 VALUES LESS THAN (2025) + INTERVAL 6 MONTH,
    PARTITION p2025_q3 VALUES LESS THAN (2025) + INTERVAL 9 MONTH,
    PARTITION p2025_q4 VALUES LESS THAN (2026)
);
```

Actually, the above syntax is incorrect. Here is the proper way:

```sql
-- Split yearly partition into quarterly (correct syntax)
ALTER TABLE sales_log REORGANIZE PARTITION p_2025_q1 INTO (
    PARTITION p_2025_jan VALUES LESS THAN ('2025-02-01'),
    PARTITION p_2025_feb VALUES LESS THAN ('2025-03-01'),
    PARTITION p_2025_mar VALUES LESS THAN ('2025-04-01')
);
```

### Truncating Partitions

Empty a partition without dropping it:

```sql
-- Remove all data but keep the partition structure
ALTER TABLE orders TRUNCATE PARTITION p2023;
```

### Exchanging Partitions

Swap a partition with a non-partitioned table. Useful for archiving:

```sql
-- Create an archive table with identical structure (but no partitions)
CREATE TABLE orders_archive_2022 LIKE orders;
ALTER TABLE orders_archive_2022 REMOVE PARTITIONING;

-- Move 2022 data to archive table instantly
ALTER TABLE orders EXCHANGE PARTITION p2022 WITH TABLE orders_archive_2022;
```

After exchange, `orders_archive_2022` contains all the 2022 data, and partition p2022 is empty.

## Subpartitioning

Subpartitioning (composite partitioning) applies a second level of partitioning to each partition. MySQL supports subpartitioning RANGE and LIST partitions with HASH or KEY.

### Creating a Subpartitioned Table

Partition by date range, then subpartition by hash for even distribution:

```sql
CREATE TABLE transaction_log (
    txn_id BIGINT NOT NULL AUTO_INCREMENT,
    account_id INT NOT NULL,
    txn_date DATE NOT NULL,
    txn_type ENUM('credit', 'debit', 'transfer') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (txn_id, txn_date, account_id)
)
PARTITION BY RANGE (YEAR(txn_date))
SUBPARTITION BY HASH (account_id)
SUBPARTITIONS 4 (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

This creates 16 subpartitions total (4 partitions x 4 subpartitions each).

### Explicitly Named Subpartitions

Define subpartitions with specific names for clearer management:

```sql
CREATE TABLE audit_log (
    log_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    action_date DATE NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    details JSON,
    PRIMARY KEY (log_id, action_date, user_id)
)
PARTITION BY RANGE (YEAR(action_date))
SUBPARTITION BY HASH (user_id) (
    PARTITION p2025 VALUES LESS THAN (2026) (
        SUBPARTITION p2025_s0,
        SUBPARTITION p2025_s1,
        SUBPARTITION p2025_s2,
        SUBPARTITION p2025_s3
    ),
    PARTITION p2026 VALUES LESS THAN (2027) (
        SUBPARTITION p2026_s0,
        SUBPARTITION p2026_s1,
        SUBPARTITION p2026_s2,
        SUBPARTITION p2026_s3
    ),
    PARTITION pmax VALUES LESS THAN MAXVALUE (
        SUBPARTITION pmax_s0,
        SUBPARTITION pmax_s1,
        SUBPARTITION pmax_s2,
        SUBPARTITION pmax_s3
    )
);
```

## Partition Maintenance

### Checking Partition Information

Query the INFORMATION_SCHEMA to monitor your partitions:

```sql
-- Get partition details including row counts
SELECT
    TABLE_NAME,
    PARTITION_NAME,
    SUBPARTITION_NAME,
    PARTITION_ORDINAL_POSITION,
    TABLE_ROWS,
    AVG_ROW_LENGTH,
    DATA_LENGTH,
    INDEX_LENGTH
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'orders'
ORDER BY PARTITION_ORDINAL_POSITION;
```

### Analyzing Partitions

Update statistics for specific partitions:

```sql
-- Analyze specific partitions
ALTER TABLE orders ANALYZE PARTITION p2024, p2025;

-- Analyze all partitions
ALTER TABLE orders ANALYZE PARTITION ALL;
```

### Optimizing Partitions

Reclaim space and defragment partitions:

```sql
-- Optimize specific partitions (reclaims space, defragments)
ALTER TABLE orders OPTIMIZE PARTITION p2024;

-- Optimize multiple partitions
ALTER TABLE orders OPTIMIZE PARTITION p2024, p2025, p2026;
```

### Repairing Partitions

Fix corrupted partitions:

```sql
-- Check for errors
ALTER TABLE orders CHECK PARTITION p2024, p2025;

-- Repair if needed
ALTER TABLE orders REPAIR PARTITION p2024;
```

### Rebuilding Partitions

Rebuild partitions to update the partition storage:

```sql
-- Rebuild specific partitions
ALTER TABLE orders REBUILD PARTITION p2024, p2025;
```

## Converting Existing Tables to Partitioned Tables

### Method 1: ALTER TABLE (for smaller tables)

Add partitioning to an existing table:

```sql
-- Add RANGE partitioning to existing orders table
ALTER TABLE orders PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

Warning: This locks the table and can take a long time for large tables.

### Method 2: CREATE TABLE ... SELECT (for larger tables)

Create a new partitioned table and migrate data:

```sql
-- Step 1: Create the new partitioned table
CREATE TABLE orders_partitioned (
    order_id INT NOT NULL,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    PRIMARY KEY (order_id, order_date)
)
PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- Step 2: Copy data in batches
INSERT INTO orders_partitioned
SELECT * FROM orders
WHERE order_date >= '2022-01-01' AND order_date < '2023-01-01';

INSERT INTO orders_partitioned
SELECT * FROM orders
WHERE order_date >= '2023-01-01' AND order_date < '2024-01-01';

-- Continue for each partition...

-- Step 3: Rename tables (brief lock)
RENAME TABLE orders TO orders_old,
             orders_partitioned TO orders;

-- Step 4: Drop old table after verification
DROP TABLE orders_old;
```

### Method 3: Using pt-online-schema-change

For zero-downtime migration on production tables, use Percona Toolkit:

```bash
# Install Percona Toolkit first, then run:
pt-online-schema-change \
  --alter "PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION pmax VALUES LESS THAN MAXVALUE
  )" \
  --execute \
  D=mydb,t=orders
```

## Removing Partitioning

Convert a partitioned table back to a regular table:

```sql
-- Remove partitioning but keep the data
ALTER TABLE orders REMOVE PARTITIONING;
```

## Performance Considerations

### Choosing the Right Partition Key

| Scenario | Recommended Partition Type | Key Selection |
|----------|---------------------------|---------------|
| Time-series data with date queries | RANGE | Date/timestamp column |
| Geographic or categorical queries | LIST | Region/category column |
| Even distribution needed | HASH/KEY | High-cardinality column |
| Hot/cold data separation | RANGE | Date column |
| Multi-tenant application | LIST or HASH | tenant_id column |

### Number of Partitions

Guidelines for partition count:

- RANGE/LIST: Create partitions based on query patterns and data lifecycle
- HASH/KEY: Start with 4-16 partitions, increase based on table size
- Maximum: MySQL supports up to 8192 partitions per table
- Too many partitions increases memory usage and management overhead

### Indexing Partitioned Tables

Each partition maintains its own indexes. Consider these strategies:

```sql
-- Create a partitioned table with indexes
CREATE TABLE products (
    product_id INT NOT NULL AUTO_INCREMENT,
    category_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at DATE NOT NULL,
    PRIMARY KEY (product_id, created_at),
    INDEX idx_category (category_id, created_at),
    INDEX idx_price (price)
)
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

Index tips for partitioned tables:

- Include the partition key in frequently used indexes
- Local indexes (per partition) are smaller and faster to maintain
- Unique indexes must include the partition key

## Automated Partition Management

### Creating Partitions Automatically with Events

Set up a scheduled event to create future partitions:

```sql
-- Create an event to add monthly partitions
DELIMITER //

CREATE EVENT add_monthly_partition
ON SCHEDULE EVERY 1 MONTH
STARTS '2026-02-01 00:00:00'
DO
BEGIN
    DECLARE partition_name VARCHAR(20);
    DECLARE partition_date DATE;

    -- Calculate next month's partition details
    SET partition_date = DATE_ADD(CURDATE(), INTERVAL 2 MONTH);
    SET partition_date = DATE_FORMAT(partition_date, '%Y-%m-01');
    SET partition_name = CONCAT('p', DATE_FORMAT(partition_date, '%Y%m'));

    -- Reorganize the pmax partition
    SET @sql = CONCAT(
        'ALTER TABLE orders REORGANIZE PARTITION pmax INTO (',
        'PARTITION ', partition_name, ' VALUES LESS THAN (''',
        DATE_ADD(partition_date, INTERVAL 1 MONTH), '''), ',
        'PARTITION pmax VALUES LESS THAN MAXVALUE)'
    );

    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END //

DELIMITER ;

-- Enable the event scheduler
SET GLOBAL event_scheduler = ON;
```

### Dropping Old Partitions Automatically

Create an event to remove partitions older than a retention period:

```sql
DELIMITER //

CREATE EVENT drop_old_partitions
ON SCHEDULE EVERY 1 MONTH
STARTS '2026-02-01 01:00:00'
DO
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE part_name VARCHAR(64);
    DECLARE part_desc VARCHAR(64);
    DECLARE retention_date DATE;

    -- Keep 3 years of data
    SET retention_date = DATE_SUB(CURDATE(), INTERVAL 3 YEAR);

    -- Find partitions to drop
    DECLARE partition_cursor CURSOR FOR
        SELECT PARTITION_NAME, PARTITION_DESCRIPTION
        FROM INFORMATION_SCHEMA.PARTITIONS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'orders'
          AND PARTITION_NAME != 'pmax'
          AND CAST(PARTITION_DESCRIPTION AS UNSIGNED) < YEAR(retention_date);

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN partition_cursor;

    read_loop: LOOP
        FETCH partition_cursor INTO part_name, part_desc;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET @drop_sql = CONCAT('ALTER TABLE orders DROP PARTITION ', part_name);
        PREPARE stmt FROM @drop_sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;

    CLOSE partition_cursor;
END //

DELIMITER ;
```

## Common Mistakes and Solutions

### Mistake 1: Partition Key Not in Primary Key

```sql
-- This will fail
CREATE TABLE bad_example (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_date DATE NOT NULL
)
PARTITION BY RANGE (YEAR(created_date)) (
    PARTITION p2025 VALUES LESS THAN (2026)
);

-- Error: A PRIMARY KEY must include all columns in the table's partitioning function

-- Correct version
CREATE TABLE good_example (
    id INT NOT NULL AUTO_INCREMENT,
    created_date DATE NOT NULL,
    PRIMARY KEY (id, created_date)
)
PARTITION BY RANGE (YEAR(created_date)) (
    PARTITION p2025 VALUES LESS THAN (2026)
);
```

### Mistake 2: Queries Not Using Partition Key

```sql
-- This scans ALL partitions (bad)
SELECT * FROM orders WHERE customer_id = 12345;

-- This uses partition pruning (good)
SELECT * FROM orders
WHERE customer_id = 12345
  AND order_date >= '2025-01-01'
  AND order_date < '2026-01-01';
```

### Mistake 3: Forgetting MAXVALUE Partition

```sql
-- Insert will fail if date is in 2027
INSERT INTO orders (customer_id, order_date, amount, status)
VALUES (1, '2027-03-15', 99.99, 'pending');

-- Error: Table has no partition for value 2027

-- Always include a MAXVALUE partition for RANGE
PARTITION pmax VALUES LESS THAN MAXVALUE
```

## Monitoring Partition Usage

Create a monitoring query to track partition health:

```sql
-- Comprehensive partition status report
SELECT
    TABLE_NAME,
    PARTITION_NAME,
    PARTITION_METHOD,
    PARTITION_EXPRESSION,
    PARTITION_DESCRIPTION,
    TABLE_ROWS,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS total_mb
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA = DATABASE()
  AND PARTITION_NAME IS NOT NULL
ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION;
```

## Summary

Table partitioning transforms how MySQL handles large datasets. The key takeaways:

1. Choose RANGE for time-series data, LIST for categories, HASH/KEY for even distribution
2. Always include the partition key in your primary key and unique indexes
3. Write queries that include the partition key to benefit from partition pruning
4. Use EXPLAIN to verify your queries are pruning partitions correctly
5. Automate partition maintenance with MySQL events
6. Plan for data lifecycle from the start, partitioning makes archival straightforward

Start with a simple partitioning scheme and adjust based on actual query patterns and data growth. Monitor partition sizes regularly and automate the creation of new partitions to avoid maintenance surprises.

# How to Migrate from MySQL to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MySQL, Migration, Database, Analytics, ETL

Description: Migrate analytical tables from MySQL to ClickHouse by mapping data types, exporting data with mysqldump or SELECT INTO OUTFILE, and optimizing the schema for columnar storage.

---

MySQL is excellent for transactional workloads but struggles with analytical queries over tens of millions of rows. ClickHouse can query the same data 100x faster by storing it in a columnar format optimized for aggregations. This guide covers a practical migration path from MySQL to ClickHouse.

## When to Migrate

Consider migrating MySQL tables to ClickHouse when you observe:

- Analytical queries taking more than a few seconds
- Read replicas overwhelmed by reporting queries
- `GROUP BY` queries on large tables consuming excessive CPU
- Dashboard timeouts at peak usage

Keep MySQL for transactional writes, foreign key enforcement, and short point lookups. Move large event, log, and metrics tables to ClickHouse.

## Data Type Mapping

MySQL types do not map one-to-one to ClickHouse. Use this reference:

| MySQL | ClickHouse |
|-------|------------|
| TINYINT | Int8 |
| SMALLINT | Int16 |
| INT / INTEGER | Int32 |
| BIGINT | Int64 |
| TINYINT UNSIGNED | UInt8 |
| INT UNSIGNED | UInt32 |
| BIGINT UNSIGNED | UInt64 |
| FLOAT | Float32 |
| DOUBLE | Float64 |
| DECIMAL(p, s) | Decimal(p, s) |
| VARCHAR / TEXT | String |
| CHAR | FixedString(N) |
| ENUM | LowCardinality(String) |
| DATE | Date |
| DATETIME | DateTime |
| TIMESTAMP | DateTime |
| BOOLEAN / TINYINT(1) | Bool |
| JSON | String (use JSONExtract functions) |
| BLOB | String |

## Example: MySQL Schema

```sql
-- MySQL schema
CREATE TABLE events (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    session_id  VARCHAR(64)     NOT NULL,
    event_type  ENUM('page_view','click','purchase','signup') NOT NULL,
    page        VARCHAR(512),
    amount      DECIMAL(10, 2),
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user    (user_id),
    INDEX idx_created (created_at)
);
```

## Equivalent ClickHouse Schema

```sql
CREATE TABLE events
(
    id         UInt64,
    user_id    UInt64,
    session_id String,
    event_type LowCardinality(String),
    page       String,
    amount     Decimal(10, 2),
    created_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (event_type, user_id, created_at)
SETTINGS index_granularity = 8192;
```

Key differences:
- No `AUTO_INCREMENT PRIMARY KEY` - ClickHouse does not enforce unique constraints
- No B-tree secondary indexes - rely on the `ORDER BY` sort key and optional data skipping indexes for fast lookups
- `ENUM` becomes `LowCardinality(String)` for flexibility
- `PARTITION BY` replaces manual table partitioning

## Step 1: Export from MySQL

Use `SELECT INTO OUTFILE` for large tables (fastest method):

```sql
-- Run on the MySQL server
SELECT
    id,
    user_id,
    session_id,
    event_type,
    page,
    amount,
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')
INTO OUTFILE '/var/lib/mysql-files/events.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
FROM events;
```

For remote export, use `mysqldump` with `--tab` or `mysql` client:

```bash
mysql -h mysql.host -u root -p analytics \
  -e "SELECT id, user_id, session_id, event_type, page, amount, created_at
      FROM events
      INTO OUTFILE '/tmp/events.tsv'
      FIELDS TERMINATED BY '\t'
      LINES TERMINATED BY '\n';"
```

Alternatively, export with `mysql` to stdout and pipe directly:

```bash
mysql -h mysql.host -u root -p analytics \
  --batch --skip-column-names \
  -e "SELECT id, user_id, session_id, event_type, page, amount, created_at FROM events" \
  > /tmp/events.tsv
```

## Step 2: Load into ClickHouse

Load the TSV file using `clickhouse-client`:

```bash
clickhouse-client \
  --database analytics \
  --query "INSERT INTO events FORMAT TSV" \
  < /tmp/events.tsv
```

For CSV with headers, use `CSVWithNames`:

```bash
clickhouse-client \
  --database analytics \
  --query "INSERT INTO events FORMAT CSVWithNames" \
  < /tmp/events.csv
```

## Step 3: Use ClickHouse MySQL Table Function for Live Sync

Instead of file export, use ClickHouse's built-in `mysql()` table function to query MySQL directly:

```sql
SELECT *
FROM mysql(
    'mysql.host:3306',
    'analytics',
    'events',
    'root',
    'password'
)
LIMIT 10;
```

Insert from MySQL to ClickHouse in one step:

```sql
INSERT INTO events
SELECT
    id,
    user_id,
    session_id,
    event_type,
    page,
    amount,
    created_at
FROM mysql(
    'mysql.host:3306',
    'analytics',
    'events',
    'root',
    'password'
)
WHERE created_at >= '2024-01-01';
```

## Step 4: Set Up Ongoing Replication with MySQL Engine

For continuous replication, use the `MySQL` database engine:

```sql
CREATE DATABASE mysql_replica
ENGINE = MySQL(
    'mysql.host:3306',
    'analytics',
    'root',
    'password'
);
```

This creates a virtual mapping of all MySQL tables, proxying queries to MySQL in real time. You can then run periodic batch inserts to copy new rows from MySQL into ClickHouse:

```sql
INSERT INTO events
SELECT id, user_id, session_id, event_type, page, amount, created_at
FROM mysql_replica.events
WHERE created_at > (SELECT max(created_at) FROM events);
```

Note: The MySQL database engine is a proxy, not a local replica. Materialized views will not auto-trigger on new MySQL inserts. Run the above query on a schedule (e.g., via cron) for incremental syncs.

For production continuous replication, use ClickHouse's `MaterializedMySQL` engine, which consumes the MySQL binary log:

```sql
CREATE DATABASE mysql_cdc
ENGINE = MaterializedMySQL(
    'mysql.host:3306',
    'analytics',
    'root',
    'password'
)
SETTINGS
    allows_query_when_mysql_lost = 1,
    max_wait_time_when_mysql_unavailable = 10000;
```

This requires MySQL GTID-based replication with `binlog_format = ROW` and `binlog_row_image = FULL`.

Enable on MySQL:

```text
[mysqld]
gtid_mode                = ON
enforce_gtid_consistency = ON
binlog_format            = ROW
binlog_row_image         = FULL
log_bin                  = mysql-bin
server_id                = 1
```

## Step 5: Validate the Migration

Count comparison:

```sql
-- MySQL
SELECT COUNT(*) FROM events;

-- ClickHouse
SELECT COUNT(*) FROM events;
```

Sum comparison:

```sql
-- MySQL
SELECT SUM(amount), COUNT(DISTINCT user_id) FROM events;

-- ClickHouse
SELECT sum(amount), uniqExact(user_id) FROM events;
```

Row-level spot check:

```sql
-- ClickHouse: verify a specific record
SELECT * FROM events WHERE id = 12345;
```

## Query Rewrites

Some MySQL queries need adjustment for ClickHouse:

```sql
-- MySQL: LIMIT with OFFSET
SELECT * FROM events ORDER BY created_at DESC LIMIT 10 OFFSET 100;

-- ClickHouse: same syntax works
SELECT * FROM events ORDER BY created_at DESC LIMIT 10 OFFSET 100;
```

```sql
-- MySQL: GROUP_CONCAT
SELECT user_id, GROUP_CONCAT(event_type) FROM events GROUP BY user_id;

-- ClickHouse: arrayStringConcat(groupArray(...))
SELECT user_id, arrayStringConcat(groupArray(event_type), ',') FROM events GROUP BY user_id;
```

```sql
-- MySQL: IFNULL
SELECT IFNULL(page, 'unknown') FROM events;

-- ClickHouse: ifNull or coalesce
SELECT ifNull(page, 'unknown') FROM events;
```

## Summary

Migrating from MySQL to ClickHouse involves mapping data types, redesigning the schema around a sort key instead of secondary indexes, and choosing between a one-time file export or continuous replication via `MaterializedMySQL`. Keep MySQL for transactional writes and use ClickHouse exclusively for analytical queries. After migration, validate row counts and aggregates, then rewrite GROUP BY and reporting queries to use ClickHouse's analytical functions.

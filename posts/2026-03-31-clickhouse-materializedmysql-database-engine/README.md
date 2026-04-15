# How to Use MaterializedMySQL Database Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MaterializedMySQL, MySQL, CDC, Database Engine

Description: Learn how to use the MaterializedMySQL database engine to replicate an entire MySQL database into ClickHouse using binlog for fast analytics.

---

MaterializedMySQL is a ClickHouse database engine that replicates an entire MySQL database into ClickHouse using MySQL's binary log (binlog). All tables in the MySQL database are mirrored as ReplacingMergeTree tables in ClickHouse, enabling fast analytics on your operational MySQL data without impacting the MySQL server.

## Prerequisites

Enable binlog on MySQL:

```ini
# my.cnf
[mysqld]
server-id         = 1
log_bin           = /var/log/mysql/mysql-bin.log
binlog_format     = ROW
binlog_row_image  = FULL
expire_logs_days  = 7
```

Create a MySQL user with REPLICATION privileges:

```sql
CREATE USER 'ch_repl'@'%' IDENTIFIED BY 'secret';
GRANT REPLICATION SLAVE, REPLICATION CLIENT, RELOAD, SELECT ON *.* TO 'ch_repl'@'%';
FLUSH PRIVILEGES;
```

## Creating the Database

MaterializedMySQL is an experimental engine. Enable it in ClickHouse before use:

```sql
SET allow_experimental_database_materialized_mysql = 1;
```

Then create a database with the MaterializedMySQL engine:

```sql
CREATE DATABASE mysql_replica
ENGINE = MaterializedMySQL(
    '10.0.0.5:3306',
    'production_db',
    'ch_repl',
    'secret'
)
SETTINGS
    allows_query_when_mysql_lost = 1,
    max_wait_time_when_mysql_unavailable = 10000;
```

ClickHouse performs an initial full dump of all tables and then follows the binlog for incremental changes.

## Querying Replicated Tables

```sql
USE mysql_replica;

SELECT
    customer_id,
    sum(total_amount) AS revenue,
    count() AS orders
FROM orders
WHERE order_date >= '2024-01-01'
GROUP BY customer_id
ORDER BY revenue DESC
LIMIT 20;
```

## How Tables Are Mapped

Each MySQL table becomes a ReplacingMergeTree table in ClickHouse:
- MySQL primary key maps to ClickHouse ORDER BY key
- MySQL DELETE operations mark rows with `_sign = -1`
- Use FINAL or filter `WHERE _sign = 1` to exclude deleted rows

```sql
-- Safe query that excludes deleted rows
SELECT *
FROM mysql_replica.orders FINAL
WHERE _sign = 1
  AND status = 'completed';
```

## Checking Sync Status

```sql
SELECT *
FROM system.databases
WHERE engine = 'MaterializedMySQL';
```

## Handling Schema Changes

MaterializedMySQL supports a subset of DDL operations from MySQL binlog:
- `CREATE TABLE`, `DROP TABLE`: Supported
- `ALTER TABLE ADD/DROP COLUMN`: Supported
- `RENAME TABLE`: Supported

Unsupported DDL operations may stop replication. Monitor ClickHouse server logs for errors.

## Performance Tuning

```sql
-- Adjust flush interval for better throughput
CREATE DATABASE mysql_replica
ENGINE = MaterializedMySQL('host:3306', 'db', 'user', 'pass')
SETTINGS
    max_flush_data_time = 1000,
    allows_query_when_mysql_lost = 1;
```

## Summary

MaterializedMySQL provides a near-real-time mirror of your MySQL database inside ClickHouse. It automates table creation, schema mapping, and incremental sync via binlog. The result is fast analytical queries on live operational data with no impact on MySQL performance. Use FINAL or `_sign` filtering to always query the latest, non-deleted data.

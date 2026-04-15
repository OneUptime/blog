# How to Replicate Data from MySQL to ClickHouse in Real-Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MySQL, Replication, CDC, Real-Time, MaterializedMySQL

Description: Replicate MySQL tables into ClickHouse in real-time using the MaterializedMySQL engine for live analytics on operational data.

---

The `MaterializedMySQL` database engine replicates MySQL databases into ClickHouse in real-time using MySQL binlog replication. This enables live analytics on MySQL operational data without ETL pipelines.

## Prerequisites

Enable binlog replication on your MySQL server:

```ini
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
binlog_row_image = FULL
gtid_mode = ON
enforce_gtid_consistency = ON
binlog_expire_logs_seconds = 604800
```

Create a MySQL user with replication privileges:

```sql
CREATE USER 'clickhouse'@'%' IDENTIFIED BY 'secret';
GRANT REPLICATION SLAVE, REPLICATION CLIENT, SELECT ON *.* TO 'clickhouse'@'%';
FLUSH PRIVILEGES;
```

## Create MaterializedMySQL Database in ClickHouse

```sql
CREATE DATABASE mysql_replica
ENGINE = MaterializedMySQL(
    'mysql-host:3306',
    'myapp_db',
    'clickhouse',
    'secret'
)
SETTINGS
    max_wait_time_when_mysql_unavailable = 10000,
    allows_query_when_mysql_lost = true;
```

This creates a ClickHouse database that mirrors all tables from `myapp_db`.

## Query Replicated Tables

Tables are accessible immediately:

```sql
SHOW TABLES IN mysql_replica;

SELECT * FROM mysql_replica.orders LIMIT 10;

SELECT
    status,
    count() AS order_count,
    sum(total_amount) AS revenue
FROM mysql_replica.orders
WHERE created_at >= now() - INTERVAL 24 HOUR
GROUP BY status
ORDER BY revenue DESC;
```

## ReplacingMergeTree Under the Hood

Replicated tables use `ReplacingMergeTree` to handle MySQL UPDATEs and DELETEs:

```sql
SHOW CREATE TABLE mysql_replica.orders;
-- ENGINE = ReplacingMergeTree(_version)
-- ORDER BY (id)
```

Deleted rows are marked with `_sign = -1`. Use the `FINAL` keyword for accurate results:

```sql
SELECT * FROM mysql_replica.orders FINAL WHERE id = 12345;
```

## Monitor Replication Lag

```sql
SELECT
    database,
    executed_gtid_set,
    exception
FROM system.materialized_mysql_databases;
```

Check MySQL lag:

```sql
SHOW REPLICA STATUS\G
```

## Filter Tables

Replicate only specific tables:

```sql
CREATE DATABASE mysql_replica
ENGINE = MaterializedMySQL('mysql-host:3306', 'myapp_db', 'clickhouse', 'secret')
SETTINGS materialized_mysql_tables_list = 'orders,customers,products';
```

## Handle Schema Changes

`MaterializedMySQL` handles most DDL changes automatically (ADD COLUMN, DROP COLUMN, RENAME). ClickHouse applies these changes to the replicated tables.

## Summary

`MaterializedMySQL` provides zero-ETL real-time replication from MySQL to ClickHouse via binlog streaming. Enable ROW-format binlog on MySQL, create the materialized database in ClickHouse, and query replicated tables directly. Use `FINAL` for correct results when rows may have been updated or deleted.

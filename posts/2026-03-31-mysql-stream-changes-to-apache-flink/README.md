# How to Stream MySQL Changes to Apache Flink

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Apache Flink, CDC, Debezium, Stream Processing

Description: Learn how to stream MySQL change data capture events to Apache Flink using the Flink CDC connector to build real-time stream processing pipelines.

---

## Architecture Overview

MySQL changes are captured from the binary log and streamed directly into Apache Flink jobs using the Flink CDC (Change Data Capture) connector. This enables real-time aggregations, enrichments, and transformations without separate Kafka infrastructure.

## Prerequisites

- Apache Flink 1.17+
- MySQL 8.0 with binary logging in ROW format
- Flink CDC MySQL connector JAR

## MySQL Configuration

Enable binary logging for CDC:

```ini
[mysqld]
server-id     = 1
log_bin       = mysql-bin
binlog_format = ROW
binlog_row_image = FULL
```

Create a replication user for Flink:

```sql
CREATE USER 'flink_cdc'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT
  ON *.* TO 'flink_cdc'@'%';
FLUSH PRIVILEGES;
```

## Flink Table API: MySQL CDC Source

Define a Flink table backed by MySQL CDC using SQL:

```sql
-- In Flink SQL client
CREATE TABLE mysql_orders (
  id              BIGINT,
  customer_id     BIGINT,
  total_amount    DECIMAL(10, 2),
  status          STRING,
  order_date      TIMESTAMP(3),
  WATERMARK FOR order_date AS order_date - INTERVAL '5' SECOND,
  PRIMARY KEY (id) NOT ENFORCED
) WITH (
  'connector'    = 'mysql-cdc',
  'hostname'     = 'mysql-host',
  'port'         = '3306',
  'username'     = 'flink_cdc',
  'password'     = 'strong_password',
  'database-name' = 'orders_db',
  'table-name'   = 'orders'
);
```

## Real-Time Aggregation

Compute real-time order revenue per minute using a Flink tumbling window:

```sql
CREATE TABLE order_revenue_per_minute (
  window_start TIMESTAMP(3),
  window_end   TIMESTAMP(3),
  order_count  BIGINT,
  total_revenue DECIMAL(12, 2),
  PRIMARY KEY (window_start) NOT ENFORCED
) WITH (
  'connector' = 'jdbc',
  'url'       = 'jdbc:mysql://analytics-db:3306/reports',
  'table-name' = 'order_revenue_per_minute',
  'username'  = 'analytics_user',
  'password'  = 'analytics_password'
);

INSERT INTO order_revenue_per_minute
SELECT
  TUMBLE_START(order_date, INTERVAL '1' MINUTE) AS window_start,
  TUMBLE_END(order_date, INTERVAL '1' MINUTE)   AS window_end,
  COUNT(*) AS order_count,
  SUM(total_amount) AS total_revenue
FROM mysql_orders
WHERE status != 'cancelled'
GROUP BY TUMBLE(order_date, INTERVAL '1' MINUTE);
```

## DataStream API Example

For programmatic processing, use the DataStream API:

```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

MySqlSource<String> mySqlSource = MySqlSource.<String>builder()
    .hostname("mysql-host")
    .port(3306)
    .databaseList("orders_db")
    .tableList("orders_db.orders")
    .username("flink_cdc")
    .password("strong_password")
    .deserializer(new JsonDebeziumDeserializationSchema())
    .build();

DataStream<String> stream = env
    .fromSource(mySqlSource, WatermarkStrategy.noWatermarks(), "MySQL Source");

stream
    .filter(record -> record.contains("\"op\":\"c\""))  // only inserts
    .print();

env.execute("MySQL CDC to Flink");
```

## Monitoring the Flink Job

Check job status via the Flink REST API:

```bash
curl http://flink-jobmanager:8081/jobs
curl http://flink-jobmanager:8081/jobs/{job-id}/metrics
```

Key metrics to monitor:
- `currentEmitEventTimeLag` - lag between event time and current processing time
- `pendingRecords` - number of records awaiting processing from the source

## Summary

Stream MySQL changes to Apache Flink using the Flink CDC MySQL connector, which reads directly from the MySQL binary log. Define CDC tables in Flink SQL to consume row-level changes, apply windowed aggregations or enrichments, and write results to a sink. This eliminates the need for Kafka in simple CDC pipelines while providing exactly-once processing guarantees.

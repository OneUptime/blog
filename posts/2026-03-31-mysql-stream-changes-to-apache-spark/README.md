# How to Stream MySQL Changes to Apache Spark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Apache Spark, CDC, Debezium, Kafka

Description: Learn how to stream MySQL change data capture events to Apache Spark Structured Streaming via Kafka and Debezium for real-time data lake and analytics pipelines.

---

## Architecture

MySQL CDC events flow through three stages: MySQL binary log -> Debezium on Kafka Connect -> Kafka topic -> Apache Spark Structured Streaming. Spark reads the Kafka topic, parses CDC events, and writes to a data lake or analytics database.

## Step 1: MySQL Binary Log Setup

```ini
[mysqld]
server-id        = 1
log_bin          = mysql-bin
binlog_format    = ROW
binlog_row_image = FULL
```

```sql
CREATE USER 'debezium'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT, RELOAD, SHOW DATABASES, REPLICATION SLAVE, REPLICATION CLIENT
  ON *.* TO 'debezium'@'%';
```

## Step 2: Deploy Debezium to Kafka

```bash
curl -X POST http://kafka-connect:8083/connectors \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "mysql-orders-cdc",
    "config": {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "database.hostname": "mysql-host",
      "database.port": "3306",
      "database.user": "debezium",
      "database.password": "strong_password",
      "database.server.id": "200001",
      "topic.prefix": "cdc",
      "database.include.list": "orders_db",
      "schema.history.internal.kafka.bootstrap.servers": "kafka:9092",
      "schema.history.internal.kafka.topic": "schema-changes.orders_db",
      "key.converter": "org.apache.kafka.connect.json.JsonConverter",
      "key.converter.schemas.enable": "false",
      "value.converter": "org.apache.kafka.connect.json.JsonConverter",
      "value.converter.schemas.enable": "false"
    }
  }'
```

## Step 3: Spark Structured Streaming Job

Read CDC events from Kafka and process them:

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, get_json_object
from pyspark.sql.types import StructType, StructField, LongType, StringType, DoubleType

spark = SparkSession.builder \
    .appName("MySQL CDC to Spark") \
    .getOrCreate()

kafka_df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:9092") \
    .option("subscribe", "cdc.orders_db.orders") \
    .option("startingOffsets", "earliest") \
    .load()

# Parse the CDC envelope
cdc_df = kafka_df.selectExpr("CAST(value AS STRING) AS cdc_json") \
    .select(
        get_json_object("cdc_json", "$.op").alias("op"),
        get_json_object("cdc_json", "$.after.id").cast(LongType()).alias("order_id"),
        get_json_object("cdc_json", "$.after.customer_id").cast(LongType()).alias("customer_id"),
        get_json_object("cdc_json", "$.after.total_amount").cast(DoubleType()).alias("total_amount"),
        get_json_object("cdc_json", "$.after.status").alias("status"),
        get_json_object("cdc_json", "$.ts_ms").cast(LongType()).alias("event_ts_ms")
    )
```

## Aggregating in a Streaming Window

```python
from pyspark.sql.functions import window, sum as spark_sum, count

windowed = cdc_df \
    .filter(col("op").isin(["c", "u"])) \
    .withColumn("event_time",
                (col("event_ts_ms") / 1000).cast("timestamp")) \
    .withWatermark("event_time", "2 minutes") \
    .groupBy(window("event_time", "1 minute")) \
    .agg(
        count("order_id").alias("order_count"),
        spark_sum("total_amount").alias("total_revenue")
    )

query = windowed.writeStream \
    .outputMode("update") \
    .format("console") \
    .start()

query.awaitTermination()
```

## Writing to a Delta Lake or MySQL Sink

```python
def write_to_mysql(df, epoch_id):
    df.write \
        .format("jdbc") \
        .option("url", "jdbc:mysql://analytics-db:3306/reports") \
        .option("dbtable", "real_time_order_stats") \
        .option("user", "spark_writer") \
        .option("password", "password") \
        .mode("append") \
        .save()

windowed.writeStream \
    .outputMode("update") \
    .foreachBatch(write_to_mysql) \
    .start() \
    .awaitTermination()
```

## Summary

Stream MySQL changes to Apache Spark by routing CDC events through Debezium and Kafka, then consuming with Spark Structured Streaming. Parse the Debezium JSON envelope to extract `op`, `before`, and `after` fields. Apply windowed aggregations and write results to a data lake, analytics database, or Delta table for near real-time reporting.

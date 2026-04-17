# How to Connect ClickHouse with Apache Spark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Spark, Big Data, Integration, ETL

Description: Learn how to read from and write to ClickHouse using Apache Spark with the official spark-clickhouse-connector, including DataFrame API, batch writes, and partition pushdown.

---

Integrating ClickHouse with Apache Spark lets you use Spark's distributed compute engine to preprocess large datasets before loading them into ClickHouse, or to read from ClickHouse for complex ML pipelines that benefit from Spark's broader ecosystem. The official connector `spark-clickhouse-connector` supports both reading and writing, partition pruning, column pushdown, and parallel reads across ClickHouse shards.

## Dependency Setup

### Maven

```xml
<dependencies>
    <dependency>
        <groupId>com.clickhouse.spark</groupId>
        <artifactId>clickhouse-spark-runtime-3.4_2.12</artifactId>
        <version>0.8.0</version>
    </dependency>
    <dependency>
        <groupId>com.clickhouse</groupId>
        <artifactId>clickhouse-http-client</artifactId>
        <version>0.6.5</version>
    </dependency>
</dependencies>
```

### Gradle

```text
implementation 'com.clickhouse.spark:clickhouse-spark-runtime-3.4_2.12:0.8.0'
implementation 'com.clickhouse:clickhouse-http-client:0.6.5'
```

### spark-submit with --packages

```bash
spark-submit \
  --packages com.clickhouse.spark:clickhouse-spark-runtime-3.4_2.12:0.8.0,\
com.clickhouse:clickhouse-http-client:0.6.5 \
  my_spark_job.py
```

## Create a SparkSession with ClickHouse Catalog

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("ClickHouse ETL") \
    .config("spark.sql.catalog.clickhouse",
            "com.clickhouse.spark.ClickHouseCatalog") \
    .config("spark.sql.catalog.clickhouse.host", "localhost") \
    .config("spark.sql.catalog.clickhouse.protocol", "http") \
    .config("spark.sql.catalog.clickhouse.http_port", "8123") \
    .config("spark.sql.catalog.clickhouse.user", "default") \
    .config("spark.sql.catalog.clickhouse.password", "") \
    .config("spark.sql.catalog.clickhouse.database", "default") \
    .getOrCreate()
```

## Read a ClickHouse Table as a DataFrame

```python
# Read using the catalog
df = spark.read \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("http_port", "8123") \
    .option("user", "default") \
    .option("password", "") \
    .option("database", "default") \
    .option("table", "events") \
    .load()

df.printSchema()
df.show(10)
df.count()
```

## Read with a Custom SQL Query

```python
df = spark.read \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("http_port", "8123") \
    .option("user", "default") \
    .option("password", "") \
    .option("query", """
        SELECT
            user_id,
            event_name,
            count()         AS cnt,
            min(created_at) AS first_seen
        FROM default.events
        WHERE created_at >= '2024-01-01'
        GROUP BY user_id, event_name
    """) \
    .load()

df.show()
```

## Push Down Filters (Partition Pruning)

The connector pushes `WHERE` predicates on partition and order-by columns down to ClickHouse, reducing the data transferred to Spark:

```python
from pyspark.sql.functions import col

df = spark.read \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("http_port", "8123") \
    .option("database", "default") \
    .option("table", "events") \
    .load()

# Filter is pushed down to ClickHouse
result = df.filter(
    (col("user_id") == 1001) &
    (col("created_at") >= "2024-01-01")
)
result.show()
```

## Write a DataFrame to ClickHouse

```python
from pyspark.sql import Row
from datetime import datetime

rows = [
    Row(user_id=1001, event_name="click", created_at=datetime.now()),
    Row(user_id=1002, event_name="view",  created_at=datetime.now()),
]
input_df = spark.createDataFrame(rows)

input_df.write \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("http_port", "8123") \
    .option("user", "default") \
    .option("password", "") \
    .option("database", "default") \
    .option("table", "events") \
    .mode("append") \
    .save()

print("Write complete")
```

## Overwrite a Table

```python
df.write \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("http_port", "8123") \
    .option("database", "default") \
    .option("table", "events_aggregated") \
    .mode("overwrite") \
    .save()
```

`overwrite` mode truncates the table before writing. Use `append` to add rows to an existing table.

## Use the Catalog for SQL Queries

```python
spark.sql("USE clickhouse.default")

spark.sql("""
    SELECT
        event_name,
        count() AS cnt
    FROM events
    GROUP BY event_name
    ORDER BY cnt DESC
    LIMIT 10
""").show()
```

## Full ETL Pipeline: Parquet to ClickHouse

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, to_timestamp

spark = SparkSession.builder \
    .appName("Parquet to ClickHouse") \
    .getOrCreate()

# Read from data lake (Parquet on S3 or HDFS)
raw = spark.read.parquet("s3a://my-bucket/raw/events/")

# Transform
transformed = raw \
    .filter(col("event_name").isNotNull()) \
    .withColumn("created_at",
                to_timestamp(col("event_timestamp") / 1000)) \
    .select("user_id", "event_name", "created_at", "amount") \
    .dropDuplicates(["user_id", "event_name", "created_at"])

print(f"Writing {transformed.count()} rows to ClickHouse")

# Write to ClickHouse
transformed.write \
    .format("clickhouse") \
    .option("host", "clickhouse.internal") \
    .option("http_port", "8123") \
    .option("user", "etl_user") \
    .option("password", "etl_secret") \
    .option("database", "analytics") \
    .option("table", "events") \
    .option("spark.clickhouse.write.batchSize", "500000") \
    .mode("append") \
    .save()

print("ETL complete")
```

## Use JDBC as an Alternative

If you prefer the JDBC connector without the native Spark connector:

```python
df = spark.read \
    .format("jdbc") \
    .option("url", "jdbc:ch://localhost:8123/default") \
    .option("dbtable", "events") \
    .option("user", "default") \
    .option("password", "") \
    .option("driver", "com.clickhouse.jdbc.ClickHouseDriver") \
    .option("fetchsize", "100000") \
    .load()

df.show(5)
```

Write via JDBC:

```python
result_df.write \
    .format("jdbc") \
    .option("url", "jdbc:ch://localhost:8123/default") \
    .option("dbtable", "aggregated_events") \
    .option("user", "default") \
    .option("password", "") \
    .option("driver", "com.clickhouse.jdbc.ClickHouseDriver") \
    .option("batchsize", "100000") \
    .mode("append") \
    .save()
```

## Scala Example

```scala
import org.apache.spark.sql.SparkSession

object ClickHouseSparkExample {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("ClickHouse Spark")
      .getOrCreate()

    import spark.implicits._

    val df = spark.read
      .format("clickhouse")
      .option("host", "localhost")
      .option("http_port", "8123")
      .option("database", "default")
      .option("table", "events")
      .load()

    df.groupBy("event_name")
      .count()
      .orderBy($"count".desc)
      .show(10)

    spark.stop()
  }
}
```

## Tune Write Performance

```python
df.write \
    .format("clickhouse") \
    .option("host", "localhost") \
    .option("http_port", "8123") \
    .option("database", "default") \
    .option("table", "events") \
    .option("spark.clickhouse.write.batchSize", "1000000") \
    .option("spark.clickhouse.write.maxRetry", "3") \
    .option("spark.clickhouse.write.retryInterval", "5s") \
    .mode("append") \
    .save()
```

`batchSize` controls rows per HTTP request, `maxRetry` sets retries on failure, and `retryInterval` is a duration string (e.g. `"5s"`). Increase `batchSize` to reduce the number of HTTP requests for large writes. Each Spark partition sends its data in batches to a single ClickHouse node.

## Common Pitfalls

- The connector requires that the target ClickHouse table already exists. It will not auto-create tables. Run `CREATE TABLE` in ClickHouse before the Spark write.
- Use `mode("append")` for production writes. `mode("overwrite")` runs `TRUNCATE TABLE` which removes all existing data.
- Spark executor parallelism controls how many concurrent HTTP connections are opened to ClickHouse. Avoid setting too many executors if ClickHouse has limited `max_connections` configured.
- When using JDBC fallback, always set `fetchsize` to a large value (100,000+). The default JDBC fetch size is 0 (all rows at once), which loads the entire result set into the executor's memory.

## Summary

`spark-clickhouse-connector` bridges Spark's distributed compute with ClickHouse's analytical storage. Use it to load large datasets from S3, HDFS, or Kafka via Spark transformations into ClickHouse, or to pull aggregated data from ClickHouse into Spark for ML pipelines. Tune `batch_size` for write throughput, use filter pushdown to minimize data transfer on reads, and prefer the native connector over JDBC for production workloads.

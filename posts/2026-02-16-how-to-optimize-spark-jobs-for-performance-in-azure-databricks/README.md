# How to Optimize Spark Jobs for Performance in Azure Databricks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Spark, Azure Databricks, Performance Optimization, Data Engineering, Spark Tuning, Big Data

Description: Practical techniques to optimize Spark job performance in Azure Databricks covering partitioning, caching, joins, shuffle optimization, and cluster sizing.

---

Spark jobs that run slowly usually have a fixable root cause. It might be too many shuffle partitions, a skewed join, a scan of unnecessary data, or an undersized cluster. The difference between a job that takes 10 minutes and one that takes 2 hours often comes down to a handful of configuration changes and code adjustments.

In this post, I will cover the most impactful Spark performance optimizations you can apply in Azure Databricks. These are the techniques I reach for first when a job is running too slowly.

## Start with the Spark UI

Before optimizing, understand where the time is being spent. The Spark UI is your primary diagnostic tool.

1. Open a running or completed cluster
2. Click on the **Spark UI** tab
3. Navigate to the job and stage details

Look for:
- **Stages with high task count** - potential shuffle issues
- **Tasks with uneven duration** - data skew
- **Stages that are mostly idle** - waiting for slow tasks (straggler problem)
- **Large shuffle read/write** - excessive data movement
- **Spill to disk** - insufficient memory

## 1. Optimize Shuffle Partitions

The default number of shuffle partitions is 200, which is often wrong. Too many partitions for small datasets creates overhead. Too few for large datasets creates memory pressure.

```python
# Check current setting
print(spark.conf.get("spark.sql.shuffle.partitions"))
# Default: 200

# For small datasets (under 1 GB), reduce partitions
spark.conf.set("spark.sql.shuffle.partitions", 20)

# For large datasets (over 100 GB), increase partitions
spark.conf.set("spark.sql.shuffle.partitions", 1000)
```

A good rule of thumb: aim for each partition to be between 100 MB and 200 MB after a shuffle.

### Enable Adaptive Query Execution (AQE)

AQE automatically adjusts shuffle partitions at runtime based on actual data sizes. This is the single most impactful optimization for most workloads.

```python
# Enable AQE (usually enabled by default in recent runtimes)
spark.conf.set("spark.sql.adaptive.enabled", True)

# AQE will automatically coalesce small shuffle partitions
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", True)

# Set the target size for coalesced partitions (default 64MB)
spark.conf.set("spark.sql.adaptive.advisoryPartitionSizeInBytes", "128MB")
```

With AQE enabled, you can set a high initial partition count and let Spark figure out the right number.

## 2. Optimize Joins

Joins are often the most expensive operation in Spark jobs. The wrong join strategy can be orders of magnitude slower.

### Broadcast Joins

When one side of the join is small enough to fit in memory on each executor, use a broadcast join. This eliminates the shuffle entirely.

```python
from pyspark.sql.functions import broadcast

# Small dimension table (under 10 MB)
dim_products = spark.table("silver.dim_products")

# Large fact table
fact_sales = spark.table("silver.fact_sales")

# Force broadcast of the small table
result = fact_sales.join(
    broadcast(dim_products),
    on="product_id",
    how="inner"
)
```

Spark's default broadcast threshold is 10 MB. You can increase it for larger dimension tables.

```python
# Increase broadcast threshold to 100 MB
spark.conf.set("spark.sql.autoBroadcastJoinThreshold", 100 * 1024 * 1024)
```

### Handle Skewed Joins

Data skew happens when a few join keys have disproportionately more rows. AQE can handle this automatically.

```python
# Enable AQE skew join optimization
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", True)

# Adjust the skew detection threshold if needed
spark.conf.set("spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes", "256MB")
```

If AQE does not resolve the skew, you can manually salt the join key.

```python
# Manual salting for heavily skewed keys
from pyspark.sql.functions import expr, col, lit, concat

# Add a salt column (random number from 0 to 9)
fact_salted = fact_sales.withColumn("salt", (col("product_id").hash() % 10).cast("string"))

# Explode the dimension table with all salt values
dim_exploded = dim_products.crossJoin(
    spark.range(10).withColumnRenamed("id", "salt").withColumn("salt", col("salt").cast("string"))
)

# Join on product_id + salt
result = fact_salted.join(dim_exploded, on=["product_id", "salt"], how="inner").drop("salt")
```

## 3. Reduce Data Scanning

Reading less data is the most reliable way to improve performance.

### Column Pruning

Only select the columns you need. Parquet and Delta Lake support columnar reads, so selecting fewer columns means reading less data from disk.

```python
# Bad: reads all columns
df = spark.table("silver.large_table")
result = df.groupBy("category").count()

# Good: reads only the columns needed
df = spark.table("silver.large_table").select("category")
result = df.groupBy("category").count()
```

### Predicate Pushdown

Apply filters early so Spark can skip entire files or partitions.

```python
# Good: filter pushes down to the data source
df = spark.table("silver.events") \
    .filter("event_date >= '2026-01-01'") \
    .filter("event_type = 'purchase'")

# The filter on event_date will skip non-matching partitions
# The filter on event_type will skip non-matching row groups within Parquet files
```

### Use Delta Lake Z-Order

Z-ordering co-locates related data in the same files, enabling much better data skipping.

```sql
-- Optimize with Z-order on frequently filtered columns
OPTIMIZE silver.events ZORDER BY (event_type, user_id);
```

After Z-ordering, queries that filter on `event_type` or `user_id` will read significantly fewer files.

## 4. Caching and Persistence

Cache DataFrames that are used multiple times in a job to avoid recomputing them.

```python
# Cache a DataFrame in memory
frequent_df = spark.table("silver.customers").filter("is_active = true")
frequent_df.cache()

# Force materialization of the cache
frequent_df.count()

# Now subsequent operations on frequent_df use the cached data
result1 = frequent_df.groupBy("region").count()
result2 = frequent_df.groupBy("segment").agg({"revenue": "sum"})

# Unpersist when done to free memory
frequent_df.unpersist()
```

Only cache when:
- The DataFrame is used multiple times
- It fits in available memory
- The cost of recomputation is high

Do not cache DataFrames that are used once or are very large.

## 5. Right-Size Your Cluster

No amount of code optimization helps if your cluster is too small for the data volume.

### Memory Per Executor

Each executor needs enough memory for:
- Shuffle data
- Cached data
- Broadcast variables
- Overhead

A good starting point: 4 GB of memory per core for general workloads, 8 GB per core for memory-intensive workloads.

### Number of Workers

The right number depends on your data size and parallelism needs. Here is a rough guide.

| Data Size | Workers (Standard_DS3_v2) |
|-----------|--------------------------|
| Under 10 GB | 2-4 workers |
| 10-100 GB | 4-8 workers |
| 100 GB - 1 TB | 8-16 workers |
| Over 1 TB | 16+ workers |

Use autoscaling to handle variable workloads, but set max workers based on your budget.

## 6. Optimize Write Operations

### Use Delta Lake Optimized Writes

Delta Lake's optimized writes automatically right-size output files during writes.

```python
# Enable optimized writes
spark.conf.set("spark.databricks.delta.optimizeWrite.enabled", True)

# Enable auto-compaction for small files
spark.conf.set("spark.databricks.delta.autoCompact.enabled", True)
```

### Repartition Before Writing

Control the number of output files by repartitioning before writing.

```python
# Write exactly 10 files
df.repartition(10).write.format("delta").mode("overwrite").save("/path/to/table")

# Coalesce to reduce files without a full shuffle
df.coalesce(10).write.format("delta").mode("append").save("/path/to/table")
```

Use `repartition()` when you want to redistribute data (triggers a shuffle). Use `coalesce()` when you want to reduce the number of partitions without redistribution (no shuffle, but can create uneven partitions).

## 7. Use Photon

Photon is Databricks' C++ query engine that accelerates Spark SQL and DataFrame operations. It can provide 2-8x performance improvements for scan-heavy, aggregation, and join workloads.

Enable Photon by selecting a Photon-enabled runtime when creating your cluster.

```
Runtime: 14.3.x-photon-scala2.12
```

Photon works transparently - no code changes needed. It accelerates operations that run through the Spark SQL engine.

## 8. Avoid Common Anti-Patterns

### Collecting Large Results to the Driver

```python
# Bad: pulls all data to the driver (can cause OOM)
all_data = df.collect()

# Better: use toPandas() for moderate datasets
pandas_df = df.limit(100000).toPandas()

# Best: write results to a table and query from there
df.write.format("delta").saveAsTable("results.output")
```

### Using Python UDFs When SQL Functions Exist

```python
# Bad: Python UDF is slow (data serialized between JVM and Python)
from pyspark.sql.functions import udf
@udf("string")
def clean_name(name):
    return name.strip().upper()
df.withColumn("clean_name", clean_name("name"))

# Good: Use built-in functions (runs natively in JVM)
from pyspark.sql.functions import upper, trim
df.withColumn("clean_name", upper(trim(col("name"))))
```

### Unnecessary Repartitioning

```python
# Bad: repartitioning before a join triggers an unnecessary shuffle
df1.repartition("key").join(df2.repartition("key"), "key")

# Good: let Spark handle the shuffle during the join
df1.join(df2, "key")
```

## Wrapping Up

Spark performance optimization in Azure Databricks comes down to a few key principles: reduce data movement (fewer shuffles, broadcast small tables), read less data (column pruning, predicate pushdown, Z-ordering), right-size your resources (cluster and partition count), and use the platform features (AQE, Photon, optimized writes). Start with the Spark UI to identify the actual bottleneck, then apply the relevant optimization. Most of the time, enabling AQE and adjusting shuffle partitions gets you 80% of the way there.

# How to Configure Glue ETL Jobs for Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Glue, ETL, Performance, Spark

Description: Practical tips for configuring AWS Glue ETL jobs for optimal performance, covering worker sizing, Spark tuning, data partitioning, and common bottleneck fixes.

---

Your Glue ETL job works. It processes data correctly. But it takes three hours and costs a fortune. Sound familiar? Glue runs Apache Spark under the hood, and Spark performance tuning is a deep topic. The good news is that a handful of straightforward configuration changes can cut your job runtime by 50-80%.

This guide covers the most impactful performance optimizations, from job-level settings to Spark configuration to data layout strategies.

## Worker Type and Count

The most direct performance lever is how much compute you throw at the job.

### Worker Types

| Worker Type | vCPU | Memory | Disk | DPU | Best For |
|-------------|------|--------|------|-----|----------|
| G.1X | 4 | 16 GB | 64 GB | 1 | Most jobs |
| G.2X | 8 | 32 GB | 128 GB | 2 | Memory-heavy transforms, large joins |
| G.4X | 16 | 64 GB | 256 GB | 4 | Very large datasets |
| G.8X | 32 | 128 GB | 512 GB | 8 | Extreme scale |

**Start with G.1X** and monitor. If you see out-of-memory errors or heavy disk spilling, move to G.2X. Most jobs don't need G.4X or G.8X.

### Right-Sizing Worker Count

More workers doesn't always mean faster. There's overhead in coordinating work across nodes.

```python
# Create a job with tuned worker settings
glue.create_job(
    Name='optimized-transform',
    Role='arn:aws:iam::YOUR_ACCOUNT_ID:role/GlueETLRole',
    Command={
        'Name': 'glueetl',
        'ScriptLocation': 's3://my-scripts/transform.py',
        'PythonVersion': '3'
    },
    GlueVersion='4.0',
    WorkerType='G.1X',
    NumberOfWorkers=20,
    DefaultArguments={
        '--job-language': 'python',
        '--enable-auto-scaling': 'true',  # Let Glue scale workers dynamically
        '--TempDir': 's3://my-glue-temp/temp/'
    }
)
```

### Auto Scaling

Enable auto-scaling to let Glue dynamically adjust the number of workers:

```python
# Enable auto-scaling
default_args = {
    '--enable-auto-scaling': 'true'
}
```

With auto-scaling, you set the maximum number of workers. Glue starts with fewer and scales up based on the workload. This is cost-effective because you don't pay for idle workers during the less intensive phases of your job.

## Spark Configuration Tuning

Glue lets you pass Spark configuration parameters:

```python
# Pass custom Spark configuration
default_args = {
    '--conf': 'spark.sql.shuffle.partitions=200',
    '--conf': 'spark.default.parallelism=100'
}
```

Wait - that won't work because of duplicate keys. Use this approach instead:

```python
# Set multiple Spark configurations in the ETL script itself
spark.conf.set("spark.sql.shuffle.partitions", "200")
spark.conf.set("spark.sql.autoBroadcastJoinThreshold", "52428800")  # 50 MB
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
```

### Key Spark Settings

**`spark.sql.shuffle.partitions`** (default: 200)

This controls how many partitions are created during shuffles (joins, aggregations, etc.). The default of 200 is often wrong:
- Too high for small datasets (creates tiny partitions with high overhead)
- Too low for very large datasets (creates huge partitions that spill to disk)

Rule of thumb: aim for partitions between 128 MB and 256 MB each.

```python
# Calculate optimal shuffle partitions based on data size
data_size_gb = 100  # Total data size in GB
target_partition_mb = 200  # Target partition size

optimal_partitions = int((data_size_gb * 1024) / target_partition_mb)
spark.conf.set("spark.sql.shuffle.partitions", str(optimal_partitions))
print(f"Setting shuffle partitions to: {optimal_partitions}")
```

**`spark.sql.adaptive.enabled`** (default: true in Glue 4.0)

Adaptive Query Execution (AQE) optimizes queries at runtime based on actual data sizes. Keep this enabled - it handles many tuning issues automatically.

**`spark.sql.autoBroadcastJoinThreshold`** (default: 10 MB)

When one side of a join is smaller than this threshold, Spark broadcasts it to all workers instead of shuffling. Increase this for faster joins when one table is small:

```python
# Increase broadcast threshold for faster joins with small tables
spark.conf.set("spark.sql.autoBroadcastJoinThreshold", "104857600")  # 100 MB
```

## Optimizing Reads

### Push Down Predicates

Always use push-down predicates to limit the data read from S3:

```python
# Read only the partitions you need
source = glueContext.create_dynamic_frame.from_catalog(
    database="raw_data",
    table_name="events",
    push_down_predicate="year='2025' AND month='02'",
    transformation_ctx="source"
)
```

Without the push-down, Glue reads the entire table. With it, it reads only February 2025 data.

### Column Selection

Select only the columns you need early in the pipeline:

```python
# Select only needed columns immediately after reading
source = glueContext.create_dynamic_frame.from_catalog(
    database="raw_data",
    table_name="events",
    push_down_predicate="year='2025'",
    transformation_ctx="source"
)

# Drop unnecessary columns early
df = source.toDF().select(
    "event_id", "event_type", "user_id", "timestamp", "revenue"
)
```

This reduces memory usage and speeds up all downstream operations.

### File Format Matters

Reading Parquet is dramatically faster than reading CSV or JSON:

| Format | Read Speed (relative) | Memory Usage |
|--------|----------------------|--------------|
| Parquet | 1x (baseline) | Low |
| ORC | 1.1x | Low |
| JSON | 5-10x slower | High |
| CSV | 3-5x slower | Medium |

If your source is CSV or JSON, consider a one-time conversion job to produce Parquet. All subsequent jobs will be faster. See our guide on [column formats for Athena](https://oneuptime.com/blog/post/2026-02-12-optimize-athena-queries-with-column-formats-parquet-orc/view) - the same principles apply to Glue.

## Optimizing Joins

Joins are the most expensive operation in most ETL jobs. Here's how to make them faster:

### Broadcast Joins

If one table is small (under 100 MB), use a broadcast join:

```python
# Force a broadcast join for a small reference table
from pyspark.sql.functions import broadcast

small_table = spark.read.parquet("s3://my-bucket/reference/products/")
large_table = spark.read.parquet("s3://my-bucket/events/")

# Broadcast the small table to all workers
result = large_table.join(
    broadcast(small_table),
    "product_id",
    "inner"
)
```

Broadcast joins eliminate shuffles entirely, which is a massive performance win.

### Pre-Sorting for Sort-Merge Joins

For large-to-large joins, sort both datasets by the join key:

```python
# Sort both sides before joining for better merge join performance
left_sorted = left_df.repartition(200, "join_key").sortWithinPartitions("join_key")
right_sorted = right_df.repartition(200, "join_key").sortWithinPartitions("join_key")

result = left_sorted.join(right_sorted, "join_key", "inner")
```

### Avoid Cartesian Joins

A join without a proper condition creates a cartesian product that can explode your data size and kill your job. Always verify your join conditions.

## Optimizing Writes

### Control Output File Count

Too many small files slow down everything downstream:

```python
# Coalesce to reduce the number of output files
output_df = transformed_df.coalesce(20)  # Write 20 files

# Or use repartition for even distribution
output_df = transformed_df.repartition(50)  # Write 50 evenly-sized files
```

Use `coalesce` when reducing file count (it avoids a shuffle). Use `repartition` when you need evenly-sized files or when partitioning by specific columns.

### Write with Partitioning

```python
# Write partitioned output for downstream query efficiency
output_df.write \
    .mode("append") \
    .partitionBy("year", "month") \
    .parquet("s3://my-data-lake/processed/events/")
```

## Handling Data Skew

Data skew is when some partitions have much more data than others. One common scenario: grouping by customer_id where a few customers have millions of events and most have a handful.

### Detecting Skew

```python
# Check for skew in your data
distribution = df.groupBy("customer_id").count().orderBy("count", ascending=False)
distribution.show(20)

# Compare largest vs median partition
stats = distribution.describe("count")
stats.show()
```

### Salting to Fix Skew

```python
# Add salt to distribute skewed keys across multiple partitions
from pyspark.sql.functions import concat, lit, rand, floor

salt_factor = 10

# Add a salt column
salted_df = df.withColumn("salt", floor(rand() * salt_factor).cast("int"))
salted_df = salted_df.withColumn(
    "salted_key",
    concat(col("customer_id"), lit("_"), col("salt"))
)

# Aggregate on salted key, then aggregate again on original key
partial_agg = salted_df.groupBy("salted_key", "customer_id").agg(
    sum("revenue").alias("partial_revenue"),
    count("*").alias("partial_count")
)

final_agg = partial_agg.groupBy("customer_id").agg(
    sum("partial_revenue").alias("total_revenue"),
    sum("partial_count").alias("total_count")
)
```

## Monitoring Performance

### Enable Spark UI

```python
# Enable Spark UI for detailed performance analysis
default_args = {
    '--enable-spark-ui': 'true',
    '--spark-event-logs-path': 's3://my-glue-spark-ui/logs/'
}
```

The Spark UI shows execution plans, stage timelines, and storage metrics. Access it through the Glue console after the job runs.

### CloudWatch Metrics

Glue publishes metrics to CloudWatch:

```python
# Enable continuous logging for real-time metrics
default_args = {
    '--enable-metrics': '',
    '--enable-continuous-cloudwatch-log': 'true',
    '--continuous-log-logGroup': '/aws-glue/jobs/output'
}
```

Key metrics to watch:
- `glue.driver.aggregate.bytesRead` - Total data read
- `glue.driver.aggregate.elapsedTime` - Total elapsed time
- `glue.driver.aggregate.numCompletedTasks` - Completed Spark tasks
- `glue.driver.aggregate.numFailedTasks` - Failed tasks (should be 0)
- `glue.driver.jvm.heap.used` - JVM heap memory usage

### Custom Performance Logging

```python
# Add timing to key stages of your job
import time

start = time.time()
source = glueContext.create_dynamic_frame.from_catalog(...)
read_time = time.time() - start
print(f"Read completed in {read_time:.1f}s, records: {source.count()}")

start = time.time()
# ... transformations ...
transform_time = time.time() - start
print(f"Transform completed in {transform_time:.1f}s")

start = time.time()
glueContext.write_dynamic_frame.from_options(...)
write_time = time.time() - start
print(f"Write completed in {write_time:.1f}s")

print(f"Total pipeline: {read_time + transform_time + write_time:.1f}s")
```

## Performance Checklist

Before running your optimized job, go through this checklist:

1. Are you using Parquet/ORC as your source format?
2. Are push-down predicates filtering unnecessary partitions?
3. Are you selecting only needed columns early?
4. Is auto-scaling enabled?
5. Are shuffle partitions set appropriately?
6. Are small tables being broadcast for joins?
7. Is output file count reasonable (not too many small files)?
8. Are you using [job bookmarks](https://oneuptime.com/blog/post/2026-02-12-use-glue-job-bookmarks-for-incremental-data-processing/view) to avoid reprocessing?

For monitoring your Glue jobs alongside the rest of your infrastructure, tools like [OneUptime](https://oneuptime.com) can provide end-to-end visibility across your data pipeline.

## Wrapping Up

Glue ETL performance tuning is mostly Spark performance tuning. The biggest wins come from reducing data read (push-down predicates, column selection, proper partitioning), optimizing joins (broadcast small tables), and right-sizing your compute (worker type and count). Enable auto-scaling, use Spark's adaptive query execution, and monitor your metrics to find the remaining bottlenecks.

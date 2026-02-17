# How to Tune Spark Memory and Executor Settings on Dataproc Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Spark, Performance, Memory

Description: A practical guide to tuning Spark executor memory, cores, and driver settings on Dataproc clusters for optimal job performance.

---

Getting Spark memory and executor settings right is the difference between a job that runs in 10 minutes and one that crashes with an OutOfMemoryError or crawls along for hours. Dataproc makes it easy to spin up clusters, but it does not automatically optimize Spark for your specific workload. That part is on you.

This article covers how Spark memory management works, how to calculate the right settings for your Dataproc cluster, and how to troubleshoot common memory-related issues.

## Understanding Spark Memory Architecture

Before tuning anything, you need to understand how Spark uses memory. Each executor has a fixed amount of memory divided into several regions:

```
Total Executor Memory
|
+-- spark.executor.memory (JVM heap)
|   |
|   +-- Execution Memory (shuffles, joins, sorts, aggregations)
|   |
|   +-- Storage Memory (cached DataFrames and RDDs)
|   |
|   +-- User Memory (user-defined data structures)
|   |
|   +-- Reserved Memory (300MB, fixed)
|
+-- spark.executor.memoryOverhead (off-heap, native memory)
```

The key insight is that execution and storage memory share a unified region (controlled by `spark.memory.fraction`, default 0.6). When one side needs more memory and the other has free space, it borrows from the other.

## Step 1: Calculate Executor Settings Based on Machine Type

The right executor settings depend on the machine type of your worker nodes. Here is how to calculate them for an `n2-standard-8` machine (8 vCPUs, 32 GB RAM).

Start with the total available resources per node, reserving some for YARN and the OS:

```
Machine: n2-standard-8
Total RAM: 32 GB
Total vCPUs: 8

Reserved for OS and YARN NodeManager: ~1 GB RAM, 1 vCPU
Available for executors: ~31 GB RAM, 7 vCPUs
```

Now decide how many executors to run per node. A common approach is to leave 1 core for overhead:

```
Option A: 1 executor per node (fat executors)
  - spark.executor.cores = 7
  - spark.executor.memory = 27g
  - spark.executor.memoryOverhead = 4g

Option B: 2 executors per node (moderate executors)
  - spark.executor.cores = 3
  - spark.executor.memory = 13g
  - spark.executor.memoryOverhead = 2g

Option C: 7 executors per node (thin executors)
  - spark.executor.cores = 1
  - spark.executor.memory = 3g
  - spark.executor.memoryOverhead = 1g
```

For most workloads, Option B is a good balance. Fat executors can cause garbage collection issues, while thin executors miss out on within-executor parallelism.

## Step 2: Apply Settings at Cluster Creation

You can set Spark defaults when creating the Dataproc cluster:

```bash
# Create a Dataproc cluster with tuned Spark memory settings
gcloud dataproc clusters create tuned-cluster \
  --region=us-central1 \
  --num-workers=4 \
  --worker-machine-type=n2-standard-8 \
  --properties="\
spark:spark.executor.memory=13g,\
spark:spark.executor.cores=3,\
spark:spark.executor.memoryOverhead=2g,\
spark:spark.driver.memory=8g,\
spark:spark.driver.cores=2,\
spark:spark.sql.shuffle.partitions=200,\
spark:spark.dynamicAllocation.enabled=true,\
spark:spark.dynamicAllocation.minExecutors=2,\
spark:spark.dynamicAllocation.maxExecutors=16"
```

## Step 3: Override Settings Per Job

Cluster-level defaults can be overridden when submitting individual jobs:

```bash
# Submit a memory-intensive job with custom settings
gcloud dataproc jobs submit pyspark gs://my-bucket/scripts/heavy_join.py \
  --cluster=tuned-cluster \
  --region=us-central1 \
  --properties="\
spark.executor.memory=20g,\
spark.executor.cores=5,\
spark.executor.memoryOverhead=4g,\
spark.driver.memory=16g,\
spark.sql.shuffle.partitions=500,\
spark.sql.autoBroadcastJoinThreshold=104857600"
```

## Step 4: Tune Shuffle Partitions

The `spark.sql.shuffle.partitions` setting has a massive impact on performance. The default is 200, which is too few for large datasets and too many for small ones.

A rule of thumb: aim for partitions that are between 128 MB and 200 MB each. If you are shuffling 100 GB of data, you want roughly 500 to 800 partitions.

```python
# Check the size of your shuffle data to determine partition count
df = spark.read.parquet("gs://my-data-bucket/large_dataset/")

# Get approximate size
total_rows = df.count()
sample_size = df.limit(1000).toPandas().memory_usage(deep=True).sum()
estimated_size_gb = (sample_size / 1000) * total_rows / (1024 ** 3)

# Calculate recommended partitions (targeting 150MB per partition)
recommended_partitions = max(int(estimated_size_gb * 1024 / 150), 1)
print(f"Estimated data size: {estimated_size_gb:.1f} GB")
print(f"Recommended shuffle partitions: {recommended_partitions}")

# Apply the setting
spark.conf.set("spark.sql.shuffle.partitions", str(recommended_partitions))
```

Better yet, enable Adaptive Query Execution which adjusts partitions automatically:

```bash
# Enable Adaptive Query Execution for automatic partition tuning
gcloud dataproc jobs submit pyspark gs://my-bucket/scripts/job.py \
  --cluster=tuned-cluster \
  --region=us-central1 \
  --properties="\
spark.sql.adaptive.enabled=true,\
spark.sql.adaptive.coalescePartitions.enabled=true,\
spark.sql.adaptive.skewJoin.enabled=true"
```

## Step 5: Handle Skewed Data

Data skew - where some partitions are much larger than others - is the most common cause of slow Spark jobs. One task takes 10x longer than the others, and the whole job waits for it.

Detect skew by looking at the Spark UI's task distribution:

```python
# Identify skewed keys in your data
from pyspark.sql.functions import col, count

# Check the distribution of your join key
key_distribution = df.groupBy("customer_id") \
    .agg(count("*").alias("row_count")) \
    .orderBy("row_count", ascending=False)

# Show the top skewed keys
key_distribution.show(20)

# Calculate skew metrics
stats = key_distribution.select("row_count").describe().show()
```

Fix skew with salting or AQE:

```python
# Salting technique to handle skewed joins
from pyspark.sql.functions import lit, rand, floor, concat

# Add a salt column to spread skewed keys across partitions
SALT_BUCKETS = 10

# Salt the large (skewed) table
large_df_salted = large_df.withColumn(
    "salt", floor(rand() * SALT_BUCKETS).cast("int"))

# Explode the small table to match all salt values
from pyspark.sql.functions import explode, array
salt_values = [lit(i) for i in range(SALT_BUCKETS)]

small_df_exploded = small_df.withColumn(
    "salt", explode(array(*salt_values)).cast("int"))

# Join on the original key plus the salt
result = large_df_salted.join(
    small_df_exploded,
    ["customer_id", "salt"],
    "inner"
).drop("salt")
```

## Step 6: Monitor Memory Usage

The Spark UI (accessible through Dataproc's component gateway) shows detailed memory usage per executor. Look at:

- **Executors tab** - Shows memory usage, GC time, and shuffle read/write per executor
- **Storage tab** - Shows cached DataFrames and their memory consumption
- **SQL tab** - Shows physical query plans with data sizes at each stage

You can also check YARN resource usage:

```bash
# Check YARN resource allocation on the cluster
gcloud compute ssh tuned-cluster-m --zone=us-central1-a \
  --command="yarn application -list && yarn node -list"
```

## Step 7: Common Memory Problems and Fixes

**OutOfMemoryError in executors:**
- Increase `spark.executor.memory` or reduce the workload per executor
- Add more executors with `spark.executor.instances`
- Check for data skew causing uneven partitions

**OutOfMemoryError in the driver:**
- Increase `spark.driver.memory`
- Avoid `.collect()` and `.toPandas()` on large DataFrames
- Use `.show()` or `.take()` for debugging instead

**Excessive garbage collection:**
- Reduce `spark.executor.memory` to below 32 GB to avoid compressed oops issues
- Use more executors with less memory each
- Check the GC time in the Executors tab of the Spark UI

**Container killed by YARN (exit code 137):**
- Increase `spark.executor.memoryOverhead` - this catches off-heap memory usage
- Common when using Python UDFs, Arrow, or native libraries

```bash
# Fix for YARN container being killed due to memory overhead
gcloud dataproc jobs submit pyspark gs://my-bucket/scripts/job.py \
  --cluster=tuned-cluster \
  --region=us-central1 \
  --properties="\
spark.executor.memoryOverhead=4g,\
spark.executor.memory=12g"
```

## Quick Reference Cheat Sheet

| Cluster Size | Machine Type | executor.memory | executor.cores | executor.instances |
|---|---|---|---|---|
| Small (2 workers) | n2-standard-4 | 6g | 2 | 4 |
| Medium (4 workers) | n2-standard-8 | 13g | 3 | 8 |
| Large (8 workers) | n2-highmem-16 | 25g | 4 | 24 |
| XL (16 workers) | n2-highmem-32 | 50g | 5 | 80 |

## Wrapping Up

Spark memory tuning on Dataproc is not a one-size-fits-all exercise. Start with reasonable defaults based on your machine type, enable Adaptive Query Execution for automatic adjustments, and use the Spark UI to identify bottlenecks. The most impactful settings are usually executor memory, executor cores, shuffle partitions, and memory overhead. Get those right for your workload, and most performance issues disappear.

# How to Monitor Dataproc Jobs with the Spark History Server UI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Spark, Monitoring, Performance

Description: Use the Spark History Server UI on Dataproc to monitor completed and running Spark jobs, analyze execution plans, and debug performance issues.

---

When a Spark job is running slowly or failing intermittently, the Spark History Server UI is your best diagnostic tool. It shows you exactly what happened during job execution: how tasks were distributed, where time was spent, which stages had data skew, and how much memory was consumed. On Dataproc, the History Server is available through the component gateway with zero extra setup.

This guide walks you through accessing the History Server, reading the key metrics, and using the UI to diagnose common performance problems.

## Accessing the Spark History Server

Dataproc exposes the Spark History Server through the component gateway. To access it:

1. Go to the **Dataproc Clusters** page in the Cloud Console
2. Click on your cluster name
3. Select the **Web Interfaces** tab
4. Click **Spark History Server**

If the component gateway is not enabled on your cluster, you can enable it during cluster creation:

```bash
# Create a cluster with the component gateway enabled
gcloud dataproc clusters create monitoring-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --enable-component-gateway \
  --num-workers=3
```

Alternatively, set up an SSH tunnel to access the History Server directly:

```bash
# Create an SSH tunnel to the Spark History Server port
gcloud compute ssh monitoring-cluster-m \
  --zone=us-central1-a \
  -- -L 18080:localhost:18080

# Open http://localhost:18080 in your browser
```

## Understanding the History Server Dashboard

When you open the History Server, you see a list of all completed and running Spark applications. Each entry shows:

- **App ID** - Unique identifier for the application
- **App Name** - The name set in your SparkSession builder
- **Status** - Running, Completed, or Failed
- **Duration** - Total execution time
- **Start/End Time** - When the job ran

Click on any application to dive into the details.

## The Jobs Tab

The Jobs tab shows all Spark jobs within an application. A single `spark-submit` can trigger multiple Spark jobs (each action like `count()`, `write()`, or `collect()` creates a new job).

For each job, you see:

- **Job ID** and description
- **Duration** - How long the job took
- **Stages** - Number of stages (succeeded, active, failed, skipped)
- **Tasks** - Total task count across all stages

Look for jobs that took disproportionately long compared to others. These are your optimization targets.

## The Stages Tab

This is where the real debugging happens. Each stage represents a chunk of work that can be executed in parallel. The Stages tab shows:

- **Input/Output size** - How much data was read and written
- **Shuffle Read/Write** - Data moved between executors during shuffles
- **Duration** - Stage execution time
- **Tasks** - Number of tasks and their distribution

Click on a stage to see the task-level details.

## Analyzing Task Distribution

Within a stage, the Summary Metrics section is critical. It shows the min, 25th percentile, median, 75th percentile, and max for:

- **Duration** - Time per task
- **GC Time** - Garbage collection time per task
- **Input Size** - Data read per task
- **Shuffle Read/Write** - Shuffle data per task

If there is a large gap between the median and max values, you have data skew. For example:

```
Duration:
  Min: 2s
  Median: 5s
  Max: 180s    <-- This task is 36x slower than the median. Data skew!
```

## The SQL Tab

For Spark SQL and DataFrame operations, the SQL tab shows the logical and physical execution plans. This tells you exactly what Spark is doing with your query.

Look for:

- **BroadcastHashJoin vs SortMergeJoin** - Broadcast joins are much faster for small tables
- **Filter pushdown** - Check if predicates are being pushed down to the data source
- **Exchange nodes** - These represent shuffles, which are expensive
- **Whole-stage codegen** - Blue nodes in the plan use codegen, which is faster

## Configuring Event Logging for Persistent History

By default, Spark writes event logs to HDFS on the cluster. If you want history to persist after cluster deletion, configure logging to GCS:

```bash
# Create a cluster with persistent Spark event logs in GCS
gcloud dataproc clusters create persistent-history-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --enable-component-gateway \
  --properties="\
spark:spark.eventLog.enabled=true,\
spark:spark.eventLog.dir=gs://my-spark-logs/event-logs/,\
spark:spark.history.fs.logDirectory=gs://my-spark-logs/event-logs/"
```

With this configuration, you can create a separate single-node cluster just for running the History Server against historical logs:

```bash
# Create a lightweight History Server cluster for reviewing past jobs
gcloud dataproc clusters create history-server \
  --region=us-central1 \
  --single-node \
  --enable-component-gateway \
  --properties="\
spark:spark.history.fs.logDirectory=gs://my-spark-logs/event-logs/"
```

## Common Performance Issues You Can Spot

### Detecting Data Skew

In the Stages view, click on a stage and look at the task duration distribution. If a few tasks take 10x or more longer than the median, you have skew.

The fix depends on the operation:
- For joins, use broadcast joins for smaller tables or apply key salting
- For aggregations, add a pre-aggregation step to reduce skewed keys
- Enable Adaptive Query Execution's skew join optimization

### Identifying Excessive Shuffles

Look at the shuffle read and write sizes in the Stages tab. Large shuffles indicate that data is being moved extensively between executors.

Reduce shuffles by:
- Using broadcast joins instead of sort-merge joins
- Pre-partitioning data on join keys
- Reducing the number of distinct keys in group-by operations

### Spotting Memory Issues

In the Executors tab, check:
- **Storage Memory** - If executors are maxing out storage memory, reduce cache usage or increase memory
- **GC Time** - High GC time (more than 10% of total task time) indicates memory pressure
- **Failed Tasks** - Tasks that fail with OOM errors need more memory or smaller partitions

### Finding Slow Stages

Sort stages by duration. The slowest stage often dominates total job time. Focus your tuning efforts there.

```python
# Example: check if your job benefits from caching
# Run the job twice and compare History Server timelines

# First run - data is read from source
df = spark.read.parquet("gs://my-data-bucket/large_dataset/")
result1 = df.groupBy("key").count()
result1.write.parquet("gs://my-data-bucket/output1/")

# Cache the DataFrame
df.cache()
df.count()  # Materialize the cache

# Second run - data is read from cache (should be faster)
result2 = df.filter("key > 100").groupBy("key").count()
result2.write.parquet("gs://my-data-bucket/output2/")
```

## Using the Environment Tab

The Environment tab shows all Spark, Hadoop, and system properties for the application. This is useful for verifying that your configuration properties were actually applied. Check this when:

- A property you set does not seem to take effect
- You want to see what defaults are being used
- You need to compare settings between two jobs

## The Executors Tab

The Executors tab gives you a per-executor breakdown of:

- Active/completed/failed tasks
- Memory usage (on-heap and off-heap)
- Shuffle read/write
- GC time
- Input/output size

One executor consuming significantly more resources than others usually points to data skew or an unbalanced partition assignment.

## Wrapping Up

The Spark History Server UI is the most valuable tool for understanding Spark job behavior on Dataproc. Make it a habit to check the History Server after every job - even successful ones. You will catch performance issues early, understand your data processing patterns better, and make informed tuning decisions instead of guessing. Enable persistent event logging to GCS so you can review history even after clusters are deleted.

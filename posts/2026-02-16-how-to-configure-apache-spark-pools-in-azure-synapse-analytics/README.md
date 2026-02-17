# How to Configure Apache Spark Pools in Azure Synapse Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Synapse Analytics, Apache Spark, Spark Pools, Big Data, PySpark, Data Engineering

Description: Learn how to create, configure, and optimize Apache Spark pools in Azure Synapse Analytics for big data processing and machine learning workloads.

---

Azure Synapse Analytics includes Apache Spark as a first-class compute engine alongside SQL pools. Spark pools let you run PySpark, Scala, and .NET Spark jobs for data engineering, machine learning, and large-scale data transformation directly within your Synapse workspace. This guide covers how to set up and configure Spark pools for production use.

## What Are Spark Pools in Synapse?

A Spark pool in Azure Synapse is a managed Apache Spark cluster that you configure once and use on demand. When you run a Spark notebook or job, Synapse provisions the cluster from the pool configuration, runs your code, and auto-terminates when idle. You do not manage VMs, install Spark, or configure YARN - Synapse handles all of that.

Key characteristics:
- **Serverless provisioning**: Clusters spin up when needed and shut down when idle.
- **Auto-scale**: The cluster can grow and shrink based on workload demand.
- **Integrated with Synapse**: Direct access to data lake storage, dedicated SQL pools, and other Synapse resources.
- **Multi-language**: Supports PySpark, Scala, SparkSQL, and .NET for Apache Spark.

## Prerequisites

- An Azure Synapse workspace
- An Azure Data Lake Storage Gen2 account (typically the workspace's primary storage)
- Contributor or Synapse Administrator role on the workspace

## Step 1: Create a Spark Pool

```bash
# Create a Spark pool with auto-scaling enabled
az synapse spark pool create \
  --name sparkpool01 \
  --workspace-name my-synapse-workspace \
  --resource-group rg-synapse \
  --spark-version 3.4 \
  --node-size Medium \
  --min-node-count 3 \
  --max-node-count 10 \
  --enable-auto-scale true \
  --enable-auto-pause true \
  --delay 15
```

Let me break down each parameter:

- **spark-version 3.4**: The Apache Spark version. Use the latest supported version for best performance and features.
- **node-size Medium**: The VM size for each node. Options range from Small (4 vCores, 32 GB) to XXXLarge (80 vCores, 504 GB).
- **min-node-count 3**: Minimum cluster size. Three is the smallest valid Spark cluster (1 driver + 2 executors).
- **max-node-count 10**: Maximum nodes when auto-scaling is enabled.
- **enable-auto-scale true**: Allows the cluster to add or remove nodes based on workload.
- **enable-auto-pause true**: Shuts down the cluster after idle timeout to save costs.
- **delay 15**: Auto-pause delay in minutes. The cluster shuts down after 15 minutes of inactivity.

## Step 2: Choose the Right Node Size

Node size determines the CPU and memory available to each Spark executor. Choose based on your workload characteristics:

| Node Size | vCores | Memory | Best For |
|-----------|--------|--------|----------|
| Small | 4 | 32 GB | Light ETL, small datasets |
| Medium | 8 | 64 GB | General-purpose ETL and analytics |
| Large | 16 | 128 GB | Memory-intensive operations, ML training |
| XLarge | 32 | 256 GB | Very large datasets, complex joins |
| XXLarge | 64 | 432 GB | Extreme workloads |

For most data engineering workloads, Medium nodes with auto-scaling from 3 to 10 nodes provides a good balance of cost and performance. Start here and adjust based on actual job metrics.

## Step 3: Configure Spark Properties

Fine-tune Spark behavior by setting configuration properties on the pool.

**Using Synapse Studio:**

1. Navigate to Manage > Apache Spark pools.
2. Click on your pool.
3. Under "Apache Spark configuration", you can upload a configuration file or add properties.

**Create a configuration file:**

```bash
# Create a spark-config.txt file with key=value pairs
# Each line sets a Spark configuration property
```

Common configuration properties to consider:

```
spark.executor.memory    28g
spark.executor.cores     4
spark.driver.memory      28g
spark.driver.cores       4
spark.sql.shuffle.partitions    200
spark.sql.adaptive.enabled      true
spark.sql.adaptive.coalescePartitions.enabled    true
spark.serializer    org.apache.spark.serializer.KryoSerializer
spark.sql.parquet.compression.codec    snappy
```

Key settings explained:

- **spark.sql.shuffle.partitions**: Default is 200. For smaller datasets, reduce this to 20-50 to avoid too many tiny partitions. For larger datasets, increase it.
- **spark.sql.adaptive.enabled**: Enables Adaptive Query Execution (AQE), which automatically optimizes shuffle partitions and join strategies at runtime. Always enable this.
- **spark.serializer**: Kryo serialization is faster than Java serialization for most workloads.

## Step 4: Install Libraries

Your Spark jobs likely need Python packages or Java/Scala libraries beyond what is included by default.

### Workspace-Level Packages

Install packages that should be available to all Spark pools in the workspace.

```bash
# Upload a requirements.txt to install Python packages
# Create requirements.txt with the packages you need:
# pandas==2.1.0
# scikit-learn==1.3.0
# pyarrow==13.0.0
# delta-spark==3.0.0
```

In Synapse Studio:
1. Go to Manage > Workspace packages.
2. Upload `.whl` files for Python packages or `.jar` files for Java/Scala libraries.

### Pool-Level Packages

For packages specific to one pool, attach a `requirements.txt` to the pool:

```bash
# Create requirements.txt
cat > requirements.txt << 'EOF'
great-expectations==0.18.0
azure-storage-blob==12.19.0
requests==2.31.0
EOF
```

In Synapse Studio:
1. Go to Manage > Apache Spark pools.
2. Click on your pool.
3. Under Packages, upload the `requirements.txt`.
4. The packages will be installed next time the pool starts.

### Session-Level Packages

For one-off package needs, install them in a notebook cell:

```python
# Install a package for this session only
# This does not persist across sessions
%%configure -f
{
    "conf": {
        "spark.jars.packages": "io.delta:delta-spark_2.12:3.0.0"
    }
}
```

## Step 5: Run a Spark Notebook

With the pool configured, create and run a Spark notebook in Synapse Studio.

```python
# Read Parquet files from the data lake
# The abfss:// protocol is used for Azure Data Lake Storage Gen2
df = spark.read.parquet(
    "abfss://synapse-data@synapsedatalake2026.dfs.core.windows.net/raw/sales/"
)

# Show the schema and first few rows
df.printSchema()
df.show(5)

# Perform a transformation - aggregate sales by category and month
from pyspark.sql.functions import col, year, month, sum as spark_sum, count

monthly_sales = (
    df
    .withColumn("sales_year", year(col("OrderDate")))
    .withColumn("sales_month", month(col("OrderDate")))
    .groupBy("sales_year", "sales_month", "ProductCategory")
    .agg(
        spark_sum("TotalAmount").alias("total_revenue"),
        count("*").alias("order_count")
    )
    .orderBy("sales_year", "sales_month")
)

# Write the results back to the data lake as Parquet
monthly_sales.write \
    .mode("overwrite") \
    .parquet("abfss://synapse-data@synapsedatalake2026.dfs.core.windows.net/curated/monthly_sales/")
```

## Step 6: Configure Auto-Scale Behavior

Auto-scaling adjusts the number of nodes based on workload demand. Here is how it works in practice:

- When a stage needs more executors than currently available, Synapse adds nodes up to the max count.
- When executors are idle (no tasks assigned), Synapse removes nodes down to the min count.
- The scale-up happens quickly (1-2 minutes per node). Scale-down is more gradual.

For predictable workloads, you might want to disable auto-scaling and use a fixed cluster size:

```bash
# Create a pool with fixed size (no auto-scale)
az synapse spark pool update \
  --name sparkpool01 \
  --workspace-name my-synapse-workspace \
  --resource-group rg-synapse \
  --enable-auto-scale false \
  --node-count 5
```

Fixed-size clusters avoid the latency of adding nodes mid-job but waste resources during light workloads.

## Step 7: Set Up Auto-Pause

Auto-pause shuts down the cluster after a period of inactivity. This is critical for cost management - Spark clusters are expensive to leave running.

```bash
# Enable auto-pause with a 10-minute delay
az synapse spark pool update \
  --name sparkpool01 \
  --workspace-name my-synapse-workspace \
  --resource-group rg-synapse \
  --enable-auto-pause true \
  --delay 10
```

The minimum delay is 5 minutes and the maximum is 10080 minutes (7 days). For interactive development, 15-30 minutes is reasonable. For scheduled batch jobs, 5-10 minutes is fine since the job will complete and the cluster can shut down quickly.

Be aware that starting a paused cluster takes 2-5 minutes. Your notebook or job will wait during this startup time.

## Step 8: Monitor Spark Pool Usage

Track your Spark pool performance and costs:

**In Synapse Studio:**
1. Go to Monitor > Apache Spark applications.
2. View running and completed jobs with execution details.
3. Click on any job to see the Spark UI with stage-level metrics.

**Key metrics to watch:**

- **Job duration**: If jobs are consistently slow, consider larger node sizes or more nodes.
- **Shuffle read/write**: Excessive shuffling means your data is not well-partitioned. Repartition before joins and aggregations.
- **Spill to disk**: If executors spill data to disk, they need more memory. Increase node size.
- **Executor idle time**: If executors sit idle for long periods, your cluster is oversized. Reduce max node count or node size.

## Performance Tips

1. **Use Parquet or Delta Lake format**: Columnar formats with predicate pushdown are dramatically faster than CSV.
2. **Partition your data lake files**: Partition by commonly filtered columns (e.g., date) to enable partition pruning.
3. **Cache when reusing DataFrames**: Use `.cache()` or `.persist()` when a DataFrame is used in multiple operations.
4. **Avoid collecting large datasets to the driver**: `df.collect()` pulls all data to the driver node. Use `.show()`, `.head()`, or write to storage instead.
5. **Use Delta Lake for ACID transactions**: Delta Lake provides ACID guarantees over your data lake files and supports upserts, deletes, and time travel.

## Wrapping Up

Apache Spark pools in Azure Synapse give you managed, auto-scaling Spark clusters that integrate natively with your data lake and SQL pools. The key configuration decisions are node size (match to your workload's memory and CPU needs), auto-scale settings (balance between cost and job speed), and auto-pause delay (save money when the cluster is idle). Start with Medium nodes, enable auto-scale and auto-pause, and adjust based on the metrics you observe in your actual jobs.

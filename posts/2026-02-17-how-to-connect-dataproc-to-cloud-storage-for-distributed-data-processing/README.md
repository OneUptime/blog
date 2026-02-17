# How to Connect Dataproc to Cloud Storage for Distributed Data Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Cloud Storage, Spark, HDFS

Description: Learn how to configure Dataproc clusters to read from and write to Google Cloud Storage for scalable distributed data processing.

---

Cloud Storage is the default data layer for Dataproc workloads on GCP. Unlike HDFS, which is tied to a specific cluster and disappears when the cluster is deleted, Cloud Storage persists independently. Your data is always available regardless of whether a cluster is running, and any number of clusters can access the same buckets simultaneously.

This article covers how Dataproc connects to Cloud Storage, how to configure it properly, and how to get the best performance out of the integration.

## How Dataproc Accesses Cloud Storage

Dataproc uses the Cloud Storage connector (GCS connector) to provide Hadoop-compatible filesystem access to GCS buckets. This connector implements the Hadoop `FileSystem` interface, which means you can use `gs://` paths anywhere you would use `hdfs://` paths in your Spark, Hadoop, or Hive jobs.

The connector is pre-installed on all Dataproc clusters. You do not need to install anything extra.

## Step 1: Create a Storage Bucket

If you do not already have a bucket, create one in the same region as your Dataproc cluster. Co-locating compute and storage in the same region eliminates cross-region data transfer costs and reduces latency.

```bash
# Create a regional GCS bucket in the same region as your Dataproc cluster
gsutil mb -l us-central1 -c standard gs://my-dataproc-data/

# Create directory structure for organized data management
gsutil cp /dev/null gs://my-dataproc-data/raw/
gsutil cp /dev/null gs://my-dataproc-data/processed/
gsutil cp /dev/null gs://my-dataproc-data/staging/
```

## Step 2: Configure IAM Permissions

The Dataproc cluster's service account needs read and write access to your bucket. By default, Dataproc uses the Compute Engine default service account, which has the `Editor` role and broad access. For production, use a custom service account with least-privilege permissions.

```bash
# Create a dedicated service account for Dataproc
gcloud iam service-accounts create dataproc-sa \
  --display-name="Dataproc Service Account"

# Grant storage access to the service account
gsutil iam ch serviceAccount:dataproc-sa@my-project.iam.gserviceaccount.com:objectAdmin \
  gs://my-dataproc-data/

# Grant the Dataproc worker role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:dataproc-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/dataproc.worker"
```

Create the cluster with this service account:

```bash
# Create a cluster using the custom service account
gcloud dataproc clusters create my-cluster \
  --region=us-central1 \
  --service-account=dataproc-sa@my-project.iam.gserviceaccount.com \
  --scopes=cloud-platform \
  --num-workers=3 \
  --image-version=2.1-debian11
```

## Step 3: Read Data from Cloud Storage in Spark

Reading from GCS in Spark is as simple as specifying a `gs://` path:

```python
# read_gcs.py - Read various file formats from Cloud Storage
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("ReadFromGCS").getOrCreate()

# Read Parquet files
parquet_df = spark.read.parquet("gs://my-dataproc-data/raw/events/")

# Read CSV files with headers
csv_df = spark.read.option("header", "true") \
    .option("inferSchema", "true") \
    .csv("gs://my-dataproc-data/raw/users/*.csv")

# Read JSON files
json_df = spark.read.json("gs://my-dataproc-data/raw/logs/")

# Read Avro files
avro_df = spark.read.format("avro").load("gs://my-dataproc-data/raw/records/")

# Read a specific partition using glob patterns
partition_df = spark.read.parquet("gs://my-dataproc-data/raw/events/dt=2025-12-*/")

parquet_df.show(5)
print(f"Event count: {parquet_df.count()}")
```

## Step 4: Write Data to Cloud Storage

Writing follows the same pattern with `gs://` paths:

```python
# Write processed data to Cloud Storage in different formats
from pyspark.sql.functions import col, year, month

# Read raw data
df = spark.read.parquet("gs://my-dataproc-data/raw/events/")

# Apply transformations
processed = df.filter(col("event_type") != "heartbeat") \
    .withColumn("event_year", year("event_timestamp")) \
    .withColumn("event_month", month("event_timestamp"))

# Write as Parquet with partitioning
processed.write \
    .partitionBy("event_year", "event_month") \
    .mode("overwrite") \
    .parquet("gs://my-dataproc-data/processed/events/")

# Write as CSV for downstream consumers that need flat files
processed.write \
    .option("header", "true") \
    .mode("overwrite") \
    .csv("gs://my-dataproc-data/exports/events_csv/")
```

## Step 5: Use GCS as the Default Filesystem

You can configure Dataproc to use GCS as the default filesystem instead of HDFS. This means all paths without a scheme prefix will resolve to GCS.

```bash
# Create a cluster with GCS as the default filesystem
gcloud dataproc clusters create gcs-default-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --properties="core:fs.defaultFS=gs://my-dataproc-data" \
  --num-workers=2
```

With this configuration, your Spark code can use relative paths:

```python
# With GCS as default FS, you can use paths without the gs:// prefix
df = spark.read.parquet("/raw/events/")
df.write.parquet("/processed/events/")
```

## Step 6: Tune the GCS Connector for Performance

The GCS connector has several configuration properties that affect performance. Set these at cluster creation time or in your Spark job.

```bash
# Create a cluster with optimized GCS connector settings
gcloud dataproc clusters create tuned-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --num-workers=4 \
  --properties="\
core:fs.gs.block.size=134217728,\
core:fs.gs.metadata.cache.enable=true,\
core:fs.gs.metadata.cache.type=FILESYSTEM_BACKED,\
core:fs.gs.performance.cache.enable=true,\
core:fs.gs.status.parallel.enable=true"
```

Key properties explained:

- `fs.gs.block.size` - Block size for reads (default 64MB, increase for large files)
- `fs.gs.metadata.cache.enable` - Cache file metadata to reduce API calls
- `fs.gs.performance.cache.enable` - Enable read caching for hot data
- `fs.gs.status.parallel.enable` - Parallelize status checks for directory listings

## Step 7: Handle Partitioned Data Efficiently

Partitioned data in GCS follows a directory structure. Spark uses this structure to skip irrelevant data during reads.

Here is how to write partitioned data properly:

```python
# Write data with multiple partition columns
from pyspark.sql.functions import col, year, month, dayofmonth

events = spark.read.parquet("gs://my-dataproc-data/raw/events/")

# Add partition columns
partitioned = events \
    .withColumn("year", year("event_date")) \
    .withColumn("month", month("event_date")) \
    .withColumn("day", dayofmonth("event_date"))

# Write with partition pruning-friendly structure
partitioned.write \
    .partitionBy("year", "month", "day") \
    .mode("overwrite") \
    .parquet("gs://my-dataproc-data/processed/events_partitioned/")
```

When reading back, filter on partition columns to take advantage of partition pruning:

```python
# This read only scans files in the year=2025/month=12/ directory
december = spark.read.parquet("gs://my-dataproc-data/processed/events_partitioned/") \
    .filter("year = 2025 AND month = 12")

print(f"December events: {december.count()}")
```

## Step 8: GCS vs HDFS - When to Use Which

Dataproc clusters still have HDFS available on local disks. Here is when each makes sense:

**Use Cloud Storage for:**
- All persistent data (input, output, intermediate results you want to keep)
- Data shared between multiple clusters
- Data that needs to survive cluster deletion
- Large datasets that benefit from Cloud Storage's durability and scalability

**Use HDFS for:**
- Temporary shuffle data during job execution (Dataproc handles this automatically)
- Small lookup tables that benefit from data locality
- Iterative algorithms where the same data is read many times within a single job

In practice, you should default to Cloud Storage for everything and only consider HDFS if you hit specific performance bottlenecks.

## Monitoring Storage Access

Keep an eye on GCS access patterns to optimize costs and performance:

```bash
# Check storage access logs for your bucket
gcloud logging read "resource.type=gcs_bucket AND resource.labels.bucket_name=my-dataproc-data" \
  --limit=50 \
  --format="table(timestamp, protoPayload.methodName, protoPayload.resourceName)"
```

You can also monitor GCS operations through Cloud Monitoring to track read/write throughput and API call rates.

## Wrapping Up

Cloud Storage is the backbone of data processing on Dataproc. The GCS connector provides seamless Hadoop-compatible access, letting you use `gs://` paths anywhere in your Spark, Hive, or Hadoop jobs. By co-locating your data and compute in the same region, tuning the connector settings, and using proper partitioning, you get scalable distributed processing with the durability and cost advantages of cloud object storage. The separation of storage from compute is one of the biggest advantages of running Dataproc on GCP - your data is always available, even when no cluster is running.

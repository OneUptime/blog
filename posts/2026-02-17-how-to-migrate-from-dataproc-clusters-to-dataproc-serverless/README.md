# How to Migrate from Dataproc Clusters to Dataproc Serverless

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Serverless, Spark, Migration

Description: A practical guide to migrating your existing Dataproc cluster workloads to Dataproc Serverless for reduced operational overhead and cost savings.

---

Running Dataproc clusters has been the standard way to process big data on GCP for years. You spin up a cluster, submit your Spark or Hadoop jobs, and tear it down when you are finished. But there is always overhead: choosing machine types, tuning autoscaling policies, managing initialization actions, and dealing with cluster startup delays. Dataproc Serverless removes most of that.

I have migrated several production Spark pipelines from traditional Dataproc clusters to Dataproc Serverless, and this article covers what actually changes, what stays the same, and how to handle the tricky parts.

## Why Migrate?

The main benefits of moving to Dataproc Serverless are:

- **No cluster management** - You do not provision, configure, or manage clusters. Google handles infrastructure.
- **Faster job startup** - Serverless jobs start in seconds instead of the minutes it takes to spin up a cluster.
- **Pay-per-use billing** - You pay for compute time consumed, not for idle cluster nodes.
- **Automatic scaling** - Serverless workloads scale up and down based on demand without you configuring autoscaling.

The trade-off is that you lose some low-level control over the cluster environment. If your workloads rely on custom OS packages, specific Hadoop ecosystem components, or persistent HDFS storage, you will need to adjust your approach.

## What Changes Between Cluster Mode and Serverless

Here is a quick overview of the differences:

| Feature | Dataproc Clusters | Dataproc Serverless |
|---|---|---|
| Infrastructure | You manage | Google manages |
| Job types | Spark, Hadoop, Hive, Pig, Presto | Spark (PySpark, SparkR, Spark SQL) |
| Storage | HDFS, GCS | GCS only |
| Custom packages | Init actions, custom images | Custom containers, PySpark packages |
| Startup time | 2-5 minutes | 10-30 seconds |
| Billing model | Per-node per-hour | Per DCU per-second |

## Step 1: Audit Your Existing Workloads

Before migrating anything, catalog what your clusters are doing. Run through these questions for each workload:

- Is it a Spark job, a Hive query, a Hadoop MapReduce job, or something else?
- Does it depend on HDFS for intermediate or permanent storage?
- Does it use custom initialization actions?
- Does it require specific Hadoop ecosystem tools (like Hive, Presto, or Flink)?
- What Spark properties are configured on the cluster?

Workloads that are pure Spark (PySpark, Spark SQL, SparkR) reading from and writing to Cloud Storage are the easiest to migrate. Workloads that depend heavily on HDFS or non-Spark tools will need more work.

## Step 2: Move HDFS Storage to Cloud Storage

Dataproc Serverless does not have HDFS. All data needs to live in Google Cloud Storage. If your jobs read from or write to `hdfs://` paths, you need to change those to `gs://` paths.

Here is a common pattern change in your Spark code:

```python
# Before: reading from HDFS on a Dataproc cluster
df = spark.read.parquet("hdfs:///data/events/2025/")

# After: reading from Cloud Storage for serverless
df = spark.read.parquet("gs://my-data-bucket/data/events/2025/")
```

If your jobs use HDFS for temporary shuffle storage, Dataproc Serverless handles that internally. You do not need to configure shuffle storage yourself.

## Step 3: Convert Initialization Actions to Custom Containers

On traditional Dataproc clusters, you might use initialization actions to install Python packages, system libraries, or configure the environment. Serverless does not support init actions. Instead, you build a custom container image.

Here is a Dockerfile for a custom Dataproc Serverless runtime:

```dockerfile
# Start from the official Dataproc Serverless base image
FROM gcr.io/dataproc-serverless/spark-runtime:2.1-debian11

# Install additional Python packages
RUN pip install pandas==2.0.3 scikit-learn==1.3.0 pyarrow==12.0.1

# Install any system-level dependencies
RUN apt-get update && apt-get install -y libgomp1

# Copy custom JARs if needed
COPY my-custom-connector.jar /opt/spark/jars/
```

Build and push the image to Artifact Registry:

```bash
# Build the custom container image
docker build -t us-central1-docker.pkg.dev/my-project/dataproc/custom-spark:v1 .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/my-project/dataproc/custom-spark:v1
```

## Step 4: Translate Your gcloud Submission Commands

The command structure changes when you switch from cluster-based submission to serverless. Here is a side-by-side comparison.

Submitting a PySpark job to a Dataproc cluster:

```bash
# Old approach: submit to a named cluster
gcloud dataproc jobs submit pyspark gs://my-bucket/jobs/etl_job.py \
  --cluster=my-cluster \
  --region=us-central1 \
  --properties=spark.executor.memory=4g,spark.executor.instances=10
```

Submitting the same job as a Dataproc Serverless batch:

```bash
# New approach: submit as a serverless batch
gcloud dataproc batches submit pyspark gs://my-bucket/jobs/etl_job.py \
  --region=us-central1 \
  --subnet=default \
  --properties=spark.executor.memory=4g,spark.executor.instances=10 \
  --version=2.1
```

The key differences: you replace `jobs submit` with `batches submit`, drop the `--cluster` flag, and add `--subnet` for networking.

## Step 5: Update Spark Properties

Most Spark properties work the same way in Serverless mode, but there are some that do not apply or behave differently.

Properties you can keep:
- `spark.executor.memory`
- `spark.executor.instances`
- `spark.driver.memory`
- `spark.sql.*` properties
- `spark.dynamicAllocation.*` properties

Properties to remove or adjust:
- `spark.yarn.*` - YARN is not used in Serverless mode
- `spark.hadoop.fs.defaultFS` - no HDFS, so this is irrelevant
- Properties related to node-level configuration

## Step 6: Handle Job Dependencies

If your Spark jobs use additional JAR files or Python packages, you have a few options with Serverless:

Using inline package specification:

```bash
# Submit with Python packages specified inline
gcloud dataproc batches submit pyspark gs://my-bucket/jobs/ml_job.py \
  --region=us-central1 \
  --subnet=default \
  --py-files=gs://my-bucket/libs/helpers.zip \
  --jars=gs://my-bucket/jars/bigquery-connector.jar \
  --deps-bucket=gs://my-staging-bucket
```

Or reference your custom container:

```bash
# Submit using a custom container image
gcloud dataproc batches submit pyspark gs://my-bucket/jobs/ml_job.py \
  --region=us-central1 \
  --subnet=default \
  --container-image=us-central1-docker.pkg.dev/my-project/dataproc/custom-spark:v1
```

## Step 7: Test and Validate

Before cutting over production workloads, run both the cluster-based and serverless versions of each job side by side. Compare:

- Output correctness (row counts, checksums on output data)
- Execution time
- Cost (check billing reports for both approaches)
- Error handling behavior

A practical approach is to run the serverless version against a subset of your data first, then scale up once you have confidence in the results.

## Step 8: Update Orchestration

If you are using Cloud Composer, Workflows, or another orchestrator to trigger Dataproc jobs, update your DAGs or workflow definitions. The API endpoints are different for Serverless batches versus cluster jobs.

For Cloud Composer, switch from the `DataprocSubmitJobOperator` to the `DataprocCreateBatchOperator`:

```python
# Updated Airflow operator for Dataproc Serverless
from airflow.providers.google.cloud.operators.dataproc import DataprocCreateBatchOperator

batch_config = {
    "pyspark_batch": {
        "main_python_file_uri": "gs://my-bucket/jobs/etl_job.py",
    },
    "runtime_config": {
        "version": "2.1",
    },
    "environment_config": {
        "execution_config": {
            "subnetwork_uri": "default",
        }
    },
}

submit_job = DataprocCreateBatchOperator(
    task_id="run_etl",
    batch=batch_config,
    batch_id="etl-{{ ds_nodash }}",
    region="us-central1",
    project_id="my-project",
)
```

## Common Pitfalls

A few things to watch out for during migration:

- **Network configuration**: Serverless requires Private Google Access on the subnet. This catches people who have custom VPCs.
- **Persistent clusters for Hive Metastore**: If your jobs rely on a Hive Metastore on the cluster, you need to set up a Dataproc Metastore service separately.
- **Job logs location**: Serverless batch logs go to Cloud Logging by default rather than the cluster's local log directory.

## Wrapping Up

Migrating from Dataproc clusters to Dataproc Serverless is mostly about removing infrastructure assumptions from your Spark code. Replace HDFS paths with GCS paths, swap init actions for custom containers, and update your submission commands. The Spark code itself rarely needs significant changes.

Start with your simplest, most well-tested workloads, validate them in Serverless mode, and work your way up to the more complex pipelines. The operational simplicity and cost savings are worth the migration effort.

# How to Run Serverless Spark Jobs on Dataproc for On-Demand Data Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc Serverless, Apache Spark, Data Processing, Serverless

Description: Learn how to run Apache Spark jobs on Dataproc Serverless without managing clusters, covering batch jobs, configuration, and cost optimization strategies.

---

Managing Spark clusters is a chore. You provision a Dataproc cluster, wait for it to spin up, run your job, and then remember to delete it so you stop paying. Dataproc Serverless eliminates all of that. You submit a Spark job, Google provisions the resources, runs the job, and tears everything down automatically. No cluster management, no idle resources, and you pay only for what you use.

I moved several ETL jobs from persistent Dataproc clusters to Serverless and the operational overhead dropped to basically zero. The jobs take about the same time to run, but I no longer worry about cluster sizing, autoscaling policies, or someone forgetting to delete a cluster over the weekend.

## How Dataproc Serverless Works

When you submit a batch job to Dataproc Serverless, Google allocates Spark executors from a shared pool. Your job runs in its own isolated environment with its own Spark configuration. When the job completes, all resources are released. There is no cluster to manage, no nodes to monitor, and no idle costs.

The trade-off is a cold start delay of about 30-60 seconds while resources are allocated. For batch jobs that run for minutes or hours, this is negligible. For interactive queries, you might still want a persistent cluster.

## Submitting Your First Serverless Spark Job

Submit a PySpark job using the gcloud CLI:

```bash
# Submit a simple PySpark job to Dataproc Serverless
gcloud dataproc batches submit pyspark \
  gs://my-bucket/scripts/daily_etl.py \
  --region=us-central1 \
  --subnet=default \
  --deps-bucket=gs://my-bucket/dependencies \
  -- --input-path=gs://my-bucket/raw/2026-02-17/ \
     --output-path=gs://my-bucket/processed/2026-02-17/
```

The `--` separator separates gcloud arguments from arguments passed to your PySpark script.

## A Complete PySpark ETL Job

Here is a practical ETL job designed for Serverless execution:

```python
# daily_etl.py
# Daily ETL job that reads raw events, transforms them,
# and writes aggregated results to BigQuery
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType
import argparse
import sys

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-path", required=True, help="GCS path to raw data")
    parser.add_argument("--output-table", default="my-project.analytics.daily_summary")
    parser.add_argument("--date", required=True, help="Processing date YYYY-MM-DD")
    args = parser.parse_args()

    # Initialize Spark session
    spark = SparkSession.builder \
        .appName(f"DailyETL-{args.date}") \
        .getOrCreate()

    # Read raw events from Cloud Storage
    raw_events = spark.read.json(args.input_path)

    # Transform: clean, deduplicate, and aggregate
    cleaned = (
        raw_events
        .dropDuplicates(["event_id"])
        .filter(F.col("timestamp").isNotNull())
        .withColumn("event_date", F.to_date(F.col("timestamp")))
        .withColumn("event_hour", F.hour(F.col("timestamp")))
    )

    # Aggregate by category and hour
    hourly_summary = (
        cleaned
        .groupBy("event_date", "event_hour", "category")
        .agg(
            F.count("*").alias("event_count"),
            F.countDistinct("user_id").alias("unique_users"),
            F.sum("amount").alias("total_amount"),
            F.avg("amount").alias("avg_amount"),
        )
        .orderBy("event_date", "event_hour", "category")
    )

    # Write results to BigQuery
    hourly_summary.write \
        .format("bigquery") \
        .option("table", args.output_table) \
        .option("temporaryGcsBucket", "my-bucket-temp") \
        .mode("append") \
        .save()

    row_count = hourly_summary.count()
    print(f"Processed {row_count} aggregated rows for {args.date}")

    spark.stop()

if __name__ == "__main__":
    main()
```

Submit it:

```bash
# Submit the ETL job with specific resource configuration
gcloud dataproc batches submit pyspark \
  gs://my-bucket/scripts/daily_etl.py \
  --region=us-central1 \
  --subnet=default \
  --version=2.1 \
  --properties="spark.executor.instances=10,spark.executor.cores=4,spark.executor.memory=8g,spark.driver.memory=4g" \
  -- --input-path=gs://my-bucket/raw/2026-02-17/ \
     --output-table=my-project.analytics.daily_summary \
     --date=2026-02-17
```

## Configuring Spark Properties

Tune your Serverless job with Spark properties for performance:

```bash
# Submit with tuned Spark configuration
gcloud dataproc batches submit pyspark \
  gs://my-bucket/scripts/daily_etl.py \
  --region=us-central1 \
  --subnet=default \
  --properties="\
spark.executor.instances=20,\
spark.executor.cores=4,\
spark.executor.memory=16g,\
spark.driver.memory=8g,\
spark.sql.adaptive.enabled=true,\
spark.sql.adaptive.coalescePartitions.enabled=true,\
spark.sql.adaptive.skewJoin.enabled=true,\
spark.dynamicAllocation.enabled=true,\
spark.dynamicAllocation.minExecutors=5,\
spark.dynamicAllocation.maxExecutors=50" \
  -- --input-path=gs://my-bucket/raw/2026-02-17/ \
     --date=2026-02-17
```

## Adding Python Dependencies

If your PySpark job needs external Python packages, bundle them:

```bash
# Option 1: Use a requirements file
# Create a requirements.txt with your dependencies
echo "pandas==2.1.0
pyarrow==14.0.0
requests==2.31.0" > requirements.txt

# Submit with the requirements file
gcloud dataproc batches submit pyspark \
  gs://my-bucket/scripts/daily_etl.py \
  --region=us-central1 \
  --subnet=default \
  --deps-bucket=gs://my-bucket/dependencies \
  --py-files=gs://my-bucket/libs/my_utils.zip \
  --properties="spark.pyspark.python=python3" \
  --pip-packages="pandas==2.1.0,pyarrow==14.0.0"
```

```bash
# Option 2: Use a custom container image for complex dependencies
# Build a custom image with all your dependencies baked in
gcloud dataproc batches submit pyspark \
  gs://my-bucket/scripts/daily_etl.py \
  --region=us-central1 \
  --subnet=default \
  --container-image=gcr.io/my-project/spark-custom:latest
```

## Submitting Spark SQL Jobs

You can run Spark SQL directly without writing Python:

```bash
# Submit a Spark SQL batch job
gcloud dataproc batches submit spark-sql \
  --region=us-central1 \
  --subnet=default \
  --query="
    SELECT
      DATE(timestamp) AS event_date,
      category,
      COUNT(*) AS event_count,
      SUM(amount) AS total_amount
    FROM parquet.\`gs://my-bucket/raw/2026-02-17/*.parquet\`
    GROUP BY DATE(timestamp), category
    ORDER BY total_amount DESC
  "
```

## Scheduling Serverless Jobs

Use Cloud Scheduler with Cloud Functions or Workflows to run jobs on a schedule:

```python
# cloud_function_trigger.py
# Cloud Function that triggers a Dataproc Serverless batch job
from google.cloud import dataproc_v1
import functions_framework

@functions_framework.http
def trigger_etl(request):
    """Trigger a Dataproc Serverless batch job via HTTP."""
    client = dataproc_v1.BatchControllerClient(
        client_options={
            "api_endpoint": "us-central1-dataproc.googleapis.com:443"
        }
    )

    # Configure the batch job
    batch = dataproc_v1.Batch()
    batch.pyspark_batch = dataproc_v1.PySparkBatch(
        main_python_file_uri="gs://my-bucket/scripts/daily_etl.py",
        args=[
            "--input-path", "gs://my-bucket/raw/latest/",
            "--date", request.args.get("date", "2026-02-17"),
        ],
    )
    batch.runtime_config = dataproc_v1.RuntimeConfig(
        version="2.1",
        properties={
            "spark.executor.instances": "10",
            "spark.executor.memory": "8g",
        },
    )
    batch.environment_config = dataproc_v1.EnvironmentConfig(
        execution_config=dataproc_v1.ExecutionConfig(
            subnetwork_uri="projects/my-project/regions/us-central1/subnetworks/default",
        ),
    )

    # Submit the batch job
    operation = client.create_batch(
        request=dataproc_v1.CreateBatchRequest(
            parent="projects/my-project/locations/us-central1",
            batch=batch,
            batch_id=f"daily-etl-{request.args.get('date', 'latest')}",
        )
    )

    return {"batch_id": operation.metadata.batch, "status": "submitted"}
```

## Monitoring Serverless Jobs

Track your batch jobs and their resource usage:

```bash
# List all batch jobs
gcloud dataproc batches list --region=us-central1

# Get details of a specific batch job
gcloud dataproc batches describe BATCH_ID --region=us-central1

# View the Spark job logs
gcloud dataproc batches wait BATCH_ID \
  --region=us-central1
```

```python
# monitor_batches.py
# Programmatically monitor Dataproc Serverless batch jobs
from google.cloud import dataproc_v1

def list_recent_batches(project_id, region):
    """List recent Serverless batch jobs with their status."""
    client = dataproc_v1.BatchControllerClient(
        client_options={
            "api_endpoint": f"{region}-dataproc.googleapis.com:443"
        }
    )

    batches = client.list_batches(
        request=dataproc_v1.ListBatchesRequest(
            parent=f"projects/{project_id}/locations/{region}",
        )
    )

    for batch in batches:
        print(f"Batch: {batch.name}")
        print(f"  State: {dataproc_v1.Batch.State(batch.state).name}")
        print(f"  Created: {batch.create_time}")
        print(f"  Runtime: {batch.runtime_info}")
        print()

list_recent_batches("my-project", "us-central1")
```

## Cost Optimization Tips

Serverless Spark charges by the Dataproc Compute Unit (DCU) per second. Here are ways to minimize costs:

```bash
# Use spot/preemptible executors for fault-tolerant jobs
gcloud dataproc batches submit pyspark \
  gs://my-bucket/scripts/daily_etl.py \
  --region=us-central1 \
  --subnet=default \
  --properties="\
spark.dataproc.executor.spot.ratio=0.8,\
spark.executor.instances=20" \
  -- --input-path=gs://my-bucket/raw/2026-02-17/
```

Use Adaptive Query Execution for automatic optimization:

```bash
# AQE automatically optimizes shuffle partitions and handles skew
gcloud dataproc batches submit pyspark \
  gs://my-bucket/scripts/daily_etl.py \
  --region=us-central1 \
  --subnet=default \
  --properties="\
spark.sql.adaptive.enabled=true,\
spark.sql.adaptive.coalescePartitions.enabled=true,\
spark.sql.adaptive.advisoryPartitionSizeInBytes=128m"
```

## Summary

Dataproc Serverless removes the cluster management overhead from Spark workloads. Submit your PySpark, Spark SQL, or Spark Java jobs, and Google handles provisioning, scaling, and cleanup. The cold start adds about 30-60 seconds, which is negligible for batch jobs. Configure Spark properties for performance tuning, use custom container images for complex dependencies, and schedule jobs through Cloud Functions or Workflows. For cost optimization, enable dynamic allocation and Adaptive Query Execution, and consider spot executors for fault-tolerant workloads. The biggest win is operational - no more forgotten clusters running over the weekend.

# How to Submit Spark Jobs to Dataproc Using the gcloud CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, Spark, gcloud, Big Data

Description: Step-by-step instructions for submitting PySpark, SparkR, and Spark SQL jobs to Dataproc clusters using the gcloud command-line interface.

---

The gcloud CLI is the most direct way to submit Spark jobs to Dataproc. Whether you are running a quick PySpark script or kicking off a full-blown ETL pipeline, the command-line interface gives you granular control over job configuration. This article walks through everything you need to know to submit Spark jobs from your terminal.

## Prerequisites

Before submitting jobs, you need:

- A GCP project with the Dataproc API enabled
- The gcloud CLI installed and authenticated
- A running Dataproc cluster (or you can use Dataproc Serverless)
- Your Spark application code uploaded to Cloud Storage

If you do not have a cluster yet, here is how to quickly create one:

```bash
# Create a basic Dataproc cluster for running Spark jobs
gcloud dataproc clusters create my-spark-cluster \
  --region=us-central1 \
  --zone=us-central1-a \
  --single-node \
  --image-version=2.1-debian11
```

## Submitting a PySpark Job

PySpark jobs are the most common type of Spark submission. Upload your Python script to a GCS bucket, then submit it.

Here is a simple PySpark script that counts words in a file:

```python
# word_count.py - A basic PySpark word count job
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("WordCount").getOrCreate()

# Read a text file from Cloud Storage
lines = spark.read.text("gs://my-data-bucket/input/sample.txt")

# Split lines into words and count them
from pyspark.sql.functions import explode, split, col

words = lines.select(explode(split(col("value"), "\\s+")).alias("word"))
word_counts = words.groupBy("word").count().orderBy("count", ascending=False)

# Write results back to Cloud Storage
word_counts.write.mode("overwrite").csv("gs://my-data-bucket/output/word_counts")

spark.stop()
```

Upload the script and submit the job:

```bash
# Upload the PySpark script to Cloud Storage
gsutil cp word_count.py gs://my-data-bucket/scripts/

# Submit the PySpark job to the Dataproc cluster
gcloud dataproc jobs submit pyspark gs://my-data-bucket/scripts/word_count.py \
  --cluster=my-spark-cluster \
  --region=us-central1
```

The command blocks until the job completes and streams the output to your terminal.

## Submitting a Spark Job with Arguments

Most real-world Spark jobs accept command-line arguments. Pass them after a double dash separator.

Here is a parameterized PySpark script:

```python
# etl_job.py - A PySpark ETL job that accepts date parameters
import sys
from pyspark.sql import SparkSession

# Parse command-line arguments
input_date = sys.argv[1]
output_path = sys.argv[2]

spark = SparkSession.builder.appName("DailyETL").getOrCreate()

# Read raw events for the specified date
df = spark.read.parquet(f"gs://my-data-bucket/raw/events/dt={input_date}/")

# Apply transformations
filtered = df.filter(df.event_type != "heartbeat")
aggregated = filtered.groupBy("user_id", "event_type").count()

# Write the processed data
aggregated.write.mode("overwrite").parquet(f"{output_path}/dt={input_date}/")

spark.stop()
```

Submit with arguments:

```bash
# Submit PySpark job with custom arguments
gcloud dataproc jobs submit pyspark gs://my-data-bucket/scripts/etl_job.py \
  --cluster=my-spark-cluster \
  --region=us-central1 \
  -- "2025-12-01" "gs://my-data-bucket/processed/events"
```

Note the double dash (`--`) that separates gcloud arguments from job arguments.

## Configuring Spark Properties

You can pass Spark configuration properties directly in the submission command. This is useful for tuning memory, parallelism, and other runtime settings without modifying your code.

```bash
# Submit a PySpark job with custom Spark properties
gcloud dataproc jobs submit pyspark gs://my-data-bucket/scripts/heavy_etl.py \
  --cluster=my-spark-cluster \
  --region=us-central1 \
  --properties="spark.executor.memory=8g,spark.executor.cores=4,spark.executor.instances=20,spark.sql.shuffle.partitions=200"
```

Common properties you might want to set:

- `spark.executor.memory` - memory per executor
- `spark.executor.instances` - number of executors
- `spark.executor.cores` - CPU cores per executor
- `spark.driver.memory` - memory for the driver process
- `spark.sql.shuffle.partitions` - number of partitions for shuffles
- `spark.dynamicAllocation.enabled` - enable or disable dynamic allocation

## Submitting Spark SQL Jobs

If your job is purely SQL-based, you can submit a SQL file directly without writing Python:

```sql
-- daily_report.sql - Generate a daily summary report
CREATE TEMPORARY VIEW raw_events
USING parquet
OPTIONS (path "gs://my-data-bucket/raw/events/dt=2025-12-01/");

-- Aggregate event counts by type
CREATE TEMPORARY VIEW event_summary AS
SELECT event_type, COUNT(*) as event_count, COUNT(DISTINCT user_id) as unique_users
FROM raw_events
GROUP BY event_type;

-- Write results to a new location
INSERT OVERWRITE DIRECTORY 'gs://my-data-bucket/reports/daily/2025-12-01/'
USING parquet
SELECT * FROM event_summary;
```

Submit the SQL job:

```bash
# Submit a Spark SQL job from a SQL file
gcloud dataproc jobs submit spark-sql \
  --cluster=my-spark-cluster \
  --region=us-central1 \
  -f gs://my-data-bucket/scripts/daily_report.sql
```

## Including Additional Dependencies

Spark jobs often need extra JAR files or Python packages. The gcloud CLI provides flags for each.

Adding JAR dependencies:

```bash
# Submit with additional JAR files
gcloud dataproc jobs submit pyspark gs://my-data-bucket/scripts/bq_etl.py \
  --cluster=my-spark-cluster \
  --region=us-central1 \
  --jars=gs://my-data-bucket/jars/spark-bigquery-connector.jar,gs://my-data-bucket/jars/custom-udf.jar
```

Adding Python files (modules, zip archives):

```bash
# Submit with additional Python files
gcloud dataproc jobs submit pyspark gs://my-data-bucket/scripts/ml_pipeline.py \
  --cluster=my-spark-cluster \
  --region=us-central1 \
  --py-files=gs://my-data-bucket/libs/utils.py,gs://my-data-bucket/libs/models.zip
```

## Running Jobs Asynchronously

By default, the gcloud command waits for the job to finish. For long-running jobs, you might want to submit and return immediately.

```bash
# Submit a job asynchronously (returns immediately)
gcloud dataproc jobs submit pyspark gs://my-data-bucket/scripts/long_running_etl.py \
  --cluster=my-spark-cluster \
  --region=us-central1 \
  --async

# The command prints a job ID you can use to check status later
```

Check the job status later:

```bash
# Check the status of a submitted job
gcloud dataproc jobs describe JOB_ID --region=us-central1

# Wait for a specific job to complete
gcloud dataproc jobs wait JOB_ID --region=us-central1

# List all recent jobs on the cluster
gcloud dataproc jobs list --region=us-central1 --cluster=my-spark-cluster
```

## Submitting to Dataproc Serverless

If you prefer not to manage clusters, submit your job as a serverless batch instead:

```bash
# Submit PySpark job as a Dataproc Serverless batch
gcloud dataproc batches submit pyspark gs://my-data-bucket/scripts/etl_job.py \
  --region=us-central1 \
  --subnet=default \
  --version=2.1 \
  --properties="spark.executor.memory=4g" \
  -- "2025-12-01" "gs://my-data-bucket/processed/events"
```

## Viewing Job Logs

After a job completes (or fails), you can access the logs in several ways:

```bash
# View the driver output of a completed job
gcloud dataproc jobs describe JOB_ID --region=us-central1 --format="value(driverOutputResourceUri)"

# Stream logs from Cloud Logging
gcloud logging read "resource.type=cloud_dataproc_job AND resource.labels.job_id=JOB_ID" \
  --limit=100 \
  --format="value(textPayload)"
```

## Tips for Production Use

When you are using gcloud for production job submissions, keep a few things in mind:

1. **Always pin your Dataproc image version** to avoid surprises when Google updates the default.
2. **Use `--labels`** to tag jobs for cost tracking and filtering.
3. **Set `--max-failures-per-hour`** to limit automatic retries for flaky jobs.
4. **Store scripts in GCS**, not on local machines, so they are accessible from any environment.

```bash
# A production-ready submission command with labels and retry settings
gcloud dataproc jobs submit pyspark gs://my-data-bucket/scripts/production_etl.py \
  --cluster=prod-spark-cluster \
  --region=us-central1 \
  --labels=team=data-eng,pipeline=daily-etl,env=prod \
  --max-failures-per-hour=2 \
  --properties="spark.sql.adaptive.enabled=true"
```

## Wrapping Up

The gcloud CLI gives you a flexible and scriptable way to submit Spark jobs to Dataproc. Whether you are doing quick ad-hoc analysis or building automated pipelines, the same set of commands works across PySpark, Spark SQL, and Scala Spark jobs. Start with simple submissions, layer on properties and dependencies as needed, and integrate into your CI/CD or orchestration tooling when you are ready for production.

# How to Use EMR Serverless

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EMR, Serverless, Spark, Big Data

Description: A complete guide to running Spark and Hive jobs on EMR Serverless without managing clusters, including configuration, job submission, and cost optimization.

---

EMR Serverless takes the cluster management headache out of running Spark and Hive jobs. You don't provision instances, you don't configure YARN, and you don't worry about cluster sizing. You just submit jobs and pay for the compute time they use.

If you've been managing EMR clusters and spending time on capacity planning, this might be exactly what you need. Let's dig into how it works and when it makes sense.

## How EMR Serverless Differs from EMR on EC2

With traditional EMR, you create a cluster, pick instance types, decide how many nodes you need, and keep it running while your jobs execute. With EMR Serverless, there's no cluster. You create an "application" (basically a runtime environment), submit jobs to it, and the service automatically provisions and scales the compute resources.

The key differences:

- No cluster to manage or monitor
- Automatic scaling based on job requirements
- Pay only for resources used during job execution
- Pre-initialized capacity for faster startup (optional)
- No SSH access to nodes (which means less debugging visibility)

## Creating an EMR Serverless Application

First, create an application. This defines the runtime environment for your jobs.

This creates an EMR Serverless application for running Spark jobs with default resource limits.

```bash
aws emr-serverless create-application \
  --name "my-spark-app" \
  --release-label emr-7.0.0 \
  --type SPARK \
  --maximum-capacity '{
    "cpu": "400vCPU",
    "memory": "3000GB",
    "disk": "20000GB"
  }'
```

The maximum capacity sets an upper bound on how many resources your application can consume across all concurrent jobs. This prevents runaway costs.

You'll get back an application ID that you'll use for everything else.

```json
{
  "applicationId": "00f5abcdef123456",
  "name": "my-spark-app",
  "arn": "arn:aws:emr-serverless:us-east-1:123456789:applications/00f5abcdef123456"
}
```

## Submitting a Spark Job

Once your application is created and in a STARTED state, you can submit jobs.

This submits a PySpark job to the EMR Serverless application with custom Spark configuration.

```bash
aws emr-serverless start-job-run \
  --application-id 00f5abcdef123456 \
  --execution-role-arn arn:aws:iam::123456789:role/EMRServerlessRole \
  --name "daily-etl" \
  --job-driver '{
    "sparkSubmit": {
      "entryPoint": "s3://my-scripts/etl_job.py",
      "entryPointArguments": ["--date", "2026-02-12"],
      "sparkSubmitParameters": "--conf spark.executor.cores=4 --conf spark.executor.memory=16g --conf spark.driver.cores=4 --conf spark.driver.memory=16g"
    }
  }' \
  --configuration-overrides '{
    "monitoringConfiguration": {
      "s3MonitoringConfiguration": {
        "logUri": "s3://my-emr-logs/serverless/"
      },
      "cloudWatchLoggingConfiguration": {
        "enabled": true,
        "logGroupName": "/emr-serverless/my-spark-app"
      }
    }
  }'
```

## Writing a PySpark Job for EMR Serverless

Your PySpark code doesn't change much compared to regular EMR. The main difference is that you can't rely on local HDFS - everything goes through S3.

This PySpark script processes clickstream data and computes hourly aggregates.

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, hour, count, countDistinct, window
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', required=True)
    args = parser.parse_args()

    spark = SparkSession.builder \
        .appName("Clickstream Analytics") \
        .config("spark.sql.adaptive.enabled", "true") \
        .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
        .getOrCreate()

    # Read raw clickstream data
    clicks = spark.read.json(f"s3://my-data/raw/clicks/{args.date}/")

    # Compute hourly aggregates
    hourly_stats = clicks \
        .withColumn("hour", hour(col("event_time"))) \
        .groupBy("page_url", "hour") \
        .agg(
            count("*").alias("page_views"),
            countDistinct("user_id").alias("unique_visitors"),
            countDistinct("session_id").alias("unique_sessions")
        )

    # Write results
    hourly_stats.write \
        .mode("overwrite") \
        .partitionBy("hour") \
        .parquet(f"s3://my-data/processed/hourly_clicks/{args.date}/")

    spark.stop()

if __name__ == "__main__":
    main()
```

## Pre-initialized Capacity

By default, EMR Serverless provisions resources on demand when a job starts. This can add a few minutes of startup time. If you need faster job starts, configure pre-initialized capacity.

This updates the application to keep some workers warm and ready.

```bash
aws emr-serverless update-application \
  --application-id 00f5abcdef123456 \
  --initial-capacity '{
    "DRIVER": {
      "workerCount": 1,
      "workerConfiguration": {
        "cpu": "4vCPU",
        "memory": "16GB",
        "disk": "120GB"
      }
    },
    "EXECUTOR": {
      "workerCount": 10,
      "workerConfiguration": {
        "cpu": "4vCPU",
        "memory": "16GB",
        "disk": "120GB"
      }
    }
  }'
```

Keep in mind that pre-initialized capacity costs money even when no jobs are running. Use the auto-stop feature to shut it down during idle periods.

```bash
aws emr-serverless update-application \
  --application-id 00f5abcdef123456 \
  --auto-stop-configuration '{
    "enabled": true,
    "idleTimeoutMinutes": 15
  }'
```

## Running Hive Jobs

EMR Serverless also supports Hive. Here's how to submit a Hive query.

This submits a Hive job that runs a query script from S3.

```bash
aws emr-serverless start-job-run \
  --application-id 00fabcdef789012 \
  --execution-role-arn arn:aws:iam::123456789:role/EMRServerlessRole \
  --name "hive-etl" \
  --job-driver '{
    "hive": {
      "query": "s3://my-scripts/transform.sql",
      "initQueryFile": "s3://my-scripts/init.sql",
      "parameters": "--hiveconf hive.exec.dynamic.partition=true --hiveconf hive.exec.dynamic.partition.mode=nonstrict"
    }
  }'
```

## IAM Role Configuration

Your EMR Serverless execution role needs permissions to access S3, Glue Data Catalog, CloudWatch, and any other AWS services your job touches.

This IAM policy covers the common permissions needed for Spark jobs on EMR Serverless.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-data",
        "arn:aws:s3:::my-data/*",
        "arn:aws:s3:::my-scripts",
        "arn:aws:s3:::my-scripts/*",
        "arn:aws:s3:::my-emr-logs",
        "arn:aws:s3:::my-emr-logs/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:GetDatabase",
        "glue:GetTable",
        "glue:GetTables",
        "glue:GetPartition",
        "glue:GetPartitions",
        "glue:CreateTable",
        "glue:UpdateTable",
        "glue:BatchCreatePartition"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/emr-serverless/*"
    }
  ]
}
```

Don't forget the trust policy on the role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "emr-serverless.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Monitoring Job Runs

Check job status and get details with the CLI.

```bash
# Get job run status
aws emr-serverless get-job-run \
  --application-id 00f5abcdef123456 \
  --job-run-id 00f5abcdef789012

# List all job runs
aws emr-serverless list-job-runs \
  --application-id 00f5abcdef123456 \
  --states RUNNING PENDING
```

For real-time logs, use CloudWatch. If you enabled CloudWatch logging in your job configuration, you'll find logs under the log group you specified.

You can also access the Spark UI through the EMR Serverless dashboard. It's read-only but gives you the same job visualization you'd get from a regular Spark History Server.

## Cost Optimization Tips

EMR Serverless billing is based on vCPU-hours, GB-hours of memory, and GB-hours of storage. Here's how to keep costs down:

1. **Right-size your executors.** Don't request 32 GB per executor if your job only uses 8 GB. Check the Spark UI to see actual memory usage.

2. **Use adaptive query execution.** It automatically optimizes shuffle partitions and join strategies.

```python
spark = SparkSession.builder \
    .config("spark.sql.adaptive.enabled", "true") \
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
    .config("spark.sql.adaptive.skewJoin.enabled", "true") \
    .getOrCreate()
```

3. **Don't keep pre-initialized capacity running 24/7.** Set auto-stop timeouts.

4. **Compress your data.** Snappy or ZSTD compression reduces the data your executors need to read.

5. **Use columnar formats.** Parquet with predicate pushdown means Spark reads only the columns and rows it needs.

## When to Use EMR Serverless vs EMR on EC2

EMR Serverless is great for:
- Batch ETL jobs that run on a schedule
- Variable workloads where cluster sizing is hard to predict
- Teams that don't want to manage infrastructure
- Workloads that don't need custom AMIs or special system packages

Stick with EMR on EC2 when you need:
- Interactive notebooks (Jupyter, Zeppelin)
- Custom libraries that require system-level installation
- Persistent HDFS storage
- Fine-grained control over instance types and placement

For more on setting up traditional EMR clusters, see our guide on [setting up Amazon EMR clusters](https://oneuptime.com/blog/post/set-up-amazon-emr-clusters/view).

EMR Serverless is a solid choice when you want to focus on your data processing logic rather than cluster operations. The trade-off is less visibility and control, but for most batch workloads, that's a trade worth making.

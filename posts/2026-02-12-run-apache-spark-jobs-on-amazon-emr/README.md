# How to Run Apache Spark Jobs on Amazon EMR

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EMR, Apache Spark, Big Data, Data Engineering

Description: Learn how to submit and run Apache Spark jobs on Amazon EMR including job configuration, performance tuning, and monitoring best practices.

---

Running Spark on EMR is one of the most common ways to process large datasets on AWS. EMR handles the cluster management while you focus on writing your Spark applications. But there's a gap between "it works" and "it works well." This guide covers everything from submitting your first job to tuning it for production workloads.

## Submitting a Spark Job as a Step

The most straightforward way to run a Spark job on EMR is by adding it as a step. You can do this when creating the cluster or add it to a running cluster.

This submits a Spark job to an existing EMR cluster using the AWS CLI.

```bash
aws emr add-steps \
  --cluster-id j-XXXXXXXXXXXXX \
  --steps '[
    {
      "Type": "Spark",
      "Name": "My Spark Application",
      "ActionOnFailure": "CONTINUE",
      "Args": [
        "--deploy-mode", "cluster",
        "--class", "com.example.MainApp",
        "--conf", "spark.executor.memory=4g",
        "--conf", "spark.executor.cores=2",
        "--conf", "spark.driver.memory=4g",
        "s3://my-spark-jars/my-app.jar",
        "--input", "s3://my-data/input/",
        "--output", "s3://my-data/output/"
      ]
    }
  ]'
```

You get back a step ID that you can use to check the status.

```bash
aws emr describe-step \
  --cluster-id j-XXXXXXXXXXXXX \
  --step-id s-YYYYYYYYYYYYY
```

## Running PySpark Jobs

If you're writing in Python, the submission looks slightly different. You point to a Python script instead of a JAR.

This submits a PySpark job with additional Python dependencies.

```bash
aws emr add-steps \
  --cluster-id j-XXXXXXXXXXXXX \
  --steps '[
    {
      "Type": "Spark",
      "Name": "PySpark ETL Job",
      "ActionOnFailure": "CONTINUE",
      "Args": [
        "--deploy-mode", "cluster",
        "--conf", "spark.executor.memory=8g",
        "--conf", "spark.executor.cores=4",
        "--conf", "spark.dynamicAllocation.enabled=true",
        "--py-files", "s3://my-spark-libs/utils.zip",
        "s3://my-spark-scripts/etl_job.py",
        "--date", "2026-02-12"
      ]
    }
  ]'
```

Here's what a typical PySpark ETL script looks like.

This PySpark script reads JSON data from S3, transforms it, and writes Parquet output.

```python
import argparse
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, to_date, count, sum as spark_sum

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', required=True)
    args = parser.parse_args()

    spark = SparkSession.builder \
        .appName("Daily Sales ETL") \
        .getOrCreate()

    # Read raw JSON data
    raw_df = spark.read.json(
        f"s3://my-data/raw/sales/{args.date}/"
    )

    # Transform: clean and aggregate
    cleaned = raw_df \
        .filter(col("amount") > 0) \
        .withColumn("sale_date", to_date(col("timestamp")))

    daily_summary = cleaned.groupBy("sale_date", "product_category") \
        .agg(
            count("*").alias("transaction_count"),
            spark_sum("amount").alias("total_revenue")
        )

    # Write output as Parquet, partitioned by date
    daily_summary.write \
        .mode("overwrite") \
        .partitionBy("sale_date") \
        .parquet(f"s3://my-data/processed/daily_sales/")

    spark.stop()

if __name__ == "__main__":
    main()
```

## Deploy Mode: Client vs Cluster

Spark supports two deploy modes:

- **Client mode** - The driver runs on the master node. Good for interactive sessions and debugging. You see output in real-time.
- **Cluster mode** - The driver runs on one of the worker nodes. Better for production jobs because the driver doesn't depend on your SSH session staying alive.

Always use cluster mode for production jobs. If you're debugging, use client mode through a spark-shell session.

```bash
# Interactive PySpark session on the master node
pyspark --master yarn --deploy-mode client
```

## Tuning Spark Configuration

Getting the Spark configuration right is half the battle. Here's a framework for calculating executor settings.

For an EMR cluster with m5.2xlarge instances (8 vCPUs, 32 GB RAM) and 10 core nodes:

This configuration balances memory allocation across the cluster for optimal performance.

```bash
# Per-node resources:
# - Total cores: 8 (reserve 1 for OS)
# - Total memory: 32 GB (YARN gets ~28 GB after overhead)
# - Executors per node: 2 (with 3 cores each, leaving 1 for OS + YARN)

aws emr add-steps \
  --cluster-id j-XXXXXXXXXXXXX \
  --steps '[
    {
      "Type": "Spark",
      "Name": "Tuned Spark Job",
      "ActionOnFailure": "CONTINUE",
      "Args": [
        "--deploy-mode", "cluster",
        "--num-executors", "20",
        "--executor-cores", "3",
        "--executor-memory", "12g",
        "--driver-memory", "12g",
        "--conf", "spark.executor.memoryOverhead=2g",
        "--conf", "spark.sql.shuffle.partitions=200",
        "--conf", "spark.sql.adaptive.enabled=true",
        "--conf", "spark.serializer=org.apache.spark.serializer.KryoSerializer",
        "s3://my-spark-jars/my-app.jar"
      ]
    }
  ]'
```

## Dynamic Allocation

Instead of manually setting executor counts, let Spark adjust based on the workload.

This enables dynamic allocation so Spark scales executors up and down as needed.

```python
spark = SparkSession.builder \
    .appName("Dynamic App") \
    .config("spark.dynamicAllocation.enabled", "true") \
    .config("spark.dynamicAllocation.minExecutors", "2") \
    .config("spark.dynamicAllocation.maxExecutors", "50") \
    .config("spark.dynamicAllocation.executorIdleTimeout", "60s") \
    .config("spark.dynamicAllocation.schedulerBacklogTimeout", "5s") \
    .config("spark.shuffle.service.enabled", "true") \
    .getOrCreate()
```

Dynamic allocation works well for jobs with varying workloads. The cluster spins up more executors during heavy computation and releases them during idle periods.

## Reading and Writing Data Efficiently

How you read and write data has a huge impact on performance.

This shows best practices for reading and writing data on S3.

```python
# Use Parquet for columnar storage - much faster for analytical queries
df = spark.read.parquet("s3://my-data/input/")

# Push down predicates for partition pruning
filtered = spark.read.parquet("s3://my-data/partitioned/") \
    .filter(col("year") == 2026) \
    .filter(col("month") == 2)

# Write with sensible partitioning
df.write \
    .mode("overwrite") \
    .partitionBy("year", "month") \
    .option("compression", "snappy") \
    .parquet("s3://my-data/output/")

# Avoid writing too many small files
# Coalesce before writing if you have too many partitions
df.coalesce(100).write.parquet("s3://my-data/output/")
```

## EMRFS Optimized Committer

EMR has a special S3 committer that avoids the rename problem with regular HDFS committers. Enable it for faster and more reliable writes.

```python
spark = SparkSession.builder \
    .appName("Fast Writes") \
    .config("spark.sql.parquet.output.committer.class",
            "com.amazon.emr.committer.EmrOptimizedSparkSqlParquetOutputCommitter") \
    .config("spark.sql.hive.convertInsertingPartitionedTable", "false") \
    .getOrCreate()
```

## Monitoring Spark Jobs

EMR exposes the Spark UI on port 18080 of the master node. To access it, set up an SSH tunnel.

```bash
# Create SSH tunnel to access Spark History Server
ssh -i my-keypair.pem -L 18080:localhost:18080 hadoop@ec2-xx-xx-xx-xx.compute.amazonaws.com

# Then open http://localhost:18080 in your browser
```

The Spark UI shows you:
- Job and stage progress
- Executor memory and CPU usage
- Shuffle read/write volumes
- SQL query plans

For programmatic monitoring, check the Spark REST API.

```bash
# Get all applications
curl http://master-node:18080/api/v1/applications

# Get details of a specific application
curl http://master-node:18080/api/v1/applications/application_1234567890_0001/jobs
```

## Handling Job Failures

When a Spark job fails on EMR, check these locations in order:

1. **Step status** in the EMR console
2. **YARN logs** for executor failures
3. **Spark History Server** for stage and task details
4. **S3 logs** at your configured log URI

This command pulls YARN logs for a failed application.

```bash
# On the master node
yarn logs -applicationId application_1234567890_0001 > /tmp/app-logs.txt

# Or fetch from S3 after the cluster is gone
aws s3 ls s3://my-emr-logs/clusters/j-XXXXXXXXXXXXX/steps/
```

For deeper troubleshooting of Glue and ETL job failures, check out our guide on [troubleshooting AWS Glue jobs](https://oneuptime.com/blog/post/troubleshoot-aws-glue-job-failures/view).

## Automating with Step Functions

For production pipelines, use AWS Step Functions to orchestrate your EMR jobs.

This Step Functions state machine creates a cluster, runs a job, and terminates the cluster.

```json
{
  "StartAt": "CreateCluster",
  "States": {
    "CreateCluster": {
      "Type": "Task",
      "Resource": "arn:aws:states:::elasticmapreduce:createCluster.sync",
      "Parameters": {
        "Name": "etl-pipeline-cluster",
        "ReleaseLabel": "emr-7.0.0",
        "Applications": [{"Name": "Spark"}],
        "Instances": {
          "InstanceGroups": [
            {
              "Name": "Master",
              "InstanceRole": "MASTER",
              "InstanceType": "m5.xlarge",
              "InstanceCount": 1
            },
            {
              "Name": "Core",
              "InstanceRole": "CORE",
              "InstanceType": "m5.2xlarge",
              "InstanceCount": 5
            }
          ],
          "KeepJobFlowAliveWhenNoSteps": true
        },
        "ServiceRole": "EMR_DefaultRole",
        "JobFlowRole": "EMR_EC2_DefaultRole"
      },
      "ResultPath": "$.ClusterResult",
      "Next": "RunSparkStep"
    },
    "RunSparkStep": {
      "Type": "Task",
      "Resource": "arn:aws:states:::elasticmapreduce:addStep.sync",
      "Parameters": {
        "ClusterId.$": "$.ClusterResult.ClusterId",
        "Step": {
          "Name": "ETL Job",
          "HadoopJarStep": {
            "Jar": "command-runner.jar",
            "Args": ["spark-submit", "--deploy-mode", "cluster",
                     "s3://my-spark-scripts/etl_job.py"]
          }
        }
      },
      "Next": "TerminateCluster"
    },
    "TerminateCluster": {
      "Type": "Task",
      "Resource": "arn:aws:states:::elasticmapreduce:terminateCluster.sync",
      "Parameters": {
        "ClusterId.$": "$.ClusterResult.ClusterId"
      },
      "End": true
    }
  }
}
```

Running Spark on EMR doesn't have to be a guessing game. Start with sensible defaults, monitor your resource usage, and iterate on your configuration as you learn your workload's characteristics. The combination of dynamic allocation, the EMR-optimized committer, and adaptive query execution will get you pretty far without manual tuning.

# How to Troubleshoot AWS Glue Job Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Glue, Troubleshooting, ETL, Data Engineering

Description: A practical guide to diagnosing and fixing common AWS Glue job failures including memory errors, timeout issues, and permission problems.

---

AWS Glue jobs fail. They fail silently, they fail loudly, and sometimes they fail in ways that make absolutely no sense at first glance. If you've spent time staring at cryptic Spark error traces wondering what went wrong, this guide is for you.

We'll cover the most common failure modes, how to diagnose them efficiently, and what fixes actually work. No fluff - just the practical stuff you need to get your pipelines back on track.

## Check the Error Message First

I know this sounds obvious, but you'd be surprised how many people skip the actual error message and start guessing. Glue surfaces errors in a few places:

- **Glue Console** - The job run details page shows the error message and exit code.
- **CloudWatch Logs** - The full Spark logs live here, under `/aws-glue/jobs/output` and `/aws-glue/jobs/error`.
- **CloudWatch Metrics** - Memory utilization, executor counts, and other metrics.

This command pulls the most recent error log entries for a specific Glue job run.

```bash
aws logs get-log-events \
  --log-group-name /aws-glue/jobs/error \
  --log-stream-name "jr_abc123456789" \
  --limit 50
```

If you don't have continuous logging enabled, you should turn it on. Without it, you only get logs after the job finishes (or crashes), and the logs are less detailed.

This enables continuous logging for a Glue job, giving you real-time log output.

```bash
aws glue update-job --job-name my-etl-job \
  --job-update '{
    "DefaultArguments": {
      "--enable-continuous-cloudwatch-log": "true",
      "--enable-continuous-log-filter": "true",
      "--continuous-log-logGroup": "/aws-glue/jobs/my-etl-job"
    }
  }'
```

## Out of Memory Errors

This is probably the number one cause of Glue job failures. The symptoms look like this:

- "Container killed by YARN for exceeding memory limits"
- "java.lang.OutOfMemoryError: Java heap space"
- "ExecutorLostFailure: Executor exited caused by one of the running tasks"
- Job completes but with missing data

### Fix 1: Scale Up Worker Type

Glue offers different worker types with varying amounts of memory. If you're running Standard workers and hitting memory issues, try G.1X or G.2X.

```bash
aws glue update-job --job-name my-etl-job \
  --job-update '{
    "WorkerType": "G.2X",
    "NumberOfWorkers": 10
  }'
```

The memory per worker type breaks down like this:

| Worker Type | vCPUs | Memory | Disk |
|-------------|-------|--------|------|
| Standard    | 4     | 16 GB  | 50 GB |
| G.1X        | 4     | 16 GB  | 64 GB |
| G.2X        | 8     | 32 GB  | 128 GB |
| G.4X        | 16    | 64 GB  | 256 GB |
| G.8X        | 32    | 128 GB | 512 GB |

### Fix 2: Optimize Your Data Processing

Sometimes the issue isn't the cluster size but how you're processing data. Here are common patterns that cause memory problems.

This example shows how to repartition data to avoid memory pressure from skewed partitions.

```python
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from pyspark.context import SparkContext

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

# Bad: Reading everything into memory at once
# df = spark.read.parquet("s3://bucket/huge-dataset/")
# df.collect()  # This will blow up memory

# Good: Process in partitions and avoid collect()
df = spark.read.parquet("s3://bucket/huge-dataset/")

# Repartition to distribute data more evenly
df = df.repartition(200)

# Use coalesce for writes to avoid too many small files
df.coalesce(10).write.parquet("s3://bucket/output/")
```

### Fix 3: Handle Data Skew

Data skew happens when one partition has way more data than others. A single executor gets overwhelmed while the rest sit idle.

This code salts a skewed join key to distribute the data more evenly across partitions.

```python
from pyspark.sql.functions import col, concat, lit, rand

# If joining on a highly skewed key like "country"
# Add a salt to distribute the data
salt_range = 10
df_large = df_large.withColumn("salt", (rand() * salt_range).cast("int"))
df_small = df_small.crossJoin(
    spark.range(salt_range).withColumnRenamed("id", "salt")
)

# Join on the salted key
result = df_large.join(
    df_small,
    (df_large.country == df_small.country) & (df_large.salt == df_small.salt)
).drop("salt")
```

## Timeout Failures

Glue jobs have a default timeout (48 hours for most job types). If your job is timing out, it's usually because of one of these:

1. **Slow S3 reads** - Too many small files, or throttling from too many requests
2. **Inefficient joins** - Cartesian joins or broadcast joins on large tables
3. **Network bottlenecks** - VPC configuration issues

### Fixing Small File Problems

The "small files problem" is real in Glue. If your source data has thousands of tiny files, Spark spends more time on overhead than actual processing.

This groups small files together to reduce the overhead of reading many tiny files.

```python
# Enable file grouping for small files
glueContext.create_dynamic_frame.from_options(
    connection_type="s3",
    connection_options={
        "paths": ["s3://bucket/many-small-files/"],
        "groupFiles": "inPartition",
        "groupSize": "104857600"  # 100 MB groups
    },
    format="json"
)
```

### Fixing VPC Connectivity Timeouts

If your Glue job connects to resources in a VPC (like RDS or Redshift), make sure your network configuration is right.

```bash
# Check if the Glue connection can reach the target
aws glue test-connection --connection-name my-rds-connection

# Common issues:
# 1. Security group doesn't allow self-referencing traffic
# 2. No NAT gateway for internet access
# 3. S3 VPC endpoint is missing
```

You need a self-referencing security group rule for Glue workers to communicate with each other.

```bash
# Add self-referencing rule to allow Glue workers to talk to each other
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --source-group sg-0123456789abcdef0 \
  --protocol -1
```

## Permission Errors

IAM permission issues are sneaky. The job might start fine but fail when trying to read from S3, write to a database, or access a KMS key.

Common permission-related error messages:

- "Access Denied" on S3 operations
- "User is not authorized to perform glue:GetTable"
- "KMS key access denied"

Here's a solid baseline IAM policy for Glue jobs.

This IAM policy provides the minimum permissions a typical Glue ETL job needs.

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
        "arn:aws:s3:::my-data-bucket",
        "arn:aws:s3:::my-data-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:GetTable",
        "glue:GetTables",
        "glue:GetDatabase",
        "glue:GetDatabases",
        "glue:GetPartition",
        "glue:GetPartitions",
        "glue:BatchGetPartition"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:/aws-glue/*"
    }
  ]
}
```

## Job Bookmark Issues

Glue job bookmarks track what data has already been processed. When they get corrupted or misconfigured, you end up reprocessing old data or skipping new data.

This resets the job bookmark so the next run processes everything from scratch.

```bash
# Reset the bookmark for a specific job
aws glue reset-job-bookmark --job-name my-etl-job

# Check current bookmark state
aws glue get-job-bookmark --job-name my-etl-job
```

If your job bookmark isn't advancing, verify that:
- You're using `commit` after processing: `job.commit()`
- The source data is in a supported format (S3 with consistent paths)
- You haven't changed the job script significantly between runs

## Debugging Locally

You can run Glue jobs locally using a Docker container, which makes debugging way faster than deploying to AWS and waiting.

This Docker command starts a local Glue development environment for testing your scripts.

```bash
docker run -it \
  -v ~/.aws:/home/glue_user/.aws \
  -v /path/to/your/script:/home/glue_user/workspace \
  -e AWS_PROFILE=default \
  -e DISABLE_SSL=true \
  --rm \
  -p 4040:4040 \
  -p 18080:18080 \
  amazon/aws-glue-libs:glue_libs_4.0.0_image_01 \
  pyspark
```

## Monitoring Your Glue Jobs

Don't wait for jobs to fail. Set up proactive monitoring. Track these CloudWatch metrics:

- `glue.driver.aggregate.elapsedTime` - Is the job taking longer than expected?
- `glue.driver.aggregate.numFailedTasks` - Are tasks failing and being retried?
- `glue.ALL.jvm.heap.usage` - Is memory creeping up over time?

If you're using OneUptime for monitoring your infrastructure, you can set up alerts on these metrics and get notified before a job actually fails. For more on monitoring AWS data pipelines, check out [configuring Kinesis monitoring](https://oneuptime.com/blog/post/2026-02-12-configure-amazon-kinesis-data-streams/view).

## Quick Diagnosis Checklist

When a Glue job fails, run through this list:

1. Read the actual error message in CloudWatch
2. Check IAM permissions on the Glue role
3. Verify network connectivity if using a VPC
4. Look at CloudWatch metrics for memory/CPU spikes
5. Check if the source data has changed (schema, file count, file sizes)
6. Test the job locally with a sample dataset
7. Check for data skew in your joins

Most Glue failures fall into predictable categories. Once you've seen each type a few times, diagnosing them becomes second nature. The key is having good logging and monitoring in place so you can spot problems quickly rather than finding out hours into a failed run.

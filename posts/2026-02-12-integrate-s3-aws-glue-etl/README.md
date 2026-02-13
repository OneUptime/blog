# How to Integrate S3 with AWS Glue for ETL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Glue, ETL, Data Engineering

Description: Complete guide to building ETL pipelines with AWS Glue and S3, covering crawlers, the Data Catalog, Glue jobs, partitioning, and optimizing data formats for analytics.

---

AWS Glue is a serverless ETL service that pairs naturally with S3. You point a crawler at your S3 data, it figures out the schema, and then you write Glue jobs to transform that data into whatever format your analytics team needs. No servers to manage, no cluster sizing to worry about.

Let's build an ETL pipeline from scratch: raw data lands in S3, Glue discovers and catalogs it, transforms it, and writes clean data back to S3 in an optimized format.

## Architecture

Here's the typical flow.

```mermaid
graph LR
    A[Raw Data in S3] --> B[Glue Crawler]
    B --> C[Data Catalog]
    C --> D[Glue ETL Job]
    D --> E[Processed Data in S3]
    E --> F[Athena / Redshift Spectrum]
```

## Step 1: Set Up S3 Buckets

Create separate buckets (or prefixes) for raw and processed data. Keeping them separate makes IAM policies and lifecycle management cleaner.

```bash
# Create buckets for the data pipeline
aws s3 mb s3://company-data-raw
aws s3 mb s3://company-data-processed

# Create a bucket for Glue temporary files
aws s3 mb s3://company-glue-temp
```

Upload some sample data. Let's say we have JSON log files.

```bash
# Upload sample data
aws s3 cp sample-logs/ s3://company-data-raw/logs/year=2025/month=12/ --recursive
```

Notice the partition structure (`year=2025/month=12/`). Glue and Athena use this for partition pruning, which dramatically speeds up queries.

## Step 2: Create the Glue Database

A Glue database is a logical container for your tables in the Data Catalog.

```bash
# Create a database in the Glue Data Catalog
aws glue create-database \
  --database-input '{
    "Name": "company_analytics",
    "Description": "Analytics data catalog for company data"
  }'
```

## Step 3: Create a Crawler

The crawler scans your S3 data, infers the schema, and creates/updates tables in the Data Catalog.

First, create an IAM role for the crawler.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::company-data-raw",
        "arn:aws:s3:::company-data-raw/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "glue:*"
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
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

Create the crawler.

```bash
# Create a Glue crawler
aws glue create-crawler \
  --name raw-logs-crawler \
  --role arn:aws:iam::123456789012:role/GlueCrawlerRole \
  --database-name company_analytics \
  --targets '{
    "S3Targets": [
      {
        "Path": "s3://company-data-raw/logs/",
        "Exclusions": ["**/_temporary/**", "**/.spark-staging/**"]
      }
    ]
  }' \
  --schema-change-policy '{
    "UpdateBehavior": "UPDATE_IN_DATABASE",
    "DeleteBehavior": "LOG"
  }' \
  --recrawl-policy '{
    "RecrawlBehavior": "CRAWL_NEW_FOLDERS_ONLY"
  }' \
  --configuration '{
    "Version": 1.0,
    "Grouping": {
      "TableGroupingPolicy": "CombineCompatibleSchemas"
    }
  }'
```

Run the crawler.

```bash
# Start the crawler
aws glue start-crawler --name raw-logs-crawler

# Check crawler status
aws glue get-crawler --name raw-logs-crawler --query 'Crawler.State'
```

After the crawler finishes, you'll have a table in the Data Catalog that describes your data's schema and partitions.

## Step 4: Write a Glue ETL Job

Now create a Glue job that reads from the raw table, transforms the data, and writes it in Parquet format to the processed bucket.

Here's a PySpark Glue script.

```python
# etl_job.py - Glue ETL job script
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql.functions import col, to_date, hour, when

# Initialize Glue context
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read from the Data Catalog
raw_data = glueContext.create_dynamic_frame.from_catalog(
    database="company_analytics",
    table_name="logs",
    transformation_ctx="raw_data"
)

# Convert to Spark DataFrame for easier transformations
df = raw_data.toDF()

# Apply transformations
transformed_df = (
    df
    # Parse timestamp and extract date parts
    .withColumn("event_date", to_date(col("timestamp")))
    .withColumn("event_hour", hour(col("timestamp")))

    # Categorize events
    .withColumn("event_category",
        when(col("event_type").isin("login", "logout"), "auth")
        .when(col("event_type").isin("purchase", "refund"), "transaction")
        .otherwise("other")
    )

    # Drop null user IDs
    .filter(col("user_id").isNotNull())

    # Remove duplicate events
    .dropDuplicates(["event_id"])
)

# Convert back to DynamicFrame
output_frame = DynamicFrame.fromDF(transformed_df, glueContext, "output")

# Write to S3 in Parquet format with partitioning
glueContext.write_dynamic_frame.from_options(
    frame=output_frame,
    connection_type="s3",
    format="glueparquet",
    connection_options={
        "path": "s3://company-data-processed/logs/",
        "partitionKeys": ["event_date", "event_category"]
    },
    format_options={
        "compression": "snappy"
    },
    transformation_ctx="output"
)

job.commit()
```

Create and run the job.

```bash
# Upload the script to S3
aws s3 cp etl_job.py s3://company-glue-temp/scripts/etl_job.py

# Create the Glue job
aws glue create-job \
  --name transform-logs \
  --role arn:aws:iam::123456789012:role/GlueJobRole \
  --command '{
    "Name": "glueetl",
    "ScriptLocation": "s3://company-glue-temp/scripts/etl_job.py",
    "PythonVersion": "3"
  }' \
  --default-arguments '{
    "--TempDir": "s3://company-glue-temp/temporary/",
    "--job-bookmark-option": "job-bookmark-enable",
    "--enable-metrics": "true",
    "--enable-continuous-cloudwatch-log": "true"
  }' \
  --glue-version "4.0" \
  --number-of-workers 10 \
  --worker-type G.1X

# Run the job
aws glue start-job-run --job-name transform-logs
```

Key configuration choices:

- **Job bookmarks** (`job-bookmark-enable`) track what's been processed so the job only processes new data on subsequent runs
- **Glue version 4.0** uses Spark 3.3 with performance improvements
- **Worker type G.1X** provides 4 vCPU and 16 GB memory per worker

## Step 5: Schedule the Pipeline

Create a Glue trigger to run the crawler and job on a schedule.

```bash
# Schedule the crawler to run daily at 1 AM
aws glue create-trigger \
  --name daily-crawl \
  --type SCHEDULED \
  --schedule "cron(0 1 * * ? *)" \
  --actions '[{"CrawlerName": "raw-logs-crawler"}]' \
  --start-on-creation

# Trigger the ETL job after the crawler finishes
aws glue create-trigger \
  --name post-crawl-etl \
  --type CONDITIONAL \
  --predicate '{
    "Conditions": [
      {
        "CrawlerName": "raw-logs-crawler",
        "CrawlState": "SUCCEEDED",
        "LogicalOperator": "EQUALS"
      }
    ]
  }' \
  --actions '[{"JobName": "transform-logs"}]' \
  --start-on-creation
```

## Step 6: Query Processed Data with Athena

After the ETL job writes Parquet data, crawl the processed bucket and query with Athena.

```bash
# Create a crawler for the processed data
aws glue create-crawler \
  --name processed-logs-crawler \
  --role arn:aws:iam::123456789012:role/GlueCrawlerRole \
  --database-name company_analytics \
  --targets '{
    "S3Targets": [
      {
        "Path": "s3://company-data-processed/logs/"
      }
    ]
  }'

# Run it
aws glue start-crawler --name processed-logs-crawler
```

Then query from Athena.

```sql
-- Query the processed Parquet data
SELECT event_date, event_category, COUNT(*) as event_count
FROM company_analytics.processed_logs
WHERE event_date >= DATE '2025-12-01'
GROUP BY event_date, event_category
ORDER BY event_date;
```

Because the data is partitioned by date and category, Athena only scans the relevant partitions, making queries fast and cheap.

## Monitoring Glue Jobs

Track job success, duration, and data processed.

```bash
# Get job run details
aws glue get-job-runs \
  --job-name transform-logs \
  --max-items 5
```

For production pipelines, set up alerts for failed jobs and monitor data freshness with [OneUptime](https://oneuptime.com). A stale analytics pipeline is often worse than a broken one because nobody notices the data is old.

For more on optimizing your S3 storage costs after ETL processing, see our guide on [S3 storage class analysis](https://oneuptime.com/blog/post/2026-02-12-s3-storage-class-analysis-optimize-costs/view).

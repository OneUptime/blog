# How to Create AWS Glue ETL Jobs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Glue, ETL, Data Engineering, Spark

Description: A practical guide to creating AWS Glue ETL jobs for extracting, transforming, and loading data, including PySpark scripts, job configuration, and best practices.

---

Data rarely arrives in the format you need it in. It comes as raw JSON from an API, CSV exports from a vendor, or messy logs from your application. Getting it into a clean, queryable format is what ETL (Extract, Transform, Load) is all about, and AWS Glue is the managed service that handles it.

Glue ETL jobs run Apache Spark under the hood, so you get the distributed processing power of Spark without managing any infrastructure. You write a PySpark script, configure the job, and let AWS handle the cluster provisioning, execution, and teardown.

## Glue Job Types

Glue supports several job types:

| Type | Engine | Best For |
|------|--------|----------|
| Spark | Apache Spark | Large-scale batch ETL |
| Spark Streaming | Spark Structured Streaming | Near-real-time ETL |
| Python Shell | Python 3 | Small-scale transforms, API calls |
| Ray | Ray | Python-heavy ML workloads |

For most ETL workloads, Spark jobs are the way to go. Python Shell is good for lightweight tasks that don't need distributed processing.

## Creating a Basic ETL Job

### Using the SDK

```python
# Create a Glue ETL job that transforms CSV to Parquet
import boto3

glue = boto3.client('glue', region_name='us-east-1')

response = glue.create_job(
    Name='csv-to-parquet-transform',
    Role='arn:aws:iam::YOUR_ACCOUNT_ID:role/GlueETLRole',
    Command={
        'Name': 'glueetl',
        'ScriptLocation': 's3://my-glue-scripts/csv_to_parquet.py',
        'PythonVersion': '3'
    },
    DefaultArguments={
        '--job-language': 'python',
        '--job-bookmark-option': 'job-bookmark-enable',
        '--enable-metrics': '',
        '--enable-continuous-cloudwatch-log': 'true',
        '--source-path': 's3://my-data-lake/raw/events/',
        '--target-path': 's3://my-data-lake/processed/events/',
        '--TempDir': 's3://my-glue-temp/temp/'
    },
    GlueVersion='4.0',
    WorkerType='G.1X',
    NumberOfWorkers=10,
    Timeout=120,  # Minutes
    MaxRetries=1,
    Description='Converts raw CSV event data to partitioned Parquet format'
)

print(f"Job created: {response['Name']}")
```

### Worker Types

| Worker Type | vCPU | Memory | Disk | Use Case |
|-------------|------|--------|------|----------|
| G.1X | 4 | 16 GB | 64 GB | Most workloads |
| G.2X | 8 | 32 GB | 128 GB | Memory-heavy transforms |
| G.4X | 16 | 64 GB | 256 GB | Large-scale joins |
| G.8X | 32 | 128 GB | 512 GB | Very large datasets |
| G.025X | 2 | 4 GB | 64 GB | Small Python Shell jobs |

Start with G.1X and 10 workers. Scale up based on job performance metrics.

## Writing the ETL Script

Here's a complete ETL script that reads CSV data, transforms it, and writes Parquet:

```python
# Glue ETL script: Transform raw CSV events to partitioned Parquet
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.context import SparkContext
from pyspark.sql.functions import col, year, month, dayofmonth, from_unixtime, lower, trim

# Get job parameters
args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'source-path',
    'target-path'
])

# Initialize Glue context
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read source data from S3
source_path = args['source-path']
print(f"Reading from: {source_path}")

# Option 1: Read from Glue Data Catalog
# datasource = glueContext.create_dynamic_frame.from_catalog(
#     database="raw_data",
#     table_name="events_csv"
# )

# Option 2: Read directly from S3
datasource = glueContext.create_dynamic_frame.from_options(
    connection_type="s3",
    connection_options={
        "paths": [source_path],
        "recurse": True
    },
    format="csv",
    format_options={
        "withHeader": True,
        "separator": ","
    }
)

print(f"Source record count: {datasource.count()}")
print(f"Source schema:")
datasource.printSchema()

# Convert to Spark DataFrame for transformations
df = datasource.toDF()

# Apply transformations
transformed = df \
    .withColumn("event_type", lower(trim(col("event_type")))) \
    .withColumn("timestamp", col("timestamp").cast("long")) \
    .withColumn("event_date", from_unixtime(col("timestamp"))) \
    .withColumn("year", year(from_unixtime(col("timestamp"))).cast("string")) \
    .withColumn("month", month(from_unixtime(col("timestamp"))).cast("string").lpad(2, "0")) \
    .withColumn("day", dayofmonth(from_unixtime(col("timestamp"))).cast("string").lpad(2, "0")) \
    .filter(col("user_id").isNotNull()) \
    .filter(col("event_type").isNotNull()) \
    .dropDuplicates(["event_id"])

# Convert back to DynamicFrame
output = DynamicFrame.fromDF(transformed, glueContext, "output")

print(f"Output record count: {output.count()}")

# Write to S3 as partitioned Parquet
target_path = args['target-path']
print(f"Writing to: {target_path}")

glueContext.write_dynamic_frame.from_options(
    frame=output,
    connection_type="s3",
    connection_options={
        "path": target_path,
        "partitionKeys": ["year", "month", "day"]
    },
    format="parquet",
    format_options={
        "compression": "snappy"
    }
)

# Commit the job (important for bookmarks)
job.commit()
print("Job completed successfully")
```

## DynamicFrame vs DataFrame

Glue introduces `DynamicFrame` on top of Spark's `DataFrame`. The key differences:

- **DynamicFrame** handles schema inconsistencies gracefully (different records can have different types for the same field)
- **DataFrame** is standard Spark with stricter typing and more transformation functions

In practice, you'll often convert between them:

```python
# Convert DynamicFrame to DataFrame for complex operations
df = dynamic_frame.toDF()

# Do Spark DataFrame operations
result = df.groupBy("category").count()

# Convert back to DynamicFrame
output_frame = DynamicFrame.fromDF(result, glueContext, "output")
```

## Reading from the Data Catalog

The cleanest way to read data is through the Glue Data Catalog:

```python
# Read from the Glue Data Catalog with push-down predicates
datasource = glueContext.create_dynamic_frame.from_catalog(
    database="raw_data",
    table_name="events",
    push_down_predicate="year='2025' AND month='02'",
    additional_options={
        "enableUpdateCatalog": True
    }
)
```

The `push_down_predicate` is critical for performance. It tells Glue to only read partitions matching the predicate, just like partition filtering in Athena.

## Writing to Multiple Targets

ETL jobs often need to write to multiple destinations:

```python
# Write the same transformed data to multiple targets

# Target 1: S3 as Parquet for Athena
glueContext.write_dynamic_frame.from_options(
    frame=output,
    connection_type="s3",
    connection_options={
        "path": "s3://my-data-lake/processed/events/",
        "partitionKeys": ["year", "month"]
    },
    format="parquet"
)

# Target 2: Update the Glue Data Catalog
glueContext.write_dynamic_frame.from_catalog(
    frame=output,
    database="processed_data",
    table_name="events_parquet"
)

# Target 3: Write to a JDBC target (RDS/Redshift)
glueContext.write_dynamic_frame.from_jdbc_conf(
    frame=output,
    catalog_connection="production-rds",
    connection_options={
        "dbtable": "analytics.events",
        "database": "production"
    }
)
```

## Error Handling

Add proper error handling to make your jobs resilient:

```python
# Handle errors during transformation
from awsglue.transforms import *

# Resolve data type conflicts
resolved = ResolveChoice.apply(
    frame=datasource,
    choice="cast:string",  # Cast conflicting types to string
    transformation_ctx="resolved"
)

# Separate good records from bad ones
good_records = Filter.apply(
    frame=resolved,
    f=lambda x: x["event_id"] is not None and x["user_id"] is not None,
    transformation_ctx="good_records"
)

bad_records = Filter.apply(
    frame=resolved,
    f=lambda x: x["event_id"] is None or x["user_id"] is None,
    transformation_ctx="bad_records"
)

# Write bad records to a dead letter path for investigation
if bad_records.count() > 0:
    glueContext.write_dynamic_frame.from_options(
        frame=bad_records,
        connection_type="s3",
        connection_options={
            "path": "s3://my-data-lake/dead-letter/events/"
        },
        format="json"
    )
    print(f"Wrote {bad_records.count()} bad records to dead letter queue")
```

## Running the Job

```python
# Start the ETL job
response = glue.start_job_run(
    JobName='csv-to-parquet-transform',
    Arguments={
        '--source-path': 's3://my-data-lake/raw/events/',
        '--target-path': 's3://my-data-lake/processed/events/'
    }
)

job_run_id = response['JobRunId']
print(f"Job run started: {job_run_id}")
```

Monitor progress:

```python
# Check job run status
import time

while True:
    status = glue.get_job_run(
        JobName='csv-to-parquet-transform',
        RunId=job_run_id
    )

    state = status['JobRun']['JobRunState']
    print(f"State: {state}")

    if state in ['SUCCEEDED', 'FAILED', 'STOPPED', 'TIMEOUT']:
        if state == 'SUCCEEDED':
            print(f"Duration: {status['JobRun']['ExecutionTime']}s")
        elif state == 'FAILED':
            print(f"Error: {status['JobRun']['ErrorMessage']}")
        break

    time.sleep(30)
```

## Cost Management

Glue ETL pricing is based on DPU-hours (Data Processing Units). One G.1X worker = 1 DPU, and you're charged per second with a 1-minute minimum.

Tips to keep costs down:
- Right-size your worker count (start small and scale up)
- Enable job bookmarks to process only new data
- Use push-down predicates to limit data read
- Set reasonable timeouts to prevent runaway jobs

For more on optimizing Glue job performance and costs, check our guide on [configuring Glue ETL jobs for performance](https://oneuptime.com/blog/post/2026-02-12-configure-glue-etl-jobs-for-performance/view).

## Wrapping Up

AWS Glue ETL gives you Spark's processing power without the operational burden. Write your transformation logic in PySpark, configure the job parameters, and let Glue handle the infrastructure. Start with simple transforms, use the Data Catalog for schema management, and build up to more complex pipelines with [workflows](https://oneuptime.com/blog/post/2026-02-12-schedule-glue-etl-jobs-with-workflows/view) and [job bookmarks](https://oneuptime.com/blog/post/2026-02-12-use-glue-job-bookmarks-for-incremental-data-processing/view).

# How to Convert CSV Data to Parquet Format on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Parquet, Athena, S3, Data Engineering

Description: Learn multiple approaches to converting CSV files to Parquet format on AWS for faster queries, lower storage costs, and better compression.

---

CSV files are everywhere. They're the universal export format, the default for many data pipelines, and the thing everyone sends you in email attachments. But for analytics workloads on AWS, CSV is one of the worst formats you can use. It's not compressed, it's not columnar, and every query has to read every byte of every file even if you only need one column.

Parquet fixes all of these problems. It's columnar (so reading one column doesn't require reading the rest), compressed (typically 3-5x smaller than CSV), and self-describing (schema is embedded in the file). An Athena query over Parquet data is typically 3-10x faster and costs 3-10x less than the same query over CSV.

Let's look at the different ways to convert CSV to Parquet on AWS.

## Method 1: Athena CTAS (Simplest)

If your CSV data is already in S3 and you have an Athena table pointing to it, the easiest conversion is a CTAS (Create Table As Select) query:

```sql
-- First, create a table over your raw CSV data
CREATE EXTERNAL TABLE raw_sales_csv (
    sale_id STRING,
    customer_id STRING,
    product_name STRING,
    category STRING,
    sale_date STRING,
    amount DOUBLE,
    region STRING
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
LOCATION 's3://my-data-lake/raw/sales-csv/'
TBLPROPERTIES ('skip.header.line.count'='1');
```

```sql
-- Convert to Parquet with a CTAS query
-- This reads the CSV data and writes it as Parquet to a new S3 location
CREATE TABLE sales_parquet
WITH (
    external_location = 's3://my-data-lake/processed/sales-parquet/',
    format = 'PARQUET',
    parquet_compression = 'SNAPPY',
    partitioned_by = ARRAY['region']
) AS
SELECT
    sale_id,
    customer_id,
    product_name,
    category,
    CAST(sale_date AS DATE) AS sale_date,
    amount,
    region
FROM raw_sales_csv;
```

This is great for one-time conversions. Athena charges you for the data scanned (the full CSV), writes the Parquet files to S3, and creates a new table in the Glue catalog.

## Method 2: AWS Glue ETL Job

For recurring conversions or more complex transformations, use a Glue job:

```python
# Glue ETL job to convert CSV to Parquet with transformations
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.context import SparkContext
from pyspark.sql import functions as F
from pyspark.sql.types import DateType, DoubleType

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'input_path', 'output_path'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read CSV files from S3
input_path = args['input_path']
df = spark.read \
    .option("header", "true") \
    .option("inferSchema", "false") \
    .csv(input_path)

# Cast columns to proper types (CSV reads everything as strings)
converted_df = df \
    .withColumn("sale_id", F.col("sale_id").cast("long")) \
    .withColumn("customer_id", F.col("customer_id").cast("long")) \
    .withColumn("amount", F.col("amount").cast(DoubleType())) \
    .withColumn("sale_date", F.to_date("sale_date", "yyyy-MM-dd")) \
    .withColumn("year", F.year("sale_date").cast("string")) \
    .withColumn("month", F.format_string("%02d", F.month("sale_date")))

# Remove any rows with null key fields
cleaned_df = converted_df.filter(
    F.col("sale_id").isNotNull() &
    F.col("customer_id").isNotNull()
)

# Write as Parquet with Snappy compression and partitioning
output_path = args['output_path']
cleaned_df.write \
    .mode("overwrite") \
    .partitionBy("year", "month") \
    .option("compression", "snappy") \
    .parquet(output_path)

# Update the Glue Data Catalog
glueContext.purge_s3_path(output_path, options={"retentionPeriod": 0})

job.commit()
```

Run the job:

```bash
# Run the Glue CSV-to-Parquet conversion job
aws glue start-job-run \
    --job-name "csv-to-parquet-converter" \
    --arguments '{
        "--input_path": "s3://my-data-lake/raw/sales-csv/",
        "--output_path": "s3://my-data-lake/processed/sales-parquet/"
    }'
```

## Method 3: Lambda for Small Files

For small CSV files (under 500 MB), a Lambda function is a lightweight option:

```python
# Lambda function to convert individual CSV files to Parquet
# Triggered by S3 upload events
import boto3
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from io import BytesIO, StringIO

s3 = boto3.client('s3')

def lambda_handler(event, context):
    # Get the uploaded CSV file details
    source_bucket = event['Records'][0]['s3']['bucket']['name']
    source_key = event['Records'][0]['s3']['object']['key']

    # Only process CSV files
    if not source_key.endswith('.csv'):
        return {'status': 'skipped', 'reason': 'not a CSV file'}

    # Read the CSV from S3
    response = s3.get_object(Bucket=source_bucket, Key=source_key)
    csv_content = response['Body'].read().decode('utf-8')

    # Parse CSV with pandas
    df = pd.read_csv(StringIO(csv_content))

    # Convert date columns
    if 'sale_date' in df.columns:
        df['sale_date'] = pd.to_datetime(df['sale_date'])

    # Convert numeric columns
    numeric_cols = ['amount', 'quantity', 'price']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # Convert to Parquet
    table = pa.Table.from_pandas(df)
    parquet_buffer = BytesIO()
    pq.write_table(table, parquet_buffer, compression='snappy')

    # Generate the output key (same path but .parquet extension)
    output_key = source_key.replace('/raw/', '/parquet/').replace('.csv', '.parquet')

    # Write Parquet to S3
    parquet_buffer.seek(0)
    s3.put_object(
        Bucket=source_bucket,
        Key=output_key,
        Body=parquet_buffer.getvalue()
    )

    return {
        'status': 'converted',
        'source': f's3://{source_bucket}/{source_key}',
        'destination': f's3://{source_bucket}/{output_key}',
        'rows': len(df),
        'csv_size_bytes': len(csv_content),
        'parquet_size_bytes': parquet_buffer.tell()
    }
```

Set up the S3 trigger:

```bash
# Add S3 event notification to trigger Lambda on CSV uploads
aws s3api put-bucket-notification-configuration \
    --bucket my-data-lake \
    --notification-configuration '{
        "LambdaFunctionConfigurations": [
            {
                "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function/csv-to-parquet",
                "Events": ["s3:ObjectCreated:*"],
                "Filter": {
                    "Key": {
                        "FilterRules": [
                            {"Name": "prefix", "Value": "raw/"},
                            {"Name": "suffix", "Value": ".csv"}
                        ]
                    }
                }
            }
        ]
    }'
```

## Compression Choices

Parquet supports several compression codecs:

| Codec | Compression Ratio | Read Speed | Write Speed | Best For |
|-------|-------------------|------------|-------------|----------|
| Snappy | Good | Fast | Fast | General purpose (default choice) |
| GZIP | Better | Slower | Slower | Archive data, maximum compression |
| ZSTD | Best | Fast | Medium | Best balance of compression and speed |
| LZO | Moderate | Very fast | Very fast | Real-time processing |

For most Athena workloads, Snappy is the right choice. It gives good compression with the fastest read speed.

## Verifying the Conversion

After converting, compare the sizes:

```bash
# Check the size of original CSV data
aws s3 ls s3://my-data-lake/raw/sales-csv/ --summarize --recursive | tail -2

# Check the size of converted Parquet data
aws s3 ls s3://my-data-lake/processed/sales-parquet/ --summarize --recursive | tail -2
```

You should see a significant reduction. A 10 GB CSV file typically compresses to about 2-3 GB in Parquet with Snappy compression.

Then run the same query against both tables in Athena and compare the "Data scanned" numbers:

```sql
-- Query against CSV table
SELECT region, COUNT(*), SUM(amount)
FROM raw_sales_csv
WHERE sale_date >= '2026-01-01'
GROUP BY region;

-- Same query against Parquet table
SELECT region, COUNT(*), SUM(amount)
FROM sales_parquet
WHERE sale_date >= DATE '2026-01-01'
GROUP BY region;
```

The Parquet query will scan a fraction of the data and run much faster.

## Automating with a Glue Workflow

For an end-to-end pipeline that converts CSV uploads to Parquet:

```bash
# Create a Glue crawler for new CSV files
aws glue create-crawler \
    --name "csv-discovery-crawler" \
    --role "arn:aws:iam::123456789012:role/GlueCrawlerRole" \
    --database-name "raw_db" \
    --targets '{"S3Targets": [{"Path": "s3://my-data-lake/raw/"}]}'

# Create the conversion job
aws glue create-job \
    --name "csv-to-parquet" \
    --role "arn:aws:iam::123456789012:role/GlueJobRole" \
    --command '{"Name": "glueetl", "ScriptLocation": "s3://my-scripts/csv-to-parquet.py"}' \
    --glue-version "4.0" \
    --execution-class "FLEX" \
    --worker-type "G.1X" \
    --number-of-workers 5
```

Converting CSV to Parquet is one of the highest-ROI improvements you can make to your data lake. For more query optimization strategies, see [partitioning data in S3 for Athena](https://oneuptime.com/blog/post/2026-02-12-partition-data-s3-efficient-athena-queries/view) and [Athena CTAS for optimized tables](https://oneuptime.com/blog/post/2026-02-12-athena-ctas-creating-optimized-tables/view).

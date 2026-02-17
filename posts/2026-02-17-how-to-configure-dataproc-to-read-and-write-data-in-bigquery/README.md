# How to Configure Dataproc to Read and Write Data in BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, BigQuery, Spark, ETL

Description: Configure the Spark BigQuery connector on Dataproc to read from and write to BigQuery tables directly from your Spark jobs.

---

One of the most common patterns in GCP data engineering is reading data from BigQuery, processing it with Spark on Dataproc, and writing results back to BigQuery. The Spark BigQuery connector makes this possible without any intermediate data exports. You can treat BigQuery tables as Spark DataFrames and work with them directly.

This guide covers how to set up the connector, read and write data, handle common configurations, and avoid the gotchas that trip people up.

## How the BigQuery Connector Works

The Spark BigQuery connector uses the BigQuery Storage Read API and the BigQuery Storage Write API under the hood. When you read a table, it streams data directly from BigQuery storage into Spark executors in parallel. When you write, it uses the Storage Write API to load data back into BigQuery efficiently.

This is different from the older approach of exporting data to GCS as a temporary step. The connector still uses a temporary GCS bucket for some operations, but the read path is direct and significantly faster.

## Step 1: Create a Cluster with the BigQuery Connector

The simplest way to get started is to include the connector when creating your Dataproc cluster:

```bash
# Create a Dataproc cluster with the BigQuery connector pre-installed
gcloud dataproc clusters create bq-spark-cluster \
  --region=us-central1 \
  --image-version=2.1-debian11 \
  --num-workers=2 \
  --worker-machine-type=n2-standard-4 \
  --optional-components=JUPYTER \
  --metadata="spark-bigquery-connector-url=gs://spark-lib/bigquery/spark-bigquery-with-dependencies_2.12-0.36.1.jar" \
  --initialization-actions=gs://goog-dataproc-initialization-actions-us-central1/connectors/connectors.sh
```

Alternatively, you can specify the connector JAR when submitting individual jobs, which gives you more flexibility:

```bash
# Submit a job with the BigQuery connector JAR
gcloud dataproc jobs submit pyspark gs://my-bucket/scripts/bq_job.py \
  --cluster=bq-spark-cluster \
  --region=us-central1 \
  --jars=gs://spark-lib/bigquery/spark-bigquery-with-dependencies_2.12-0.36.1.jar
```

## Step 2: Set Up a Temporary GCS Bucket

The BigQuery connector needs a GCS bucket for temporary data during write operations. Create one if you do not already have a staging bucket:

```bash
# Create a temporary bucket for BigQuery connector staging
gsutil mb -l us-central1 gs://my-project-bq-temp/

# Set a lifecycle policy to auto-delete temp files after 1 day
gsutil lifecycle set /dev/stdin gs://my-project-bq-temp/ << 'EOF'
{
  "rule": [{
    "action": {"type": "Delete"},
    "condition": {"age": 1}
  }]
}
EOF
```

## Step 3: Read Data from BigQuery

Here is a PySpark script that reads a BigQuery table into a DataFrame:

```python
# read_bigquery.py - Read data from a BigQuery table into Spark
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("ReadFromBigQuery") \
    .getOrCreate()

# Set the temporary GCS bucket for the connector
spark.conf.set("temporaryGcsBucket", "my-project-bq-temp")

# Read an entire BigQuery table
df = spark.read.format("bigquery") \
    .option("table", "my-project.my_dataset.sales_data") \
    .load()

# Show the schema and first few rows
df.printSchema()
df.show(10)

print(f"Total rows: {df.count()}")
```

You can also push down filters to BigQuery so only relevant data is transferred:

```python
# Read with a filter pushed down to BigQuery
# Only matching rows are transferred from BigQuery to Spark
df = spark.read.format("bigquery") \
    .option("table", "my-project.my_dataset.sales_data") \
    .option("filter", "sale_date >= '2025-01-01' AND region = 'US'") \
    .load()

# Or use column selection to reduce data transfer
df = spark.read.format("bigquery") \
    .option("table", "my-project.my_dataset.sales_data") \
    .load() \
    .select("order_id", "customer_id", "amount", "sale_date")
```

## Step 4: Read BigQuery Using SQL

You can also specify a SQL query instead of a table name. This is useful when you want BigQuery to do some heavy lifting before Spark gets the data:

```python
# Use a SQL query to read pre-aggregated data from BigQuery
query = """
    SELECT
        region,
        product_category,
        DATE_TRUNC(sale_date, MONTH) as sale_month,
        SUM(amount) as total_sales,
        COUNT(*) as transaction_count
    FROM my-project.my_dataset.sales_data
    WHERE sale_date >= '2025-01-01'
    GROUP BY region, product_category, sale_month
"""

df = spark.read.format("bigquery") \
    .option("query", query) \
    .option("viewsEnabled", "true") \
    .load()

df.show()
```

Note the `viewsEnabled` option - it is required when using queries instead of direct table references.

## Step 5: Write Data to BigQuery

Writing Spark DataFrames back to BigQuery is straightforward:

```python
# write_bigquery.py - Write processed data back to BigQuery
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, when, lit

spark = SparkSession.builder \
    .appName("WriteToBigQuery") \
    .getOrCreate()

spark.conf.set("temporaryGcsBucket", "my-project-bq-temp")

# Read source data
df = spark.read.format("bigquery") \
    .option("table", "my-project.my_dataset.raw_events") \
    .load()

# Apply transformations
processed = df \
    .filter(col("event_type").isNotNull()) \
    .withColumn("event_category",
        when(col("event_type").isin("click", "scroll", "hover"), "interaction")
        .when(col("event_type").isin("purchase", "add_to_cart"), "conversion")
        .otherwise("other")) \
    .select("event_id", "user_id", "event_type", "event_category", "timestamp")

# Write the processed data to a new BigQuery table
processed.write.format("bigquery") \
    .option("table", "my-project.my_dataset.processed_events") \
    .option("writeMethod", "direct") \
    .mode("overwrite") \
    .save()

print("Data written to BigQuery successfully")
```

The `writeMethod` option controls how data is written:
- `direct` - Uses the BigQuery Storage Write API (faster, recommended)
- `indirect` - Writes to GCS first, then loads into BigQuery (legacy approach)

## Step 6: Handle Write Modes

Spark supports several write modes that map to different BigQuery behaviors:

```python
# Overwrite mode - replaces the entire table
df.write.format("bigquery") \
    .option("table", "my-project.my_dataset.output_table") \
    .mode("overwrite") \
    .save()

# Append mode - adds rows to an existing table
df.write.format("bigquery") \
    .option("table", "my-project.my_dataset.output_table") \
    .mode("append") \
    .save()

# ErrorIfExists mode - fails if the table already exists (default)
df.write.format("bigquery") \
    .option("table", "my-project.my_dataset.output_table") \
    .mode("errorifexists") \
    .save()
```

## Step 7: Configure Partitioned and Clustered Tables

When writing to BigQuery, you can create partitioned and clustered tables for better query performance:

```python
# Write data as a partitioned and clustered BigQuery table
df.write.format("bigquery") \
    .option("table", "my-project.my_dataset.events_partitioned") \
    .option("partitionField", "event_date") \
    .option("partitionType", "DAY") \
    .option("clusteredFields", "event_type,user_id") \
    .option("writeMethod", "direct") \
    .mode("overwrite") \
    .save()
```

This creates a BigQuery table partitioned by `event_date` and clustered by `event_type` and `user_id`, which dramatically improves query performance for filtered queries.

## Common Issues and Fixes

A few things that commonly go wrong:

**Missing temporary bucket** - If you see errors about a missing temporary GCS bucket, make sure you set the `temporaryGcsBucket` configuration or pass it as an option.

**Permission errors** - The Dataproc service account needs `bigquery.dataEditor` and `bigquery.jobUser` roles in addition to the default Dataproc roles.

```bash
# Grant BigQuery permissions to the Dataproc service account
PROJECT_NUMBER=$(gcloud projects describe my-project --format="value(projectNumber)")
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:${SA}" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:${SA}" \
  --role="roles/bigquery.jobUser"
```

**Schema mismatches** - When writing to an existing table, make sure the DataFrame schema matches the BigQuery table schema. Mismatched column names or types will cause failures.

## Performance Tips

- Use `filter` pushdown to minimize data transfer from BigQuery to Spark
- Select only the columns you need instead of reading entire wide tables
- For large writes, use the `direct` write method with the Storage Write API
- Set `spark.sql.sources.parallelPartitions` to control read parallelism
- Use `materializationDataset` option to control where temporary views are materialized

## Wrapping Up

The Spark BigQuery connector turns BigQuery into a first-class data source for your Dataproc Spark jobs. You read and write BigQuery tables as naturally as you would work with Parquet files in GCS. For data engineering workflows that need the processing power of Spark combined with the warehouse capabilities of BigQuery, this connector is the glue that holds everything together.

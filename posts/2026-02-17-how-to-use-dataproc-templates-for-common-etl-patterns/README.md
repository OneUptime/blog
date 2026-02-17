# How to Use Dataproc Templates for Common ETL Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataproc, ETL, Spark, Templates

Description: Use Dataproc Templates to quickly deploy pre-built ETL pipelines for common data movement patterns without writing Spark code from scratch.

---

Writing Spark ETL jobs from scratch for every data movement task gets old quickly. If you are moving data from Cloud Storage to BigQuery, from BigQuery to GCS, or from one database to another, chances are someone has already solved that problem. That is exactly what Dataproc Templates provide - pre-built, parameterized Spark jobs for the most common ETL patterns.

Instead of writing, testing, and maintaining custom Spark code, you configure a template with your source, destination, and transformation parameters, and submit it. This article covers how to use these templates effectively.

## What Are Dataproc Templates?

Dataproc Templates are open-source, production-ready Spark applications maintained by Google. They cover common data engineering patterns like:

- GCS to BigQuery
- BigQuery to GCS
- GCS to GCS (format conversion)
- JDBC to BigQuery (for relational databases)
- BigQuery to BigQuery (transformation)
- Kafka to BigQuery
- Hive to BigQuery

Each template is a parameterized Spark job that you configure through command-line properties. You do not need to write any Spark code.

## Step 1: Clone the Dataproc Templates Repository

The templates are hosted on GitHub. Start by cloning the repository:

```bash
# Clone the Dataproc Templates repository
git clone https://github.com/GoogleCloudPlatform/dataproc-templates.git
cd dataproc-templates/python
```

The repository contains templates in both Java and Python. The Python templates are simpler to customize and extend.

## Step 2: Set Up the Environment

Configure your environment variables for the template execution:

```bash
# Set environment variables for Dataproc Templates
export PROJECT=my-project
export REGION=us-central1
export GCS_STAGING_LOCATION=gs://my-staging-bucket/dataproc-templates/
export SUBNET=default

# Set the Dataproc Serverless version
export SPARK_VERSION=2.1
```

Install the required dependencies:

```bash
# Install Python dependencies for the templates
pip install -r requirements.txt
```

## Step 3: GCS to BigQuery Template

This is probably the most commonly used template. It reads files from Cloud Storage and loads them into a BigQuery table.

```bash
# Move Parquet data from GCS to BigQuery
python main.py \
  --template GCSTOBIGQUERY \
  --gcs.bigquery.input.location=gs://my-data-bucket/events/parquet/ \
  --gcs.bigquery.input.format=parquet \
  --gcs.bigquery.output.dataset=my_dataset \
  --gcs.bigquery.output.table=events \
  --gcs.bigquery.output.mode=overwrite \
  --gcs.bigquery.temp.bucket.name=my-staging-bucket
```

Or submit it using the provided helper script that handles Dataproc Serverless submission:

```bash
# Submit the GCS to BigQuery template as a serverless batch
./bin/start.sh \
  --template=GCSTOBIGQUERY \
  --gcs.bigquery.input.location=gs://my-data-bucket/events/parquet/ \
  --gcs.bigquery.input.format=parquet \
  --gcs.bigquery.output.dataset=my_dataset \
  --gcs.bigquery.output.table=events \
  --gcs.bigquery.output.mode=overwrite \
  --gcs.bigquery.temp.bucket.name=my-staging-bucket
```

The template supports multiple input formats including `parquet`, `avro`, `csv`, `json`, and `orc`.

## Step 4: BigQuery to GCS Template

For exporting BigQuery data to files in Cloud Storage:

```bash
# Export BigQuery table to Parquet files in GCS
./bin/start.sh \
  --template=BIGQUERYTOGCS \
  --bigquery.gcs.input.table=my-project:my_dataset.large_table \
  --bigquery.gcs.output.format=parquet \
  --bigquery.gcs.output.location=gs://my-data-bucket/exports/large_table/ \
  --bigquery.gcs.output.mode=overwrite
```

You can also use a SQL query to export specific data:

```bash
# Export filtered BigQuery data using a SQL query
./bin/start.sh \
  --template=BIGQUERYTOGCS \
  --bigquery.gcs.input.table=my-project:my_dataset.events \
  --bigquery.gcs.input.sql="SELECT * FROM my_dataset.events WHERE event_date >= '2025-01-01'" \
  --bigquery.gcs.output.format=csv \
  --bigquery.gcs.output.location=gs://my-data-bucket/exports/recent_events/ \
  --bigquery.gcs.output.mode=overwrite
```

## Step 5: GCS to GCS Template (Format Conversion)

Need to convert CSV files to Parquet? This template handles it:

```bash
# Convert CSV files in GCS to Parquet format
./bin/start.sh \
  --template=GCSTOGCS \
  --gcs.to.gcs.input.location=gs://my-data-bucket/raw/csv/ \
  --gcs.to.gcs.input.format=csv \
  --gcs.to.gcs.output.location=gs://my-data-bucket/processed/parquet/ \
  --gcs.to.gcs.output.format=parquet \
  --gcs.to.gcs.output.mode=overwrite \
  --gcs.to.gcs.temp.view.name=temp_data \
  --gcs.to.gcs.sql.query="SELECT * FROM temp_data WHERE amount > 0"
```

Notice the SQL query parameter - you can apply transformations during the format conversion. This is useful for cleaning data on the fly.

## Step 6: JDBC to BigQuery Template

For loading data from relational databases (MySQL, PostgreSQL, Oracle, SQL Server) into BigQuery:

```bash
# Load data from a Cloud SQL MySQL instance into BigQuery
./bin/start.sh \
  --template=JDBCTOBIGQUERY \
  --jdbc.bigquery.input.url="jdbc:mysql://10.0.0.5:3306/production_db" \
  --jdbc.bigquery.input.driver=com.mysql.cj.jdbc.Driver \
  --jdbc.bigquery.input.table=orders \
  --jdbc.bigquery.input.fetchsize=10000 \
  --jdbc.bigquery.input.sessioninitstatement="SET time_zone = '+00:00'" \
  --jdbc.bigquery.output.dataset=my_dataset \
  --jdbc.bigquery.output.table=orders \
  --jdbc.bigquery.output.mode=overwrite \
  --jdbc.bigquery.temp.bucket.name=my-staging-bucket
```

You can also use a SQL query to extract specific data from the source database:

```bash
# Extract filtered data from PostgreSQL to BigQuery
./bin/start.sh \
  --template=JDBCTOBIGQUERY \
  --jdbc.bigquery.input.url="jdbc:postgresql://10.0.0.10:5432/analytics" \
  --jdbc.bigquery.input.driver=org.postgresql.Driver \
  --jdbc.bigquery.input.table="(SELECT * FROM events WHERE created_at >= '2025-01-01') AS filtered" \
  --jdbc.bigquery.output.dataset=my_dataset \
  --jdbc.bigquery.output.table=events_imported \
  --jdbc.bigquery.output.mode=append \
  --jdbc.bigquery.temp.bucket.name=my-staging-bucket
```

## Step 7: Hive to BigQuery Template

If you have data managed by the Hive Metastore, this template moves it to BigQuery:

```bash
# Move data from Hive tables to BigQuery
./bin/start.sh \
  --template=HIVETOBIGQUERY \
  --hive.bigquery.input.database=analytics_db \
  --hive.bigquery.input.table=user_events \
  --hive.bigquery.output.dataset=my_dataset \
  --hive.bigquery.output.table=user_events \
  --hive.bigquery.output.mode=overwrite \
  --hive.bigquery.temp.bucket.name=my-staging-bucket
```

## Customizing Templates

While the built-in templates handle many scenarios, sometimes you need small modifications. The templates are open source, so you can fork them and add custom logic.

For example, adding a custom transformation to the GCS to BigQuery template:

```python
# custom_gcs_to_bq.py - Extended GCS to BigQuery with custom transformations
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, when, current_timestamp

spark = SparkSession.builder.appName("CustomGCSToBQ").getOrCreate()

# Read source data
df = spark.read.parquet("gs://my-data-bucket/raw/events/")

# Apply custom transformations
transformed = df \
    .filter(col("event_type").isNotNull()) \
    .withColumn("processed_at", current_timestamp()) \
    .withColumn("is_conversion",
        when(col("event_type").isin("purchase", "signup"), True)
        .otherwise(False))

# Write to BigQuery
transformed.write.format("bigquery") \
    .option("table", "my-project.my_dataset.processed_events") \
    .option("temporaryGcsBucket", "my-staging-bucket") \
    .option("writeMethod", "direct") \
    .mode("overwrite") \
    .save()
```

## Scheduling Templates

For recurring ETL jobs, combine templates with Cloud Composer or Cloud Scheduler:

```bash
# Create a Cloud Scheduler job that triggers a template daily
gcloud scheduler jobs create http daily-gcs-to-bq \
  --location=us-central1 \
  --schedule="0 6 * * *" \
  --uri="https://dataproc.googleapis.com/v1/projects/my-project/locations/us-central1/batches" \
  --http-method=POST \
  --oauth-service-account-email=my-sa@my-project.iam.gserviceaccount.com \
  --message-body-from-file=batch_request.json
```

## Performance Tips

- **Increase parallelism** for large datasets by setting `spark.sql.shuffle.partitions` and executor configurations
- **Use pushdown filters** when reading from JDBC sources to avoid transferring unnecessary data
- **Choose the right output format** - Parquet is almost always the best choice for intermediate data
- **Set appropriate fetch sizes** for JDBC templates to balance memory usage and throughput

## Wrapping Up

Dataproc Templates eliminate the boilerplate of common ETL tasks. Instead of writing and maintaining custom Spark code for every data movement pattern, you configure a template and run it. For standard patterns like loading data from GCS to BigQuery or extracting from a relational database, these templates save significant development time. When you need more than what the templates offer, they serve as a solid starting point for custom implementations.

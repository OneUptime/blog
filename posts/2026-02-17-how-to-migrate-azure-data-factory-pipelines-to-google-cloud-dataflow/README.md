# How to Migrate Azure Data Factory Pipelines to Google Cloud Dataflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Azure Migration, Data Pipelines, ETL, Apache Beam

Description: A practical guide to migrating Azure Data Factory ETL pipelines to Google Cloud Dataflow using Apache Beam for batch and streaming workloads.

---

Azure Data Factory (ADF) and Google Cloud Dataflow serve related but different roles in the data pipeline world. ADF is an orchestration and ETL service with a visual pipeline designer and managed data movement. Dataflow is a fully managed Apache Beam runner that executes data processing pipelines. Migrating between them requires rethinking how your pipelines are structured, because the programming model is fundamentally different.

## Understanding the Conceptual Shift

ADF is an orchestration-first tool. You build pipelines by connecting activities - Copy Data, Data Flow, Stored Procedure, Web Activity, and so on. The pipeline definition describes what to do and in what order.

Dataflow is a processing-first tool. You write Apache Beam code that describes how to transform data. The pipeline is actual code - Python or Java - that reads from sources, applies transformations, and writes to sinks.

Here is how key ADF concepts map to GCP:

| Azure Data Factory | Google Cloud |
|-------------------|-------------|
| Pipeline | Dataflow job (or Cloud Composer DAG) |
| Copy Data activity | Dataflow read/write transforms |
| Data Flow (mapping) | Apache Beam PCollection transforms |
| Linked Service | Beam IO connectors |
| Trigger (schedule) | Cloud Scheduler + Cloud Composer |
| Integration Runtime | Dataflow worker VMs (managed) |
| Dataset | Beam PCollection |

An important distinction: ADF handles both orchestration and data movement. On GCP, you often split these. Cloud Composer (managed Airflow) handles orchestration, while Dataflow handles the actual data processing.

## Step 1: Categorize Your ADF Pipelines

Go through your ADF pipelines and group them:

**Simple copy pipelines** - These just move data from source A to sink B. These might not even need Dataflow. Cloud Data Fusion, BigQuery Data Transfer, or a simple Cloud Function might be simpler alternatives.

**Transformation pipelines** - These use Mapping Data Flows to reshape, aggregate, or join data. These are ideal candidates for Dataflow.

**Orchestration pipelines** - These chain multiple activities together (run a stored procedure, then copy data, then trigger another pipeline). These should be migrated to Cloud Composer.

## Step 2: Migrate Simple Copy Pipelines

For straightforward data movement, you have several options. Here is a Dataflow template that replaces a common ADF Copy Data activity:

```bash
# Use a Dataflow template for simple data movement
# This replaces an ADF Copy Data activity from Cloud Storage to BigQuery
gcloud dataflow jobs run copy-csv-to-bq \
    --gcs-location=gs://dataflow-templates/latest/GCS_Text_to_BigQuery \
    --region=us-central1 \
    --parameters \
inputFilePattern=gs://my-data-bucket/input/*.csv,\
JSONPath=gs://my-data-bucket/schemas/schema.json,\
outputTable=my-project:my_dataset.my_table,\
bigQueryLoadingTemporaryDirectory=gs://my-data-bucket/temp/
```

Google provides many pre-built Dataflow templates for common patterns like JDBC to BigQuery, Pub/Sub to BigQuery, and Cloud Storage file conversions.

## Step 3: Migrate Transformation Pipelines

ADF Mapping Data Flows get translated into Apache Beam pipelines. Here is an example migration.

Suppose your ADF Data Flow reads sales data from CSV, filters out records with zero amounts, aggregates by region, and writes to a database. Here is how that looks as an Apache Beam pipeline:

```python
# Apache Beam pipeline replacing an ADF Mapping Data Flow
# Reads CSV, filters, aggregates, and writes to BigQuery
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
import csv
from io import StringIO

def parse_csv_line(line):
    """Parse a single CSV line into a dictionary."""
    reader = csv.DictReader(StringIO(line), fieldnames=[
        'order_id', 'region', 'product', 'amount', 'date'
    ])
    return next(reader)

def filter_valid_sales(record):
    """Filter out records with zero or negative amounts."""
    try:
        return float(record['amount']) > 0
    except (ValueError, KeyError):
        return False

# Define pipeline options for Dataflow runner
options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--temp_location=gs://my-data-bucket/temp/',
    '--staging_location=gs://my-data-bucket/staging/'
])

# Build the pipeline - this replaces the entire ADF Data Flow
with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        # Read from Cloud Storage (replaces ADF Source)
        | 'ReadCSV' >> beam.io.ReadFromText(
            'gs://my-data-bucket/sales/*.csv',
            skip_header_lines=1
        )
        # Parse each line (replaces ADF Derived Column)
        | 'ParseLines' >> beam.Map(parse_csv_line)
        # Filter invalid records (replaces ADF Filter transformation)
        | 'FilterValid' >> beam.Filter(filter_valid_sales)
        # Convert amount to float for aggregation
        | 'PrepareForAgg' >> beam.Map(
            lambda r: (r['region'], float(r['amount']))
        )
        # Sum by region (replaces ADF Aggregate transformation)
        | 'SumByRegion' >> beam.CombinePerKey(sum)
        # Format for BigQuery output
        | 'FormatOutput' >> beam.Map(
            lambda kv: {'region': kv[0], 'total_sales': kv[1]}
        )
        # Write to BigQuery (replaces ADF Sink)
        | 'WriteToBQ' >> beam.io.WriteToBigQuery(
            'my-project:sales_dataset.regional_totals',
            schema='region:STRING,total_sales:FLOAT',
            write_disposition=beam.io.BigQueryDisposition.WRITE_TRUNCATE,
            create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED
        )
    )
```

## Step 4: Handle Incremental Loads

ADF pipelines often use watermarks or change tracking for incremental loading. In Dataflow, you handle this with windowing for streaming, or by reading watermark values from a metadata table for batch:

```python
# Incremental loading pattern - replaces ADF watermark-based loading
import apache_beam as beam
from google.cloud import bigquery

def get_last_watermark():
    """Read the last processed timestamp from a metadata table."""
    client = bigquery.Client()
    query = """
        SELECT MAX(last_processed) as watermark
        FROM my_dataset.pipeline_metadata
        WHERE pipeline_name = 'sales_pipeline'
    """
    result = list(client.query(query).result())
    return result[0].watermark if result[0].watermark else '1970-01-01'

def update_watermark(element):
    """Update the watermark after processing."""
    client = bigquery.Client()
    client.query(f"""
        MERGE my_dataset.pipeline_metadata t
        USING (SELECT 'sales_pipeline' as pipeline_name,
               CURRENT_TIMESTAMP() as last_processed) s
        ON t.pipeline_name = s.pipeline_name
        WHEN MATCHED THEN UPDATE SET last_processed = s.last_processed
        WHEN NOT MATCHED THEN INSERT VALUES (s.pipeline_name, s.last_processed)
    """).result()
    return element

watermark = get_last_watermark()

with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        # Read only new records since last watermark
        | 'ReadNew' >> beam.io.ReadFromBigQuery(
            query=f"""
                SELECT * FROM source_dataset.sales
                WHERE updated_at > '{watermark}'
            """,
            use_standard_sql=True
        )
        | 'Transform' >> beam.Map(lambda r: r)
        | 'Write' >> beam.io.WriteToBigQuery(
            'my-project:target_dataset.sales',
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND
        )
    )
```

## Step 5: Set Up Orchestration with Cloud Composer

For ADF pipelines that chain multiple activities, use Cloud Composer to orchestrate Dataflow jobs:

```python
# Cloud Composer DAG replacing an ADF orchestration pipeline
from airflow import DAG
from airflow.providers.google.cloud.operators.dataflow import (
    DataflowStartFlexTemplateOperator
)
from airflow.providers.google.cloud.operators.bigquery import (
    BigQueryInsertJobOperator
)
from datetime import datetime

# Define the DAG - equivalent to an ADF pipeline with multiple activities
dag = DAG(
    'sales_etl_pipeline',
    description='Migrated from ADF - daily sales processing',
    schedule_interval='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False
)

# Step 1: Run Dataflow job (replaces ADF Data Flow activity)
run_dataflow = DataflowStartFlexTemplateOperator(
    task_id='run_sales_transform',
    body={
        'launchParameter': {
            'jobName': 'sales-transform',
            'containerSpecGcsPath': 'gs://my-templates/sales-transform.json',
            'parameters': {
                'input': 'gs://my-data/sales/',
                'output': 'my-project:sales_dataset.processed'
            }
        }
    },
    location='us-central1',
    dag=dag
)

# Step 2: Run aggregation query (replaces ADF Stored Procedure activity)
run_aggregation = BigQueryInsertJobOperator(
    task_id='aggregate_sales',
    configuration={
        'query': {
            'query': """
                CREATE OR REPLACE TABLE sales_dataset.daily_summary AS
                SELECT DATE(sale_date) as day, SUM(amount) as total
                FROM sales_dataset.processed
                GROUP BY day
            """,
            'useLegacySql': False
        }
    },
    dag=dag
)

# Chain the tasks - equivalent to ADF activity dependencies
run_dataflow >> run_aggregation
```

## Step 6: Migrate Linked Services to Beam IO Connectors

ADF Linked Services define connections to data sources. In Beam, you use IO connectors. Here are common mappings:

- **Azure SQL Database** - Use `beam.io.ReadFromJdbc` with the SQL Server JDBC driver, or migrate the database to Cloud SQL and use the PostgreSQL connector
- **Azure Blob Storage** - Use `beam.io.ReadFromText` or `beam.io.ReadFromAvro` with `gs://` paths
- **Azure Cosmos DB** - Use HTTP-based Beam IO or migrate to Firestore
- **REST APIs** - Use custom `beam.DoFn` with the `requests` library

## Monitoring and Operations

ADF has built-in pipeline monitoring. For Dataflow, use:

```bash
# Check running Dataflow jobs
gcloud dataflow jobs list --region=us-central1 --status=active

# View job details and metrics
gcloud dataflow jobs describe JOB_ID --region=us-central1
```

Dataflow also integrates with Cloud Monitoring, so you can set up alerts on job failures, processing latency, and data freshness - similar to ADF alerts.

## Tips for a Smooth Migration

1. **Do not try to replicate ADF's visual model in code.** Embrace the code-first approach. It gives you much better testability and version control.

2. **Use Dataflow templates** for common patterns before writing custom Beam code.

3. **Test locally first.** Apache Beam has a DirectRunner that runs pipelines on your machine, making development much faster than deploying to Dataflow every time.

4. **Start with batch, then tackle streaming.** If you have ADF pipelines with tumbling window triggers, convert those to batch Dataflow jobs first, then consider streaming later.

The migration is not trivial, but the result is a more flexible, code-driven data platform that handles both batch and streaming workloads in a unified programming model.

# How to Configure Cloud Data Fusion Pipelines to Load Data into BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Data Fusion, BigQuery, ETL, Data Pipeline, Data Integration

Description: A practical guide to configuring Cloud Data Fusion pipelines that load data from various sources into BigQuery tables on Google Cloud Platform.

---

Loading data into BigQuery is one of the most common use cases for Cloud Data Fusion. Whether your source is a relational database, a set of files in Cloud Storage, or a streaming topic, Data Fusion gives you a visual pipeline builder that handles the plumbing so you can focus on the data. In this post, I will walk through the process of configuring a pipeline that pulls data from a source and lands it in BigQuery.

## Prerequisites

Before you start building, make sure you have:

- A Cloud Data Fusion instance running (Enterprise or Developer edition)
- A BigQuery dataset created where your tables will land
- The appropriate IAM permissions - your Data Fusion service account needs BigQuery Data Editor and BigQuery Job User roles
- Your source data accessible from the Data Fusion instance (network connectivity configured if using private instances)

## Creating a New Pipeline

Open your Cloud Data Fusion instance and click "Studio" in the left navigation. Select "Data Pipeline - Batch" to create a new batch pipeline. You will see a blank canvas where you can drag and drop nodes from the left panel.

The basic structure of a pipeline that loads data into BigQuery looks like this:

```mermaid
graph LR
    A[Source] --> B[Transform] --> C[BigQuery Sink]
```

## Configuring the Source

The source you choose depends on where your data lives. Cloud Data Fusion supports dozens of source plugins out of the box. Some of the most popular ones for BigQuery loading workflows include:

- **GCS** - for CSV, JSON, Avro, or Parquet files in Cloud Storage
- **Database** - for MySQL, PostgreSQL, SQL Server, or Oracle
- **BigQuery** - yes, you can read from one BigQuery table and write to another
- **Cloud Spanner** - for Spanner databases

Let's use a GCS source as our example. Drag the "GCS" source from the left panel onto the canvas. Click on it to configure:

```yaml
# GCS source configuration example
Reference Name: customer_data_source
Path: gs://my-data-bucket/customer_exports/
Format: csv
Delimiter: ","
Skip Header: true
```

Set the reference name to something descriptive. The path should point to your GCS location. If your files are CSV, set the format and delimiter accordingly. Enable "Skip Header" if your CSV files have a header row.

### Setting the Schema

Click "Get Schema" to let Data Fusion infer the schema from your data, or define it manually. For a CSV source, you will typically want to specify the schema explicitly to avoid type inference issues:

```json
// Define the schema with proper data types for each column
{
  "fields": [
    {"name": "customer_id", "type": "long"},
    {"name": "name", "type": "string"},
    {"name": "email", "type": "string"},
    {"name": "signup_date", "type": "string"},
    {"name": "total_spend", "type": "double"}
  ]
}
```

## Adding Transformations (Optional)

If your data needs cleaning or restructuring before loading into BigQuery, you can add transform nodes between the source and sink. The most commonly used transforms include:

- **Wrangler** - for interactive data cleansing using directives
- **JavaScript** - for custom transformation logic
- **Projection** - for renaming, dropping, or reordering fields

Drag a Wrangler transform onto the canvas and connect it between the source and sink. You can add directives like:

```
// Parse the signup_date string into a proper date format
parse-as-datetime signup_date "yyyy-MM-dd"

// Convert total_spend to a decimal type
set-type total_spend decimal

// Drop any rows where customer_id is null
filter-rows-on condition-if-matched customer_id =~ '^\s*$'
```

## Configuring the BigQuery Sink

Now for the main event - the BigQuery sink configuration. Drag the "BigQuery" sink from the left panel onto the canvas and connect it to your transform node (or directly to the source if no transforms are needed).

Click on the BigQuery sink to open its configuration panel. Here are the key settings:

### Basic Settings

```yaml
# BigQuery sink basic configuration
Reference Name: customer_data_bq_sink
Project: my-gcp-project
Dataset: analytics
Table: customers
```

The reference name is for tracking lineage. The project, dataset, and table specify exactly where the data will land in BigQuery.

### Table Creation and Update Settings

This is where you make important decisions about how the pipeline interacts with your BigQuery table:

**Create Table if Not Found** - Set this to "true" if you want Data Fusion to create the table on the first run. The table schema will match the output schema of the pipeline.

**Truncate Table** - Set to "true" if you want to replace all existing data on each pipeline run. This is useful for full-refresh loads.

**Update Table Schema** - Set to "true" if your source schema might change over time and you want BigQuery to automatically add new columns.

### Temporary Bucket

Cloud Data Fusion uses a temporary GCS bucket as a staging area when loading data into BigQuery. You need to specify this:

```yaml
# Staging configuration for the load job
Temporary Bucket Name: my-temp-staging-bucket
```

Make sure your Data Fusion service account has write access to this bucket. The data is written here temporarily and then loaded into BigQuery using a load job.

### Partitioning and Clustering

For large tables, configure partitioning to improve query performance and reduce costs:

```yaml
# Partitioning configuration
Partition Field: signup_date
Partition Type: TIME
Time Partitioning Type: DAY
Require Partition Filter: true
```

You can also add clustering fields:

```yaml
# Clustering helps with query performance on frequently filtered columns
Clustering Order: customer_id, email
```

### Schema Mapping

The BigQuery sink maps fields from the pipeline schema to BigQuery columns by name. If the names match, no additional configuration is needed. If you need to rename fields, add a Projection transform before the sink.

## Handling Different Load Patterns

### Full Refresh

For a full refresh pattern where you replace all data each time:

- Set "Truncate Table" to true on the BigQuery sink
- Schedule the pipeline to run at your desired frequency

### Incremental Loads

For incremental loads where you only process new or changed records:

- Use a source filter to select only records modified since the last run
- Set "Truncate Table" to false
- Consider using a merge key if you need upsert behavior

For the Database source, you can add a filter like:

```sql
-- Only select records modified since the last pipeline run
WHERE modified_date > '${runtime:logical.start.time}'
```

### Append-Only Loads

If you are simply appending new records without worrying about duplicates:

- Set "Truncate Table" to false
- Leave merge keys empty
- The pipeline will insert all records from the source

## Running and Testing the Pipeline

Before running the pipeline in production, use the "Preview" feature. Click the "Preview" button at the top of the Studio canvas. This runs the pipeline on a small sample of your data and shows you the output at each stage. Check that:

- The source is reading data correctly
- Transformations are producing expected results
- The output schema matches what BigQuery expects

Once preview looks good, deploy the pipeline by clicking "Deploy." Then run it by clicking the play button.

## Monitoring the Load

After the pipeline starts running, switch to the "Pipeline Runs" view to monitor progress. You will see:

- The status of each stage (running, completed, failed)
- Record counts at each node
- Any error messages if something went wrong

For the BigQuery sink specifically, check your BigQuery console to verify the data landed correctly. Run a quick count query to make sure the row counts match what the pipeline reported.

## Common Issues and Fixes

**Schema mismatch errors** - Make sure the output schema of your pipeline exactly matches the BigQuery table schema. Pay special attention to nullable fields and date/timestamp types.

**Permission denied on temporary bucket** - The Data Fusion service account needs storage.objects.create and storage.objects.delete on the staging bucket.

**Timeout on large loads** - If you are loading very large datasets, increase the pipeline timeout in the runtime arguments and consider breaking the load into smaller partitions.

**Duplicate records after incremental loads** - If you need deduplication, add a Deduplicate transform or use BigQuery merge statements post-load.

## Wrapping Up

Cloud Data Fusion makes the process of loading data into BigQuery straightforward, even for complex scenarios involving multiple sources and transformations. The key is getting your sink configuration right - especially the table creation settings, partitioning, and staging bucket. Start with a simple pipeline, verify it works with preview, and then add complexity as needed. Once you have a working pipeline, you can schedule it, add alerting, and build out more sophisticated data integration workflows on top of it.

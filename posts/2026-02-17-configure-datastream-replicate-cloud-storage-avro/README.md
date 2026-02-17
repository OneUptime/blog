# How to Configure Datastream to Replicate to Cloud Storage in Avro Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Datastream, Cloud Storage, Avro, CDC, Data Lake, BigQuery

Description: Learn how to configure Google Cloud Datastream to write CDC events to Cloud Storage in Avro format for flexible data lake architectures.

---

While Datastream's direct BigQuery integration is great for straightforward analytics, writing to Cloud Storage in Avro format gives you more flexibility. You can feed the data into multiple destinations, apply custom transformations with Dataflow, build a data lake on GCS, or use the files as input for Spark jobs on Dataproc. The Avro format preserves schema information and is compact, making it a solid choice for CDC event storage.

This guide covers the full setup, from configuring the Cloud Storage destination to understanding the file structure and integrating with downstream systems.

## Why Cloud Storage Instead of Direct BigQuery

There are several scenarios where Cloud Storage makes more sense as a Datastream destination:

**Multi-destination routing.** You need the same CDC data in BigQuery, Elasticsearch, and a Spark cluster. Writing to GCS once and reading from multiple consumers is more efficient than running separate streams.

**Custom transformation requirements.** Dataflow templates and custom Apache Beam pipelines read from GCS naturally. If you need PII masking, data enrichment, or complex joins before loading to BigQuery, the GCS intermediate step is the standard pattern.

**Cost optimization.** For high-volume CDC streams, GCS storage is cheaper than BigQuery streaming inserts. You can batch-load from GCS to BigQuery on a schedule instead of streaming.

**Compliance and archival.** GCS gives you fine-grained lifecycle policies, retention locks, and integration with Cloud DLP for scanning.

## Step 1: Set Up the Cloud Storage Bucket

Create a dedicated bucket for Datastream output:

```bash
# Create a regional bucket in the same region as your Datastream
gsutil mb -l us-central1 -c standard gs://my-project-cdc-events/

# Enable versioning for safety (optional but recommended)
gsutil versioning set on gs://my-project-cdc-events/

# Set a lifecycle policy to clean up old files after 30 days
cat > lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {
        "age": 30,
        "isLive": true
      }
    }
  ]
}
EOF

gsutil lifecycle set lifecycle.json gs://my-project-cdc-events/
```

## Step 2: Create the Cloud Storage Connection Profile

```bash
# Create a GCS connection profile
gcloud datastream connection-profiles create gcs-avro-dest \
  --display-name="GCS Avro Destination" \
  --type=google-cloud-storage \
  --gcs-bucket=my-project-cdc-events \
  --gcs-root-path=/cdc/ \
  --location=us-central1 \
  --project=my-project
```

The `gcs-root-path` is the prefix under which all CDC files will be written.

## Step 3: Create the Stream with Avro Output

Create the stream with Avro file format and configure the file rotation settings:

```bash
# Create the stream writing Avro to GCS
gcloud datastream streams create mysql-to-gcs-avro \
  --display-name="MySQL CDC to GCS Avro" \
  --location=us-central1 \
  --source=mysql-source-profile \
  --mysql-source-config='{
    "includeObjects": {
      "mysqlDatabases": [{
        "database": "production",
        "mysqlTables": [
          {"table": "orders"},
          {"table": "customers"},
          {"table": "products"},
          {"table": "order_items"}
        ]
      }]
    }
  }' \
  --destination=gcs-avro-dest \
  --gcs-destination-config='{
    "avroFileFormat": {},
    "fileRotation": {
      "intervalSeconds": "120",
      "maxFileSizeBytes": "104857600"
    },
    "path": "/cdc/"
  }' \
  --backfill-all \
  --project=my-project
```

The `fileRotation` settings are important:

- `intervalSeconds` - How often a new file is created, even if it is not full. Lower values mean lower latency but more files.
- `maxFileSizeBytes` - Maximum file size before rotation. 100 MB (104857600 bytes) is a good default.

## Step 4: Start the Stream

```bash
# Start the stream
gcloud datastream streams update mysql-to-gcs-avro \
  --location=us-central1 \
  --state=RUNNING \
  --project=my-project
```

## Understanding the File Structure

Datastream organizes files in GCS using a path structure that includes the database, schema, and table names:

```
gs://my-project-cdc-events/cdc/
  production/
    orders/
      2026/02/17/14/
        file_001.avro
        file_002.avro
      2026/02/17/15/
        file_003.avro
    customers/
      2026/02/17/14/
        file_001.avro
```

The path format is: `{root_path}/{database}/{table}/{year}/{month}/{day}/{hour}/`

Each Avro file contains CDC events for a single table, with metadata fields included alongside the table data.

## Avro Schema Structure

Each Avro file includes the full schema. Here is what a typical CDC event looks like when read from the Avro file:

```json
{
  "order_id": 12345,
  "customer_id": 678,
  "total_amount": "99.99",
  "order_status": "shipped",
  "created_at": 1739750400000000,
  "_metadata_stream": "projects/123/locations/us-central1/streams/mysql-to-gcs-avro",
  "_metadata_timestamp": 1739750460,
  "_metadata_read_timestamp": 1739750462,
  "_metadata_read_method": "mysql-cdc",
  "_metadata_source_type": "mysql",
  "_metadata_deleted": false,
  "_metadata_table": "orders",
  "_metadata_change_type": "INSERT",
  "_metadata_primary_keys": ["order_id"],
  "_metadata_schema": "production",
  "_metadata_log_file": "mysql-bin.000042",
  "_metadata_log_position": 12345678
}
```

## Reading Avro Files from GCS

You can read the Avro files in several ways depending on your use case.

Using Python with the `fastavro` library:

```python
import fastavro
from google.cloud import storage

def read_cdc_events(bucket_name, prefix):
    """Read CDC events from Avro files in GCS."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # List all Avro files under the prefix
    blobs = bucket.list_blobs(prefix=prefix)

    events = []
    for blob in blobs:
        if blob.name.endswith('.avro'):
            # Download and parse the Avro file
            content = blob.download_as_bytes()
            reader = fastavro.reader(io.BytesIO(content))

            for record in reader:
                events.append(record)
                # Process each CDC event
                print(f"Table: {record['_metadata_table']}, "
                      f"Type: {record['_metadata_change_type']}, "
                      f"Deleted: {record['_metadata_deleted']}")

    return events

# Read today's orders CDC events
import io
events = read_cdc_events(
    "my-project-cdc-events",
    "cdc/production/orders/2026/02/17/"
)
```

Using BigQuery external tables to query GCS Avro files directly:

```sql
-- Create an external table pointing to GCS Avro files
CREATE OR REPLACE EXTERNAL TABLE `my-project.staging.orders_cdc`
OPTIONS (
  format = 'AVRO',
  uris = ['gs://my-project-cdc-events/cdc/production/orders/*.avro']
);

-- Query the external table
SELECT
  order_id,
  total_amount,
  _metadata_change_type,
  _metadata_timestamp
FROM `my-project.staging.orders_cdc`
WHERE _metadata_deleted = false
ORDER BY _metadata_timestamp DESC
LIMIT 100;
```

## Loading from GCS to BigQuery

For batch loading from GCS to BigQuery, use a scheduled load job:

```bash
# Load the latest Avro files into BigQuery
bq load \
  --source_format=AVRO \
  --use_avro_logical_types \
  my-project:analytics.orders_staging \
  'gs://my-project-cdc-events/cdc/production/orders/2026/02/17/*.avro'
```

For automated loading, use a Cloud Function triggered by GCS notifications:

```python
from google.cloud import bigquery
import functions_framework

@functions_framework.cloud_event
def load_avro_to_bigquery(cloud_event):
    """Triggered by new Avro files in GCS, loads them to BigQuery."""
    data = cloud_event.data

    bucket = data["bucket"]
    file_name = data["name"]

    # Only process Avro files
    if not file_name.endswith('.avro'):
        return

    # Extract table name from the file path
    parts = file_name.split('/')
    # Path format: cdc/{database}/{table}/{year}/{month}/{day}/{hour}/file.avro
    table_name = parts[2] if len(parts) > 2 else 'unknown'

    client = bigquery.Client()

    # Configure the load job
    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.AVRO,
        use_avro_logical_types=True,
        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
    )

    uri = f"gs://{bucket}/{file_name}"
    table_ref = f"my-project.staging.{table_name}_cdc"

    # Start the load job
    load_job = client.load_table_from_uri(uri, table_ref, job_config=job_config)
    load_job.result()  # Wait for completion

    print(f"Loaded {file_name} to {table_ref}")
```

## Setting Up GCS Notifications

To trigger processing when new Avro files arrive:

```bash
# Create a Pub/Sub topic for GCS notifications
gcloud pubsub topics create cdc-file-notifications --project=my-project

# Set up object notifications for the bucket
gsutil notification create \
  -t cdc-file-notifications \
  -f json \
  -e OBJECT_FINALIZE \
  gs://my-project-cdc-events/
```

## Choosing Between Avro and JSON

Datastream also supports JSON output format. Here is how they compare:

| Feature | Avro | JSON |
|---------|------|------|
| File size | Smaller (binary + compression) | Larger (text-based) |
| Schema included | Yes, embedded in file | No |
| Read speed | Faster | Slower |
| Human readable | No | Yes |
| BigQuery compatibility | Native support | Native support |
| Spark compatibility | Native support | Native support |

For most production use cases, Avro is the better choice. Use JSON only when you need human-readable files for debugging or when downstream tools specifically require JSON.

## Wrapping Up

Writing Datastream CDC events to Cloud Storage in Avro format gives you a flexible data lake foundation. The files can feed into BigQuery, Dataflow, Dataproc, or any other system that reads Avro. The key configuration decisions are file rotation interval (balancing latency vs. file count) and lifecycle policies (balancing retention vs. storage costs). This pattern is especially powerful when you need to serve multiple consumers from a single CDC stream or when you need a transformation layer before data reaches its final destination.

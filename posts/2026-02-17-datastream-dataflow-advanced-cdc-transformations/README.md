# How to Use Datastream with Dataflow for Advanced CDC Transformations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Datastream, Dataflow, CDC, Apache Beam, BigQuery, Data Transformation

Description: Learn how to combine Google Cloud Datastream with Dataflow to apply advanced transformations to CDC data before loading it into BigQuery.

---

Datastream does a solid job of replicating data from source databases to BigQuery, but sometimes you need more than a straight copy. Maybe you need to mask PII fields, enrich records with reference data, flatten nested structures, or apply business logic before the data lands in your analytics tables. That is where Dataflow comes in.

By placing Dataflow between Datastream and BigQuery, you get a transformation layer that can handle anything from simple field renaming to complex multi-source joins. Google provides a template for this pattern, and you can customize it for your specific needs.

## The Architecture

Instead of Datastream writing directly to BigQuery, you configure it to write CDC events to Cloud Storage in Avro format. Dataflow reads these files, applies transformations, and writes the results to BigQuery.

```mermaid
graph LR
    A[Source Database] -->|CDC| B[Datastream]
    B -->|Avro Files| C[Cloud Storage]
    C --> D[Dataflow Pipeline]
    D -->|Transformed Data| E[BigQuery]
    D -->|Dead Letter| F[Error Table]
```

This pattern adds a small amount of latency (typically 1-5 minutes depending on configuration) but gives you full control over the data before it reaches BigQuery.

## Step 1: Configure Datastream to Write to Cloud Storage

First, set up a Cloud Storage bucket and configure Datastream to write there instead of directly to BigQuery.

```bash
# Create a bucket for Datastream output

gsutil mb -l us-central1 gs://my-project-datastream-staging/

# Create a Cloud Storage connection profile
gcloud datastream connection-profiles create gcs-staging-profile \
  --display-name="GCS Staging for CDC" \
  --type=google-cloud-storage \
  --bucket=my-project-datastream-staging \
  --root-path=/ \
  --location=us-central1 \
  --project=my-project
```

Now create the stream that writes to Cloud Storage:

```bash
cat > mysql_source_config.json <<'EOF'
{
  "includeObjects": {
    "mysqlDatabases": [{
      "database": "production",
      "mysqlTables": [
        {"table": "orders"},
        {"table": "customers"}
      ]
    }]
  }
}
EOF

cat > gcs_destination_config.json <<'EOF'
{
  "path": "/cdc-events/",
  "avroFileFormat": {},
  "fileRotationInterval": "60s",
  "fileRotationMb": 50
}
EOF

# Create the stream with GCS destination
gcloud datastream streams create mysql-to-gcs-stream \
  --display-name="MySQL CDC to Cloud Storage" \
  --location=us-central1 \
  --source=mysql-source-profile \
  --mysql-source-config=mysql_source_config.json \
  --destination=gcs-staging-profile \
  --gcs-destination-config=gcs_destination_config.json \
  --backfill-all \
  --project=my-project
```

The `fileRotationInterval` and `fileRotationMb` settings control how frequently Datastream creates new files. Shorter intervals mean lower latency but more files to process.

## Step 2: Use the Datastream to BigQuery Template

Google provides a Dataflow template specifically for processing Datastream CDC output. This template handles the CDC merge logic (inserts, updates, deletes) and can be extended with custom transforms.

```bash
# Launch the Datastream to BigQuery template
gcloud dataflow flex-template run datastream-to-bq-job \
  --project=my-project \
  --region=us-central1 \
  --enable-streaming-engine \
  --template-file-gcs-location=gs://dataflow-templates-us-central1/latest/flex/Cloud_Datastream_to_BigQuery \
  --parameters \
inputFileFormat=avro,\
inputFilePattern=gs://my-project-datastream-staging/cdc-events/,\
outputProjectId=my-project,\
outputStagingDatasetTemplate=staging,\
outputDatasetTemplate=analytics,\
outputStagingTableNameTemplate={_metadata_schema}_{_metadata_table}_staging,\
outputTableNameTemplate={_metadata_schema}_{_metadata_table},\
deadLetterQueueDirectory=gs://my-project-datastream-staging/dead-letter/,\
mergeFrequencyMinutes=5
```

## Step 3: Adding Custom Transformations

The template handles basic CDC operations, and it also supports user-defined functions for per-record transformations. Here is a Python UDF that masks and enriches Datastream records before the template writes them to BigQuery. If you add new fields such as `region`, make sure the destination table schema includes those fields because the UDF output must match the BigQuery destination schema.

```python
import json
import hashlib


REGION_MAP = {
    'US': 'North America',
    'CA': 'North America',
    'GB': 'Europe',
    'DE': 'Europe',
    'FR': 'Europe',
    'JP': 'Asia Pacific',
    'AU': 'Asia Pacific',
}


def transform_cdc_record(json_str):
    """Mask personally identifiable information and add region data."""
    record = json.loads(json_str)

    # Mask email addresses - keep domain but hash the local part
    if record.get('email'):
        parts = record['email'].split('@')
        if len(parts) == 2:
            digest = hashlib.sha256(parts[0].encode('utf-8')).hexdigest()[:12]
            record['email'] = f"{digest}@{parts[1]}"

    # Mask phone numbers - keep last 4 digits
    if record.get('phone'):
        record['phone'] = f"***-***-{record['phone'][-4:]}"

    # Add region information based on country code
    country = record.get('country_code', '')
    record['region'] = REGION_MAP.get(country, 'Other')

    return json.dumps(record)
```

Upload the file and add the UDF parameters when you launch the template:

```bash
gsutil cp transforms.py gs://my-project-datastream-staging/transforms.py

gcloud dataflow flex-template run datastream-to-bq-job \
  --project=my-project \
  --region=us-central1 \
  --enable-streaming-engine \
  --template-file-gcs-location=gs://dataflow-templates-us-central1/latest/flex/Cloud_Datastream_to_BigQuery \
  --parameters \
inputFileFormat=avro,\
inputFilePattern=gs://my-project-datastream-staging/cdc-events/,\
outputProjectId=my-project,\
outputStagingDatasetTemplate=staging,\
outputDatasetTemplate=analytics,\
outputStagingTableNameTemplate={_metadata_schema}_{_metadata_table}_staging,\
outputTableNameTemplate={_metadata_schema}_{_metadata_table},\
deadLetterQueueDirectory=gs://my-project-datastream-staging/dead-letter/,\
mergeFrequencyMinutes=5,\
pythonTextTransformGcsPath=gs://my-project-datastream-staging/transforms.py,\
pythonTextTransformFunctionName=transform_cdc_record
```

## Step 4: Handling the CDC Merge Logic

One of the trickiest parts of processing CDC data is applying the correct merge logic. When Datastream captures an update, you need to update the existing row in BigQuery, not just append a new one.

The Dataflow template handles this through a merge operation, but if you are writing a custom pipeline, you need to implement it yourself:

```python
import apache_beam as beam

class CDCMergeTransform(beam.DoFn):
    """Apply CDC merge logic to produce the current state of each record."""

    def __init__(self, primary_key_field):
        self.primary_key_field = primary_key_field

    def process(self, element, window=beam.DoFn.WindowParam):
        # Group events by primary key and take the latest one
        # This is a simplified version - production code should
        # handle ordering by source timestamp
        yield {
            'key': element[self.primary_key_field],
            'record': element,
            'timestamp': element.get('_metadata_source_timestamp', 0),
            'is_delete': element.get('_metadata_deleted', False),
        }
```

For a more robust approach in a custom pipeline, use BigQuery's MERGE statement in a scheduled query after the Dataflow pipeline appends new events:

```sql
-- Merge CDC events into the final table
MERGE `my-project.analytics.customers` AS target
USING (
  -- Get the latest version of each record from the staging table
  SELECT * EXCEPT(row_num)
  FROM (
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY customer_id
        ORDER BY _metadata_source_timestamp DESC
      ) AS row_num
    FROM `my-project.staging.customers_cdc`
    WHERE _metadata_source_timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  )
  WHERE row_num = 1
) AS source
ON target.customer_id = source.customer_id
WHEN MATCHED AND source._metadata_deleted = TRUE THEN
  DELETE
WHEN MATCHED THEN
  UPDATE SET
    target.name = source.name,
    target.email = source.email,
    target.updated_at = source._metadata_source_timestamp
WHEN NOT MATCHED AND source._metadata_deleted IS NOT TRUE THEN
  INSERT (customer_id, name, email, updated_at)
  VALUES (source.customer_id, source.name, source.email, source._metadata_source_timestamp)
```

## Notification-Based Processing

Instead of polling Cloud Storage for new files, use Pub/Sub notifications to trigger Dataflow processing:

```bash
# Create a Pub/Sub topic for GCS notifications
gcloud pubsub topics create datastream-file-notifications

# Set up GCS notifications
gcloud storage buckets notifications create gs://my-project-datastream-staging \
  --topic=datastream-file-notifications \
  --event-types=OBJECT_FINALIZE \
  --payload-format=json

# Create the subscription used by the Dataflow template
gcloud pubsub subscriptions create datastream-notifications \
  --topic=datastream-file-notifications
```

Your Dataflow pipeline can then subscribe to this topic and process files as they arrive, reducing latency.
For the Google-provided template, use `gcsPubSubSubscription=projects/my-project/subscriptions/datastream-notifications` instead of `inputFilePattern` when you launch the job.

## Monitoring the Combined Pipeline

With Datastream and Dataflow working together, you need to monitor both:

```bash
# Check Datastream stream status
gcloud datastream streams describe mysql-to-gcs-stream \
  --location=us-central1

# Check Dataflow job status
gcloud dataflow jobs list --region=us-central1 --status=active

# Check for dead letter records
gsutil ls gs://my-project-datastream-staging/dead-letter/
```

## Wrapping Up

Combining Datastream with Dataflow gives you the best of both worlds - managed CDC capture from Datastream and flexible data transformation from Dataflow. The pattern works well for PII masking, data enrichment, format conversion, and complex business logic. The trade-off is added complexity and slightly higher latency compared to Datastream's direct BigQuery integration. Use this pattern when your transformation requirements go beyond what BigQuery views and scheduled queries can handle.

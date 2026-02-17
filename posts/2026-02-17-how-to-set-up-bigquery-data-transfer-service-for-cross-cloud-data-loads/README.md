# How to Set Up BigQuery Data Transfer Service for Cross-Cloud Data Loads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Data Transfer Service, Cross-Cloud, Data Migration

Description: Learn how to configure BigQuery Data Transfer Service to load data from AWS S3, Azure Blob Storage, and other cloud sources into BigQuery on a schedule.

---

Moving data between cloud providers is one of those tasks that sounds straightforward until you actually do it. Between authentication, formatting, scheduling, and error handling, a simple data copy becomes a project of its own. The BigQuery Data Transfer Service simplifies this by giving you a managed, scheduled way to pull data from external sources into BigQuery.

I have used it extensively for pulling data from AWS S3, third-party SaaS platforms, and even other GCP services. Let me walk through how to set it up for cross-cloud data loads.

## What Is the BigQuery Data Transfer Service?

The Data Transfer Service is a managed service that automates data movement into BigQuery on a schedule. It supports several data sources out of the box:

- **Amazon S3**: Pull files from S3 buckets
- **Azure Blob Storage**: Load data from Azure
- **Cloud Storage**: Transfer from GCS (useful for cross-project)
- **Google Ads, Google Analytics, YouTube**: Marketing data
- **Teradata, Amazon Redshift**: Database migrations
- **Scheduled queries**: Run SQL on a schedule (covered in another post)

For cross-cloud scenarios, the Amazon S3 and Azure Blob Storage connectors are the most relevant.

## Setting Up S3 to BigQuery Transfer

Let me start with the most common scenario: loading data from an AWS S3 bucket into BigQuery.

### Step 1: Prepare Your S3 Bucket

Make sure your data is in a supported format (CSV, JSON, Avro, Parquet, or ORC) and organized in a predictable path structure.

```
s3://my-data-bucket/events/
  2026/02/17/events_001.parquet
  2026/02/17/events_002.parquet
  2026/02/18/events_001.parquet
```

### Step 2: Create AWS Credentials

The Data Transfer Service needs AWS credentials to access your S3 bucket. Create an IAM user in AWS with read-only access to the bucket.

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
                "arn:aws:s3:::my-data-bucket",
                "arn:aws:s3:::my-data-bucket/*"
            ]
        }
    ]
}
```

Generate an access key and secret key for this IAM user. You will need them when configuring the transfer.

### Step 3: Create the Transfer Configuration

Use the bq CLI to create the transfer.

```bash
# Create an S3 to BigQuery transfer
bq mk --transfer_config \
  --project_id=my_project \
  --data_source=amazon_s3 \
  --target_dataset=my_dataset \
  --display_name="Daily S3 Events Import" \
  --schedule="every day 08:00" \
  --params='{
    "destination_table_name_template": "events_from_s3",
    "data_path": "s3://my-data-bucket/events/{run_date|yyyyMMdd}/*.parquet",
    "access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "file_format": "PARQUET",
    "write_disposition": "APPEND"
  }'
```

The `{run_date|yyyyMMdd}` template dynamically resolves to the scheduled run date, so each run picks up only that day's files.

### Step 4: Create the Transfer via Terraform

For infrastructure-as-code management, use Terraform.

```hcl
# Terraform resource for S3 to BigQuery transfer
resource "google_bigquery_data_transfer_config" "s3_events" {
  display_name           = "Daily S3 Events Import"
  location               = "US"
  data_source_id         = "amazon_s3"
  schedule               = "every day 08:00"
  destination_dataset_id = google_bigquery_dataset.main.dataset_id

  params = {
    destination_table_name_template = "events_from_s3"
    data_path                       = "s3://my-data-bucket/events/{run_date|yyyyMMdd}/*.parquet"
    access_key_id                   = var.aws_access_key_id
    secret_access_key               = var.aws_secret_access_key
    file_format                     = "PARQUET"
    write_disposition               = "APPEND"
  }

  # Sensitive credentials should come from variables, not hardcoded
  sensitive_params {
    secret_access_key = var.aws_secret_access_key
  }
}
```

## Setting Up Azure Blob Storage to BigQuery Transfer

For Azure, the process is similar but uses Azure storage credentials.

```bash
# Create an Azure Blob Storage to BigQuery transfer
bq mk --transfer_config \
  --project_id=my_project \
  --data_source=azure_blob_storage \
  --target_dataset=my_dataset \
  --display_name="Daily Azure Events Import" \
  --schedule="every day 09:00" \
  --params='{
    "destination_table_name_template": "events_from_azure",
    "data_path": "https://mystorageaccount.blob.core.windows.net/mycontainer/events/{run_date|yyyy/MM/dd}/*.parquet",
    "storage_account": "mystorageaccount",
    "container": "mycontainer",
    "sas_token": "sv=2021-06-08&ss=b&srt=sco&sp=rl&se=2027-01-01T00:00:00Z&sig=EXAMPLE",
    "file_format": "PARQUET",
    "write_disposition": "APPEND"
  }'
```

Generate a SAS token in the Azure Portal with read and list permissions on the container.

## Configuring Write Dispositions

The write disposition controls how data is loaded into the destination table.

**APPEND**: New data is appended to the existing table. Best for incremental loads.

**WRITE_TRUNCATE**: The destination table is replaced with each transfer run. Best for full refresh scenarios.

**MIRROR**: Keeps the BigQuery table in sync with the source. Only works with certain source types.

```bash
# Full refresh transfer - replaces the table on each run
bq mk --transfer_config \
  --project_id=my_project \
  --data_source=amazon_s3 \
  --target_dataset=my_dataset \
  --display_name="Full Refresh S3 Products" \
  --schedule="every day 06:00" \
  --params='{
    "destination_table_name_template": "products",
    "data_path": "s3://my-data-bucket/products/latest/*.csv",
    "access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "file_format": "CSV",
    "field_delimiter": ",",
    "skip_leading_rows": "1",
    "write_disposition": "WRITE_TRUNCATE"
  }'
```

## Dynamic File Paths

Use template variables in your data path to handle date-partitioned source data.

```
# Available template variables:
# {run_time|yyyyMMddHH}  - Run timestamp with hour
# {run_date|yyyyMMdd}    - Run date
# {run_date|yyyy/MM/dd}  - Run date with slashes

# Example paths:
s3://bucket/data/{run_date|yyyy/MM/dd}/*.parquet
s3://bucket/data/dt={run_date|yyyyMMdd}/part-*.parquet
s3://bucket/hourly/{run_time|yyyyMMddHH}/*.json
```

## Monitoring Transfer Runs

Check the status of your transfer runs using the bq CLI.

```bash
# List all transfer configurations
bq ls --transfer_config \
  --transfer_location=us \
  --project_id=my_project

# List recent runs for a specific transfer
bq ls --transfer_run \
  --transfer_location=us \
  projects/my_project/locations/us/transferConfigs/abc123

# Get details of a specific run
bq show --transfer_run \
  projects/my_project/locations/us/transferConfigs/abc123/runs/xyz789
```

You can also monitor from SQL.

```sql
-- Check recent transfer job status
SELECT
  job_id,
  job_type,
  state,
  creation_time,
  end_time,
  TIMESTAMP_DIFF(end_time, start_time, SECOND) AS duration_seconds,
  total_bytes_processed,
  error_result
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE job_type = 'LOAD'
  AND creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY creation_time DESC;
```

## Setting Up Notifications

Configure notifications to get alerted when transfers succeed or fail.

```bash
# Set up Pub/Sub notifications for a transfer config
bq update --transfer_config \
  --transfer_config_id=projects/my_project/locations/us/transferConfigs/abc123 \
  --notification_pubsub_topic=projects/my_project/topics/transfer-alerts
```

Create a Cloud Function to process these notifications.

```python
# notification_handler.py - Process transfer notifications
import functions_framework
import json
import base64

@functions_framework.cloud_event
def handle_transfer_notification(cloud_event):
    """Process BigQuery Data Transfer Service notifications."""
    # Decode the Pub/Sub message
    data = base64.b64decode(cloud_event.data["message"]["data"]).decode()
    message = json.loads(data)

    transfer_name = message.get("name", "unknown")
    state = message.get("state", "unknown")

    if state == "FAILED":
        # Send alert via your preferred channel
        error = message.get("errorStatus", {}).get("message", "Unknown error")
        print(f"ALERT: Transfer {transfer_name} failed: {error}")
        # Send to Slack, PagerDuty, email, etc.
    elif state == "SUCCEEDED":
        print(f"Transfer {transfer_name} completed successfully")
```

## Backfilling Historical Data

When you first set up a transfer, you often need to load historical data. Use the backfill feature.

```bash
# Trigger a backfill for a date range
bq mk --transfer_run \
  --start_time='2026-01-01T00:00:00Z' \
  --end_time='2026-02-17T00:00:00Z' \
  --run_time='2026-02-17T08:00:00Z' \
  projects/my_project/locations/us/transferConfigs/abc123
```

## Handling Schema Evolution

When your source data schema changes, you need to handle it in BigQuery.

```bash
# Update the transfer to allow new fields
bq mk --transfer_config \
  --project_id=my_project \
  --data_source=amazon_s3 \
  --target_dataset=my_dataset \
  --display_name="S3 Events with Schema Detection" \
  --params='{
    "destination_table_name_template": "events_evolving",
    "data_path": "s3://my-data-bucket/events/latest/*.parquet",
    "access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "file_format": "PARQUET",
    "write_disposition": "APPEND"
  }'
```

Parquet and Avro files carry their schema, so new columns are automatically added to the BigQuery table when the transfer runs.

## Wrapping Up

The BigQuery Data Transfer Service makes cross-cloud data movement straightforward and reliable. Set up the transfer once, configure the schedule, and let GCP handle the rest. For production setups, always configure notifications and monitor transfer health regularly. The combination of scheduled transfers with proper alerting gives you a hands-off data pipeline that just works.

For comprehensive monitoring across your cross-cloud data infrastructure, [OneUptime](https://oneuptime.com) can help you track transfer status, data freshness, and pipeline health from a single dashboard.

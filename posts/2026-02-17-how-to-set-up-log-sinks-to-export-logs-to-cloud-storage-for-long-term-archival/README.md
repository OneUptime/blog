# How to Set Up Log Sinks to Export Logs to Cloud Storage for Long-Term Archival

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Cloud Storage, Log Archival, Compliance

Description: Learn how to create Cloud Logging sinks that export logs to Cloud Storage for cost-effective long-term archival and compliance requirements.

---

Many organizations need to retain logs for years - whether for regulatory compliance, security auditing, or forensic analysis. Cloud Logging's default retention of 30 days is not enough for these use cases. Cloud Storage, on the other hand, offers cheap, durable storage that can keep your logs for as long as you need them.

In this post, I will show you how to set up log sinks that export logs to Cloud Storage, including bucket configuration, lifecycle policies, and cost optimization strategies.

## Why Cloud Storage for Log Archival?

Compared to other log export destinations in GCP, Cloud Storage stands out for archival because:

- **Lowest cost**: Standard storage costs around $0.020 per GB/month. Nearline, Coldline, and Archive storage classes go even lower.
- **Lifecycle policies**: Automatically transition logs to cheaper storage classes or delete them after a retention period.
- **Compliance-friendly**: Object locks and retention policies prevent logs from being deleted prematurely.
- **Familiar format**: Exported logs are stored as JSON files, which any tool can read.

## Step 1: Create a Cloud Storage Bucket

Create a bucket specifically for log archival:

```bash
# Create a storage bucket for log archival
gcloud storage buckets create gs://my-project-log-archive \
  --location=US \
  --default-storage-class=STANDARD \
  --uniform-bucket-level-access \
  --public-access-prevention=enforced
```

The `--uniform-bucket-level-access` flag ensures consistent IAM-based access control, and `--public-access-prevention` prevents accidental public exposure of your logs.

## Step 2: Configure Lifecycle Policies

Lifecycle policies automatically manage storage costs by transitioning objects to cheaper storage classes and eventually deleting them.

Create a lifecycle configuration file:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 30
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 90
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "ARCHIVE"
        },
        "condition": {
          "age": 365
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 2555
        }
      }
    ]
  }
}
```

Apply it:

```bash
# Apply lifecycle rules to the log archive bucket
gcloud storage buckets update gs://my-project-log-archive \
  --lifecycle-file=lifecycle.json
```

This configuration moves logs through progressively cheaper storage classes:
- 0-30 days: Standard storage (frequent access during active investigation)
- 30-90 days: Nearline (accessed once a month or less)
- 90-365 days: Coldline (accessed once a quarter or less)
- 1-7 years: Archive (accessed less than once a year)
- After 7 years: Deleted

## Step 3: Create the Log Sink

Now create a sink that exports logs to the bucket:

```bash
# Create a log sink to export all logs to Cloud Storage
gcloud logging sinks create archive-all-logs \
  storage.googleapis.com/my-project-log-archive \
  --project=my-project
```

For a more targeted export:

```bash
# Export only audit logs and error-level logs
gcloud logging sinks create archive-important-logs \
  storage.googleapis.com/my-project-log-archive \
  --log-filter='logName:"cloudaudit.googleapis.com" OR severity>=ERROR' \
  --project=my-project
```

## Step 4: Grant Permissions

The sink's service account needs write access to the bucket:

```bash
# Get the sink's writer identity
WRITER=$(gcloud logging sinks describe archive-all-logs \
  --project=my-project \
  --format='value(writerIdentity)')

# Grant Object Creator role on the bucket
gcloud storage buckets add-iam-policy-binding gs://my-project-log-archive \
  --member="$WRITER" \
  --role="roles/storage.objectCreator"
```

## Understanding the Export Format

Cloud Logging exports logs to Cloud Storage as JSON files organized by date. The file structure looks like this:

```
gs://my-project-log-archive/
  syslog/2026/02/17/
    08:00:00_08:59:59_S0.json
    09:00:00_09:59:59_S0.json
  cloudaudit.googleapis.com%2Factivity/2026/02/17/
    08:00:00_08:59:59_S0.json
```

Each file contains newline-delimited JSON (one log entry per line). Files are batched by the hour and organized into directories by log name and date.

## Setting Up Retention Policies for Compliance

If regulatory requirements mandate that logs cannot be deleted before a certain period, use bucket retention policies:

```bash
# Set a 7-year retention policy on the bucket
gcloud storage buckets update gs://my-project-log-archive \
  --retention-period=220752000s
```

The retention period is in seconds. 220,752,000 seconds is approximately 7 years.

Once set, you can lock the retention policy to make it permanent (cannot be reduced or removed):

```bash
# Lock the retention policy - this is permanent and irreversible
gcloud storage buckets update gs://my-project-log-archive \
  --lock-retention-period
```

Be careful with locking - once locked, you cannot shorten the retention period or delete the bucket until all objects have met their retention requirements.

## Cost Optimization Strategies

### Filter What You Archive

Do not archive everything unless you have to. System health check logs, debug-level output, and other noisy logs rarely need long-term retention:

```bash
# Export everything except debug logs and health checks
gcloud logging sinks create archive-filtered-logs \
  storage.googleapis.com/my-project-log-archive \
  --log-filter='severity>=INFO AND NOT httpRequest.requestUrl="/healthz" AND NOT httpRequest.requestUrl="/readyz"' \
  --project=my-project
```

### Use the Right Storage Class

If you never plan to access old logs unless there is an incident, start with Nearline or Coldline:

```bash
# Create a bucket with Coldline as the default storage class
gcloud storage buckets create gs://my-project-cold-archive \
  --location=US \
  --default-storage-class=COLDLINE \
  --uniform-bucket-level-access
```

### Estimated Cost Comparison

Here is a rough comparison for storing 1 TB of logs per month:

| Storage Class | Monthly Cost per TB | Best For |
|---------------|--------------------| ---------|
| Standard | ~$20 | Logs accessed frequently |
| Nearline | ~$10 | Logs accessed monthly |
| Coldline | ~$4 | Logs accessed quarterly |
| Archive | ~$1.20 | Logs rarely accessed |

The savings from using Archive class over Standard are substantial when storing years of logs.

## Terraform Configuration

Here is the complete Terraform setup:

```hcl
# Cloud Storage bucket for log archival
resource "google_storage_bucket" "log_archive" {
  name     = "${var.project_id}-log-archive"
  location = "US"

  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Lifecycle rules for cost optimization
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 30
    }
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 90
    }
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
    condition {
      age = 365
    }
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 2555  # 7 years
    }
  }

  # Optional: retention policy for compliance
  retention_policy {
    retention_period = 220752000  # 7 years in seconds
    is_locked        = false      # Set to true after verifying
  }
}

# Log sink to Cloud Storage
resource "google_logging_project_sink" "archive" {
  name                   = "archive-all-logs"
  destination            = "storage.googleapis.com/${google_storage_bucket.log_archive.name}"
  filter                 = "severity>=INFO"
  unique_writer_identity = true
}

# Grant the sink's service account write access
resource "google_storage_bucket_iam_member" "log_writer" {
  bucket = google_storage_bucket.log_archive.name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.archive.writer_identity
}
```

## Reading Archived Logs

When you need to access archived logs, you have several options:

### Direct Download

```bash
# List log files for a specific date
gcloud storage ls gs://my-project-log-archive/syslog/2026/02/17/

# Download a specific log file
gcloud storage cp gs://my-project-log-archive/syslog/2026/02/17/08:00:00_08:59:59_S0.json .
```

### Query with BigQuery External Tables

You can query Cloud Storage logs directly from BigQuery without importing them:

```sql
-- Create an external table pointing to archived logs
CREATE EXTERNAL TABLE `my-project.logs.archived_logs`
OPTIONS (
  format = 'JSON',
  uris = ['gs://my-project-log-archive/syslog/2026/02/17/*.json']
);

-- Query the external table
SELECT timestamp, severity, textPayload
FROM `my-project.logs.archived_logs`
WHERE severity = 'ERROR';
```

## Wrapping Up

Cloud Storage is the most cost-effective destination for long-term log archival in GCP. With lifecycle policies managing storage class transitions and retention policies ensuring compliance, you can keep years of logs without breaking the budget. The setup is simple - create a bucket, create a sink, grant permissions - and the ongoing cost is minimal, especially once logs age into Archive storage class.

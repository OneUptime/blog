# How to Create GCP Logging Sinks with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Logging, Log Sinks, Observability, Infrastructure as Code

Description: Learn how to create and manage Google Cloud Logging sinks and log routers using Terraform to export logs to BigQuery, Cloud Storage, and Pub/Sub.

---

Google Cloud generates a lot of logs. Every API call, every resource change, every application log entry flows through Cloud Logging. By default, logs are stored for 30 days (or 400 days for admin activity audit logs) and then they are gone. If you need logs for longer retention, compliance, or analysis in external tools, you need log sinks.

Log sinks route copies of your logs to destinations like BigQuery, Cloud Storage, Pub/Sub, or another Cloud Logging bucket. Terraform makes it straightforward to define these routing rules as code, ensuring they are consistent across projects and environments.

## How Log Sinks Work

A log sink has three parts:
- A **filter** that selects which logs to export
- A **destination** where the logs are sent
- A **writer identity** - a service account that GCP creates automatically to write to the destination

The writer identity needs permissions on the destination. This is a common source of errors - you create the sink and the destination but forget the IAM binding in between.

## Sink to BigQuery

BigQuery is the most popular destination for log analysis. Each log entry becomes a row in a BigQuery table, which means you can query your logs with SQL.

```hcl
# BigQuery dataset for log storage
resource "google_bigquery_dataset" "logs" {
  dataset_id  = "cloud_logs"
  project     = var.project_id
  location    = var.region
  description = "Exported cloud logs for analysis"

  # Set default table expiration to 90 days
  default_table_expiration_ms = 7776000000

  labels = {
    environment = var.environment
    purpose     = "logging"
  }
}

# Log sink that exports to BigQuery
resource "google_logging_project_sink" "bigquery_sink" {
  name    = "bigquery-log-sink"
  project = var.project_id

  # Destination is the BigQuery dataset
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.logs.dataset_id}"

  # Filter to select which logs to export
  # This example exports all audit logs and HTTP load balancer logs
  filter = <<-EOT
    logName:"cloudaudit.googleapis.com" OR
    resource.type="http_load_balancer"
  EOT

  # Use partitioned tables for better query performance and cost
  bigquery_options {
    use_partitioned_tables = true
  }

  # Create a unique writer identity
  unique_writer_identity = true
}

# Grant the sink's writer identity access to the BigQuery dataset
resource "google_bigquery_dataset_iam_member" "sink_writer" {
  dataset_id = google_bigquery_dataset.logs.dataset_id
  project    = var.project_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_project_sink.bigquery_sink.writer_identity
}
```

## Sink to Cloud Storage

Cloud Storage is ideal for long-term archival of logs. It is cheaper than BigQuery for storage and works well with lifecycle policies.

```hcl
# GCS bucket for log archival
resource "google_storage_bucket" "log_archive" {
  name          = "${var.project_id}-log-archive"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  uniform_bucket_level_access = true

  # Move to cheaper storage classes over time
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  # Delete after 7 years for compliance
  lifecycle_rule {
    condition {
      age = 2555
    }
    action {
      type = "Delete"
    }
  }
}

# Log sink to Cloud Storage
resource "google_logging_project_sink" "gcs_sink" {
  name    = "gcs-log-archive"
  project = var.project_id

  destination = "storage.googleapis.com/${google_storage_bucket.log_archive.name}"

  # Export everything
  filter = ""

  unique_writer_identity = true
}

# Grant write access to the bucket
resource "google_storage_bucket_iam_member" "sink_writer" {
  bucket = google_storage_bucket.log_archive.name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.gcs_sink.writer_identity
}
```

## Sink to Pub/Sub

Pub/Sub sinks are useful when you want to process logs in real time - for example, sending security-relevant logs to a SIEM or triggering alerts.

```hcl
# Pub/Sub topic for log streaming
resource "google_pubsub_topic" "security_logs" {
  name    = "security-log-events"
  project = var.project_id

  labels = {
    purpose = "security-logging"
  }
}

# Subscription for the SIEM to consume
resource "google_pubsub_subscription" "siem_subscription" {
  name    = "siem-log-subscription"
  topic   = google_pubsub_topic.security_logs.id
  project = var.project_id

  # Acknowledge deadline
  ack_deadline_seconds = 60

  # Retain messages for 7 days if the subscriber falls behind
  message_retention_duration = "604800s"

  # Retry policy
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

# Log sink for security events to Pub/Sub
resource "google_logging_project_sink" "pubsub_security_sink" {
  name    = "pubsub-security-sink"
  project = var.project_id

  destination = "pubsub.googleapis.com/${google_pubsub_topic.security_logs.id}"

  # Only export security-relevant logs
  filter = <<-EOT
    protoPayload.methodName:"SetIamPolicy" OR
    protoPayload.methodName:"CreateServiceAccount" OR
    protoPayload.methodName:"DeleteServiceAccount" OR
    protoPayload.methodName:"CreateServiceAccountKey" OR
    protoPayload.methodName:"DisableServiceAccount" OR
    protoPayload.serviceName="login.googleapis.com"
  EOT

  unique_writer_identity = true
}

# Grant the sink permission to publish to the topic
resource "google_pubsub_topic_iam_member" "sink_publisher" {
  topic   = google_pubsub_topic.security_logs.id
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = google_logging_project_sink.pubsub_security_sink.writer_identity
}
```

## Organization-Level Sinks

For centralized logging across all projects, create an organization-level sink. This captures logs from every project in the organization.

```hcl
# Organization-level sink for centralized audit logging
resource "google_logging_organization_sink" "org_audit_sink" {
  name     = "org-audit-log-sink"
  org_id   = var.org_id

  destination = "bigquery.googleapis.com/projects/${var.logging_project_id}/datasets/${var.audit_dataset_id}"

  # Only audit logs
  filter = "logName:\"cloudaudit.googleapis.com\""

  # Include logs from all child resources
  include_children = true

  bigquery_options {
    use_partitioned_tables = true
  }
}

# Grant the org sink writer identity access to the destination
resource "google_bigquery_dataset_iam_member" "org_sink_writer" {
  dataset_id = var.audit_dataset_id
  project    = var.logging_project_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_organization_sink.org_audit_sink.writer_identity
}
```

## Folder-Level Sinks

If your organization has folders for different teams or business units, folder-level sinks let you aggregate logs for a subset of projects.

```hcl
# Folder-level sink
resource "google_logging_folder_sink" "team_sink" {
  name   = "team-log-sink"
  folder = var.team_folder_id

  destination = "storage.googleapis.com/${var.team_log_bucket}"

  filter           = ""
  include_children = true
}

# Grant access for the folder sink
resource "google_storage_bucket_iam_member" "folder_sink_writer" {
  bucket = var.team_log_bucket
  role   = "roles/storage.objectCreator"
  member = google_logging_folder_sink.team_sink.writer_identity
}
```

## Exclusion Filters

Sometimes you want to reduce log volume by excluding certain logs. Exclusion filters prevent logs from being stored in Cloud Logging (and therefore reduce costs).

```hcl
# Exclude noisy health check logs
resource "google_logging_project_exclusion" "health_check_exclusion" {
  name    = "exclude-health-checks"
  project = var.project_id

  description = "Exclude load balancer health check logs to reduce noise"

  # Filter matches logs that will be EXCLUDED
  filter = <<-EOT
    resource.type="http_load_balancer" AND
    httpRequest.requestUrl="/health" AND
    httpRequest.status=200
  EOT
}

# Exclude GKE system component logs
resource "google_logging_project_exclusion" "gke_system_exclusion" {
  name    = "exclude-gke-system"
  project = var.project_id

  description = "Exclude verbose GKE system component logs"

  filter = <<-EOT
    resource.type="k8s_container" AND
    resource.labels.namespace_name="kube-system" AND
    severity<="INFO"
  EOT
}
```

## Custom Log Buckets

Cloud Logging also supports custom log buckets with configurable retention periods.

```hcl
# Custom log bucket with extended retention
resource "google_logging_project_bucket_config" "extended_retention" {
  project        = var.project_id
  location       = var.region
  bucket_id      = "extended-audit-logs"
  description    = "Audit logs with 1 year retention"
  retention_days = 365
}

# Sink to the custom log bucket
resource "google_logging_project_sink" "custom_bucket_sink" {
  name    = "custom-bucket-audit-sink"
  project = var.project_id

  destination = "logging.googleapis.com/projects/${var.project_id}/locations/${var.region}/buckets/${google_logging_project_bucket_config.extended_retention.bucket_id}"

  filter = "logName:\"cloudaudit.googleapis.com\""

  unique_writer_identity = true
}
```

## Writing Effective Filters

Log filters use the Cloud Logging query language. Here are some patterns that come up frequently:

```hcl
# All error logs from a specific service
# filter = "resource.type=\"cloud_run_revision\" AND severity>=ERROR"

# Specific log name
# filter = "logName=\"projects/my-project/logs/my-application\""

# Combining conditions
# filter = "resource.type=\"gce_instance\" AND severity>=WARNING AND resource.labels.zone=\"us-central1-a\""

# Excluding specific entries
# filter = "resource.type=\"http_load_balancer\" AND NOT httpRequest.requestUrl:\"/health\""
```

## Conclusion

Log sinks are essential for compliance, security analysis, and operational visibility. Terraform makes it easy to define consistent logging infrastructure across projects - the same sink configurations, the same filters, the same destinations. The key things to remember are: always set `unique_writer_identity = true`, always grant the writer identity access to the destination, and use partitioned tables when exporting to BigQuery. With these pieces in place, you have a solid foundation for log management on GCP.

For related topics, check out our guide on [creating GCP monitoring alert policies with Terraform](https://oneuptime.com/blog/post/2026-02-17-how-to-create-cloud-monitoring-alerting-policies-and-notification-channels-with-terraform/view).

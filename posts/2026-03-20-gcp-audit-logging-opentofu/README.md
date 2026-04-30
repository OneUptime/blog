# How to Set Up GCP Audit Logging with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Audit Logging, Cloud Audit Logs, Compliance, Infrastructure as Code

Description: Learn how to configure GCP Cloud Audit Logs with OpenTofu to capture admin activity, data access, and system events across your Google Cloud projects for compliance and security monitoring.

GCP Cloud Audit Logs record who did what, where, and when across your Google Cloud resources. Admin Activity logs are always enabled, and System Event logs are also always written. Data Access logs (which capture reads and data manipulation) usually must be explicitly enabled, except for BigQuery Data Access logs, which are enabled by default. Managing audit log configuration in OpenTofu ensures consistent coverage across projects.

## Provider Configuration

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

## Enable Data Access Audit Logs

```hcl
# Enable Data Access audit log permission types for all services at the project level

resource "google_project_iam_audit_config" "all_services" {
  project = var.project_id
  service = "allServices"  # Apply to all Google Cloud services

  audit_log_config {
    log_type = "ADMIN_READ"   # Reads of configuration or metadata that require ADMIN_READ permissions
  }

  audit_log_config {
    log_type = "DATA_READ"    # Data reads (Storage reads, BigQuery queries)
  }

  audit_log_config {
    log_type = "DATA_WRITE"   # Data writes (Storage uploads, BigQuery inserts)
  }
}
```

## Service-Specific Audit Logging

```hcl
# Enable granular audit logs for Cloud Storage
resource "google_project_iam_audit_config" "storage" {
  project = var.project_id
  service = "storage.googleapis.com"

  audit_log_config {
    log_type = "DATA_READ"
    # Exempt service accounts from data read logging to reduce noise
    exempted_members = [
      "serviceAccount:backup-sa@${var.project_id}.iam.gserviceaccount.com",
    ]
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Configure service-level audit logging for BigQuery
resource "google_project_iam_audit_config" "bigquery" {
  project = var.project_id
  service = "bigquery.googleapis.com"

  audit_log_config {
    log_type = "ADMIN_READ"  # Required for some BigQuery services, such as Reservations
  }

  audit_log_config {
    log_type = "DATA_READ"   # BigQuery Data Access logs are enabled by default
  }

  audit_log_config {
    log_type = "DATA_WRITE"  # Table creation, DML operations
  }
}

# Enable audit logs for Secret Manager
resource "google_project_iam_audit_config" "secret_manager" {
  project = var.project_id
  service = "secretmanager.googleapis.com"

  audit_log_config {
    log_type = "ADMIN_READ"
  }

  audit_log_config {
    log_type = "DATA_READ"   # Secret access events
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }
}
```

## Organization-Level Audit Log Configuration

```hcl
# Apply audit log config at the organization level
resource "google_organization_iam_audit_config" "org" {
  org_id  = var.org_id
  service = "allServices"

  audit_log_config {
    log_type = "ADMIN_READ"
  }

  audit_log_config {
    log_type = "DATA_READ"
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }
}
```

## Export Audit Logs to Cloud Storage

```hcl
resource "google_storage_bucket" "audit_logs" {
  name          = "audit-logs-${var.project_id}"
  location      = "US"
  force_destroy = false

  uniform_bucket_level_access = true

  retention_policy {
    is_locked        = true   # Compliance lock - cannot be removed
    retention_period = 31536000  # 1 year in seconds
  }

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
}

# Log sink to export admin activity and data access logs
resource "google_logging_project_sink" "audit_to_gcs" {
  name        = "audit-logs-to-gcs"
  destination = "storage.googleapis.com/${google_storage_bucket.audit_logs.name}"

  filter = <<-EOT
    logName=("projects/${var.project_id}/logs/cloudaudit.googleapis.com%2Factivity"
    OR "projects/${var.project_id}/logs/cloudaudit.googleapis.com%2Fdata_access")
  EOT

  unique_writer_identity = true
}

# Grant the sink's service account write access to the bucket
resource "google_storage_bucket_iam_member" "audit_sink_writer" {
  bucket = google_storage_bucket.audit_logs.name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.audit_to_gcs.writer_identity
}
```

## Alert on Sensitive Audit Events

```hcl
# Alert on IAM policy changes
resource "google_logging_metric" "iam_policy_changes" {
  name   = "iam-policy-changes"
  filter = <<-EOT
    log_id("cloudaudit.googleapis.com/activity")
    protoPayload.methodName:"SetIamPolicy"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Security Email"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

resource "google_monitoring_alert_policy" "iam_policy_change" {
  display_name = "IAM Policy Changed"
  combiner     = "OR"

  conditions {
    display_name = "IAM policy change detected"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.iam_policy_changes.name}\""
      duration        = "0s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    auto_close = "1800s"
  }
}
```

## Conclusion

GCP Cloud Audit Logs in OpenTofu provide comprehensive visibility into who accessed and changed your cloud resources. Admin Activity and System Event logs are always on; explicitly enable Data Access logs for services with sensitive data like Cloud Storage and Secret Manager, while BigQuery Data Access logs are enabled by default. Export audit logs to Cloud Storage with retention locks for compliance archival, and create log-based metrics with alerting for critical security events like IAM policy changes.

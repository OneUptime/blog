# How to Configure Comprehensive Audit Log Collection and Retention Across a GCP Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Audit Logs, Cloud Logging, Compliance, Security

Description: Configure organization-wide audit log collection and long-term retention in Google Cloud for compliance, forensics, and security monitoring.

---

Every action in Google Cloud generates an audit log entry. The problem is not generating these logs - GCP does that automatically for admin activities. The problem is making sure you are collecting everything you need, storing it for the right amount of time, and actually being able to search through it when something goes wrong.

In this post, I will walk through setting up a comprehensive audit log collection strategy across an entire GCP organization, including the tricky parts like Data Access logs that are not enabled by default, long-term retention for compliance, and making the data queryable.

## Understanding GCP Audit Log Types

Google Cloud produces four types of audit logs:

- **Admin Activity** - Always on, cannot be disabled. Records configuration changes like creating VMs, modifying IAM policies, or changing firewall rules. Free to collect and store.
- **Data Access** - Not enabled by default. Records when data is read or written. This includes things like reading a Cloud Storage object or querying BigQuery. Can generate a lot of volume and may cost money to store.
- **System Event** - Always on, cannot be configured. Records GCP system actions like live migration events.
- **Policy Denied** - Records when access is denied by VPC Service Controls or Organization Policies.

The gap most organizations have is Data Access logs. Without them, you know who changed your infrastructure but not who read your data.

## Enabling Data Access Logs Organization-Wide

Enable Data Access logs at the organization level so every project inherits the configuration:

```hcl
# org-audit-config.tf
# Enable Data Access audit logs across the entire organization

# Enable for all services (broad coverage)
resource "google_organization_iam_audit_config" "all_services" {
  org_id  = var.org_id
  service = "allServices"

  # Log admin read operations
  audit_log_config {
    log_type = "ADMIN_READ"
  }

  # Log data write operations (who modified data)
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Enable DATA_READ for specific sensitive services
# We do not enable DATA_READ for allServices because of volume
resource "google_organization_iam_audit_config" "bigquery" {
  org_id  = var.org_id
  service = "bigquery.googleapis.com"

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

resource "google_organization_iam_audit_config" "cloud_storage" {
  org_id  = var.org_id
  service = "storage.googleapis.com"

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

resource "google_organization_iam_audit_config" "cloud_sql" {
  org_id  = var.org_id
  service = "cloudsql.googleapis.com"

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

resource "google_organization_iam_audit_config" "secret_manager" {
  org_id  = var.org_id
  service = "secretmanager.googleapis.com"

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

resource "google_organization_iam_audit_config" "iam" {
  org_id  = var.org_id
  service = "iam.googleapis.com"

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

## Setting Up Centralized Log Sinks

Create organization-level log sinks that capture audit logs from every project and route them to centralized storage:

```hcl
# log-sinks.tf
# Organization-level log sinks for centralized audit log collection

# Sink to BigQuery for interactive analysis (short-term)
resource "google_logging_organization_sink" "audit_to_bigquery" {
  name             = "org-audit-logs-to-bigquery"
  org_id           = var.org_id
  destination      = "bigquery.googleapis.com/projects/${var.security_project_id}/datasets/${google_bigquery_dataset.audit_logs.dataset_id}"
  include_children = true

  # Capture all audit logs
  filter = "logName:\"logs/cloudaudit.googleapis.com\""
}

# Sink to Cloud Storage for long-term retention (compliance)
resource "google_logging_organization_sink" "audit_to_gcs" {
  name             = "org-audit-logs-to-gcs"
  org_id           = var.org_id
  destination      = "storage.googleapis.com/${google_storage_bucket.audit_archive.name}"
  include_children = true

  filter = "logName:\"logs/cloudaudit.googleapis.com\""
}

# Sink to Pub/Sub for real-time security monitoring
resource "google_logging_organization_sink" "audit_to_pubsub" {
  name             = "org-audit-logs-to-pubsub"
  org_id           = var.org_id
  destination      = "pubsub.googleapis.com/projects/${var.security_project_id}/topics/${google_pubsub_topic.audit_events.name}"
  include_children = true

  # Only send security-relevant events to Pub/Sub
  filter = <<-EOT
    logName:"logs/cloudaudit.googleapis.com"
    AND (
      protoPayload.methodName:"SetIamPolicy"
      OR protoPayload.methodName:"CreateServiceAccount"
      OR protoPayload.methodName:"CreateServiceAccountKey"
      OR protoPayload.methodName:"insert" resource.type="gce_firewall_rule"
      OR protoPayload.methodName:"delete"
      OR severity >= "WARNING"
    )
  EOT
}

# Grant the sink service accounts write access
resource "google_bigquery_dataset_iam_member" "sink_writer_bq" {
  dataset_id = google_bigquery_dataset.audit_logs.dataset_id
  project    = var.security_project_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_organization_sink.audit_to_bigquery.writer_identity
}

resource "google_storage_bucket_iam_member" "sink_writer_gcs" {
  bucket = google_storage_bucket.audit_archive.name
  role   = "roles/storage.objectCreator"
  member = google_logging_organization_sink.audit_to_gcs.writer_identity
}

resource "google_pubsub_topic_iam_member" "sink_writer_pubsub" {
  project = var.security_project_id
  topic   = google_pubsub_topic.audit_events.name
  role    = "roles/pubsub.publisher"
  member  = google_logging_organization_sink.audit_to_pubsub.writer_identity
}
```

## Storage Configuration for Long-Term Retention

Set up the storage backend with appropriate retention policies:

```hcl
# storage.tf
# Storage infrastructure for audit log retention

# BigQuery dataset for interactive queries (90 day retention)
resource "google_bigquery_dataset" "audit_logs" {
  dataset_id    = "org_audit_logs"
  project       = var.security_project_id
  location      = var.region
  friendly_name = "Organization Audit Logs"

  # Keep 90 days in BigQuery for active analysis
  default_table_expiration_ms = 7776000000  # 90 days

  # Restrict access to security team only
  access {
    role          = "READER"
    group_by_email = var.security_team_group
  }

  access {
    role          = "WRITER"
    special_group = "projectWriters"
  }
}

# GCS bucket for long-term compliance retention
resource "google_storage_bucket" "audit_archive" {
  name          = "${var.security_project_id}-audit-archive"
  project       = var.security_project_id
  location      = var.region
  force_destroy = false

  # Enforce retention - logs cannot be deleted for 7 years
  retention_policy {
    is_locked        = true
    retention_period = 220752000  # 7 years in seconds
  }

  # Lifecycle: move to coldline after 90 days, archive after 1 year
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

  # Encrypt with CMEK
  encryption {
    default_kms_key_name = google_kms_crypto_key.audit_key.id
  }

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning {
    enabled = true
  }
}

# Pub/Sub topic for real-time event streaming
resource "google_pubsub_topic" "audit_events" {
  name    = "org-audit-events"
  project = var.security_project_id

  # Keep messages for 7 days for replay
  message_retention_duration = "604800s"
}
```

## Querying Audit Logs in BigQuery

With logs flowing into BigQuery, here are some useful queries for security monitoring:

```sql
-- Track all IAM policy changes across the organization
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS actor,
  resource.labels.project_id AS project,
  protopayload_auditlog.methodName AS method,
  protopayload_auditlog.resourceName AS resource_changed
FROM `security-project.org_audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  protopayload_auditlog.methodName LIKE '%SetIamPolicy%'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
ORDER BY timestamp DESC
LIMIT 100;
```

```sql
-- Find all service account key creation events
-- Key creation outside of Terraform is a red flag
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS creator,
  protopayload_auditlog.resourceName AS service_account,
  protopayload_auditlog.requestMetadata.callerIp AS source_ip,
  resource.labels.project_id AS project
FROM `security-project.org_audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  protopayload_auditlog.methodName = 'google.iam.admin.v1.CreateServiceAccountKey'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
ORDER BY timestamp DESC;
```

```sql
-- Identify unusual after-hours activity
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS actor,
  COUNT(*) AS action_count,
  MIN(timestamp) AS first_action,
  MAX(timestamp) AS last_action,
  ARRAY_AGG(DISTINCT protopayload_auditlog.methodName LIMIT 10) AS methods
FROM `security-project.org_audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  AND EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/New_York') NOT BETWEEN 8 AND 18
  AND EXTRACT(DAYOFWEEK FROM timestamp) NOT IN (1, 7)
GROUP BY actor
HAVING action_count > 10
ORDER BY action_count DESC;
```

## Monitoring Log Collection Health

Make sure your log pipeline is actually working by monitoring for gaps:

```hcl
# monitoring.tf
# Alert if audit log collection stops working

resource "google_monitoring_alert_policy" "log_gap_alert" {
  display_name = "Audit Log Collection Gap Detected"
  project      = var.security_project_id

  conditions {
    display_name = "No audit logs received in 30 minutes"
    condition_absent {
      filter   = "resource.type=\"bigquery_dataset\" AND metric.type=\"logging.googleapis.com/exports/byte_count\""
      duration = "1800s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  notification_channels = var.security_notification_channels
  alert_strategy {
    auto_close = "3600s"
  }
}
```

## Wrapping Up

Comprehensive audit log collection is one of those things that seems boring until you actually need it. When a security incident happens, or when an auditor asks for evidence, having complete, immutable, and queryable logs is the difference between a fast resolution and weeks of uncertainty. Set up the org-level sinks, enable Data Access logs for your sensitive services, lock the retention policies, and test your queries before you need them in an emergency. Future you will be grateful.

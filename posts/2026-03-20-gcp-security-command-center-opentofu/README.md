# How to Set Up GCP Security Command Center with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Security Command Center, OpenTofu, Security, Compliance, Threat Detection

Description: Learn how to configure GCP Security Command Center with OpenTofu to enable continuous security monitoring, threat detection, and vulnerability scanning across GCP resources.

## Overview

GCP Security Command Center (SCC) is a risk dashboard and threat intelligence platform for GCP. It discovers misconfigurations, vulnerabilities, and threats across GCP resources. After SCC is activated for your organization, OpenTofu can manage notification configurations, Security Health Analytics custom modules, custom sources, and BigQuery exports.

## Step 1: Enable Security Command Center

Security Command Center activation is completed in the Google Cloud console. After SCC is activated, enable the APIs that the OpenTofu resources use.

```hcl
resource "google_project_service" "securitycenter_api" {
  project            = var.project_id
  service            = "securitycenter.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "securitycentermanagement_api" {
  project            = var.project_id
  service            = "securitycentermanagement.googleapis.com"
  disable_on_destroy = false
}
```

## Step 2: Configure Notification for High-Severity Findings

```hcl
# Create Pub/Sub topic for SCC findings
resource "google_pubsub_topic" "scc_findings" {
  project = var.project_id
  name    = "security-command-center-findings"
}

# SCC notification configuration
resource "google_scc_v2_organization_notification_config" "high_severity_alerts" {
  config_id    = "high-severity-findings"
  organization = var.org_id
  location     = "global"
  description  = "Notify on HIGH and CRITICAL severity findings"
  pubsub_topic = google_pubsub_topic.scc_findings.id

  streaming_config {
    # Filter for critical and high severity findings that are active
    filter = "(severity = \"HIGH\" OR severity = \"CRITICAL\") AND state = \"ACTIVE\""
  }

  depends_on = [google_project_service.securitycenter_api]
}

resource "google_pubsub_topic_iam_member" "scc_notification_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.scc_findings.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_scc_v2_organization_notification_config.high_severity_alerts.service_account}"
}
```

## Step 3: Configure a Security Health Analytics Custom Module

```hcl
resource "google_scc_management_organization_security_health_analytics_custom_module" "kms_rotation_check" {
  organization     = var.org_id
  location         = "global"
  display_name     = "kms_rotation_period_check"
  enablement_state = "ENABLED"

  custom_config {
    predicate {
      expression = "resource.rotationPeriod > duration(\"2592000s\")"
    }
    resource_selector {
      resource_types = ["cloudkms.googleapis.com/CryptoKey"]
    }
    severity       = "MEDIUM"
    description    = "The rotation period of the identified CryptoKey exceeds 30 days."
    recommendation = "Set the rotation period to 30 days or less."
  }

  depends_on = [google_project_service.securitycentermanagement_api]
}
```

## Step 4: Export Findings to BigQuery

```hcl
# BigQuery dataset for SCC findings analysis
resource "google_bigquery_dataset" "scc_exports" {
  project     = var.project_id
  dataset_id  = "security_command_center_exports"
  location    = "US"
  description = "SCC findings exported for analysis and compliance reporting"
}

# BigQuery export for long-term findings storage and analysis
resource "google_scc_v2_organization_scc_big_query_export" "bq_export" {
  big_query_export_id = "bq-findings-export"
  organization        = var.org_id
  location            = "global"
  dataset             = google_bigquery_dataset.scc_exports.id
  description         = "Export active SCC findings to BigQuery"
  filter              = "state = \"ACTIVE\""

  depends_on = [google_project_service.securitycenter_api]
}

resource "google_bigquery_dataset_iam_member" "scc_export_writer" {
  project    = var.project_id
  dataset_id = google_bigquery_dataset.scc_exports.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_scc_v2_organization_scc_big_query_export.bq_export.principal}"
}
```

## Step 5: Create a Custom Source and Grant Permissions

```hcl
resource "google_scc_v2_organization_source" "custom_source" {
  display_name = "Custom Security Scanner"
  organization = var.org_id
  description  = "Custom security findings source for application-level checks"

  depends_on = [google_project_service.securitycenter_api]
}

resource "google_scc_v2_organization_source_iam_member" "source_admin" {
  source = google_scc_v2_organization_source.custom_source.name
  role   = "roles/securitycenter.findingsEditor"
  member = "serviceAccount:${var.security_scanner_service_account_email}"
}
```

## Step 6: Outputs

```hcl
output "scc_notification_config" {
  value       = google_scc_v2_organization_notification_config.high_severity_alerts.name
  description = "SCC notification configuration for findings"
}

output "findings_pubsub_topic" {
  value = google_pubsub_topic.scc_findings.id
}
```

## Summary

GCP Security Command Center with OpenTofu provides continuous security posture monitoring across your GCP organization. Notification configurations route high-severity findings to Pub/Sub for real-time alerting, BigQuery exports enable compliance reporting, and Security Health Analytics custom modules add organization-specific misconfiguration checks.

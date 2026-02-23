# How to Create GCP Logging Exclusion Filters in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Logging, Cost Optimization, Infrastructure as Code

Description: Learn how to create Google Cloud Logging exclusion filters using Terraform to reduce logging costs by filtering out unnecessary log entries.

---

Google Cloud Logging can generate enormous volumes of log data, leading to significant costs. Logging exclusion filters let you prevent specific log entries from being ingested into Cloud Logging while still allowing them to be exported to other destinations if needed. This guide shows you how to manage exclusion filters with Terraform.

## Setting Up the Provider

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
}

variable "project_id" { type = string }
```

## Excluding Health Check Logs

Health check logs are typically the highest volume and lowest value:

```hcl
# Exclude load balancer health check logs
resource "google_logging_project_exclusion" "health_checks" {
  name        = "exclude-health-checks"
  description = "Exclude load balancer health check log entries"
  filter      = "resource.type=\"http_load_balancer\" AND httpRequest.requestUrl:\"/health\" OR httpRequest.requestUrl:\"/healthz\" OR httpRequest.requestUrl:\"/ready\""
}
```

## Excluding Debug Logs

```hcl
# Exclude debug-level logs from all resources
resource "google_logging_project_exclusion" "debug_logs" {
  name        = "exclude-debug-logs"
  description = "Exclude debug severity logs"
  filter      = "severity = DEBUG"
}

# Exclude verbose application logs
resource "google_logging_project_exclusion" "verbose_app_logs" {
  name        = "exclude-verbose-app-logs"
  description = "Exclude verbose application logging"
  filter      = "resource.type=\"k8s_container\" AND jsonPayload.level=\"TRACE\""
}
```

## Excluding Specific Resource Logs

```hcl
# Exclude logs from non-production namespaces
resource "google_logging_project_exclusion" "non_prod_k8s" {
  name        = "exclude-dev-namespace-logs"
  description = "Exclude logs from development Kubernetes namespaces"
  filter      = "resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"development\""
}

# Exclude GKE system component verbose logs
resource "google_logging_project_exclusion" "gke_system" {
  name        = "exclude-gke-system-verbose"
  description = "Exclude verbose GKE system component logs"
  filter      = "resource.type=\"k8s_container\" AND resource.labels.namespace_name=\"kube-system\" AND severity < WARNING"
}
```

## Partial Exclusions (Sampling)

You can exclude a percentage of matching logs instead of all of them:

```hcl
# Exclude 90% of successful request logs (keep 10% for sampling)
resource "google_logging_project_exclusion" "sample_success_logs" {
  name        = "sample-success-requests"
  description = "Keep only 10% of successful request logs"
  filter      = "resource.type=\"http_load_balancer\" AND httpRequest.status>=200 AND httpRequest.status<300"

  # Exclude 90% (sample 10%)
  disabled = false
}
```

## Organization-Level Exclusions

```hcl
# Create exclusion at the organization level
resource "google_logging_organization_exclusion" "org_debug" {
  name        = "org-exclude-debug"
  org_id      = var.organization_id
  description = "Exclude debug logs across the organization"
  filter      = "severity = DEBUG"
}

variable "organization_id" { type = string }
```

## Folder-Level Exclusions

```hcl
# Create exclusion at the folder level
resource "google_logging_folder_exclusion" "folder_verbose" {
  name        = "folder-exclude-verbose"
  folder      = var.folder_id
  description = "Exclude verbose logs for all projects in this folder"
  filter      = "severity < INFO"
}

variable "folder_id" { type = string }
```

## Exclusions with Log Sinks (Export Before Exclude)

```hcl
# First, export logs to BigQuery for long-term analysis
resource "google_logging_project_sink" "bigquery_all" {
  name                   = "all-logs-to-bigquery"
  destination            = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.logs.dataset_id}"
  filter                 = ""
  unique_writer_identity = true
}

resource "google_bigquery_dataset" "logs" {
  dataset_id = "all_logs"
  location   = "US"
}

# Grant the sink writer access to BigQuery
resource "google_bigquery_dataset_iam_member" "logs_writer" {
  dataset_id = google_bigquery_dataset.logs.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_project_sink.bigquery_all.writer_identity
}

# Then exclude from Cloud Logging (but they still go to BigQuery)
resource "google_logging_project_exclusion" "exclude_after_export" {
  name        = "exclude-verbose-after-export"
  description = "Exclude verbose logs from Cloud Logging (already exported to BigQuery)"
  filter      = "severity < WARNING AND resource.type!=\"gce_instance\""

  depends_on = [google_logging_project_sink.bigquery_all]
}
```

## Dynamic Exclusion Management

```hcl
variable "exclusions" {
  type = map(object({
    description = string
    filter      = string
    disabled    = bool
  }))
  default = {
    "health-checks" = {
      description = "Exclude health check logs"
      filter      = "httpRequest.requestUrl:\"/health\""
      disabled    = false
    }
    "debug-logs" = {
      description = "Exclude debug logs"
      filter      = "severity = DEBUG"
      disabled    = false
    }
    "audit-temp-disable" = {
      description = "Temporarily disabled exclusion for troubleshooting"
      filter      = "resource.type=\"cloud_function\" AND severity < WARNING"
      disabled    = true
    }
  }
}

resource "google_logging_project_exclusion" "dynamic" {
  for_each    = var.exclusions
  name        = each.key
  description = each.value.description
  filter      = each.value.filter
  disabled    = each.value.disabled
}
```

## Best Practices

Always export logs to a cheaper destination like BigQuery or Cloud Storage before excluding them from Cloud Logging. Start with the highest-volume, lowest-value logs like health checks and debug messages. Use the disabled flag to temporarily turn off exclusions during troubleshooting without deleting the configuration. Test exclusion filters in the Logs Explorer before applying them. Monitor your logging costs before and after applying exclusions to measure the impact. Never exclude security-relevant logs without exporting them first.

For creating metrics from the logs you keep, see our guide on [GCP Logging metrics](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-logging-metrics-in-terraform/view).

## Conclusion

GCP Logging exclusion filters managed through Terraform help you control logging costs while maintaining the observability you need. By strategically excluding high-volume, low-value logs and combining exclusions with export sinks, you get the best of both worlds: cost efficiency and comprehensive log retention. Terraform makes it easy to manage these exclusions consistently across projects, folders, and your entire organization.

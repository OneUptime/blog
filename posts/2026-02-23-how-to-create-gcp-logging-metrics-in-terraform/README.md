# How to Create GCP Logging Metrics in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Logging, Metrics, Monitoring, Infrastructure as Code

Description: Learn how to create Google Cloud log-based metrics using Terraform to transform log entries into quantifiable metrics for alerting and dashboards.

---

Google Cloud log-based metrics let you extract numeric data from your log entries, creating custom metrics that can be used in dashboards and alert policies. This bridges the gap between logging and monitoring. This guide shows you how to create and use log-based metrics with Terraform.

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

## Counter Metrics

```hcl
# Count error log entries
resource "google_logging_metric" "error_count" {
  name        = "error-log-count"
  description = "Count of error-level log entries"
  filter      = "severity >= ERROR"

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key         = "resource_type"
      value_type  = "STRING"
      description = "Type of resource that generated the error"
    }
  }

  label_extractors = {
    "resource_type" = "EXTRACT(resource.type)"
  }
}

# Count specific application errors
resource "google_logging_metric" "app_errors" {
  name        = "application-errors"
  description = "Count of application-specific errors"
  filter      = "resource.type=\"k8s_container\" AND jsonPayload.level=\"ERROR\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key         = "namespace"
      value_type  = "STRING"
      description = "Kubernetes namespace"
    }
  }

  label_extractors = {
    "namespace" = "EXTRACT(resource.labels.namespace_name)"
  }
}
```

## Distribution Metrics

```hcl
# Extract response times as a distribution metric
resource "google_logging_metric" "response_time" {
  name        = "api-response-time"
  description = "Distribution of API response times from logs"
  filter      = "resource.type=\"k8s_container\" AND jsonPayload.type=\"http_request\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "DISTRIBUTION"
    labels {
      key         = "endpoint"
      value_type  = "STRING"
      description = "API endpoint path"
    }
  }

  value_extractor = "EXTRACT(jsonPayload.duration_ms)"

  bucket_options {
    explicit_buckets {
      bounds = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    }
  }

  label_extractors = {
    "endpoint" = "EXTRACT(jsonPayload.path)"
  }
}
```

## Security Metrics

```hcl
# Count IAM policy changes
resource "google_logging_metric" "iam_changes" {
  name        = "iam-policy-changes"
  description = "Count of IAM policy modifications"
  filter      = "protoPayload.methodName=\"SetIamPolicy\" OR protoPayload.methodName=\"google.iam.admin.v1.CreateRole\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

# Count failed authentication attempts
resource "google_logging_metric" "auth_failures" {
  name        = "authentication-failures"
  description = "Count of failed authentication attempts"
  filter      = "protoPayload.status.code=7 AND protoPayload.authenticationInfo.principalEmail!=\"\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key         = "principal"
      value_type  = "STRING"
    }
  }

  label_extractors = {
    "principal" = "EXTRACT(protoPayload.authenticationInfo.principalEmail)"
  }
}
```

## Creating Alerts on Log-Based Metrics

```hcl
# Alert on high error rate
resource "google_monitoring_alert_policy" "high_errors" {
  display_name = "High Error Log Rate"
  combiner     = "OR"

  conditions {
    display_name = "Error count exceeds threshold"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.error_count.name}\" resource.type=\"global\""
      comparison      = "COMPARISON_GT"
      threshold_value = 100
      duration        = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  notification_channels = [var.notification_channel_id]
}

variable "notification_channel_id" {
  type = string
}
```

## Batch Metric Creation

```hcl
variable "log_metrics" {
  type = map(object({
    description = string
    filter      = string
  }))
  default = {
    "http-500" = {
      description = "HTTP 500 errors"
      filter      = "httpRequest.status=500"
    }
    "timeout" = {
      description = "Request timeouts"
      filter      = "textPayload:\"timeout\" OR jsonPayload.error:\"timeout\""
    }
    "oom-killed" = {
      description = "Out of memory kills"
      filter      = "textPayload:\"OOMKilled\""
    }
  }
}

resource "google_logging_metric" "batch" {
  for_each    = var.log_metrics
  name        = each.key
  description = each.value.description
  filter      = each.value.filter

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}
```

## Kubernetes-Specific Log Metrics

For GKE environments, log-based metrics help track container lifecycle events:

```hcl
# Track container restarts
resource "google_logging_metric" "container_restarts" {
  name        = "container-restart-count"
  description = "Count of container restarts in Kubernetes"
  filter      = "resource.type=\"k8s_container\" AND jsonPayload.message:\"restarted\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key         = "container_name"
      value_type  = "STRING"
    }
    labels {
      key         = "namespace"
      value_type  = "STRING"
    }
  }

  label_extractors = {
    "container_name" = "EXTRACT(resource.labels.container_name)"
    "namespace"      = "EXTRACT(resource.labels.namespace_name)"
  }
}

# Track pod scheduling failures
resource "google_logging_metric" "scheduling_failures" {
  name        = "pod-scheduling-failures"
  description = "Count of pod scheduling failures"
  filter      = "resource.type=\"k8s_cluster\" AND jsonPayload.reason=\"FailedScheduling\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

# Track node NotReady events
resource "google_logging_metric" "node_not_ready" {
  name        = "node-not-ready-events"
  description = "Count of node NotReady events"
  filter      = "resource.type=\"k8s_node\" AND jsonPayload.reason=\"NodeNotReady\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key        = "node_name"
      value_type = "STRING"
    }
  }

  label_extractors = {
    "node_name" = "EXTRACT(resource.labels.node_name)"
  }
}
```

## Best Practices

Write specific log filters to avoid counting unrelated entries. Use labels to add dimensions to your metrics for more granular analysis. Use distribution metrics for latency and size measurements rather than averages. Create alerts on all security-related log metrics with short evaluation windows. Test your filters in the Logs Explorer before adding them to Terraform to verify they match the expected entries.

For controlling log volume, see our guide on [GCP Logging exclusion filters](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-logging-exclusion-filters-in-terraform/view).

## Conclusion

GCP log-based metrics in Terraform transform your log data into actionable monitoring signals. By extracting counts, distributions, and labeled metrics from log entries, you bridge the gap between logging and monitoring, enabling alerts and dashboards based on the full richness of your log data.

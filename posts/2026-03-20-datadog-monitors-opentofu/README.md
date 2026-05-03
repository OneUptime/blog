# How to Create Monitors with OpenTofu on Datadog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Datadog, Infrastructure as Code, IaC, Monitor, Alerting

Description: Learn how to create Datadog metric, log, and APM monitors with notification channels using OpenTofu.

## Introduction

Datadog monitors are alerting rules that notify your team when metrics cross thresholds or anomalies are detected. Managing monitors as code with OpenTofu ensures consistent alerting configurations across environments and enables peer review for alerting changes.

## Prerequisites

- OpenTofu v1.6+
- Datadog API key and Application key
- The `DataDog/datadog` OpenTofu provider

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.39"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}
```

## Metric Alert Monitor

```hcl
# monitors.tf

# High CPU usage monitor

resource "datadog_monitor" "cpu_high" {
  name    = "[${var.environment}] High CPU Usage"
  type    = "metric alert"
  message = <<-EOT
    CPU usage on {{host.name}} is above threshold.
    Current value: {{value}}%

    Notify: @slack-alerts-${var.environment}
  EOT

  query = "avg(last_5m):avg:system.cpu.user{env:${var.environment}} by {host} > 90"

  monitor_thresholds {
    critical = 90
    warning  = 80
  }

  notify_no_data    = false
  renotify_interval = 60
  include_tags      = true

  tags = ["env:${var.environment}", "team:platform", "managed-by:opentofu"]
}
```

## APM Latency Monitor

```hcl
resource "datadog_monitor" "api_latency" {
  name    = "[${var.environment}] High API Latency (p99 > 1s)"
  type    = "metric alert"
  message = "API P99 latency is above 1s for {{service.name}}. @pagerduty-${var.environment}"

  query = "avg(last_10m):p99:trace.web.request{env:${var.environment}} by {service} > 1"

  monitor_thresholds {
    critical = 1       # 1 second
    warning  = 0.5     # 500ms
  }

  notify_no_data    = true
  no_data_timeframe = 10

  tags = ["env:${var.environment}", "team:backend", "managed-by:opentofu"]
}
```

## Error Rate Monitor

```hcl
resource "datadog_monitor" "error_rate" {
  name    = "[${var.environment}] High Error Rate"
  type    = "metric alert"
  message = "Error rate is above 1% for {{service.name}}. Notify: @slack-oncall-${var.environment}"

  # Error rate = errors / total requests * 100
  query = "sum(last_5m):100 * sum:trace.web.request.errors{env:${var.environment}} by {service}.as_rate() / sum:trace.web.request.hits{env:${var.environment}} by {service}.as_rate() > 5"

  monitor_thresholds {
    critical = 5    # 5% error rate
    warning  = 1    # 1% error rate
  }

  tags = ["env:${var.environment}", "managed-by:opentofu"]
}
```

## Log Error Monitor

```hcl
resource "datadog_monitor" "log_errors" {
  name    = "[${var.environment}] Spike in Log Errors"
  type    = "log alert"
  message = "High number of error logs detected. Check the logs dashboard."

  query = "logs(\"env:${var.environment} status:error\").index(\"main\").rollup(\"count\").last(\"5m\") > 100"

  monitor_thresholds {
    critical = 100
    warning  = 50
  }

  enable_logs_sample = true  # Include sample logs in the alert

  tags = ["env:${var.environment}", "managed-by:opentofu"]
}
```

## Outputs

```hcl
output "cpu_monitor_id" {
  value = datadog_monitor.cpu_high.id
}
```

## Deploy

```bash
export DD_API_KEY="your-datadog-api-key"
export DD_APP_KEY="your-datadog-app-key"

tofu init
tofu apply
```

## Conclusion

Datadog monitors managed with OpenTofu bring consistency and auditability to your alerting setup. Define `monitor_thresholds` for both `critical` and `warning` levels, include `{{host.name}}` and `{{value}}` template variables in `message` for actionable alerts, and tag monitors with `env:${var.environment}` for easy filtering. Use `notify_no_data = true` for critical services where missing data itself indicates an outage.

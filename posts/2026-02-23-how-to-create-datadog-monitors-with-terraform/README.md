# How to Create Datadog Monitors with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Datadog, Monitoring, Alerts, Infrastructure as Code

Description: Learn how to create Datadog monitors using Terraform for consistent and version-controlled alerting across your entire infrastructure.

---

Datadog monitors allow you to track metrics, logs, and traces and alert your team when things go wrong. Managing monitors through Terraform ensures your alerting configuration is version-controlled, peer-reviewed, and consistently deployed. This guide shows you how to create various types of Datadog monitors with Terraform.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}

variable "datadog_api_key" { type = string; sensitive = true }
variable "datadog_app_key" { type = string; sensitive = true }
```

## Metric Monitor

```hcl
# Monitor CPU utilization across hosts
resource "datadog_monitor" "cpu_high" {
  name    = "High CPU Utilization"
  type    = "metric alert"
  message = "CPU utilization is above 80% on {{host.name}}. @ops-team @pagerduty-infrastructure"

  query = "avg(last_5m):avg:system.cpu.user{environment:production} by {host} > 80"

  monitor_thresholds {
    critical          = 80
    warning           = 70
    critical_recovery = 60
    warning_recovery  = 55
  }

  notify_no_data    = true
  no_data_timeframe = 10
  renotify_interval = 60

  tags = ["environment:production", "team:infrastructure", "service:core"]
}
```

## Log Monitor

```hcl
# Monitor for error patterns in application logs
resource "datadog_monitor" "log_errors" {
  name    = "Application Error Rate High"
  type    = "log alert"
  message = "Error rate in application logs has exceeded threshold. Check recent deployments. @dev-team"

  query = "logs(\"service:api status:error\").index(\"main\").rollup(\"count\").by(\"service\").last(\"5m\") > 50"

  monitor_thresholds {
    critical = 50
    warning  = 25
  }

  tags = ["environment:production", "team:backend"]
}
```

## APM Monitor

```hcl
# Monitor service latency
resource "datadog_monitor" "apm_latency" {
  name    = "API Service High Latency"
  type    = "query alert"
  message = "P95 latency for the API service exceeds 2 seconds. @ops-team"

  query = "avg(last_5m):trace.web.request.duration.by.service.95p{service:api-service,env:production} > 2"

  monitor_thresholds {
    critical = 2
    warning  = 1.5
  }

  tags = ["environment:production", "service:api"]
}

# Monitor error rate for a service
resource "datadog_monitor" "apm_errors" {
  name    = "API Service Error Rate"
  type    = "query alert"
  message = "Error rate for the API service exceeds 5%. @ops-team @pagerduty"

  query = "sum(last_5m):sum:trace.web.request.errors{service:api-service,env:production}.as_count() / sum:trace.web.request.hits{service:api-service,env:production}.as_count() * 100 > 5"

  monitor_thresholds {
    critical = 5
    warning  = 2
  }

  tags = ["environment:production", "service:api"]
}
```

## Composite Monitor

```hcl
# Composite monitor that triggers when multiple conditions are true
resource "datadog_monitor" "composite_degraded" {
  name    = "Service Degraded - Multiple Indicators"
  type    = "composite"
  message = "Multiple degradation indicators detected. Investigate immediately. @ops-team @pagerduty"

  query = "${datadog_monitor.cpu_high.id} && ${datadog_monitor.apm_latency.id}"

  tags = ["environment:production", "team:infrastructure"]
}
```

## Anomaly Monitor

```hcl
# Detect anomalous request patterns
resource "datadog_monitor" "request_anomaly" {
  name    = "Anomalous Request Rate"
  type    = "query alert"
  message = "Request rate is anomalously high or low. Check for traffic issues. @ops-team"

  query = "avg(last_4h):anomalies(avg:nginx.requests.total{environment:production}, 'agile', 3, direction='both', interval=60, alert_window='last_15m', count_default_zero='true') >= 1"

  monitor_thresholds {
    critical = 1
    warning  = 0.8
  }

  monitor_threshold_windows {
    trigger_window  = "last_15m"
    recovery_window = "last_30m"
  }

  tags = ["environment:production"]
}
```

## Batch Monitor Creation

```hcl
variable "metric_monitors" {
  type = map(object({
    name      = string
    query     = string
    critical  = number
    warning   = number
    message   = string
    tags      = list(string)
  }))
  default = {
    "disk-usage" = {
      name     = "High Disk Usage"
      query    = "avg(last_5m):avg:system.disk.in_use{*} by {host} > 0.9"
      critical = 0.9
      warning  = 0.8
      message  = "Disk usage above 90% on {{host.name}}. @ops-team"
      tags     = ["team:infrastructure"]
    }
    "memory-usage" = {
      name     = "High Memory Usage"
      query    = "avg(last_5m):avg:system.mem.pct_usable{*} by {host} < 0.1"
      critical = 0.1
      warning  = 0.2
      message  = "Memory usage critically high on {{host.name}}. @ops-team"
      tags     = ["team:infrastructure"]
    }
  }
}

resource "datadog_monitor" "batch" {
  for_each = var.metric_monitors

  name    = each.value.name
  type    = "metric alert"
  message = each.value.message
  query   = each.value.query

  monitor_thresholds {
    critical = each.value.critical
    warning  = each.value.warning
  }

  tags = concat(each.value.tags, ["managed-by:terraform"])
}
```

## Process and Network Monitors

```hcl
# Monitor for process not running
resource "datadog_monitor" "process_check" {
  name    = "Critical Process Not Running"
  type    = "process alert"
  message = "The nginx process is not running on {{host.name}}. @ops-team @pagerduty"
  query   = "processes('nginx').over('environment:production').by('host').last(2).count_by_status()"

  monitor_thresholds {
    critical = 1
  }

  tags = ["environment:production", "service:webserver"]
}

# Network connectivity monitor
resource "datadog_monitor" "network_latency" {
  name    = "High Network Latency"
  type    = "query alert"
  message = "Network latency is high between services. @ops-team"
  query   = "avg(last_5m):avg:system.net.tcp.rtt{environment:production} by {host} > 100"

  monitor_thresholds {
    critical = 100
    warning  = 50
  }

  tags = ["environment:production", "team:infrastructure"]
}
```

## Monitor Downtimes

```hcl
# Create a scheduled maintenance window
resource "datadog_downtime" "weekly_maintenance" {
  scope      = "environment:production"
  start      = 1708646400
  end        = 1708653600

  recurrence {
    type   = "weeks"
    period = 1
    week_days = ["Sun"]
  }

  message = "Weekly maintenance window - alerts suppressed"
}
```

## Best Practices

Use meaningful monitor names and messages that include context about what the alert means and how to investigate. Include @mentions in messages to route notifications to the right teams. Set both warning and critical thresholds to give teams early notice. Use tags consistently for filtering and managing monitors. Configure renotify intervals to avoid alert fatigue while ensuring persistent issues are not forgotten.

For creating Datadog dashboards alongside your monitors, see our guide on [Datadog dashboards with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-datadog-dashboards-with-terraform/view).

## Conclusion

Datadog monitors managed through Terraform provide consistent, version-controlled alerting that scales with your infrastructure. From simple metric thresholds to sophisticated anomaly detection and composite monitors, Terraform handles the full range of Datadog monitoring capabilities. The batch creation pattern makes it easy to maintain monitoring standards across your entire organization.

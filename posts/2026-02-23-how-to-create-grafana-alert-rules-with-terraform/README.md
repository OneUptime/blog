# How to Create Grafana Alert Rules with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Grafana, Alerts, Monitoring, Infrastructure as Code

Description: Learn how to create Grafana alerting rules using Terraform to set up metric-based and log-based alerts with notification routing.

---

Grafana Alerting provides a unified alerting experience across all your data sources. Alert rules evaluate queries on a schedule and fire notifications when conditions are met. Managing alert rules through Terraform ensures consistent alerting across your Grafana instances. This guide covers creating alert rules, contact points, and notification policies.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 2.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_auth
}

variable "grafana_url" { type = string }
variable "grafana_auth" { type = string; sensitive = true }
```

## Creating Contact Points

```hcl
# Email contact point
resource "grafana_contact_point" "email" {
  name = "Operations Email"

  email {
    addresses               = ["ops@company.com"]
    single_email            = true
    message                 = "{{ template \"default.message\" .}}"
  }
}

# Slack contact point
resource "grafana_contact_point" "slack" {
  name = "Slack Alerts"

  slack {
    url                     = var.slack_webhook_url
    recipient               = "#alerts"
    text                    = "{{ template \"default.message\" .}}"
    title                   = "{{ template \"default.title\" .}}"
  }
}

# PagerDuty contact point
resource "grafana_contact_point" "pagerduty" {
  name = "PagerDuty"

  pagerduty {
    integration_key = var.pagerduty_integration_key
    severity        = "critical"
  }
}

variable "slack_webhook_url" { type = string; sensitive = true }
variable "pagerduty_integration_key" { type = string; sensitive = true }
```

## Notification Policy

```hcl
# Define how alerts are routed to contact points
resource "grafana_notification_policy" "main" {
  group_by      = ["alertname", "grafana_folder"]
  contact_point = grafana_contact_point.email.name

  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "4h"

  # Route critical alerts to PagerDuty
  policy {
    matcher {
      label = "severity"
      match = "="
      value = "critical"
    }
    contact_point = grafana_contact_point.pagerduty.name
    group_wait    = "10s"
  }

  # Route warnings to Slack
  policy {
    matcher {
      label = "severity"
      match = "="
      value = "warning"
    }
    contact_point = grafana_contact_point.slack.name
  }
}
```

## Creating Alert Rules

```hcl
# Create a rule group for infrastructure alerts
resource "grafana_rule_group" "infrastructure" {
  name             = "Infrastructure Alerts"
  folder_uid       = grafana_folder.alerts.uid
  interval_seconds = 60
  org_id           = 1

  # High CPU alert rule
  rule {
    name      = "High CPU Usage"
    condition = "C"

    # Query data
    data {
      ref_id         = "A"
      datasource_uid = grafana_data_source.prometheus.uid

      relative_time_range {
        from = 300
        to   = 0
      }

      model = jsonencode({
        expr         = "100 - (avg by(instance)(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
        intervalMs   = 15000
        refId        = "A"
      })
    }

    # Reduce to a single value
    data {
      ref_id         = "B"
      datasource_uid = "-100"

      relative_time_range {
        from = 0
        to   = 0
      }

      model = jsonencode({
        type       = "reduce"
        expression = "A"
        reducer    = "last"
        refId      = "B"
      })
    }

    # Threshold condition
    data {
      ref_id         = "C"
      datasource_uid = "-100"

      relative_time_range {
        from = 0
        to   = 0
      }

      model = jsonencode({
        type       = "threshold"
        expression = "B"
        refId      = "C"
        conditions = [{
          evaluator = {
            type   = "gt"
            params = [80]
          }
        }]
      })
    }

    labels = {
      severity = "warning"
      team     = "infrastructure"
    }

    annotations = {
      summary     = "High CPU usage detected on {{ $labels.instance }}"
      description = "CPU usage is {{ $values.B }}% on instance {{ $labels.instance }}"
    }

    for            = "5m"
    no_data_state  = "NoData"
    exec_err_state = "Alerting"
  }

  # Low disk space alert rule
  rule {
    name      = "Low Disk Space"
    condition = "C"

    data {
      ref_id         = "A"
      datasource_uid = grafana_data_source.prometheus.uid

      relative_time_range {
        from = 300
        to   = 0
      }

      model = jsonencode({
        expr  = "(1 - (node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"})) * 100"
        refId = "A"
      })
    }

    data {
      ref_id         = "B"
      datasource_uid = "-100"
      relative_time_range { from = 0; to = 0 }
      model = jsonencode({
        type = "reduce"; expression = "A"; reducer = "last"; refId = "B"
      })
    }

    data {
      ref_id         = "C"
      datasource_uid = "-100"
      relative_time_range { from = 0; to = 0 }
      model = jsonencode({
        type = "threshold"; expression = "B"; refId = "C"
        conditions = [{ evaluator = { type = "gt"; params = [85] } }]
      })
    }

    labels = {
      severity = "critical"
      team     = "infrastructure"
    }

    annotations = {
      summary = "Low disk space on {{ $labels.instance }}"
    }

    for            = "10m"
    no_data_state  = "NoData"
    exec_err_state = "Alerting"
  }
}

resource "grafana_folder" "alerts" {
  title = "Alert Rules"
}

data "grafana_data_source" "prometheus" {
  name = "Prometheus"
}
```

## Best Practices

Group related alert rules into the same rule group for atomic evaluation. Use labels like severity and team for notification routing. Set appropriate "for" durations to avoid alerting on brief spikes. Include descriptive annotations with template variables for useful alert messages. Route critical alerts through multiple channels for redundancy. Use mute timings for planned maintenance windows.

For organizing your alert rules, see our guide on [Grafana folders and permissions](https://oneuptime.com/blog/post/2026-02-23-how-to-create-grafana-folders-and-permissions-with-terraform/view).

## Conclusion

Grafana alert rules managed through Terraform provide a consistent, version-controlled approach to monitoring and alerting. By defining contact points, notification policies, and rule groups as code, you ensure that alerting behavior is predictable, reviewable, and automatically deployed. The unified alerting model means your alerts work consistently regardless of the underlying data source.

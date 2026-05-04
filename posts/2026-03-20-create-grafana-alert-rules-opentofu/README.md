# How to Create Grafana Alert Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Grafana, Alerting, Monitoring, Infrastructure as Code

Description: Learn how to create Grafana alert rules, contact points, and notification policies with OpenTofu to manage your alerting configuration as code.

Grafana Alerting manages alert rules alongside dashboards. OpenTofu lets you version-control alert definitions, contact points, and routing policies - ensuring your alerting configuration is reviewed, tested, and consistently deployed.

## Provider Configuration

```hcl
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
  }
}

provider "grafana" {
  url  = var.grafana_url
  auth = var.grafana_token
}
```

## Creating a Contact Point

```hcl
# Slack contact point

resource "grafana_contact_point" "slack_alerts" {
  name = "Slack Alerts"

  slack {
    url       = var.slack_webhook_url
    recipient = "#platform-alerts"
    title     = "[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}"
    text      = "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"
  }
}

# PagerDuty contact point
resource "grafana_contact_point" "pagerduty_oncall" {
  name = "PagerDuty Oncall"

  pagerduty {
    integration_key = var.pagerduty_integration_key
    severity        = "critical"
  }
}

# Email contact point
resource "grafana_contact_point" "email_team" {
  name = "Engineering Team"

  email {
    addresses               = ["engineering@example.com", "oncall@example.com"]
    single_email            = false
    message                 = "{{ template \"default.message\" . }}"
    subject                 = "{{ template \"default.title\" . }}"
  }
}
```

## Notification Policy

```hcl
resource "grafana_notification_policy" "main" {
  contact_point = grafana_contact_point.slack_alerts.name
  group_by      = ["alertname", "cluster", "namespace"]

  # Route critical alerts to PagerDuty
  policy {
    matcher {
      label = "severity"
      match = "="
      value = "critical"
    }
    contact_point   = grafana_contact_point.pagerduty_oncall.name
    group_wait      = "30s"
    group_interval  = "5m"
    repeat_interval = "4h"
  }

  # Route warning alerts to Slack only
  policy {
    matcher {
      label = "severity"
      match = "="
      value = "warning"
    }
    contact_point   = grafana_contact_point.slack_alerts.name
    group_wait      = "1m"
    group_interval  = "10m"
    repeat_interval = "12h"
  }
}
```

## Alert Rules

```hcl
resource "grafana_rule_group" "application" {
  name             = "application-alerts"
  folder_uid       = grafana_folder.alerts.uid
  interval_seconds = 60  # Evaluate every minute

  rule {
    name      = "High Error Rate"
    condition = "C"

    # Fetch the error rate
    data {
      ref_id = "A"
      relative_time_range {
        from = 600  # Last 10 minutes
        to   = 0
      }
      datasource_uid = grafana_data_source.prometheus.uid
      model = jsonencode({
        expr         = "sum(rate(http_requests_total{status=~\"5..\",job=\"api\"}[5m])) / sum(rate(http_requests_total{job=\"api\"}[5m])) * 100"
        legendFormat = "error_rate"
        refId        = "A"
      })
    }

    # Reduce to a single value
    data {
      ref_id = "B"
      relative_time_range {
        from = 0
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        type       = "reduce"
        refId      = "B"
        expression = "A"
        reducer    = "last"
      })
    }

    # Threshold condition
    data {
      ref_id = "C"
      relative_time_range {
        from = 0
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        type       = "threshold"
        refId      = "C"
        expression = "B"
        conditions = [{
          evaluator = { params = [5], type = "gt" }
          operator  = { type = "and" }
        }]
      })
    }

    annotations = {
      summary     = "Error rate is {{ $values.B.Value | printf \"%.1f\" }}%"
      description = "API error rate has exceeded 5% for 5 minutes"
      runbook_url = "https://runbooks.example.com/high-error-rate"
    }

    labels = {
      severity = "critical"
      team     = "backend"
    }

    no_data_state  = "NoData"
    exec_err_state = "Error"
    for            = "5m"
  }
}
```

## Mute Timings (Maintenance Windows)

```hcl
resource "grafana_mute_timing" "maintenance_window" {
  name = "Weekly Maintenance"

  intervals {
    weekdays = ["sunday"]
    times {
      start = "02:00"
      end   = "04:00"
    }
  }
}
```

## Conclusion

Grafana alert rules in OpenTofu give you version-controlled, reviewable alerting. Define contact points for Slack, PagerDuty, and email; set up notification policies to route by severity; and create alert rules with multi-stage evaluation expressions. Mute timings handle planned maintenance windows automatically.

# How to Create New Relic Alert Policies with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, New Relic, Monitoring, Alerts, Infrastructure as Code

Description: Learn how to create New Relic alert policies and conditions using Terraform for consistent, version-controlled observability alerting.

---

New Relic alert policies group related alert conditions together and define how notifications are handled. Managing these through Terraform ensures your alerting configuration is consistent, peer-reviewed, and automatically deployed. This guide covers creating alert policies, NRQL conditions, and notification workflows.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    newrelic = {
      source  = "newrelic/newrelic"
      version = "~> 3.0"
    }
  }
}

provider "newrelic" {
  account_id = var.account_id
  api_key    = var.api_key
  region     = "US"
}

variable "account_id" { type = number }
variable "api_key" { type = string; sensitive = true }
```

## Creating Alert Policies

```hcl
# Create alert policies for different severity levels
resource "newrelic_alert_policy" "critical" {
  name                = "Critical Infrastructure Alerts"
  incident_preference = "PER_CONDITION_AND_TARGET"
}

resource "newrelic_alert_policy" "warning" {
  name                = "Warning Alerts"
  incident_preference = "PER_POLICY"
}

resource "newrelic_alert_policy" "application" {
  name                = "Application Performance Alerts"
  incident_preference = "PER_CONDITION_AND_TARGET"
}
```

## NRQL Alert Conditions

```hcl
# High error rate alert
resource "newrelic_nrql_alert_condition" "error_rate" {
  account_id                   = var.account_id
  policy_id                    = newrelic_alert_policy.application.id
  type                         = "static"
  name                         = "High Error Rate"
  description                  = "Error rate exceeds 5% for the API service"
  enabled                      = true
  violation_time_limit_seconds = 3600

  nrql {
    query = "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'api-service'"
  }

  critical {
    operator              = "above"
    threshold             = 5
    threshold_duration    = 300
    threshold_occurrences = "all"
  }

  warning {
    operator              = "above"
    threshold             = 2
    threshold_duration    = 300
    threshold_occurrences = "all"
  }
}

# High response time alert
resource "newrelic_nrql_alert_condition" "response_time" {
  account_id                   = var.account_id
  policy_id                    = newrelic_alert_policy.application.id
  type                         = "static"
  name                         = "High Response Time"
  description                  = "P95 response time exceeds 2 seconds"
  enabled                      = true
  violation_time_limit_seconds = 3600

  nrql {
    query = "SELECT percentile(duration, 95) FROM Transaction WHERE appName = 'api-service'"
  }

  critical {
    operator              = "above"
    threshold             = 2
    threshold_duration    = 300
    threshold_occurrences = "all"
  }

  warning {
    operator              = "above"
    threshold             = 1
    threshold_duration    = 300
    threshold_occurrences = "all"
  }
}

# Throughput drop alert
resource "newrelic_nrql_alert_condition" "throughput_drop" {
  account_id                   = var.account_id
  policy_id                    = newrelic_alert_policy.critical.id
  type                         = "static"
  name                         = "Traffic Drop Detected"
  description                  = "Request throughput has dropped significantly"
  enabled                      = true
  violation_time_limit_seconds = 3600

  nrql {
    query = "SELECT rate(count(*), 1 minute) FROM Transaction WHERE appName = 'api-service'"
  }

  critical {
    operator              = "below"
    threshold             = 10
    threshold_duration    = 600
    threshold_occurrences = "all"
  }
}
```

## Anomaly Detection Conditions

```hcl
# Anomaly-based alert for response time
resource "newrelic_nrql_alert_condition" "response_anomaly" {
  account_id                   = var.account_id
  policy_id                    = newrelic_alert_policy.application.id
  type                         = "baseline"
  name                         = "Response Time Anomaly"
  description                  = "Response time is anomalously high compared to baseline"
  enabled                      = true
  violation_time_limit_seconds = 3600
  baseline_direction           = "upper_only"

  nrql {
    query = "SELECT average(duration) FROM Transaction WHERE appName = 'api-service'"
  }

  critical {
    operator              = "above"
    threshold             = 3
    threshold_duration    = 300
    threshold_occurrences = "all"
  }

  warning {
    operator              = "above"
    threshold             = 2
    threshold_duration    = 300
    threshold_occurrences = "all"
  }
}
```

## Infrastructure Alert Conditions

```hcl
# CPU utilization alert
resource "newrelic_nrql_alert_condition" "host_cpu" {
  account_id = var.account_id
  policy_id  = newrelic_alert_policy.critical.id
  type       = "static"
  name       = "Host CPU High"
  enabled    = true
  violation_time_limit_seconds = 3600

  nrql {
    query = "SELECT average(cpuPercent) FROM SystemSample FACET hostname"
  }

  critical {
    operator              = "above"
    threshold             = 90
    threshold_duration    = 300
    threshold_occurrences = "all"
  }

  warning {
    operator              = "above"
    threshold             = 80
    threshold_duration    = 300
    threshold_occurrences = "all"
  }
}

# Disk usage alert
resource "newrelic_nrql_alert_condition" "disk_usage" {
  account_id = var.account_id
  policy_id  = newrelic_alert_policy.critical.id
  type       = "static"
  name       = "Disk Usage High"
  enabled    = true
  violation_time_limit_seconds = 3600

  nrql {
    query = "SELECT average(diskUsedPercent) FROM SystemSample FACET hostname"
  }

  critical {
    operator              = "above"
    threshold             = 90
    threshold_duration    = 300
    threshold_occurrences = "all"
  }
}
```

## Notification Workflows

```hcl
# Create a notification destination
resource "newrelic_notification_destination" "email" {
  account_id = var.account_id
  name       = "Operations Email"
  type       = "EMAIL"

  property {
    key   = "email"
    value = var.ops_email
  }
}

# Create a notification channel
resource "newrelic_notification_channel" "email" {
  account_id    = var.account_id
  name          = "ops-email-channel"
  type          = "EMAIL"
  destination_id = newrelic_notification_destination.email.id
  product       = "IINT"

  property {
    key   = "subject"
    value = "New Relic Alert: {{issueTitle}}"
  }
}

# Create a workflow that connects policies to channels
resource "newrelic_workflow" "critical_alerts" {
  account_id            = var.account_id
  name                  = "Critical Alert Workflow"
  muting_rules_handling = "NOTIFY_ALL_ISSUES"

  issues_filter {
    name = "critical-filter"
    type = "FILTER"

    predicate {
      attribute = "labels.policyIds"
      operator  = "EXACTLY_MATCHES"
      values    = [newrelic_alert_policy.critical.id]
    }
  }

  destination {
    channel_id = newrelic_notification_channel.email.id
  }
}

variable "ops_email" { type = string }
```

## Best Practices

Use PER_CONDITION_AND_TARGET incident preference for infrastructure alerts to get separate incidents per host. Use PER_POLICY for application-level alerts where you want a single incident per outage. Write NRQL queries that are specific and use FACET when monitoring multiple targets. Set violation time limits to auto-close stale incidents. Use anomaly detection for metrics with natural patterns. Include meaningful descriptions in alert conditions.

For creating dashboards alongside your alerts, see our guide on [New Relic dashboards](https://oneuptime.com/blog/post/2026-02-23-how-to-create-new-relic-dashboards-with-terraform/view).

## Conclusion

New Relic alert policies managed through Terraform provide a structured, version-controlled approach to observability alerting. By defining policies, conditions, and notification workflows as code, you ensure consistent monitoring across your entire stack. The combination of static thresholds, anomaly detection, and NRQL flexibility gives you the tools to create precise, actionable alerts.

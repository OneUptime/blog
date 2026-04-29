# How to Manage New Relic Resources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, New Relic, Monitoring, Observability, Alerting

Description: Learn how to manage New Relic dashboards, alert policies, notification channels, and synthetic monitors using OpenTofu for code-driven observability configuration.

## Introduction

The New Relic provider for OpenTofu manages alert policies, dashboards, synthetic monitors, and workloads. Defining observability configuration as code ensures consistent monitoring setup across services and enables review-based changes to production alert thresholds.

## Provider Configuration

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
  account_id = var.newrelic_account_id
  api_key    = var.newrelic_api_key  # User key
  region     = "US"
}
```

## Alert Policy and Conditions

```hcl
resource "newrelic_alert_policy" "app_policy" {
  name                = "App Server Alerts"
  incident_preference = "PER_CONDITION_AND_TARGET"
}

# NRQL alert condition for error rate

resource "newrelic_nrql_alert_condition" "error_rate" {
  account_id = var.newrelic_account_id
  policy_id  = newrelic_alert_policy.app_policy.id
  name       = "High Error Rate"
  type       = "static"
  enabled    = true

  nrql {
    query = "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'my-app'"
  }

  critical {
    operator              = "above"
    threshold             = 5
    threshold_duration    = 300
    threshold_occurrences = "ALL"
  }

  warning {
    operator              = "above"
    threshold             = 2
    threshold_duration    = 600
    threshold_occurrences = "ALL"
  }

  fill_option       = "static"
  fill_value        = 0
  aggregation_method = "event_flow"
  aggregation_delay  = 120
}

# NRQL alert condition for response time
resource "newrelic_nrql_alert_condition" "response_time" {
  account_id = var.newrelic_account_id
  policy_id  = newrelic_alert_policy.app_policy.id
  name       = "High Response Time"
  type       = "static"
  enabled    = true

  nrql {
    query = "SELECT average(duration) FROM Transaction WHERE appName = 'my-app'"
  }

  critical {
    operator              = "above"
    threshold             = 2.0  # 2 seconds
    threshold_duration    = 300
    threshold_occurrences = "ALL"
  }
}
```

## Notification Channels

```hcl
# PagerDuty notification
resource "newrelic_notification_channel" "pagerduty" {
  name           = "PagerDuty - Platform"
  type           = "PAGERDUTY_ACCOUNT_INTEGRATION"
  destination_id = newrelic_notification_destination.pagerduty.id
  product        = "IINT"

  property {
    key   = "summary"
    value = "{{ issueTitle }}"
  }

  property {
    key   = "service"
    label = "Platform Service"
    value = "PTQK3FM"
  }

  property {
    key   = "email"
    value = "platform@example.com"
  }
}

resource "newrelic_notification_destination" "pagerduty" {
  name = "PagerDuty Platform Team"
  type = "PAGERDUTY_ACCOUNT_INTEGRATION"

  property {
    key   = "two_way_integration"
    value = "true"
  }

  auth_token {
    prefix = "Token token="
    token  = var.pagerduty_integration_key
  }
}

# Slack notification
# Slack destinations are OAuth-based and must already exist in New Relic.
data "newrelic_notification_destination" "slack" {
  exact_name = "Slack Workspace"
}

resource "newrelic_notification_channel" "slack" {
  name           = "Slack #alerts"
  type           = "SLACK"
  destination_id = data.newrelic_notification_destination.slack.id
  product        = "IINT"

  property {
    key   = "channelId"
    value = "C01234567"
  }
}
```

## Dashboard

```hcl
resource "newrelic_one_dashboard" "app_overview" {
  name = "App Overview"

  page {
    name = "Overview"

    widget_line {
      title  = "Response Time (seconds)"
      row    = 1
      column = 1
      height = 3
      width  = 6

      nrql_query {
        account_id = var.newrelic_account_id
        query      = "SELECT average(duration) FROM Transaction WHERE appName = 'my-app' TIMESERIES"
      }
    }

    widget_billboard {
      title  = "Error Rate"
      row    = 1
      column = 7
      height = 3
      width  = 3

      nrql_query {
        account_id = var.newrelic_account_id
        query      = "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'my-app'"
      }

      critical = 5
      warning  = 2
    }
  }
}
```

## Synthetic Monitor

```hcl
resource "newrelic_synthetics_monitor" "health_check" {
  name             = "App Health Check"
  type             = "SIMPLE"
  period           = "EVERY_5_MINUTES"
  status           = "ENABLED"
  locations_public = ["US_EAST_1", "US_WEST_2", "EU_WEST_1"]
  uri              = "https://app.example.com/health"
  validation_string = "\"status\":\"ok\""
}
```

## Conclusion

New Relic managed with OpenTofu enables consistent monitoring configuration across services. Alert thresholds, NRQL queries, and dashboard layouts go through code review before reaching production, preventing accidental threshold changes or monitor deletions. Use the module pattern to create standardized alert policies for service types (web, worker, database) that teams can instantiate with service-specific parameters.

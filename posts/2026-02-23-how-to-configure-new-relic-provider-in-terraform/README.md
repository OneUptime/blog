# How to Configure New Relic Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, New Relic, Monitoring, Observability, Provider, Infrastructure as Code

Description: Learn how to configure the Terraform New Relic provider to manage alert policies, dashboards, synthetic monitors, and NRQL conditions as infrastructure code.

---

New Relic provides full-stack observability - APM, infrastructure monitoring, logs, synthetics, and more. As your monitoring setup grows, managing it through the New Relic UI becomes hard to maintain consistently. The Terraform New Relic provider lets you define alert policies, notification channels, dashboards, and synthetic monitors as code, so your observability configuration gets the same rigor as your infrastructure.

## Prerequisites

You need three things from your New Relic account:

- **Account ID** - Found in the URL when logged in or in Account Settings
- **API Key** - A User API key (not the License key or Insights key)
- **Region** - Either US or EU

### Getting Your API Key

1. Go to New Relic > API Keys (under your profile menu)
2. Click "Create a key"
3. Select "User" as the key type
4. Give it a name like "Terraform Automation"

```bash
# Set environment variables
export NEW_RELIC_ACCOUNT_ID="1234567"
export NEW_RELIC_API_KEY="NRAK-your-api-key-here"
export NEW_RELIC_REGION="US"  # or "EU"
```

## Basic Provider Configuration

```hcl
# versions.tf
terraform {
  required_providers {
    newrelic = {
      source  = "newrelic/newrelic"
      version = "~> 3.50"
    }
  }
}

# provider.tf
provider "newrelic" {
  account_id = var.new_relic_account_id
  api_key    = var.new_relic_api_key
  region     = var.new_relic_region
}

variable "new_relic_account_id" {
  description = "New Relic account ID"
  type        = number
}

variable "new_relic_api_key" {
  description = "New Relic User API key"
  type        = string
  sensitive   = true
}

variable "new_relic_region" {
  description = "New Relic region (US or EU)"
  type        = string
  default     = "US"
}
```

Or using environment variables (the simplest approach):

```hcl
provider "newrelic" {
  # Reads from NEW_RELIC_ACCOUNT_ID, NEW_RELIC_API_KEY, and NEW_RELIC_REGION
}
```

## Alert Policies

Alert policies group related alert conditions together:

```hcl
# Create an alert policy
resource "newrelic_alert_policy" "production" {
  name                = "Production Alerts"
  incident_preference = "PER_CONDITION_AND_TARGET"
  # Options: PER_POLICY, PER_CONDITION, PER_CONDITION_AND_TARGET
}

resource "newrelic_alert_policy" "infrastructure" {
  name                = "Infrastructure Alerts"
  incident_preference = "PER_CONDITION"
}
```

## NRQL Alert Conditions

NRQL-based alert conditions are the most flexible way to create alerts in New Relic:

```hcl
# High error rate condition
resource "newrelic_nrql_alert_condition" "error_rate" {
  account_id                   = var.new_relic_account_id
  policy_id                    = newrelic_alert_policy.production.id
  type                         = "static"
  name                         = "High Error Rate"
  description                  = "Fires when error rate exceeds 5%"
  enabled                      = true
  violation_time_limit_seconds = 3600

  nrql {
    query = "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'my-api-service'"
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

  fill_option = "none"
}

# High response time
resource "newrelic_nrql_alert_condition" "response_time" {
  account_id                   = var.new_relic_account_id
  policy_id                    = newrelic_alert_policy.production.id
  type                         = "static"
  name                         = "High Response Time"
  description                  = "Average response time exceeds 2 seconds"
  enabled                      = true
  violation_time_limit_seconds = 3600

  nrql {
    query = "SELECT average(duration) FROM Transaction WHERE appName = 'my-api-service'"
  }

  critical {
    operator              = "above"
    threshold             = 2.0
    threshold_duration    = 300
    threshold_occurrences = "all"
  }

  warning {
    operator              = "above"
    threshold             = 1.0
    threshold_duration    = 300
    threshold_occurrences = "all"
  }
}

# Throughput drop (anomaly-based)
resource "newrelic_nrql_alert_condition" "throughput_drop" {
  account_id                   = var.new_relic_account_id
  policy_id                    = newrelic_alert_policy.production.id
  type                         = "baseline"
  name                         = "Throughput Drop"
  description                  = "Transaction throughput dropped significantly"
  enabled                      = true
  violation_time_limit_seconds = 3600

  nrql {
    query = "SELECT count(*) FROM Transaction WHERE appName = 'my-api-service'"
  }

  critical {
    operator              = "above"
    threshold             = 3      # 3 standard deviations
    threshold_duration    = 300
    threshold_occurrences = "all"
  }

  baseline_direction = "lower_only"
}

# Infrastructure CPU alert
resource "newrelic_nrql_alert_condition" "high_cpu" {
  account_id                   = var.new_relic_account_id
  policy_id                    = newrelic_alert_policy.infrastructure.id
  type                         = "static"
  name                         = "High CPU Usage"
  enabled                      = true
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

# Disk space alert
resource "newrelic_nrql_alert_condition" "disk_usage" {
  account_id                   = var.new_relic_account_id
  policy_id                    = newrelic_alert_policy.infrastructure.id
  type                         = "static"
  name                         = "High Disk Usage"
  enabled                      = true
  violation_time_limit_seconds = 3600

  nrql {
    query = "SELECT average(diskUsedPercent) FROM StorageSample FACET hostname, mountPoint"
  }

  critical {
    operator              = "above"
    threshold             = 90
    threshold_duration    = 300
    threshold_occurrences = "all"
  }
}
```

## Notification Destinations and Workflows

Configure where alerts go using the newer workflow-based notification system:

```hcl
# Email notification destination
resource "newrelic_notification_destination" "email_ops" {
  account_id = var.new_relic_account_id
  name       = "Ops Team Email"
  type       = "EMAIL"

  property {
    key   = "email"
    value = "ops-team@example.com"
  }
}

# Slack notification destination
resource "newrelic_notification_destination" "slack_alerts" {
  account_id = var.new_relic_account_id
  name       = "Slack Alerts Channel"
  type       = "SLACK"

  property {
    key   = "url"
    value = var.slack_webhook_url
  }
}

# PagerDuty notification destination
resource "newrelic_notification_destination" "pagerduty" {
  account_id = var.new_relic_account_id
  name       = "PagerDuty"
  type       = "PAGERDUTY_ACCOUNT_INTEGRATION"

  property {
    key   = "account"
    value = var.pagerduty_account_id
  }
}

# Notification channel
resource "newrelic_notification_channel" "slack_channel" {
  account_id     = var.new_relic_account_id
  name           = "Slack - Ops Alerts"
  type           = "SLACK"
  destination_id = newrelic_notification_destination.slack_alerts.id
  product        = "IINT"

  property {
    key   = "channelId"
    value = "C01234ABCDE"
  }
}

# Workflow that routes alerts to the right channels
resource "newrelic_workflow" "production_alerts" {
  account_id            = var.new_relic_account_id
  name                  = "Production Alert Workflow"
  muting_rules_handling = "NOTIFY_ALL_ISSUES"

  issues_filter {
    name = "Production issues"
    type = "FILTER"

    predicate {
      attribute = "labels.policyIds"
      operator  = "EXACTLY_MATCHES"
      values    = [newrelic_alert_policy.production.id]
    }
  }

  destination {
    channel_id = newrelic_notification_channel.slack_channel.id
  }
}
```

## Dashboards

Create dashboards with NRQL queries:

```hcl
resource "newrelic_one_dashboard" "service_overview" {
  name = "Service Overview - Production"

  page {
    name = "Overview"

    # Throughput widget
    widget_line {
      title  = "Request Throughput"
      row    = 1
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "SELECT rate(count(*), 1 minute) FROM Transaction WHERE appName = 'my-api-service' TIMESERIES"
      }
    }

    # Error rate widget
    widget_line {
      title  = "Error Rate (%)"
      row    = 1
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'my-api-service' TIMESERIES"
      }
    }

    # Response time widget
    widget_line {
      title  = "Average Response Time"
      row    = 4
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "SELECT average(duration) FROM Transaction WHERE appName = 'my-api-service' TIMESERIES"
      }
    }

    # Top errors table
    widget_table {
      title  = "Top Errors"
      row    = 4
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "SELECT count(*) FROM TransactionError WHERE appName = 'my-api-service' FACET error.class, error.message LIMIT 10"
      }
    }

    # Apdex score
    widget_billboard {
      title  = "Apdex Score"
      row    = 7
      column = 1
      width  = 4
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "SELECT apdex(duration, t: 0.5) FROM Transaction WHERE appName = 'my-api-service'"
      }
    }
  }

  page {
    name = "Infrastructure"

    widget_line {
      title  = "CPU Usage by Host"
      row    = 1
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "SELECT average(cpuPercent) FROM SystemSample FACET hostname TIMESERIES"
      }
    }

    widget_line {
      title  = "Memory Usage by Host"
      row    = 1
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.new_relic_account_id
        query      = "SELECT average(memoryUsedPercent) FROM SystemSample FACET hostname TIMESERIES"
      }
    }
  }
}
```

## Synthetic Monitors

Create synthetic monitoring checks:

```hcl
# Simple ping monitor
resource "newrelic_synthetics_monitor" "api_ping" {
  name      = "API Health Check"
  type      = "SIMPLE"
  uri       = "https://api.example.com/health"
  period    = "EVERY_MINUTE"
  status    = "ENABLED"
  locations_public = ["US_EAST_1", "EU_WEST_1"]

  treat_redirect_as_failure = false
  verify_ssl                = true
}

# Scripted API monitor
resource "newrelic_synthetics_script_monitor" "api_flow" {
  name    = "API Login Flow"
  type    = "SCRIPT_API"
  period  = "EVERY_5_MINUTES"
  status  = "ENABLED"
  locations_public = ["US_EAST_1", "US_WEST_1"]

  script = <<-EOT
    var assert = require('assert');

    $http.post({
      url: 'https://api.example.com/auth/login',
      body: JSON.stringify({username: 'test', password: $secure.TEST_PASSWORD}),
      headers: {'Content-Type': 'application/json'}
    }, function(err, response, body) {
      assert.equal(response.statusCode, 200, 'Login should return 200');
      var token = JSON.parse(body).token;
      assert.ok(token, 'Response should include a token');
    });
  EOT
}

# Alert on synthetic failures
resource "newrelic_nrql_alert_condition" "synthetics_failure" {
  account_id = var.new_relic_account_id
  policy_id  = newrelic_alert_policy.production.id
  type       = "static"
  name       = "Synthetic Monitor Failure"
  enabled    = true

  nrql {
    query = "SELECT filter(count(*), WHERE result = 'FAILED') FROM SyntheticCheck WHERE monitorName = '${newrelic_synthetics_monitor.api_ping.name}'"
  }

  critical {
    operator              = "above"
    threshold             = 0
    threshold_duration    = 300
    threshold_occurrences = "at_least_once"
  }

  violation_time_limit_seconds = 3600
}
```

## Service Level Indicators (SLIs) and Objectives (SLOs)

Define SLOs for your services:

```hcl
# Look up the entity
data "newrelic_entity" "api_service" {
  name   = "my-api-service"
  type   = "APPLICATION"
  domain = "APM"
}

# Define an SLI/SLO
resource "newrelic_service_level" "api_availability" {
  guid        = data.newrelic_entity.api_service.guid
  name        = "API Availability"
  description = "Percentage of successful responses"

  events {
    account_id = var.new_relic_account_id
    valid_events {
      from = "Transaction"
      where = "appName = 'my-api-service'"
    }
    good_events {
      from = "Transaction"
      where = "appName = 'my-api-service' AND error IS false AND duration < 2"
    }
  }

  objective {
    target    = 99.9
    time_window {
      rolling {
        count = 7
        unit  = "DAY"
      }
    }
  }
}
```

## Summary

The New Relic provider gives you code-level control over your observability stack. Define alert policies and NRQL conditions for precise alerting, build dashboards that give your team a consistent view of service health, set up synthetic monitors for proactive detection, and track SLOs to measure reliability. The combination of NRQL's flexibility with Terraform's declarative approach means you can standardize monitoring across all your services and deploy it alongside the infrastructure you are monitoring.

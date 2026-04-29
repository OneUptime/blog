# How to Manage New Relic Resources with OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, New Relic, Observability, Monitoring, Infrastructure as Code

Description: Learn how to manage New Relic dashboards, alert policies, notification channels, and synthetics monitors using OpenTofu and the official New Relic provider.

## Introduction

New Relic is a comprehensive observability platform covering APM, infrastructure monitoring, and alerting. Managing New Relic resources with OpenTofu allows teams to version-control dashboards and alert configurations, ensuring consistency across environments and enabling rapid onboarding of new services.

## Prerequisites

- OpenTofu installed (v1.6+)
- A New Relic account
- New Relic User API key (also called a personal API key)
- Your New Relic Account ID

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
  api_key    = var.newrelic_api_key
  region     = "US"  # Valid values: "US", "EU", or "JP"
}
```

## Creating Alert Policies

```hcl
resource "newrelic_alert_policy" "app" {
  name                = "App Alert Policy"
  incident_preference = "PER_CONDITION_AND_TARGET"
}

resource "newrelic_nrql_alert_condition" "high_error_rate" {
  policy_id   = newrelic_alert_policy.app.id
  name        = "High Error Rate"
  type        = "static"
  enabled     = true
  description = "Alert when error rate exceeds 5%"

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
    threshold_duration    = 300
    threshold_occurrences = "ALL"
  }

  fill_option   = "last_value"
  aggregation_method = "event_flow"
}
```

## Notification Channels

Create the Slack destination in New Relic first, then reference it from OpenTofu because Slack destinations cannot be created by the provider.

```hcl
data "newrelic_notification_destination" "slack" {
  exact_name = "Slack Workspace"
}

resource "newrelic_notification_channel" "slack" {
  name           = "Ops Slack Channel"
  type           = "SLACK"
  destination_id = data.newrelic_notification_destination.slack.id
  product        = "IINT"

  property {
    key   = "channelId"
    value = "C0123456789"
  }
}

resource "newrelic_workflow" "ops" {
  name                  = "Ops Notification Workflow"
  muting_rules_handling = "NOTIFY_ALL_ISSUES"
  enabled               = true

  issues_filter {
    name = "filter"
    type = "FILTER"

    predicate {
      attribute = "labels.policyIds"
      operator  = "EXACTLY_MATCHES"
      values    = [newrelic_alert_policy.app.id]
    }
  }

  destination {
    channel_id            = newrelic_notification_channel.slack.id
    notification_triggers = ["ACTIVATED", "ACKNOWLEDGED", "CLOSED"]
  }
}
```

## Creating Dashboards

```hcl
resource "newrelic_one_dashboard" "app" {
  name        = "Application Overview"
  permissions = "public_read_only"

  page {
    name = "Overview"

    widget_line {
      title  = "Request Throughput"
      row    = 1
      column = 1
      width  = 8
      height = 3

      nrql_query {
        account_id = var.newrelic_account_id
        query      = "SELECT rate(count(*), 1 minute) FROM Transaction WHERE appName = 'my-app' TIMESERIES"
      }
    }

    widget_billboard {
      title  = "Average Response Time"
      row    = 1
      column = 9
      width  = 4
      height = 3

      nrql_query {
        account_id = var.newrelic_account_id
        query      = "SELECT average(duration) FROM Transaction WHERE appName = 'my-app'"
      }

      critical = 2.0
      warning  = 1.0
    }
  }
}
```

## Synthetic Monitors

```hcl
resource "newrelic_synthetics_monitor" "uptime" {
  name             = "App Uptime Check"
  type             = "SIMPLE"
  period           = "EVERY_5_MINUTES"
  status           = "ENABLED"
  locations_public = ["US_EAST_1", "EU_WEST_1", "AP_SOUTHEAST_1"]
  uri              = "https://www.example.com/health"

  custom_header {
    name  = "X-Monitor"
    value = "newrelic-synthetic"
  }

  validation_string         = "OK"
  verify_ssl                = true
  bypass_head_request       = false
  treat_redirect_as_failure = false
}
```

## Best Practices

- Use NRQL conditions over classic alert conditions for flexibility.
- Store the New Relic API key in a secrets manager and inject via environment variable.
- Template dashboards as reusable modules to standardize observability across services.
- Set both warning and critical thresholds to allow gradual escalation.
- Use `newrelic_entity_tags` to label managed entities that expose a GUID for easy filtering.

## Conclusion

The New Relic OpenTofu provider enables you to manage your entire observability stack as code. Dashboards, alerts, and synthetic monitors can be version-controlled, reviewed, and deployed consistently - ensuring your team always has reliable visibility into application health.

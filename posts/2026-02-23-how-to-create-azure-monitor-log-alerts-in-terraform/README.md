# How to Create Azure Monitor Log Alerts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Monitor, Log Alerts, Monitoring, Infrastructure as Code

Description: Learn how to create Azure Monitor log-based alert rules using Terraform to detect patterns in your log data and trigger automated responses.

---

Azure Monitor log alerts use Kusto Query Language (KQL) queries to search log data and fire alerts based on the results. Unlike metric alerts that monitor numeric values, log alerts can detect complex patterns in text data, correlate events across multiple sources, and alert on the absence of expected events. This guide shows you how to create and manage log alerts with Terraform.

## Setting Up the Foundation

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "monitoring" {
  name     = "rg-log-alerts"
  location = "eastus"
}

# Reference a Log Analytics workspace
data "azurerm_log_analytics_workspace" "main" {
  name                = "law-production"
  resource_group_name = "rg-monitoring"
}

# Reference an action group
data "azurerm_monitor_action_group" "ops" {
  name                = "ops-team-notifications"
  resource_group_name = "rg-monitoring"
}
```

## Basic Log Alert Rule

```hcl
# Alert on application errors in the last 5 minutes
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "app_errors" {
  name                = "app-error-alert"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  description         = "Alert when application error count exceeds threshold"
  severity            = 2
  enabled             = true

  scopes                  = [data.azurerm_log_analytics_workspace.main.id]
  evaluation_frequency    = "PT5M"
  window_duration         = "PT5M"

  criteria {
    query = <<-KQL
      AppExceptions
      | where TimeGenerated > ago(5m)
      | summarize ErrorCount = count() by bin(TimeGenerated, 5m)
    KQL

    time_aggregation_method = "Total"
    operator                = "GreaterThan"
    threshold               = 10
    metric_measure_column   = "ErrorCount"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [data.azurerm_monitor_action_group.ops.id]
  }
}
```

## Security Event Alert

```hcl
# Alert on failed login attempts
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "failed_logins" {
  name                = "failed-login-alert"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  description         = "Alert on excessive failed login attempts"
  severity            = 1
  enabled             = true

  scopes               = [data.azurerm_log_analytics_workspace.main.id]
  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"

  criteria {
    query = <<-KQL
      SigninLogs
      | where TimeGenerated > ago(15m)
      | where ResultType != "0"
      | summarize FailedCount = count() by UserPrincipalName, IPAddress
      | where FailedCount > 5
    KQL

    time_aggregation_method = "Count"
    operator                = "GreaterThan"
    threshold               = 0

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [data.azurerm_monitor_action_group.ops.id]
  }
}
```

## Resource Health Alert

```hcl
# Alert when resources report errors
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "resource_errors" {
  name                = "resource-error-alert"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  description         = "Alert on resource-level errors in Azure Activity Log"
  severity            = 2
  enabled             = true

  scopes               = [data.azurerm_log_analytics_workspace.main.id]
  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"

  criteria {
    query = <<-KQL
      AzureActivity
      | where TimeGenerated > ago(5m)
      | where Level == "Error"
      | summarize ErrorCount = count() by ResourceGroup, ResourceProviderValue, _ResourceId
      | where ErrorCount > 0
    KQL

    time_aggregation_method = "Count"
    operator                = "GreaterThan"
    threshold               = 0

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [data.azurerm_monitor_action_group.ops.id]
  }
}
```

## Custom Application Log Alert

```hcl
# Alert on custom application logs
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "custom_app_alert" {
  name                = "payment-failure-alert"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  description         = "Alert on payment processing failures"
  severity            = 1
  enabled             = true

  scopes               = [data.azurerm_log_analytics_workspace.main.id]
  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"

  criteria {
    query = <<-KQL
      AppTraces
      | where TimeGenerated > ago(5m)
      | where Message contains "PaymentProcessingFailed"
      | summarize FailureCount = count() by bin(TimeGenerated, 5m)
    KQL

    time_aggregation_method = "Total"
    operator                = "GreaterThan"
    threshold               = 5
    metric_measure_column   = "FailureCount"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [data.azurerm_monitor_action_group.ops.id]
  }
}
```

## Heartbeat / Missing Data Alert

```hcl
# Alert when expected heartbeat data stops arriving
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "missing_heartbeat" {
  name                = "missing-heartbeat-alert"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  description         = "Alert when agent heartbeat data is missing"
  severity            = 1
  enabled             = true

  scopes               = [data.azurerm_log_analytics_workspace.main.id]
  evaluation_frequency = "PT5M"
  window_duration      = "PT10M"

  criteria {
    query = <<-KQL
      Heartbeat
      | summarize LastHeartbeat = max(TimeGenerated) by Computer
      | where LastHeartbeat < ago(10m)
      | project Computer, LastHeartbeat, MinutesSinceLastBeat = datetime_diff('minute', now(), LastHeartbeat)
    KQL

    time_aggregation_method = "Count"
    operator                = "GreaterThan"
    threshold               = 0

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [data.azurerm_monitor_action_group.ops.id]
  }
}
```

## Performance Degradation Alert

```hcl
# Alert when API response times degrade
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "slow_api" {
  name                = "slow-api-response"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  description         = "Alert when API response times exceed threshold"
  severity            = 2
  enabled             = true

  scopes               = [data.azurerm_log_analytics_workspace.main.id]
  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"

  criteria {
    query = <<-KQL
      AppRequests
      | where TimeGenerated > ago(15m)
      | where Success == true
      | summarize
          AvgDuration = avg(DurationMs),
          P95Duration = percentile(DurationMs, 95),
          RequestCount = count()
        by bin(TimeGenerated, 5m)
      | where P95Duration > 3000 and RequestCount > 10
    KQL

    time_aggregation_method = "Count"
    operator                = "GreaterThan"
    threshold               = 0

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 2
      number_of_evaluation_periods             = 3
    }
  }

  action {
    action_groups = [data.azurerm_monitor_action_group.ops.id]
  }
}
```

## Best Practices

Write KQL queries that are as specific as possible to reduce false positives. Use the failing_periods configuration to require multiple evaluation periods before firing, which helps avoid alerting on brief anomalies. Set evaluation frequency equal to or shorter than the window duration to avoid gaps in monitoring. Test your KQL queries in the Log Analytics workspace before adding them to Terraform. Use severity levels consistently so that action groups can route alerts appropriately.

For metric-based alerting, see our guide on [Azure Monitor metric alerts](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-monitor-metric-alerts-in-terraform/view).

## Conclusion

Azure Monitor log alerts in Terraform give you the power to detect complex patterns in your log data and respond automatically. By using KQL queries, you can create alerts that go far beyond simple threshold monitoring, from detecting security incidents to tracking business logic failures. Combined with action groups and automated responses, log alerts form a critical part of your Azure monitoring strategy.

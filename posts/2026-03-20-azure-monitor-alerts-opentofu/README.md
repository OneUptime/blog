# How to Set Up Azure Monitor Alerts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Azure Monitor, Alert, Monitoring, Infrastructure as Code, Observability

Description: Learn how to create Azure Monitor metric and log alerts using OpenTofu to proactively detect and respond to performance issues and failures in your Azure infrastructure.

---

Azure Monitor is the unified observability platform for Azure. It collects metrics, logs, and traces and lets you alert on conditions that matter. With OpenTofu, you can codify your entire alerting strategy and deploy it consistently across environments.

## Setting Up Action Groups

Action groups define who gets notified and how. Create them before creating alert rules.

```hcl
# main.tf

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "monitoring" {
  name     = "monitoring-rg"
  location = var.location
}

# Action group for email and webhook notifications
resource "azurerm_monitor_action_group" "ops_team" {
  name                = "ops-team-alerts"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "ops-alerts"

  email_receiver {
    name          = "ops-team-email"
    email_address = var.ops_team_email
  }

  webhook_receiver {
    name        = "slack-webhook"
    service_uri = var.slack_webhook_url
  }
}
```

## Creating Metric Alert Rules

```hcl
# metric_alerts.tf
# Alert when CPU percentage on an App Service plan exceeds 80%
resource "azurerm_monitor_metric_alert" "app_service_cpu" {
  name                = "app-service-high-cpu"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_service_plan.app.id]
  description         = "CPU usage has been above 80% for 5 minutes"
  severity            = 2  # 0=Critical, 1=Error, 2=Warning, 3=Informational, 4=Verbose

  criteria {
    metric_namespace = "Microsoft.Web/serverfarms"
    metric_name      = "CpuPercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  # Evaluate every 1 minute over a 5-minute window
  frequency   = "PT1M"
  window_size = "PT5M"

  action {
    action_group_id = azurerm_monitor_action_group.ops_team.id
  }
}

# Alert when HTTP 5xx errors spike on App Service
resource "azurerm_monitor_metric_alert" "app_service_5xx" {
  name                = "app-service-5xx-errors"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_linux_web_app.app.id]
  description         = "5xx error count is elevated"
  severity            = 1

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http5xx"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 10
  }

  frequency   = "PT1M"
  window_size = "PT5M"

  action {
    action_group_id = azurerm_monitor_action_group.ops_team.id
  }
}
```

## Multi-Resource Alerts

Use a subscription or resource group scope to apply an alert to multiple resources of the same type in a single Azure region.

```hcl
# dynamic_alerts.tf
resource "azurerm_monitor_metric_alert" "all_vms_cpu" {
  name                = "all-vms-high-cpu"
  resource_group_name = azurerm_resource_group.monitoring.name
  # Scope to the subscription - alert applies to all matching VMs in one region
  scopes              = ["/subscriptions/${var.subscription_id}"]
  description         = "Any VM in the selected region has high CPU"
  severity            = 2

  dynamic_criteria {
    metric_namespace  = "Microsoft.Compute/virtualMachines"
    metric_name       = "Percentage CPU"
    aggregation       = "Average"
    operator          = "GreaterThan"
    alert_sensitivity = "Medium"
  }

  frequency   = "PT5M"
  window_size = "PT15M"

  target_resource_type     = "Microsoft.Compute/virtualMachines"
  target_resource_location = var.location

  action {
    action_group_id = azurerm_monitor_action_group.ops_team.id
  }
}
```

## Log-Based Alerts Using Scheduled Query Rules

```hcl
# log_alerts.tf
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "error_count" {
  name                = "app-error-count-alert"
  location            = var.location
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_log_analytics_workspace.main.id]
  description         = "Alert when 5xx error count exceeds threshold"
  severity            = 1

  # KQL query to detect 5xx responses
  criteria {
    query = <<-QUERY
      AppRequests
      | where toint(ResultCode) >= 500
      | summarize ErrorCount = sum(ItemCount) by bin(TimeGenerated, 5m)
    QUERY

    time_aggregation_method = "Total"
    metric_measure_column   = "ErrorCount"
    threshold               = 20
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"

  action {
    action_groups = [azurerm_monitor_action_group.ops_team.id]
  }
}
```

## Best Practices

- Use descriptive alert names with resource type and condition so the alert is self-documenting.
- Set alert severity appropriately - save severity 0 and 1 for critical conditions that require immediate human action.
- Use `auto_mitigate = true` for metric alerts (the default), and set `auto_mitigation_enabled = true` on scheduled query rules if you want log alerts to auto-resolve when the condition clears.
- Test action groups by using the "Test Action Group" feature in the Azure portal after deploying.
- Group related alerts together by tagging them with the same service name for easier management.

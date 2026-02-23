# How to Create Azure Monitor Metric Alerts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Monitor, Metric Alerts, Monitoring, Infrastructure as Code

Description: Learn how to create Azure Monitor metric alerts using Terraform to monitor resource performance and trigger notifications based on metric thresholds.

---

Azure Monitor metric alerts evaluate resource metrics at regular intervals and trigger actions when conditions are met. They support static thresholds, dynamic thresholds with machine learning, and multi-resource monitoring. This guide shows you how to create comprehensive metric alerts for your Azure resources using Terraform.

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

resource "azurerm_resource_group" "main" {
  name     = "rg-monitoring-alerts"
  location = "eastus"
}

# Reference an existing action group
data "azurerm_monitor_action_group" "critical" {
  name                = "critical-alerts"
  resource_group_name = "rg-monitoring"
}
```

## VM CPU Alert

```hcl
# Alert when VM CPU exceeds threshold
resource "azurerm_monitor_metric_alert" "vm_cpu" {
  name                = "vm-high-cpu"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [var.vm_resource_id]
  description         = "Alert when CPU utilization exceeds 80%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Compute/virtualMachines"
    metric_name      = "Percentage CPU"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.critical.id
  }
}

variable "vm_resource_id" {
  type = string
}
```

## Dynamic Threshold Alerts

```hcl
# Dynamic threshold alert that learns normal patterns
resource "azurerm_monitor_metric_alert" "cpu_anomaly" {
  name                = "vm-cpu-anomaly"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [var.vm_resource_id]
  description         = "Alert on anomalous CPU patterns"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  dynamic_criteria {
    metric_namespace  = "Microsoft.Compute/virtualMachines"
    metric_name       = "Percentage CPU"
    aggregation       = "Average"
    operator          = "GreaterThan"
    alert_sensitivity = "Medium"
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.critical.id
  }
}
```

## Multi-Criteria Alerts

```hcl
# Alert with multiple conditions (all must be true)
resource "azurerm_monitor_metric_alert" "app_service_degraded" {
  name                = "app-service-degraded"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [var.app_service_id]
  description         = "App Service showing degraded performance"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  # High response time
  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "HttpResponseTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 5
  }

  # Combined with high request count (not just slow with no traffic)
  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Requests"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 100
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.critical.id
  }
}

variable "app_service_id" {
  type = string
}
```

## Storage Account Alerts

```hcl
# Alert on storage availability drops
resource "azurerm_monitor_metric_alert" "storage_availability" {
  name                = "storage-low-availability"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [var.storage_account_id]
  description         = "Storage account availability dropped below 99.9%"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Storage/storageAccounts"
    metric_name      = "Availability"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 99.9
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.critical.id
  }
}

# Alert on high latency
resource "azurerm_monitor_metric_alert" "storage_latency" {
  name                = "storage-high-latency"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [var.storage_account_id]
  description         = "Storage account latency exceeding threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Storage/storageAccounts"
    metric_name      = "SuccessE2ELatency"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 1000
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.critical.id
  }
}

variable "storage_account_id" {
  type = string
}
```

## SQL Database Alerts

```hcl
# Alert on high DTU consumption
resource "azurerm_monitor_metric_alert" "sql_dtu" {
  name                = "sql-high-dtu"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [var.sql_database_id]
  description         = "SQL Database DTU usage exceeds 80%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Sql/servers/databases"
    metric_name      = "dtu_consumption_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.critical.id
  }
}

# Alert on storage usage
resource "azurerm_monitor_metric_alert" "sql_storage" {
  name                = "sql-storage-high"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [var.sql_database_id]
  description         = "SQL Database storage usage exceeds 80%"
  severity            = 2
  frequency           = "PT15M"
  window_size         = "PT1H"

  criteria {
    metric_namespace = "Microsoft.Sql/servers/databases"
    metric_name      = "storage_percent"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.critical.id
  }
}

variable "sql_database_id" {
  type = string
}
```

## Alerts at Scale

```hcl
# Define alerts as a variable for batch creation
variable "metric_alerts" {
  type = map(object({
    resource_id      = string
    metric_namespace = string
    metric_name      = string
    aggregation      = string
    operator         = string
    threshold        = number
    severity         = number
    frequency        = string
    window_size      = string
    description      = string
  }))
}

resource "azurerm_monitor_metric_alert" "batch" {
  for_each = var.metric_alerts

  name                = each.key
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [each.value.resource_id]
  description         = each.value.description
  severity            = each.value.severity
  frequency           = each.value.frequency
  window_size         = each.value.window_size

  criteria {
    metric_namespace = each.value.metric_namespace
    metric_name      = each.value.metric_name
    aggregation      = each.value.aggregation
    operator         = each.value.operator
    threshold        = each.value.threshold
  }

  action {
    action_group_id = data.azurerm_monitor_action_group.critical.id
  }
}
```

## Best Practices

Use dynamic thresholds for metrics with natural daily or weekly patterns. Set the evaluation window larger than the frequency to smooth out brief spikes. Use appropriate severity levels consistently across your organization. Combine metric alerts with log alerts for a more complete monitoring picture. Test alerts by temporarily lowering thresholds to verify that notifications work correctly.

For log-based alerting, see our guide on [Azure Monitor log alerts](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-monitor-log-alerts-in-terraform/view).

## Conclusion

Azure Monitor metric alerts in Terraform give you a structured, repeatable approach to monitoring your Azure resources. From simple static thresholds to intelligent dynamic detection, these alerts form the foundation of your monitoring strategy. The variable-driven approach makes it easy to manage alerts at scale across your entire Azure environment.

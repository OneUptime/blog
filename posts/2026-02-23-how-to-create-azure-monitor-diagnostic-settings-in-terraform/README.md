# How to Create Azure Monitor Diagnostic Settings in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Monitor, Diagnostic Settings, Logging, Infrastructure as Code

Description: Learn how to create Azure Monitor diagnostic settings using Terraform to route platform logs and metrics to Log Analytics, Storage, and Event Hubs.

---

Azure Monitor diagnostic settings control where your Azure resource logs and metrics are sent. Without diagnostic settings, most Azure resources do not emit their platform logs or detailed metrics. By configuring diagnostic settings through Terraform, you ensure that every resource in your environment has consistent logging and monitoring from the moment it is created. This guide shows you how.

## Understanding Diagnostic Settings

Every Azure resource can generate platform logs (activity, resource, and audit logs) and metrics. Diagnostic settings route this data to one or more destinations: Log Analytics workspaces, Storage accounts, Event Hubs, or partner solutions. You can have multiple diagnostic settings per resource, each routing different categories to different destinations.

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
  name     = "rg-diagnostic-settings"
  location = "eastus"
}

# Create the Log Analytics workspace destination
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-central-logging"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

# Storage account for long-term log archival
resource "azurerm_storage_account" "logs" {
  name                     = "stlogsarchive${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
```

## App Service Diagnostic Settings

```hcl
# Diagnostic settings for an App Service
resource "azurerm_monitor_diagnostic_setting" "app_service" {
  name                       = "app-service-diagnostics"
  target_resource_id         = var.app_service_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  storage_account_id         = azurerm_storage_account.logs.id

  # Enable all log categories
  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServiceConsoleLogs"
  }

  enabled_log {
    category = "AppServiceAppLogs"
  }

  enabled_log {
    category = "AppServiceAuditLogs"
  }

  enabled_log {
    category = "AppServicePlatformLogs"
  }

  # Enable metrics
  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

variable "app_service_id" {
  type = string
}
```

## SQL Database Diagnostic Settings

```hcl
# Diagnostic settings for Azure SQL Database
resource "azurerm_monitor_diagnostic_setting" "sql_database" {
  name                       = "sql-diagnostics"
  target_resource_id         = var.sql_database_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "SQLInsights"
  }

  enabled_log {
    category = "QueryStoreRuntimeStatistics"
  }

  enabled_log {
    category = "QueryStoreWaitStatistics"
  }

  enabled_log {
    category = "Errors"
  }

  enabled_log {
    category = "Timeouts"
  }

  enabled_log {
    category = "Deadlocks"
  }

  enabled_log {
    category = "Audit"
  }

  metric {
    category = "Basic"
    enabled  = true
  }

  metric {
    category = "InstanceAndAppAdvanced"
    enabled  = true
  }
}

variable "sql_database_id" {
  type = string
}
```

## Key Vault Diagnostic Settings

```hcl
# Diagnostic settings for Key Vault
resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  name                       = "keyvault-diagnostics"
  target_resource_id         = var.key_vault_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  storage_account_id         = azurerm_storage_account.logs.id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_log {
    category = "AzurePolicyEvaluationDetails"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

variable "key_vault_id" {
  type = string
}
```

## Network Security Group Flow Logs

```hcl
# NSG flow logs require special handling
resource "azurerm_monitor_diagnostic_setting" "nsg" {
  name                       = "nsg-diagnostics"
  target_resource_id         = var.nsg_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "NetworkSecurityGroupEvent"
  }

  enabled_log {
    category = "NetworkSecurityGroupRuleCounter"
  }
}

variable "nsg_id" {
  type = string
}
```

## Creating a Reusable Module

```hcl
# modules/diagnostic-settings/main.tf
variable "resource_id" {
  type        = string
  description = "Resource ID to configure diagnostics for"
}

variable "resource_name" {
  type        = string
  description = "Friendly name for the diagnostic setting"
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "storage_account_id" {
  type    = string
  default = null
}

variable "log_categories" {
  type        = list(string)
  description = "List of log categories to enable"
}

variable "enable_metrics" {
  type    = bool
  default = true
}

resource "azurerm_monitor_diagnostic_setting" "this" {
  name                       = "${var.resource_name}-diagnostics"
  target_resource_id         = var.resource_id
  log_analytics_workspace_id = var.log_analytics_workspace_id
  storage_account_id         = var.storage_account_id

  dynamic "enabled_log" {
    for_each = var.log_categories
    content {
      category = enabled_log.value
    }
  }

  dynamic "metric" {
    for_each = var.enable_metrics ? ["AllMetrics"] : []
    content {
      category = metric.value
      enabled  = true
    }
  }
}
```

## Using the Module

```hcl
module "app_service_diag" {
  source = "./modules/diagnostic-settings"

  resource_id                = var.app_service_id
  resource_name              = "app-service"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  storage_account_id         = azurerm_storage_account.logs.id
  log_categories = [
    "AppServiceHTTPLogs",
    "AppServiceConsoleLogs",
    "AppServiceAppLogs"
  ]
}

module "sql_diag" {
  source = "./modules/diagnostic-settings"

  resource_id                = var.sql_database_id
  resource_name              = "sql-database"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  log_categories = [
    "SQLInsights",
    "Errors",
    "Timeouts",
    "Deadlocks"
  ]
}
```

## Best Practices

Always send diagnostic data to a Log Analytics workspace for querying and alerting. Use a storage account for long-term archival when compliance requires it. Create diagnostic settings as part of the same Terraform configuration that creates the resource so they are never forgotten. Use the module pattern to ensure consistent diagnostic settings across all resources. Enable all relevant log categories rather than just a few since the cost of missing data during an incident is usually higher than the cost of storing extra logs.

For building alerts on the diagnostic data you collect, see our guides on [Azure Monitor metric alerts](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-monitor-metric-alerts-in-terraform/view) and [Azure Monitor log alerts](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-monitor-log-alerts-in-terraform/view).

## Conclusion

Azure Monitor diagnostic settings managed through Terraform ensure that your Azure resources emit the logs and metrics needed for effective monitoring. By creating diagnostic settings alongside your resources, you guarantee that nothing falls through the cracks. The reusable module pattern makes it easy to maintain consistent logging standards across your entire Azure environment.

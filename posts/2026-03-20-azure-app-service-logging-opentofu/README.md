# How to Configure Azure App Service Logging with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Logging, OpenTofu, Monitoring, Application Insights

Description: Learn how to configure Azure App Service application logging, HTTP logging, and diagnostic settings with OpenTofu for comprehensive observability.

## Overview

Azure App Service supports multiple logging options. This Linux App Service example configures application logs, HTTP access logs, diagnostic settings, and Application Insights for centralized observability.

## Step 1: Create Log Analytics and Application Insights

```hcl
# main.tf - Observability resources

resource "azurerm_log_analytics_workspace" "law" {
  name                = "app-logging-workspace"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_application_insights" "insights" {
  name                = "my-app-insights"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  workspace_id        = azurerm_log_analytics_workspace.law.id
  application_type    = "web"
}
```

## Step 2: Create Storage for Logs

```hcl
# Storage account for archived diagnostic logs
resource "azurerm_storage_account" "log_storage" {
  name                     = "applogstorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Step 3: Configure App Service Logs

```hcl
resource "azurerm_linux_web_app" "app" {
  name                = "my-logged-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  # Application Insights connection string and managed agent for supported Linux stacks
  app_settings = {
    APPLICATIONINSIGHTS_CONNECTION_STRING      = azurerm_application_insights.insights.connection_string
    ApplicationInsightsAgent_EXTENSION_VERSION = "~3"
  }

  logs {
    # Application logs
    application_logs {
      file_system_level = "Warning" # Verbose, Information, Warning, Error, Off
    }

    # HTTP access logs
    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 100
      }
    }

  }

  site_config {}
}
```

## Step 4: Diagnostic Settings to Log Analytics

```hcl
# Stream App Service logs to Log Analytics for querying and archive a copy in Storage
resource "azurerm_monitor_diagnostic_setting" "app_diagnostics" {
  name                       = "app-service-diagnostics"
  target_resource_id         = azurerm_linux_web_app.app.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
  storage_account_id         = azurerm_storage_account.log_storage.id

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

  enabled_metric {
    category = "AllMetrics"
  }
}
```

## Step 5: Outputs

```hcl
output "application_insights_connection_string" {
  value     = azurerm_application_insights.insights.connection_string
  sensitive = true
}

output "log_analytics_workspace_id" {
  value = azurerm_log_analytics_workspace.law.workspace_id
}
```

## Summary

Azure App Service logging configured with OpenTofu provides comprehensive observability through multiple layers: file system logs for quick debugging, Application Insights for telemetry on supported stacks, and Azure Monitor diagnostic settings for centralized querying in Log Analytics and archival in Storage. Enabling all three helps close common visibility gaps in production applications.

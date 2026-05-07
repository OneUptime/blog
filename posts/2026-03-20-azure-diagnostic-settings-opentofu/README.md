# How to Create Azure Diagnostic Settings with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Diagnostic Settings, Monitoring, Log Analytics, Infrastructure as Code

Description: Learn how to create Azure Diagnostic Settings with OpenTofu to route resource metrics and logs from Azure services to Log Analytics, Storage Accounts, or Event Hubs.

Azure Diagnostic Settings control where resource-level logs and metrics are sent. Unlike Activity Logs which capture subscription events, Diagnostic Settings capture logs from individual resources like App Services, SQL databases, and Key Vaults. Managing them in OpenTofu ensures every resource has proper observability configuration from deployment.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}
```

## App Service Diagnostic Settings

```hcl
resource "azurerm_linux_web_app" "api" {
  name                = "production-api"
  resource_group_name = azurerm_resource_group.app.name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {}
}

resource "azurerm_monitor_diagnostic_setting" "app_service" {
  name                       = "app-service-diagnostics"
  target_resource_id         = azurerm_linux_web_app.api.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AppServiceHTTPLogs"         # Web server logs
  }

  enabled_log {
    category = "AppServiceConsoleLogs"      # Console/stdout output
  }

  enabled_log {
    category = "AppServiceAppLogs"          # Application logs for supported runtimes
  }

  enabled_log {
    category = "AppServiceAuditLogs"        # FTP and Kudu login activity
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
```

## Azure SQL Database Diagnostic Settings

```hcl
resource "azurerm_mssql_server" "main" {
  name                         = "production-sql-server"
  resource_group_name          = azurerm_resource_group.data.name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
}

resource "azurerm_mssql_database" "main" {
  name      = "production-db"
  server_id = azurerm_mssql_server.main.id
  sku_name  = "GP_Gen5_4"
}

resource "azurerm_monitor_diagnostic_setting" "sql_db" {
  name                       = "sql-diagnostics"
  target_resource_id         = azurerm_mssql_database.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "SQLInsights"               # Intelligent Insights
  }

  enabled_log {
    category = "AutomaticTuning"           # Auto-tuning events
  }

  enabled_log {
    category = "QueryStoreRuntimeStatistics"  # Query performance
  }

  enabled_log {
    category = "QueryStoreWaitStatistics"
  }

  enabled_log {
    category = "Errors"
  }

  enabled_log {
    category = "DatabaseWaitStatistics"
  }

  enabled_log {
    category = "Timeouts"
  }

  enabled_log {
    category = "Blocks"
  }

  enabled_metric {
    category = "Basic"
  }

  enabled_metric {
    category = "InstanceAndAppAdvanced"
  }
}
```

## Key Vault Diagnostic Settings

```hcl
resource "azurerm_key_vault" "main" {
  name                = "production-kv-${var.suffix}"
  resource_group_name = azurerm_resource_group.security.name
  location            = var.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "premium"

  purge_protection_enabled   = true
  soft_delete_retention_days = 90
}

resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  name                       = "key-vault-audit"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # All Key Vault operations (reads, writes, deletes of secrets/keys/certs)
  enabled_log {
    category = "AuditEvent"
  }

  enabled_log {
    category = "AzurePolicyEvaluationDetails"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
```

## Reusable Module for Diagnostic Settings

```hcl
# Apply diagnostics to multiple resources using for_each

locals {
  resources_to_monitor = {
    app_service = {
      id         = azurerm_linux_web_app.api.id
      categories = ["AppServiceHTTPLogs", "AppServiceConsoleLogs"]
    }
    key_vault = {
      id         = azurerm_key_vault.main.id
      categories = ["AuditEvent"]
    }
  }
}

resource "azurerm_monitor_diagnostic_setting" "resources" {
  for_each = local.resources_to_monitor

  name                       = "${each.key}-diagnostics"
  target_resource_id         = each.value.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  dynamic "enabled_log" {
    for_each = each.value.categories
    content {
      category = enabled_log.value
    }
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
```

## AKS Diagnostic Settings

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = "production-aks"
  location            = var.location
  resource_group_name = azurerm_resource_group.compute.name
  dns_prefix          = "production"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D4s_v3"
  }

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_monitor_diagnostic_setting" "aks" {
  name                       = "aks-diagnostics"
  target_resource_id         = azurerm_kubernetes_cluster.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "kube-apiserver"
  }

  enabled_log {
    category = "kube-audit"
  }

  enabled_log {
    category = "kube-controller-manager"
  }

  enabled_log {
    category = "kube-scheduler"
  }

  enabled_log {
    category = "cluster-autoscaler"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
```

## Conclusion

Azure Diagnostic Settings in OpenTofu ensure every resource ships logs and metrics to your central observability platform. Use Log Analytics for real-time querying, Storage Accounts for long-term compliance archival, and Event Hubs for SIEM integration. Enable audit logs on security-sensitive resources like Key Vault, and remember that Azure SQL Database auditing must be enabled separately before `SQLSecurityAuditEvents` can be routed with diagnostic settings. Create reusable patterns with for_each and dynamic blocks to apply consistent diagnostic settings across all resources of the same type.

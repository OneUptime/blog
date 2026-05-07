# How to Create Azure Log Analytics Workspaces with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Log Analytics, Monitoring, Observability, Infrastructure as Code, Azure Monitor

Description: Learn how to create and configure Azure Log Analytics Workspaces using OpenTofu to centralize log collection and enable powerful KQL-based querying across your Azure resources.

---

Log Analytics Workspaces are the central data stores for Azure Monitor logs. They collect logs from virtual machines, Kubernetes clusters, Azure services, and security tools, all queryable with KQL (Kusto Query Language). OpenTofu makes workspace configuration reproducible and manageable.

## Creating a Log Analytics Workspace

```hcl
# main.tf

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "monitoring" {
  name     = "monitoring-${var.environment}-rg"
  location = var.location
}

# Create the Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "logs-${var.environment}-workspace"
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name

  # Retention period in days (30–730)
  retention_in_days   = var.log_retention_days

  # PerGB2018 pricing tier is recommended for most workloads
  sku                 = "PerGB2018"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Configuring Diagnostic Settings to Send Logs

Route Azure resource logs to the workspace.

```hcl
# diagnostics.tf
# Send App Service logs to the workspace
resource "azurerm_monitor_diagnostic_setting" "app_service" {
  name               = "app-service-diagnostics"
  target_resource_id = azurerm_linux_web_app.app.id

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # Enable selected App Service log categories
  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServiceConsoleLogs"
  }

  enabled_log {
    category = "AppServiceAppLogs"
  }

  # Enable metrics
  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Send Azure Key Vault audit logs to the workspace
resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  name               = "key-vault-diagnostics"
  target_resource_id = azurerm_key_vault.app.id

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Installing Solutions

Optionally extend the workspace with pre-built solutions for common use cases.

```hcl
# solutions.tf
# Install the Container Insights workspace solution
resource "azurerm_log_analytics_solution" "container_insights" {
  solution_name         = "ContainerInsights"
  location              = azurerm_resource_group.monitoring.location
  resource_group_name   = azurerm_resource_group.monitoring.name
  workspace_resource_id = azurerm_log_analytics_workspace.main.id
  workspace_name        = azurerm_log_analytics_workspace.main.name

  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/ContainerInsights"
  }
}

# Install the Security solution
resource "azurerm_log_analytics_solution" "security" {
  solution_name         = "Security"
  location              = azurerm_resource_group.monitoring.location
  resource_group_name   = azurerm_resource_group.monitoring.name
  workspace_resource_id = azurerm_log_analytics_workspace.main.id
  workspace_name        = azurerm_log_analytics_workspace.main.name

  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/Security"
  }
}
```

## Linking to AKS for Container Insights

```hcl
# aks_monitoring.tf
# Link the AKS cluster to the Log Analytics workspace
resource "azurerm_kubernetes_cluster" "app" {
  name                = "app-aks"
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name
  dns_prefix          = "app-aks"

  # ... other configuration ...

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
    msi_auth_for_monitoring_enabled = true
  }
}
```

## Saved Queries

Create saved queries for common operational investigations.

```hcl
# saved_queries.tf
resource "azurerm_log_analytics_saved_search" "error_summary" {
  name                       = "ErrorSummaryByService"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  category     = "Operations"
  display_name = "Error Summary by Service"

  query = <<-QUERY
    AppRequests
    | where toint(ResultCode) >= 500
    | summarize ErrorCount = count() by AppRoleName, ResultCode
    | order by ErrorCount desc
    | take 20
  QUERY
}
```

## Outputs

```hcl
# outputs.tf
output "workspace_id" {
  description = "Resource ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "workspace_customer_id" {
  description = "Workspace ID (used to configure agents)"
  value       = azurerm_log_analytics_workspace.main.workspace_id
}

output "workspace_primary_key" {
  description = "Primary shared key for agent authentication"
  value       = azurerm_log_analytics_workspace.main.primary_shared_key
  sensitive   = true
}
```

## Best Practices

- Use a single workspace per environment to simplify querying and cost management.
- Set `retention_in_days` based on compliance requirements - 90 days is a common baseline.
- Use the `PerGB2018` SKU unless you have specific commitment tier requirements.
- Enable Microsoft Defender for Cloud on the workspace if you need Defender data or ingestion benefits.
- Use long-term retention for data you need to keep beyond 730 days, and export to Azure Storage only if you need an external archive.

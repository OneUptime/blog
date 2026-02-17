# How to Configure Azure Diagnostic Settings for All Resources Using Terraform for_each

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Diagnostic Settings, Monitoring, for_each, IaC, Azure Monitor

Description: Use Terraform for_each to systematically configure Azure Diagnostic Settings across all resources and send logs to Log Analytics.

---

Azure Diagnostic Settings are how you get platform logs and metrics out of your Azure resources and into a central location like Log Analytics, a Storage Account, or Event Hubs. The problem is that every single resource needs its own diagnostic setting configured individually. If you have fifty resources, you need fifty diagnostic setting blocks. Doing that by hand is tedious, and doing it in Terraform without `for_each` leads to massive code duplication.

This post shows you how to use Terraform's `for_each` meta-argument to configure diagnostic settings across multiple Azure resources with minimal code repetition.

## The Problem

Every Azure resource type emits different log categories and metrics. A Key Vault has `AuditEvent` logs. A Storage Account has `StorageRead`, `StorageWrite`, and `StorageDelete`. An App Service has `AppServiceHTTPLogs`, `AppServiceConsoleLogs`, and more. You need to know which categories each resource type supports, and you need a diagnostic setting resource for each one.

Without `for_each`, your Terraform code would look something like this for just three resources:

```hcl
resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  name                       = "diag-keyvault"
  target_resource_id         = azurerm_key_vault.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id
  # ... log categories
}

resource "azurerm_monitor_diagnostic_setting" "storage" {
  name                       = "diag-storage"
  target_resource_id         = azurerm_storage_account.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id
  # ... different log categories
}

resource "azurerm_monitor_diagnostic_setting" "webapp" {
  name                       = "diag-webapp"
  target_resource_id         = azurerm_linux_web_app.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id
  # ... yet more different log categories
}
```

Now imagine doing this for every resource in a production environment. It does not scale.

## The Solution: A Map Variable with for_each

The trick is to define a map that contains each resource's ID and its log categories, then iterate over it with `for_each`. Here is the approach.

First, let us set up the central Log Analytics workspace.

```hcl
# Central Log Analytics workspace for all diagnostic logs
resource "azurerm_log_analytics_workspace" "central" {
  name                = "law-central-monitoring"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}
```

Now, define a local variable that maps resource names to their IDs and log categories.

```hcl
locals {
  # Map of resources to their diagnostic settings configuration
  diagnostic_settings = {
    keyvault = {
      resource_id = azurerm_key_vault.main.id
      logs = [
        { category = "AuditEvent", enabled = true },
        { category = "AzurePolicyEvaluationDetails", enabled = true },
      ]
      metrics = [{ category = "AllMetrics", enabled = true }]
    }
    appservice = {
      resource_id = azurerm_linux_web_app.api.id
      logs = [
        { category = "AppServiceHTTPLogs", enabled = true },
        { category = "AppServiceConsoleLogs", enabled = true },
        { category = "AppServiceAppLogs", enabled = true },
        { category = "AppServicePlatformLogs", enabled = true },
      ]
      metrics = [{ category = "AllMetrics", enabled = true }]
    }
    sqlserver = {
      resource_id = azurerm_mssql_database.main.id
      logs = [
        { category = "SQLInsights", enabled = true },
        { category = "AutomaticTuning", enabled = true },
        { category = "QueryStoreRuntimeStatistics", enabled = true },
        { category = "Errors", enabled = true },
        { category = "Timeouts", enabled = true },
      ]
      metrics = [{ category = "Basic", enabled = true }]
    }
    cosmosdb = {
      resource_id = azurerm_cosmosdb_account.main.id
      logs = [
        { category = "DataPlaneRequests", enabled = true },
        { category = "QueryRuntimeStatistics", enabled = true },
        { category = "PartitionKeyStatistics", enabled = true },
      ]
      metrics = [{ category = "Requests", enabled = true }]
    }
    redis = {
      resource_id = azurerm_redis_cache.main.id
      logs = [
        { category = "ConnectedClientList", enabled = true },
      ]
      metrics = [{ category = "AllMetrics", enabled = true }]
    }
  }
}
```

Now the `for_each` block that does all the work.

```hcl
# Create diagnostic settings for every resource in the map
resource "azurerm_monitor_diagnostic_setting" "all" {
  for_each = local.diagnostic_settings

  name                       = "diag-${each.key}"
  target_resource_id         = each.value.resource_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id

  # Dynamically create log blocks based on the config
  dynamic "enabled_log" {
    for_each = [for log in each.value.logs : log if log.enabled]
    content {
      category = enabled_log.value.category
    }
  }

  # Dynamically create metric blocks
  dynamic "metric" {
    for_each = each.value.metrics
    content {
      category = metric.value.category
      enabled  = metric.value.enabled
    }
  }
}
```

That single resource block handles five different resource types with different log categories. Adding a new resource is just a matter of adding another entry to the `diagnostic_settings` local map.

## Handling Resources Created with for_each

Things get more interesting when the resources themselves are created with `for_each`. For example, if you have multiple storage accounts:

```hcl
# Multiple storage accounts created with for_each
variable "storage_accounts" {
  default = {
    logs    = { name = "stlogs001", tier = "Standard" }
    backups = { name = "stbackups001", tier = "Standard" }
    data    = { name = "stdata001", tier = "Premium" }
  }
}

resource "azurerm_storage_account" "all" {
  for_each = var.storage_accounts

  name                     = each.value.name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = each.value.tier
  account_replication_type = "LRS"
}

# Diagnostic settings for each storage account
resource "azurerm_monitor_diagnostic_setting" "storage" {
  for_each = var.storage_accounts

  name                       = "diag-storage-${each.key}"
  target_resource_id         = azurerm_storage_account.all[each.key].id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id

  metric {
    category = "Transaction"
    enabled  = true
  }

  metric {
    category = "Capacity"
    enabled  = false
  }
}
```

Since both resource blocks iterate over the same map, the keys stay aligned. Each storage account gets its matching diagnostic setting automatically.

## Sending to Multiple Destinations

You might want to send logs to both Log Analytics (for querying) and a Storage Account (for long-term archival). You can specify both destinations in the same diagnostic setting.

```hcl
# Storage account for long-term log archival
resource "azurerm_storage_account" "logs_archive" {
  name                     = "stlogsarchive001"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
}

# Diagnostic setting with dual destinations
resource "azurerm_monitor_diagnostic_setting" "dual_destination" {
  for_each = local.diagnostic_settings

  name                       = "diag-${each.key}"
  target_resource_id         = each.value.resource_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id
  storage_account_id         = azurerm_storage_account.logs_archive.id

  dynamic "enabled_log" {
    for_each = [for log in each.value.logs : log if log.enabled]
    content {
      category = enabled_log.value.category
    }
  }

  dynamic "metric" {
    for_each = each.value.metrics
    content {
      category = metric.value.category
      enabled  = metric.value.enabled
    }
  }
}
```

## Discovering Available Log Categories

One challenge is knowing which log categories exist for a given resource type. You can query this from the Azure CLI:

```bash
# List available diagnostic categories for a resource
az monitor diagnostic-settings categories list \
  --resource "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{vault-name}" \
  --output table
```

This returns the available categories and whether each is a log or a metric. Use this output to populate your Terraform locals map.

## Validating Your Configuration

After deploying, verify that diagnostic data is flowing to Log Analytics.

```bash
# Check if logs are arriving (run in Log Analytics query editor)
# AzureDiagnostics | summarize count() by ResourceType, Category | order by count_ desc
```

Give it 5-10 minutes after deployment for the first logs to appear. Some categories like capacity metrics might update less frequently.

## Tips for Large Environments

If you manage hundreds of resources, consider splitting your diagnostic settings into separate Terraform modules by resource type. This keeps your locals map manageable and lets different teams own their diagnostics configuration.

Also consider using the `azurerm_monitor_diagnostic_categories` data source to dynamically discover available categories at plan time, rather than hardcoding them. This makes your code more resilient to Azure API changes.

## Conclusion

Terraform's `for_each` combined with `dynamic` blocks turns the tedious task of configuring diagnostic settings into a clean, data-driven operation. Define your resources and their log categories in a map, iterate over them, and you get consistent monitoring configuration across your entire Azure environment. When a new resource gets added, you just extend the map - no new resource blocks needed.

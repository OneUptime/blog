# How to Configure Azure SQL Auditing with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQL, Auditing, OpenTofu, Security, Compliance

Description: Learn how to configure Azure SQL Database auditing with OpenTofu to track database activities and store audit logs in Storage or Log Analytics for compliance.

## Overview

Azure SQL Auditing tracks database events and writes them to an audit log in Azure Storage, Log Analytics, or Event Hubs. This is essential for compliance frameworks like SOC 2, PCI DSS, and HIPAA.

## Step 1: Create SQL Server and Audit Storage

```hcl
# main.tf - SQL Server and dedicated audit storage

resource "azurerm_storage_account" "audit_storage" {
  name                     = "sqlauditlogs"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_mssql_server" "server" {
  name                         = "my-audited-sql-server"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = azurerm_resource_group.rg.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password
}
```

## Step 2: Enable Server-Level Auditing to Storage

```hcl
# Server-level auditing - applies to all databases on the server
resource "azurerm_mssql_server_extended_auditing_policy" "server_audit" {
  server_id                               = azurerm_mssql_server.server.id
  storage_endpoint                        = azurerm_storage_account.audit_storage.primary_blob_endpoint
  storage_account_access_key              = azurerm_storage_account.audit_storage.primary_access_key
  storage_account_access_key_is_secondary = false

  # Retain audit logs for 90 days
  retention_in_days = 90

  # Enable the auditing policy
  enabled = true
}
```

## Step 3: Database-Level Auditing with Log Analytics

```hcl
# Log Analytics workspace for audit log aggregation
resource "azurerm_log_analytics_workspace" "law" {
  name                = "sql-audit-workspace"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

resource "azurerm_mssql_database" "app_db" {
  name      = "appdb"
  server_id = azurerm_mssql_server.server.id
  sku_name  = "S1"
}

# Enable database audit events for Azure Monitor
resource "azurerm_mssql_database_extended_auditing_policy" "db_audit" {
  database_id            = azurerm_mssql_database.app_db.id
  log_monitoring_enabled = true
  enabled                = true
}
```

## Step 4: Diagnostic Settings for Log Analytics

```hcl
# Diagnostic settings route audit events and metrics to Log Analytics
resource "azurerm_monitor_diagnostic_setting" "sql_diagnostics" {
  name               = "sql-audit-diagnostics"
  target_resource_id = azurerm_mssql_database.app_db.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id

  enabled_log {
    category = "SQLSecurityAuditEvents"
  }

  enabled_metric {
    category = "Basic"
  }
}
```

## Step 5: Outputs

```hcl
output "audit_storage_endpoint" {
  value = azurerm_storage_account.audit_storage.primary_blob_endpoint
}

output "log_analytics_workspace_id" {
  value = azurerm_log_analytics_workspace.law.id
}
```

## Summary

Azure SQL Auditing configured with OpenTofu provides a comprehensive audit trail for compliance requirements. By combining storage-based audit logs with Log Analytics, you get both long-term retention and powerful query capabilities for security investigations and compliance reporting.

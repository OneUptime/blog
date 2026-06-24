# How to Set Up Azure SQL Failover Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQL, Failover, OpenTofu, High Availability, Disaster Recovery

Description: Learn how to configure Azure SQL Failover Groups with OpenTofu for automatic geo-replication and seamless failover between primary and secondary SQL servers.

## Overview

Azure SQL Failover Groups provide consistent connection endpoints and can be configured for Microsoft-managed failover between regions. This simplifies DR setup for Azure SQL Database.

## Step 1: Create Primary and Secondary SQL Servers

```hcl
# main.tf - Primary SQL Server in primary region

resource "azurerm_mssql_server" "primary" {
  name                         = "sql-primary-server"
  resource_group_name          = azurerm_resource_group.primary_rg.name
  location                     = "eastus"
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password

  azuread_administrator {
    login_username = "AzureAD Admin"
    object_id      = var.aad_admin_object_id
  }
}

# Secondary SQL Server in a different region
resource "azurerm_mssql_server" "secondary" {
  name                         = "sql-secondary-server"
  resource_group_name          = azurerm_resource_group.secondary_rg.name
  location                     = "westus"
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password

  azuread_administrator {
    login_username = "AzureAD Admin"
    object_id      = var.aad_admin_object_id
  }
}
```

## Step 2: Create the Primary Database

```hcl
# Create the database on the primary server
resource "azurerm_mssql_database" "primary_db" {
  name      = "myapp-db"
  server_id = azurerm_mssql_server.primary.id
  sku_name  = "S2"  # Standard tier

  max_size_gb = 10

  lifecycle {
    # Prevent accidental deletion of production database
    prevent_destroy = true
  }
}
```

## Step 3: Create the Failover Group

```hcl
# Failover group spans primary and secondary servers
resource "azurerm_mssql_failover_group" "failover" {
  name      = "myapp-failover-group"
  server_id = azurerm_mssql_server.primary.id

  # Databases included in the failover group
  databases = [
    azurerm_mssql_database.primary_db.id,
  ]

  partner_server {
    id = azurerm_mssql_server.secondary.id
  }

  # Microsoft-managed failover policy
  read_write_endpoint_failover_policy {
    mode          = "Automatic"
    # Allow Microsoft-managed failover after 60 minutes during a qualifying outage
    grace_minutes = 60
  }

  # Allow the read-only listener to fail over to the primary during Microsoft-managed failover
  readonly_endpoint_failover_policy_enabled = true
}
```

## Step 4: Firewall Rules on Both Servers

```hcl
# Allow Azure services on both servers
resource "azurerm_mssql_firewall_rule" "primary_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.primary.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_mssql_firewall_rule" "secondary_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.secondary.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
```

## Step 5: Outputs

```hcl
# Applications connect to the failover group endpoints, not individual servers
output "read_write_endpoint" {
  value       = "${azurerm_mssql_failover_group.failover.name}.database.windows.net"
  description = "Read-write endpoint - use this in your application connection string"
}

output "read_only_endpoint" {
  value       = "${azurerm_mssql_failover_group.failover.name}.secondary.database.windows.net"
  description = "Read-only endpoint for read replicas and reporting"
}
```

## Summary

Azure SQL Failover Groups with OpenTofu provide geo-replication with stable listener endpoints. Applications connect to the failover group endpoint rather than individual server endpoints, so they continue to target the current primary after a failover once DNS refreshes.

# How to Configure Azure SQL Elastic Pools with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQL, Elastic Pools, OpenTofu, Database, Cost Optimization

Description: Learn how to create and configure Azure SQL Elastic Pools with OpenTofu to share compute resources across multiple databases and reduce costs in multi-tenant scenarios.

## Overview

Azure SQL Elastic Pools allow multiple databases to share a pool of compute resources (DTUs or vCores). This is ideal for SaaS applications with variable, unpredictable workloads where databases don't peak simultaneously.

## Step 1: Create SQL Server

```hcl
# main.tf - SQL Server to host the elastic pool

resource "azurerm_mssql_server" "server" {
  name                         = "my-elastic-pool-server"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = azurerm_resource_group.rg.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password
}
```

## Step 2: Create an Elastic Pool

```hcl
# Create a vCore-based elastic pool (General Purpose)
resource "azurerm_mssql_elasticpool" "pool" {
  name                = "my-tenant-pool"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  server_name         = azurerm_mssql_server.server.name

  # Maximum storage for the pool
  max_size_gb = 100

  sku {
    name     = "GP_Gen5"  # General Purpose, Gen5
    tier     = "GeneralPurpose"
    family   = "Gen5"
    capacity = 4  # 4 vCores shared across all databases
  }

  per_database_settings {
    min_capacity = 0.25  # Guaranteed minimum vCores per database
    max_capacity = 4     # Max vCores a single database can use, if available
  }
}
```

## Step 3: Add Databases to the Pool

```hcl
# Local map of tenant databases to create
locals {
  tenant_databases = {
    "tenant-001" = { max_size_gb = 5 }
    "tenant-002" = { max_size_gb = 10 }
    "tenant-003" = { max_size_gb = 5 }
    "tenant-004" = { max_size_gb = 20 }
  }
}

# Create multiple tenant databases in the elastic pool
resource "azurerm_mssql_database" "tenant_dbs" {
  for_each = local.tenant_databases

  name      = each.key
  server_id = azurerm_mssql_server.server.id

  # Assign to the elastic pool
  elastic_pool_id = azurerm_mssql_elasticpool.pool.id
  sku_name        = "ElasticPool"

  max_size_gb = each.value.max_size_gb

  # Enable short-term backup retention
  short_term_retention_policy {
    retention_days           = 7
    backup_interval_in_hours = 12
  }
}
```

## Step 4: DTU-Based Elastic Pool (Alternative)

```hcl
# Standard DTU-based elastic pool for simpler workloads
resource "azurerm_mssql_elasticpool" "dtu_pool" {
  name                = "my-standard-pool"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  server_name         = azurerm_mssql_server.server.name
  max_size_gb         = 50

  sku {
    name     = "StandardPool"
    tier     = "Standard"
    capacity = 100  # 100 DTUs shared across all databases
  }

  per_database_settings {
    min_capacity = 0    # No guaranteed DTUs per database
    max_capacity = 100  # Max DTUs a single database can use, if available
  }
}
```

## Step 5: Outputs

```hcl
output "elastic_pool_id" {
  value       = azurerm_mssql_elasticpool.pool.id
  description = "Elastic pool resource ID"
}

output "tenant_db_connection_strings" {
  value = {
    for name, db in azurerm_mssql_database.tenant_dbs :
    name => "Server=tcp:${azurerm_mssql_server.server.fully_qualified_domain_name},1433;Database=${name}"
  }
  sensitive = true
}
```

## Summary

Azure SQL Elastic Pools with OpenTofu are a cost-effective solution for multi-tenant SaaS architectures. By sharing vCores or DTUs across databases, you avoid over-provisioning for each tenant. The `for_each` pattern makes it easy to manage dozens of tenant databases consistently.

# How to Create Azure Cosmos DB with SQL API Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, NoSQL, OpenTofu, Database, SQL API

Description: Learn how to create and configure Azure Cosmos DB with the SQL (Core) API using OpenTofu, including containers, throughput settings, and global distribution.

## Overview

Azure Cosmos DB with the SQL API provides a globally distributed, multi-model NoSQL database with SQL-like query capabilities. OpenTofu lets you manage Cosmos DB accounts, databases, containers, and throughput as code.

## Step 1: Create the Cosmos DB Account

```hcl
# main.tf - Cosmos DB account with SQL API

resource "azurerm_cosmosdb_account" "cosmos" {
  name                = "my-cosmos-account"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"  # SQL API

  # Enable automatic failover for high availability
  automatic_failover_enabled = true

  # Consistency policy - choose based on your needs
  consistency_policy {
    consistency_level = "Session"  # Balance between consistency and performance
  }

  # Primary region
  geo_location {
    location          = "eastus"
    failover_priority = 0  # 0 = primary region
  }

  # Secondary region for read replicas and failover
  geo_location {
    location          = "westus"
    failover_priority = 1
  }

  # Disable virtual network filtering in this example
  is_virtual_network_filter_enabled = false
}
```

## Step 2: Create a SQL Database

```hcl
# Create a database within the Cosmos account
resource "azurerm_cosmosdb_sql_database" "app_db" {
  name                = "appdb"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name

  # Shared throughput at database level (all containers share this)
  # Remove for per-container throughput
  throughput = 400
}
```

## Step 3: Create SQL Containers

```hcl
# Container with a partition key for horizontal scaling
resource "azurerm_cosmosdb_sql_container" "users" {
  name                  = "users"
  resource_group_name   = azurerm_resource_group.rg.name
  account_name          = azurerm_cosmosdb_account.cosmos.name
  database_name         = azurerm_cosmosdb_sql_database.app_db.name
  partition_key_paths   = ["/userId"]  # Partition key for distribution
  partition_key_version = 1

  # TTL: omit to disable TTL, or set -1 to keep TTL enabled with no default expiry
  default_ttl = -1

  # Indexing policy: automatic indexing on all paths by default
  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/largeBlob/?"  # Exclude large fields from indexing
    }
  }

  # Unique key constraint
  unique_key {
    paths = ["/email"]
  }
}

resource "azurerm_cosmosdb_sql_container" "orders" {
  name                = "orders"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.app_db.name
  partition_key_paths = ["/customerId"]

  # Set TTL for automatic expiry of old orders (90 days)
  default_ttl = 7776000
}
```

## Step 4: Outputs

```hcl
output "cosmos_endpoint" {
  value       = azurerm_cosmosdb_account.cosmos.endpoint
  description = "Cosmos DB account endpoint"
}

output "cosmos_primary_key" {
  value       = azurerm_cosmosdb_account.cosmos.primary_key
  sensitive   = true
  description = "Primary key for Cosmos DB access"
}

output "cosmos_connection_strings" {
  value = {
    primary            = azurerm_cosmosdb_account.cosmos.primary_sql_connection_string
    secondary          = azurerm_cosmosdb_account.cosmos.secondary_sql_connection_string
    primary_readonly   = azurerm_cosmosdb_account.cosmos.primary_readonly_sql_connection_string
    secondary_readonly = azurerm_cosmosdb_account.cosmos.secondary_readonly_sql_connection_string
  }
  sensitive = true
}
```

## Summary

Azure Cosmos DB with the SQL API provides a globally distributed NoSQL database with familiar SQL query syntax. Managed through OpenTofu, you can define accounts, databases, containers with partition keys, indexing policies, and TTL settings as code, enabling consistent deployments across environments.

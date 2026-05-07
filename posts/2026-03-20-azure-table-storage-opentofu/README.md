# How to Create Azure Table Storage with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage, Table, OpenTofu, NoSQL, Infrastructure

Description: Learn how to create and configure Azure Table Storage with OpenTofu for storing structured NoSQL data at massive scale with low cost.

## Overview

Azure Table Storage is a NoSQL key-value store ideal for storing structured, non-relational data. It's cost-effective and can scale to petabytes of data. Use cases include storing user data, device metadata, IoT sensor readings, and audit logs.

## Step 1: Create the Storage Account

```hcl
# main.tf - Storage account for table storage

resource "azurerm_resource_group" "rg" {
  name     = "my-table-storage-rg"
  location = "eastus"
}

resource "azurerm_storage_account" "storage" {
  name                     = "mytablestorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Step 2: Create Tables

```hcl
# Create tables for different entities
resource "azurerm_storage_table" "users" {
  name                 = "Users"
  storage_account_name = azurerm_storage_account.storage.name
}

resource "azurerm_storage_table" "sessions" {
  name                 = "Sessions"
  storage_account_name = azurerm_storage_account.storage.name
}

resource "azurerm_storage_table" "audit_logs" {
  name                 = "AuditLogs"
  storage_account_name = azurerm_storage_account.storage.name
}
```

## Step 3: Create Multiple Tables Dynamically

```hcl
# Define tables in a list for easy management
locals {
  table_names = [
    "Products",
    "Inventory",
    "Orders",
    "Shipments",
    "CustomerProfiles",
  ]
}

resource "azurerm_storage_table" "tables" {
  for_each = toset(local.table_names)

  name                 = each.value
  storage_account_name = azurerm_storage_account.storage.name
}
```

## Step 4: Insert Table Entities

You can also seed entities into a table:

```hcl
# Insert a sample entity into the Users table
resource "azurerm_storage_table_entity" "example" {
  storage_table_id = azurerm_storage_table.users.id

  partition_key = "US"
  row_key       = "user-001"

  entity = {
    Username  = "johndoe"
    Email     = "john@example.com"
    Region    = "eastus"
    CreatedAt = "2026-01-01T00:00:00Z"
  }
}
```

## Step 5: Role Assignments

```hcl
# Grant an application service principal access to read/write table data
resource "azurerm_role_assignment" "table_contributor" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = var.app_principal_id
}

# Grant read-only access for reporting
resource "azurerm_role_assignment" "table_reader" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Table Data Reader"
  principal_id         = var.reporting_principal_id
}
```

## Step 6: Outputs

```hcl
output "table_endpoint" {
  value       = azurerm_storage_account.storage.primary_table_endpoint
  description = "Primary table service endpoint"
}

output "table_connection_string" {
  value       = azurerm_storage_account.storage.primary_connection_string
  sensitive   = true
  description = "Connection string for table storage access"
}
```

## Summary

Azure Table Storage managed with OpenTofu provides a scalable, low-cost NoSQL store for structured data. With `for_each`, you can manage dozens of tables consistently across environments. Combine with RBAC role assignments to control access and avoid using connection strings where possible.

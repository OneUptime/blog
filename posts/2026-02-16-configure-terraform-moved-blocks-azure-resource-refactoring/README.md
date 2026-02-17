# How to Configure Terraform Moved Blocks for Azure Resource Refactoring Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Refactoring, State Management, Infrastructure as Code, DevOps, Best Practices

Description: Use Terraform moved blocks to safely refactor Azure resource configurations without destroying and recreating existing cloud resources.

---

Refactoring Terraform code is inevitable. Modules get renamed, resources move between files, and what started as a flat configuration grows into a well-organized module structure. The problem is that when you rename a resource or move it to a module, Terraform sees it as a destroy-and-recreate operation. For an Azure SQL database or a storage account with data, that is not acceptable.

Terraform's `moved` blocks solve this by telling Terraform that a resource has been relocated in the configuration but should not be recreated. This post covers practical scenarios for using `moved` blocks when refactoring Azure infrastructure.

## The Problem Without Moved Blocks

Imagine you have a storage account defined at the root level.

```hcl
# Before refactoring
resource "azurerm_storage_account" "data" {
  name                     = "stdataproduction001"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
}
```

Now you want to move it into a module for better organization.

```hcl
# After refactoring (in a module)
module "storage" {
  source = "./modules/storage"

  name                = "stdataproduction001"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}
```

Without a `moved` block, running `terraform plan` shows Terraform wanting to destroy `azurerm_storage_account.data` and create `module.storage.azurerm_storage_account.main`. That means deleting your production storage account and all its data.

## Basic Moved Block Syntax

The `moved` block tells Terraform where a resource used to be and where it is now.

```hcl
# moved.tf
# Declares that the storage account resource has moved into the storage module

moved {
  from = azurerm_storage_account.data
  to   = module.storage.azurerm_storage_account.main
}
```

After adding this block and running `terraform plan`, Terraform shows the resource will be moved in state rather than destroyed and recreated. No downtime, no data loss.

## Scenario 1: Renaming a Resource

The simplest case is renaming a resource within the same file. Maybe you started with a generic name and want something more descriptive.

```hcl
# Before: generic name
resource "azurerm_virtual_network" "main" {
  name                = "vnet-production"
  location            = "eastus"
  resource_group_name = "rg-networking"
  address_space       = ["10.0.0.0/16"]
}

# After: more descriptive name
resource "azurerm_virtual_network" "hub_network" {
  name                = "vnet-production"
  location            = "eastus"
  resource_group_name = "rg-networking"
  address_space       = ["10.0.0.0/16"]
}

# Tell Terraform about the rename
moved {
  from = azurerm_virtual_network.main
  to   = azurerm_virtual_network.hub_network
}
```

## Scenario 2: Moving Resources into a Module

This is the most common refactoring pattern. You extract a group of resources into a reusable module.

```hcl
# Before: resources defined inline
resource "azurerm_mssql_server" "main" {
  name                         = "sql-app-prod"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_password
}

resource "azurerm_mssql_database" "app" {
  name      = "db-application"
  server_id = azurerm_mssql_server.main.id
  sku_name  = "S1"
}
```

After creating the module, add moved blocks for every resource that relocated.

```hcl
# After: resources in a module
module "database" {
  source = "./modules/sql-database"

  server_name         = "sql-app-prod"
  database_name       = "db-application"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  admin_password      = var.sql_password
}

# Moved blocks for both resources
moved {
  from = azurerm_mssql_server.main
  to   = module.database.azurerm_mssql_server.main
}

moved {
  from = azurerm_mssql_database.app
  to   = module.database.azurerm_mssql_database.main
}
```

## Scenario 3: Converting count to for_each

Switching from `count` to `for_each` is a common refactoring that changes resource addresses.

```hcl
# Before: using count
resource "azurerm_network_security_group" "nsg" {
  count               = 3
  name                = "nsg-subnet-${count.index}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}
```

```hcl
# After: using for_each with meaningful keys
variable "subnets" {
  default = {
    "web"      = {}
    "api"      = {}
    "database" = {}
  }
}

resource "azurerm_network_security_group" "nsg" {
  for_each            = var.subnets
  name                = "nsg-subnet-${each.key}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

# Map the old count indexes to the new for_each keys
moved {
  from = azurerm_network_security_group.nsg[0]
  to   = azurerm_network_security_group.nsg["web"]
}

moved {
  from = azurerm_network_security_group.nsg[1]
  to   = azurerm_network_security_group.nsg["api"]
}

moved {
  from = azurerm_network_security_group.nsg[2]
  to   = azurerm_network_security_group.nsg["database"]
}
```

## Scenario 4: Splitting a Module

Sometimes a module becomes too large and needs to be split into smaller, focused modules.

```hcl
# Before: everything in one module
module "infrastructure" {
  source = "./modules/infrastructure"
  # ... contains networking, compute, and storage resources
}

# After: split into focused modules
module "networking" {
  source = "./modules/networking"
}

module "compute" {
  source = "./modules/compute"
}

module "storage" {
  source = "./modules/storage"
}

# Move networking resources from the old module to the new one
moved {
  from = module.infrastructure.azurerm_virtual_network.main
  to   = module.networking.azurerm_virtual_network.main
}

moved {
  from = module.infrastructure.azurerm_subnet.web
  to   = module.networking.azurerm_subnet.web
}

moved {
  from = module.infrastructure.azurerm_subnet.api
  to   = module.networking.azurerm_subnet.api
}

# Move compute resources
moved {
  from = module.infrastructure.azurerm_linux_virtual_machine.web
  to   = module.compute.azurerm_linux_virtual_machine.web
}

# Move storage resources
moved {
  from = module.infrastructure.azurerm_storage_account.data
  to   = module.storage.azurerm_storage_account.data
}
```

## Scenario 5: Refactoring Nested Modules

When you change the nesting structure of modules, moved blocks track the complete path.

```hcl
# Before: flat module structure
module "redis" {
  source = "./modules/redis"
}

# After: nested under a caching module
module "caching" {
  source = "./modules/caching"
  # This module internally calls the redis module
}

moved {
  from = module.redis.azurerm_redis_cache.main
  to   = module.caching.module.redis.azurerm_redis_cache.main
}

moved {
  from = module.redis.azurerm_private_endpoint.redis
  to   = module.caching.module.redis.azurerm_private_endpoint.redis
}
```

## Workflow for Safe Refactoring

Follow this workflow to refactor safely.

First, create the new module or resource structure without deleting the old code. Add the `moved` blocks declaring the relationship between old and new addresses. Run `terraform plan` and verify that the plan shows moves, not destroys and creates. Look for lines that say "will be moved" rather than "will be destroyed" or "will be created."

```bash
# Run plan and carefully review the output
terraform plan

# You should see output like:
# azurerm_storage_account.data has moved to module.storage.azurerm_storage_account.main
```

Apply the changes once you are satisfied the plan is correct.

```bash
# Apply the refactoring
terraform apply
```

After the apply succeeds, you can optionally remove the `moved` blocks. They are only needed for the transition, but keeping them around does not hurt and serves as documentation of the refactoring history.

## When Moved Blocks Are Not Enough

There are limitations. Moved blocks only work for renaming and relocating resources within the same Terraform state. They do not work for moving resources between completely separate state files. For that, you need `terraform state mv` or the `terraform_remote_state` data source approach.

Also, moved blocks cannot change the resource type. You cannot use them to move from `azurerm_storage_account` to `azurerm_storage_account_v2`, for example. Type changes require an import and remove approach.

## Summary

Terraform moved blocks are essential for maintaining Azure infrastructure without downtime during refactoring. They handle resource renames, moves into modules, count-to-for_each conversions, and module restructuring. The key is always running `terraform plan` after adding moved blocks and verifying the output shows moves rather than destroy-and-create operations. With moved blocks in your toolkit, you can evolve your Terraform codebase structure without fear of disrupting production resources.

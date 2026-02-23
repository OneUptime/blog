# How to Handle Azure Resource Naming Conventions in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Naming Conventions, Best Practices, Infrastructure as Code, Cloud Architecture

Description: Learn how to implement consistent Azure resource naming conventions in Terraform using locals, variables, and the Azure CAF naming provider.

---

Naming Azure resources consistently sounds trivial until you have 500 resources spread across 20 subscriptions and nobody can tell which storage account belongs to which application. Good naming conventions make resources discoverable, reduce mistakes, and simplify automation. Terraform gives you the tools to enforce naming conventions programmatically, so every resource follows the same pattern without relying on human memory.

This guide covers practical approaches to implementing Azure naming conventions in Terraform, from simple locals-based patterns to the Azure Cloud Adoption Framework naming module.

## Why Naming Conventions Matter

Consider these two storage account names:

- `stprodeastusapp1data01`
- `mystorageaccount2`

The first one tells you: it is a storage account (st), in production (prod), in East US (eastus), for app1, serving as data storage. The second tells you nothing. When you are troubleshooting at 2 AM, that difference matters.

Good naming conventions:

- Make resources identifiable at a glance
- Prevent name collisions across environments
- Enable automated cost reporting and compliance scanning
- Simplify access control auditing
- Make Terraform state files more readable

## Azure Naming Constraints

Before building conventions, understand Azure's constraints. Every resource type has different rules:

| Resource Type | Max Length | Allowed Characters | Scope |
|---|---|---|---|
| Resource Group | 90 | Alphanumeric, hyphens, underscores, periods | Subscription |
| Storage Account | 24 | Lowercase alphanumeric only | Global |
| Virtual Machine | 64 (Linux), 15 (Windows) | Alphanumeric, hyphens | Resource Group |
| Key Vault | 24 | Alphanumeric, hyphens | Global |
| SQL Server | 63 | Lowercase alphanumeric, hyphens | Global |
| Virtual Network | 64 | Alphanumeric, hyphens, underscores, periods | Resource Group |

The biggest constraint is storage accounts: 24 characters, lowercase letters and numbers only, no hyphens. Any naming scheme must account for this.

## The Basic Pattern

The Microsoft Cloud Adoption Framework recommends this pattern:

```
{resource-type}-{workload}-{environment}-{region}-{instance}
```

Examples:
- `rg-webapi-prod-eastus` (resource group)
- `vm-webapi-prod-eastus-01` (virtual machine)
- `vnet-webapi-prod-eastus` (virtual network)
- `stwebapiprodus01` (storage account - no hyphens, abbreviated)

## Implementing with Terraform Locals

The simplest approach uses `locals` to build names:

```hcl
# variables.tf
variable "workload" {
  description = "Name of the workload or application"
  type        = string
  default     = "webapi"
}

variable "environment" {
  description = "Environment (prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "instance" {
  description = "Instance number for uniqueness"
  type        = string
  default     = "01"
}
```

```hcl
# locals.tf - Naming conventions
locals {
  # Short versions of common values
  env_short = {
    "production"  = "prod"
    "staging"     = "stg"
    "development" = "dev"
    "testing"     = "test"
  }

  region_short = {
    "eastus"        = "eus"
    "westus2"       = "wus2"
    "centralus"     = "cus"
    "westeurope"    = "weu"
    "northeurope"   = "neu"
    "southeastasia" = "sea"
  }

  env    = lookup(local.env_short, var.environment, var.environment)
  region = lookup(local.region_short, var.location, var.location)

  # Standard naming pattern with hyphens
  name_prefix = "${var.workload}-${local.env}-${local.region}"

  # Storage account naming (no hyphens, max 24 chars)
  storage_prefix = substr(
    replace("st${var.workload}${local.env}${local.region}", "-", ""),
    0,
    20  # Leave room for a 4-character suffix
  )

  # Resource-specific names
  names = {
    resource_group  = "rg-${local.name_prefix}"
    virtual_network = "vnet-${local.name_prefix}"
    subnet          = "snet-${local.name_prefix}"
    nsg             = "nsg-${local.name_prefix}"
    public_ip       = "pip-${local.name_prefix}"
    load_balancer   = "lb-${local.name_prefix}"
    vm_linux        = "vm-${local.name_prefix}"
    key_vault       = "kv-${local.name_prefix}"
    storage_account = "${local.storage_prefix}${var.instance}"
    sql_server      = "sql-${local.name_prefix}"
    app_service     = "app-${local.name_prefix}"
    function_app    = "func-${local.name_prefix}"
    aks_cluster     = "aks-${local.name_prefix}"
    acr             = replace("cr${var.workload}${local.env}${local.region}", "-", "")
    log_analytics   = "law-${local.name_prefix}"
    app_insights    = "ai-${local.name_prefix}"
  }
}
```

Now use these names in your resources:

```hcl
# All resources use consistent names from locals
resource "azurerm_resource_group" "main" {
  name     = local.names.resource_group
  location = var.location
}

resource "azurerm_virtual_network" "main" {
  name                = local.names.virtual_network
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_storage_account" "main" {
  name                     = local.names.storage_account
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Creating a Naming Module

For larger organizations, wrap the naming logic in a module:

```hcl
# modules/naming/variables.tf
variable "workload" {
  description = "Workload name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "instance" {
  description = "Instance identifier"
  type        = string
  default     = "01"
}
```

```hcl
# modules/naming/main.tf
locals {
  env_map = {
    "production"  = "prod"
    "staging"     = "stg"
    "development" = "dev"
  }

  region_map = {
    "eastus"     = "eus"
    "westus2"    = "wus2"
    "westeurope" = "weu"
  }

  env    = lookup(local.env_map, var.environment, var.environment)
  region = lookup(local.region_map, var.location, var.location)
  prefix = "${var.workload}-${local.env}-${local.region}"
}
```

```hcl
# modules/naming/outputs.tf
output "resource_group" {
  value = "rg-${local.prefix}"
}

output "virtual_network" {
  value = "vnet-${local.prefix}"
}

output "subnet" {
  value = "snet-${local.prefix}"
}

output "storage_account" {
  value = substr(replace("st${var.workload}${local.env}${local.region}${var.instance}", "-", ""), 0, 24)
}

output "key_vault" {
  value = substr("kv-${local.prefix}", 0, 24)
}

output "vm" {
  value = "vm-${local.prefix}-${var.instance}"
}

output "aks" {
  value = "aks-${local.prefix}"
}

output "acr" {
  value = substr(replace("cr${var.workload}${local.env}${local.region}", "-", ""), 0, 50)
}
```

Use the module:

```hcl
module "naming" {
  source      = "./modules/naming"
  workload    = "webapi"
  environment = "production"
  location    = "eastus"
}

resource "azurerm_resource_group" "main" {
  name     = module.naming.resource_group
  location = "East US"
}

resource "azurerm_storage_account" "main" {
  name                     = module.naming.storage_account
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

## Validation

Add validation rules to catch naming issues early:

```hcl
variable "workload" {
  description = "Workload name - lowercase, alphanumeric, and hyphens only"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.workload))
    error_message = "Workload name must be lowercase alphanumeric with hyphens only."
  }

  validation {
    condition     = length(var.workload) <= 15
    error_message = "Workload name must be 15 characters or less to fit within Azure naming limits."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["production", "staging", "development", "testing"], var.environment)
    error_message = "Environment must be one of: production, staging, development, testing."
  }
}
```

## Using the Azure Naming Provider

The community-maintained Azure naming provider generates names according to CAF conventions:

```hcl
terraform {
  required_providers {
    azurecaf = {
      source  = "aztfmod/azurecaf"
      version = "~> 1.2"
    }
  }
}

# Generate a name for a resource group
resource "azurecaf_name" "resource_group" {
  name          = var.workload
  resource_type = "azurerm_resource_group"
  suffixes      = [var.environment, var.location]
  clean_input   = true
}

# Generate a name for a storage account
resource "azurecaf_name" "storage" {
  name          = var.workload
  resource_type = "azurerm_storage_account"
  suffixes      = [var.environment]
  clean_input   = true
}

# Use the generated names
resource "azurerm_resource_group" "main" {
  name     = azurecaf_name.resource_group.result
  location = var.location
}

resource "azurerm_storage_account" "main" {
  name                     = azurecaf_name.storage.result
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

The provider knows the naming rules for each Azure resource type and generates names that comply with length limits and character restrictions.

## Best Practices

**Document your convention.** Write it down and share it with your team. A naming convention that exists only in one person's head is not a convention.

**Keep it simple.** A complex naming scheme with 8 segments is harder to follow than a simple 4-segment one. Include only the information you actually need.

**Account for global uniqueness.** Storage accounts, Key Vaults, and SQL Servers need globally unique names. Include enough specificity in the name to avoid collisions.

**Automate enforcement.** Use Azure Policy to deny resource creation if names do not match your pattern. The naming convention is only useful if everyone follows it.

**Plan for character limits.** Test your naming convention with the longest possible input values to make sure names do not exceed Azure limits.

## Wrapping Up

Consistent naming in Azure is a solved problem if you invest the time upfront. Use Terraform locals for simple setups, a naming module for team-wide consistency, or the Azure CAF naming provider for automatic compliance with Microsoft's recommended patterns. Whatever approach you choose, the key is automation - names generated by code are always consistent, names typed by humans are not.

For more on Azure governance patterns, see [How to Use Azure CAF Module for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-azure-caf-module-for-terraform/view).

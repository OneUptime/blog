# How to Create a Resource Group with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Resource Group, Infrastructure as Code, Organisation

Description: Learn how to create and manage Azure Resource Groups with OpenTofu as the foundational container for organising and managing Azure resources.

## Introduction

Resource Groups are the fundamental organisational unit in Azure. Most Azure resources belong to exactly one resource group, although some resource types exist at the subscription, management group, or tenant scope. OpenTofu commonly manages resource groups early in Azure deployments, and the examples below assume the `azurerm` provider is already configured for your target subscription.

## Basic Resource Group

```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project}-${var.environment}-${var.location_short}"
  location = var.location

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "opentofu"
    Owner       = var.owner_email
  }
}
```

## Multiple Resource Groups by Tier

Separate resource groups for networking, application, and data tiers improve access control and cost visibility:

```hcl
locals {
  rg_prefix = "rg-${var.project}-${var.environment}"
}

resource "azurerm_resource_group" "networking" {
  name     = "${local.rg_prefix}-networking"
  location = var.location
  tags     = merge(var.common_tags, { Tier = "networking" })
}

resource "azurerm_resource_group" "application" {
  name     = "${local.rg_prefix}-application"
  location = var.location
  tags     = merge(var.common_tags, { Tier = "application" })
}

resource "azurerm_resource_group" "data" {
  name     = "${local.rg_prefix}-data"
  location = var.location
  tags     = merge(var.common_tags, { Tier = "data" })
}
```

## Dynamic Resource Groups from a Map

```hcl
variable "resource_groups" {
  type = map(object({
    location = string
    tags     = map(string)
  }))
}

resource "azurerm_resource_group" "all" {
  for_each = var.resource_groups

  name     = each.key
  location = each.value.location
  tags     = each.value.tags
}
```

Resource Group with Management Lock

```hcl
resource "azurerm_resource_group" "production" {
  name     = "rg-myapp-prod"
  location = "East US"
}

# Prevent accidental deletion of the production resource group

resource "azurerm_management_lock" "production" {
  name       = "production-lock"
  scope      = azurerm_resource_group.production.id
  lock_level = "CanNotDelete"
  notes      = "Production resource group - do not delete without change management approval"
}
```

## Variables and Outputs

```hcl
variable "project"        { type = string }
variable "environment"    { type = string }
variable "location"       { type = string; default = "East US" }
variable "location_short" { type = string; default = "eastus" }
variable "owner_email"    { type = string }
variable "common_tags"    { type = map(string); default = {} }

output "resource_group_name" { value = azurerm_resource_group.main.name }
output "resource_group_id"   { value = azurerm_resource_group.main.id }
output "location"            { value = azurerm_resource_group.main.location }
```

## Naming Convention

Azure resource group naming best practices:
- `rg-{project}-{environment}-{region}` (e.g., `rg-ecommerce-prod-eastus`)
- Keep names under 90 characters
- Use lowercase letters, numbers, hyphens, and underscores only

## Conclusion

Resource groups are the containers for most Azure resources deployed at resource-group scope. Separate them by tier for fine-grained RBAC and cost reporting, apply management locks to production groups, and enforce consistent naming and tagging conventions from the start.

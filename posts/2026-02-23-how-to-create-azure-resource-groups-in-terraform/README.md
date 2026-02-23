# How to Create Azure Resource Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Resource Groups, Infrastructure as Code, Cloud

Description: A practical guide to creating and managing Azure Resource Groups with Terraform, including naming conventions, tagging, locks, and organizational patterns.

---

In Azure, every resource lives inside a resource group. Resource groups are containers that hold related resources for a solution - they define the scope for access control, policy, and cost management. You cannot create a virtual machine, database, or storage account without first placing it in a resource group.

This makes resource groups the first thing you create in any Azure Terraform project. Getting the structure right early saves you from painful reorganizations later. This guide covers how to create resource groups, apply tags and locks, and organize them for real-world projects.

## Prerequisites

- Terraform 1.0 or later
- Azure CLI installed and authenticated (`az login`)
- An Azure subscription
- Basic familiarity with Terraform HCL

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Creating a Basic Resource Group

```hcl
# A simple resource group
resource "azurerm_resource_group" "main" {
  name     = "rg-myapp-prod-eastus"
  location = "East US"

  tags = {
    Environment = "production"
    Project     = "myapp"
    ManagedBy   = "terraform"
  }
}
```

The `name` and `location` are required. Once created, the location cannot be changed - you would have to destroy and recreate the resource group (and everything in it).

## Naming Conventions

A consistent naming convention makes resource groups discoverable. The Microsoft recommended pattern is:

```
rg-<app-or-service>-<environment>-<region>-<instance>
```

Here is how to implement this with variables:

```hcl
variable "app_name" {
  description = "Application or service name"
  type        = string
  default     = "webapp"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

# Mapping of location names to short codes for naming
locals {
  location_short = {
    "eastus"        = "eus"
    "eastus2"       = "eus2"
    "westus"        = "wus"
    "westus2"       = "wus2"
    "westeurope"    = "weu"
    "northeurope"   = "neu"
    "southeastasia" = "sea"
  }
}

resource "azurerm_resource_group" "app" {
  name     = "rg-${var.app_name}-${var.environment}-${local.location_short[var.location]}"
  location = var.location

  tags = {
    Environment = var.environment
    Application = var.app_name
    ManagedBy   = "terraform"
  }
}
```

## Creating Multiple Resource Groups

Most projects need more than one resource group. A common pattern separates resources by function:

```hcl
# Define resource group configurations
locals {
  resource_groups = {
    networking = {
      name     = "rg-${var.app_name}-networking-${var.environment}"
      purpose  = "Virtual networks, NSGs, and load balancers"
    }
    compute = {
      name     = "rg-${var.app_name}-compute-${var.environment}"
      purpose  = "Virtual machines and scale sets"
    }
    data = {
      name     = "rg-${var.app_name}-data-${var.environment}"
      purpose  = "Databases and storage accounts"
    }
    monitoring = {
      name     = "rg-${var.app_name}-monitoring-${var.environment}"
      purpose  = "Log Analytics, Application Insights, and alerts"
    }
    shared = {
      name     = "rg-${var.app_name}-shared-${var.environment}"
      purpose  = "Key Vault, container registry, and shared resources"
    }
  }

  # Standard tags for all resource groups
  common_tags = {
    Environment = var.environment
    Application = var.app_name
    ManagedBy   = "terraform"
    CostCenter  = var.cost_center
  }
}

# Create all resource groups
resource "azurerm_resource_group" "groups" {
  for_each = local.resource_groups

  name     = each.value.name
  location = var.location

  tags = merge(local.common_tags, {
    Purpose = each.value.purpose
    Layer   = each.key
  })
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}
```

## Resource Group Locks

Locks prevent accidental deletion. This is especially important for production resource groups containing stateful resources like databases:

```hcl
# Production resource group with a delete lock
resource "azurerm_resource_group" "production" {
  name     = "rg-myapp-prod-eus"
  location = "East US"

  tags = {
    Environment = "production"
  }
}

# Prevent accidental deletion of the entire resource group
resource "azurerm_management_lock" "production_lock" {
  name       = "production-nodelete"
  scope      = azurerm_resource_group.production.id
  lock_level = "CanNotDelete"
  notes      = "This resource group contains production resources. Remove lock before destroying."
}

# Read-only lock prevents any modifications (use sparingly)
resource "azurerm_management_lock" "critical_readonly" {
  name       = "critical-readonly"
  scope      = azurerm_resource_group.production.id
  lock_level = "ReadOnly"
  notes      = "Critical infrastructure - read only"
}
```

Be careful with ReadOnly locks. They prevent not just manual changes but also Terraform operations and auto-scaling. CanNotDelete is usually the better choice.

## Role-Based Access Control

Assign permissions at the resource group level:

```hcl
# Data source for an Azure AD group
data "azuread_group" "developers" {
  display_name     = "Developers"
  security_enabled = true
}

# Give the developers group Contributor access to the dev resource group
resource "azurerm_role_assignment" "dev_contributor" {
  scope                = azurerm_resource_group.groups["compute"].id
  role_definition_name = "Contributor"
  principal_id         = data.azuread_group.developers.object_id
}

# Read-only access for a monitoring team
data "azuread_group" "monitoring" {
  display_name     = "Monitoring Team"
  security_enabled = true
}

resource "azurerm_role_assignment" "monitoring_reader" {
  scope                = azurerm_resource_group.groups["monitoring"].id
  role_definition_name = "Reader"
  principal_id         = data.azuread_group.monitoring.object_id
}
```

## Azure Policy Assignment

Apply policies to resource groups to enforce standards:

```hcl
# Built-in policy: Require a tag on resources
data "azurerm_policy_definition" "require_tag" {
  display_name = "Require a tag on resources"
}

# Enforce the Environment tag on all resources in production
resource "azurerm_resource_group_policy_assignment" "require_env_tag" {
  name                 = "require-environment-tag"
  resource_group_id    = azurerm_resource_group.production.id
  policy_definition_id = data.azurerm_policy_definition.require_tag.id

  parameters = jsonencode({
    tagName = {
      value = "Environment"
    }
  })
}
```

## Cost Management

Track spending per resource group:

```hcl
# Budget scoped to a resource group
resource "azurerm_consumption_budget_resource_group" "monthly" {
  name              = "monthly-budget"
  resource_group_id = azurerm_resource_group.production.id

  amount     = 5000
  time_grain = "Monthly"

  time_period {
    start_date = "2026-01-01T00:00:00Z"
    end_date   = "2026-12-31T00:00:00Z"
  }

  notification {
    enabled   = true
    threshold = 80
    operator  = "GreaterThanOrEqualTo"

    contact_emails = ["team@example.com"]
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThanOrEqualTo"
    threshold_type = "Forecasted"

    contact_emails = ["team@example.com", "manager@example.com"]
  }
}
```

## Multi-Environment Pattern

A module-based approach for creating consistent resource groups across environments:

```hcl
# Variables for multi-environment setup
variable "environments" {
  description = "Map of environments and their configurations"
  type = map(object({
    location   = string
    lock       = bool
    budget     = number
  }))
  default = {
    dev = {
      location = "eastus"
      lock     = false
      budget   = 500
    }
    staging = {
      location = "eastus"
      lock     = false
      budget   = 1000
    }
    prod = {
      location = "eastus"
      lock     = true
      budget   = 5000
    }
  }
}

# Create resource groups for each environment
resource "azurerm_resource_group" "env_groups" {
  for_each = var.environments

  name     = "rg-myapp-${each.key}-${each.value.location}"
  location = each.value.location

  tags = {
    Environment = each.key
    ManagedBy   = "terraform"
  }
}

# Apply locks only where configured
resource "azurerm_management_lock" "env_locks" {
  for_each = {
    for k, v in var.environments : k => v if v.lock
  }

  name       = "${each.key}-nodelete"
  scope      = azurerm_resource_group.env_groups[each.key].id
  lock_level = "CanNotDelete"
  notes      = "Protected ${each.key} resource group"
}
```

## Outputs

```hcl
output "resource_group_ids" {
  description = "IDs of created resource groups"
  value = {
    for k, v in azurerm_resource_group.groups : k => v.id
  }
}

output "resource_group_names" {
  description = "Names of created resource groups"
  value = {
    for k, v in azurerm_resource_group.groups : k => v.name
  }
}

output "resource_group_locations" {
  description = "Locations of created resource groups"
  value = {
    for k, v in azurerm_resource_group.groups : k => v.location
  }
}
```

## Monitoring Resource Groups

Use OneUptime to monitor the health and performance of resources across your resource groups. Group-level dashboards make it easy to see the status of all resources belonging to a particular application or team, and alert on issues before they affect users.

## Summary

Resource groups are the organizational backbone of any Azure deployment. Getting the naming, tagging, and access control right at this level pays dividends as your infrastructure grows. Use Terraform's `for_each` to create consistent groups across environments, apply delete locks to production groups, and set budgets to avoid cost surprises. Everything else you build in Azure depends on this foundation being solid.

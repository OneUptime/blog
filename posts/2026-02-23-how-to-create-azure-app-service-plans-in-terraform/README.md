# How to Create Azure App Service Plans in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, App Service, PaaS, Hosting, Infrastructure as Code

Description: Learn how to create and configure Azure App Service Plans with Terraform, covering pricing tiers, scaling options, and platform configurations for web app hosting.

---

An Azure App Service Plan defines the compute resources that run your web apps, API apps, and function apps. It specifies the region, instance size, instance count, and pricing tier. Think of it as the server farm that hosts your applications - you can run multiple apps on the same plan to share resources and reduce costs.

Managing App Service Plans through Terraform lets you standardize your hosting configurations across environments and teams. This guide covers creating plans for different tiers, configuring auto-scaling, and organizing plans for multiple applications.

## Prerequisites

- Terraform 1.0 or later
- Azure CLI authenticated
- An Azure subscription
- A resource group

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

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}
```

## Resource Group

```hcl
resource "azurerm_resource_group" "apps" {
  name     = "rg-apps-prod-eus"
  location = var.location

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Understanding Pricing Tiers

App Service Plans come in several tiers:

- **Free (F1)** and **Shared (D1)**: For development and testing. Limited features, shared infrastructure.
- **Basic (B1, B2, B3)**: Dedicated compute, no auto-scaling. Good for low-traffic apps.
- **Standard (S1, S2, S3)**: Auto-scaling, deployment slots, daily backups. The minimum for production.
- **Premium (P1v3, P2v3, P3v3)**: Better performance, more scaling options, VNet integration.
- **Isolated (I1v2, I2v2, I3v2)**: Runs in an App Service Environment for full network isolation.

## Creating a Basic App Service Plan

```hcl
# Standard tier plan for production web apps
resource "azurerm_service_plan" "standard" {
  name                = "asp-webapp-prod"
  location            = azurerm_resource_group.apps.location
  resource_group_name = azurerm_resource_group.apps.name

  # OS type: Windows or Linux
  os_type = "Linux"

  # SKU name determines the pricing tier and instance size
  sku_name = "S1"

  tags = {
    Environment = "production"
    Tier        = "standard"
  }
}
```

## Premium Plan with More Capacity

```hcl
# Premium plan for high-traffic applications
resource "azurerm_service_plan" "premium" {
  name                = "asp-webapp-premium-prod"
  location            = azurerm_resource_group.apps.location
  resource_group_name = azurerm_resource_group.apps.name
  os_type             = "Linux"
  sku_name            = "P2v3"

  # Set the number of workers (instances)
  worker_count = 3

  # Enable zone redundancy for high availability
  zone_balancing_enabled = true

  tags = {
    Environment = "production"
    Tier        = "premium"
  }
}
```

## Windows App Service Plan

```hcl
# Windows plan for .NET applications
resource "azurerm_service_plan" "windows" {
  name                = "asp-dotnet-prod"
  location            = azurerm_resource_group.apps.location
  resource_group_name = azurerm_resource_group.apps.name

  os_type  = "Windows"
  sku_name = "S2"

  tags = {
    Environment = "production"
    Platform    = "dotnet"
  }
}
```

## Free Tier for Development

```hcl
# Free plan for development and testing
resource "azurerm_service_plan" "dev" {
  name                = "asp-webapp-dev"
  location            = azurerm_resource_group.apps.location
  resource_group_name = azurerm_resource_group.apps.name
  os_type             = "Linux"
  sku_name            = "F1"

  tags = {
    Environment = "development"
    Tier        = "free"
  }
}
```

## Autoscale Configuration

Standard and Premium plans support automatic scaling:

```hcl
# Autoscale settings for the standard plan
resource "azurerm_monitor_autoscale_setting" "app_plan" {
  name                = "autoscale-asp-prod"
  location            = azurerm_resource_group.apps.location
  resource_group_name = azurerm_resource_group.apps.name
  target_resource_id  = azurerm_service_plan.standard.id

  profile {
    name = "default"

    capacity {
      default = 2
      minimum = 2
      maximum = 8
    }

    # Scale out when CPU is high
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.standard.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 70
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    # Scale in when CPU is low
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.standard.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 25
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }

    # Scale based on memory usage
    rule {
      metric_trigger {
        metric_name        = "MemoryPercentage"
        metric_resource_id = azurerm_service_plan.standard.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 80
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    # Scale based on HTTP queue length
    rule {
      metric_trigger {
        metric_name        = "HttpQueueLength"
        metric_resource_id = azurerm_service_plan.standard.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 100
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "2"
        cooldown  = "PT5M"
      }
    }
  }

  # Send notifications on scale events
  notification {
    email {
      custom_emails = ["ops@example.com"]
    }
  }

  tags = {
    Environment = "production"
  }
}
```

## Multiple Plans for Different Workloads

Organize plans by workload type and environment:

```hcl
locals {
  app_service_plans = {
    web_prod = {
      name     = "asp-web-prod"
      os_type  = "Linux"
      sku_name = "P1v3"
      workers  = 2
      zone_redundant = true
    }
    api_prod = {
      name     = "asp-api-prod"
      os_type  = "Linux"
      sku_name = "P2v3"
      workers  = 3
      zone_redundant = true
    }
    web_staging = {
      name     = "asp-web-staging"
      os_type  = "Linux"
      sku_name = "S1"
      workers  = 1
      zone_redundant = false
    }
    functions_prod = {
      name     = "asp-functions-prod"
      os_type  = "Linux"
      sku_name = "EP1"
      workers  = 1
      zone_redundant = false
    }
  }
}

resource "azurerm_service_plan" "plans" {
  for_each = local.app_service_plans

  name                   = each.value.name
  location               = azurerm_resource_group.apps.location
  resource_group_name    = azurerm_resource_group.apps.name
  os_type                = each.value.os_type
  sku_name               = each.value.sku_name
  worker_count           = each.value.workers
  zone_balancing_enabled = each.value.zone_redundant

  tags = {
    Environment = contains(each.key, "prod") ? "production" : "staging"
    ManagedBy   = "terraform"
  }
}
```

## App Service Environment (Isolated Plan)

For workloads requiring full network isolation:

```hcl
# Note: App Service Environment v3 requires significant setup
# including a dedicated subnet. This shows the plan portion.

resource "azurerm_service_plan" "isolated" {
  name                = "asp-isolated-prod"
  location            = azurerm_resource_group.apps.location
  resource_group_name = azurerm_resource_group.apps.name
  os_type             = "Linux"
  sku_name            = "I1v2"

  # Associate with an App Service Environment
  # app_service_environment_id = azurerm_app_service_environment_v3.main.id

  worker_count = 2

  tags = {
    Environment = "production"
    Isolation   = "full"
  }
}
```

## Outputs

```hcl
output "standard_plan_id" {
  description = "ID of the standard App Service Plan"
  value       = azurerm_service_plan.standard.id
}

output "premium_plan_id" {
  description = "ID of the premium App Service Plan"
  value       = azurerm_service_plan.premium.id
}

output "all_plan_ids" {
  description = "IDs of all App Service Plans"
  value = {
    for k, v in azurerm_service_plan.plans : k => v.id
  }
}
```

## Monitoring App Service Plans

The plan-level metrics tell you about the underlying infrastructure, while app-level metrics tell you about your application. Monitor both through OneUptime to understand whether performance issues come from the platform or your code. High CPU on the plan with normal CPU on the app might mean another app on the same plan is consuming resources.

For deploying web apps on these plans, see our guide at https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-web-apps-in-terraform/view.

## Cost Optimization Tips

- Put apps with similar resource needs on the same plan to share compute.
- Use the Free or Basic tier for development environments.
- Enable auto-scaling on Standard and Premium plans to avoid paying for idle capacity.
- Consider zone redundancy only for production workloads that need high availability.
- Review your plans periodically - if a Premium plan is consistently running below 30% CPU, you might be overprovisioned.

## Summary

App Service Plans are the compute foundation for all your Azure web apps and functions. By defining them in Terraform, you maintain consistent configurations across environments and can easily spin up new plans for new projects. Start with Standard for production and scale up to Premium only when you need the additional features or performance. The auto-scaling configuration ensures you have enough capacity during peak times without paying for idle resources overnight.

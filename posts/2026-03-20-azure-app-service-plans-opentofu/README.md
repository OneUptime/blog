# How to Create Azure App Service Plans with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, OpenTofu, Infrastructure, Web Hosting, PaaS

Description: Learn how to create and configure Azure App Service Plans with OpenTofu, including different pricing tiers, operating systems, and zone redundancy for hosting web applications.

## Overview

Azure App Service Plans define the compute resources for running App Service apps. OpenTofu manages App Service Plans with various tiers from Free to Isolated, supporting Windows and Linux workloads.

## Step 1: Create a Premium v3 App Service Plan

```hcl
# main.tf - Premium v3 App Service Plan for production web apps

resource "azurerm_service_plan" "standard_plan" {
  name                = "my-app-service-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  # Operating system for the plan
  os_type  = "Linux"

  # SKU determines pricing tier and features
  # B1=Basic, S1=Standard, P1v3=Premium v3
  sku_name = "P1v3"

  tags = {
    Environment = "production"
  }
}
```

## Step 2: Zone-Redundant Premium Plan

```hcl
# Zone-redundant plan for high availability on a supported Premium tier
resource "azurerm_service_plan" "zone_redundant_plan" {
  name                = "ha-app-service-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "P2v3"  # Premium v3, 4 vCores

  # Azure distributes instances across available availability zones automatically
  zone_balancing_enabled = true

  # Minimum 2 instances required for zone redundancy
  worker_count = 2
}
```

## Step 3: Windows App Service Plan for .NET Apps

```hcl
# Windows App Service Plan for .NET Framework workloads
resource "azurerm_service_plan" "windows_plan" {
  name                = "dotnet-app-service-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Windows"
  sku_name            = "S2"  # Standard tier, 2 vCores

  worker_count = 2
}
```

## Step 4: Environment-Based Plans with Variables

```hcl
# variables.tf - Define plan sizes per environment
variable "environment" {
  type    = string
  default = "production"
}

# Map environment to appropriate SKU
locals {
  plan_sku = {
    development = "B1"   # Basic - low-cost dedicated compute
    staging     = "S1"   # Standard - autoscale, deployment slots
    production  = "P2v3" # Premium - zone redundancy support, larger scale
  }
}

resource "azurerm_service_plan" "env_plan" {
  name                = "${var.environment}-app-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  # Automatically select SKU based on environment
  sku_name            = local.plan_sku[var.environment]
}
```

## Step 5: Isolated App Service Environment Plan

```hcl
# Isolated plan runs in a dedicated App Service Environment (ASE)
resource "azurerm_service_plan" "isolated_plan" {
  name                       = "isolated-app-plan"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  os_type                    = "Linux"
  sku_name                   = "I2v2"  # Isolated v2

  # Must reference an App Service Environment
  app_service_environment_id = azurerm_app_service_environment_v3.ase.id
}
```

## Step 6: Outputs

```hcl
output "service_plan_id" {
  value       = azurerm_service_plan.standard_plan.id
  description = "App Service Plan ID for attaching web apps"
}

output "service_plan_sku" {
  value = azurerm_service_plan.standard_plan.sku_name
}
```

## Summary

Azure App Service Plans managed with OpenTofu provide the foundation for hosting web applications. Using environment-based SKU variables ensures development environments use cost-effective tiers while production can use Premium plans with larger scale and support for zone-redundant deployments.

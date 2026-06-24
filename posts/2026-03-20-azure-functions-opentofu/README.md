# How to Deploy Azure Functions with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Infrastructure as Code, IaC, Azure Function, Serverless

Description: Learn how to deploy Azure Functions with consumption and premium plans, storage accounts, and application insights using OpenTofu.

## Introduction

This guide covers how to deploy Azure Functions with OpenTofu using the current AzureRM resources. You will create a Windows Function App on the Consumption plan and a Linux Function App on the Elastic Premium plan, along with storage accounts, Log Analytics, and Application Insights. This configuration provisions the Function App infrastructure; publish your function code separately with Azure Functions Core Tools, Azure CLI, or another deployment workflow. For new Linux serverless deployments, Azure recommends Flex Consumption instead of the legacy Linux Consumption plan.

## Prerequisites

- OpenTofu v1.6+
- An Azure subscription and credentials with permission to create App Service, Storage, and Azure Monitor resources
- A short lowercase alphanumeric prefix you can use for globally unique Azure resource names

## Step 1: Configure the Provider

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
```

## Step 2: Define Variables

```hcl
variable "subscription_id" {
  description = "Azure Subscription ID"
  type        = string
}

variable "name_prefix" {
  description = "Short lowercase alphanumeric prefix used for globally unique Azure names"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "rg-functions-production"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "app_principal_id" {
  description = "Optional Microsoft Entra object ID for a deployment principal"
  type        = string
  default     = ""
}

variable "monitor_principal_id" {
  description = "Optional Microsoft Entra object ID for a monitoring principal"
  type        = string
  default     = ""
}
```

## Step 3: Create Core Resources

```hcl
locals {
  tags = {
    Environment = var.environment
    ManagedBy   = "OpenTofu"
  }
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = local.tags
}

resource "azurerm_storage_account" "consumption" {
  name                     = substr("${var.name_prefix}consa", 0, 24)
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = local.tags
}

resource "azurerm_storage_account" "premium" {
  name                     = substr("${var.name_prefix}premsa", 0, 24)
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = local.tags
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-${var.name_prefix}-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_application_insights" "main" {
  name                = "appi-${var.name_prefix}-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.main.id
  tags                = local.tags
}

resource "azurerm_service_plan" "consumption" {
  name                = "asp-${var.name_prefix}-cons"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Windows"
  sku_name            = "Y1"
  tags                = local.tags
}

resource "azurerm_service_plan" "premium" {
  name                = "asp-${var.name_prefix}-premium"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "EP1"
  tags                = local.tags
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "azurerm_windows_function_app" "consumption" {
  name                = substr("${var.name_prefix}-cons-func", 0, 32)
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.consumption.id

  storage_account_name       = azurerm_storage_account.consumption.name
  storage_account_access_key = azurerm_storage_account.consumption.primary_access_key

  functions_extension_version = "~4"
  https_only                  = true

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_insights_connection_string = azurerm_application_insights.main.connection_string
    ftps_state                             = "Disabled"
    http2_enabled                          = true
    minimum_tls_version                    = "1.2"
    scm_minimum_tls_version                = "1.2"

    application_stack {
      node_version = "~20"
    }
  }

  tags = local.tags
}

resource "azurerm_linux_function_app" "premium" {
  name                = substr("${var.name_prefix}-prem-func", 0, 32)
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.premium.id

  storage_account_name       = azurerm_storage_account.premium.name
  storage_account_access_key = azurerm_storage_account.premium.primary_access_key

  functions_extension_version = "~4"
  https_only                  = true

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_insights_connection_string = azurerm_application_insights.main.connection_string
    elastic_instance_minimum               = 1
    ftps_state                             = "Disabled"
    http2_enabled                          = true
    minimum_tls_version                    = "1.2"
    pre_warmed_instance_count              = 1
    runtime_scale_monitoring_enabled       = true
    scm_minimum_tls_version                = "1.2"

    application_stack {
      python_version = "3.11"
    }
  }

  tags = local.tags
}
```

## Step 5: Set Up Access Control

```hcl
# Optional RBAC assignments
resource "azurerm_role_assignment" "app_contributor" {
  count                = var.app_principal_id == "" ? 0 : 1
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = var.app_principal_id
}

resource "azurerm_role_assignment" "monitor_reader" {
  count                = var.monitor_principal_id == "" ? 0 : 1
  scope                = azurerm_application_insights.main.id
  role_definition_name = "Monitoring Reader"
  principal_id         = var.monitor_principal_id
}
```

## Step 6: Define Outputs

```hcl
output "consumption_function_app_name" {
  description = "The Consumption plan Function App name"
  value       = azurerm_windows_function_app.consumption.name
}

output "consumption_function_app_hostname" {
  description = "The Consumption plan Function App hostname"
  value       = azurerm_windows_function_app.consumption.default_hostname
}

output "premium_function_app_name" {
  description = "The Elastic Premium plan Function App name"
  value       = azurerm_linux_function_app.premium.name
}

output "premium_function_app_hostname" {
  description = "The Elastic Premium plan Function App hostname"
  value       = azurerm_linux_function_app.premium.default_hostname
}
```

## Step 7: Deploy

```bash
# Initialize OpenTofu
tofu init

# Preview changes
tofu plan -var-file="production.tfvars"

# Apply configuration
tofu apply -var-file="production.tfvars"
```

These commands create the Azure infrastructure. Publish your function code separately after the Function Apps are provisioned.

## Best Practices

- Use a dedicated storage account per production Function App to reduce the risk of host ID collisions and noisy-neighbor effects
- Keep the storage account in the same region as the Function App when possible
- Use workspace-based Application Insights for production monitoring
- Use Elastic Premium or Flex Consumption when you need advanced networking or always-ready capacity
- Follow Azure naming rules for globally unique Function App and Storage Account names

## Conclusion

You have successfully deployed Azure Functions with OpenTofu by provisioning a Windows Consumption plan app and a Linux Elastic Premium app, each with its own storage account and shared monitoring resources. This configuration uses current AzureRM resources, workspace-based Application Insights, and HTTPS/TLS hardening. OpenTofu provisions the Function App infrastructure, and you can publish your application code separately once the apps exist. Adapt the configuration to your specific requirements and, for new Linux serverless workloads, consider Flex Consumption as Azure's recommended plan.

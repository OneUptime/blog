# How to Deploy Azure Functions with OpenTofu - Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Azure Function, Serverless, Terraform

Description: Deploy Azure Functions serverless compute using OpenTofu, including consumption plan, storage accounts, app settings, and CI/CD integration.

## Introduction

Azure Functions is Microsoft's serverless compute platform. You pay only for execution time, and it scales automatically. This guide deploys a Function App with a Consumption plan using OpenTofu and the AzureRM provider.

## Prerequisites

- OpenTofu installed (`tofu version`)
- Azure CLI authenticated (`az login`)
- An Azure subscription

## Step 1: Configure the AzureRM Provider

```hcl
# versions.tf

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Step 2: Core Resources - Resource Group, Storage, App Service Plan

```hcl
# main.tf
variable "location" {
  default = "eastus"
}

variable "resource_group_name" {
  default = "rg-functions-demo"
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# Storage account required by Azure Functions runtime
resource "azurerm_storage_account" "sa" {
  name                     = "stfuncdemo${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Consumption plan (Y1 SKU = serverless, pay-per-execution)
resource "azurerm_service_plan" "plan" {
  name                = "asp-functions-demo"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "Y1"
}
```

## Step 3: Deploy the Function App

```hcl
resource "azurerm_linux_function_app" "func" {
  name                = "func-demo-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  storage_account_name       = azurerm_storage_account.sa.name
  storage_account_access_key = azurerm_storage_account.sa.primary_access_key
  service_plan_id            = azurerm_service_plan.plan.id

  site_config {
    application_stack {
      python_version = "3.11"
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "python"
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"
    "ENABLE_ORYX_BUILD"              = "true"
    "AzureWebJobsDisableHomepage"    = "true"
    "DATABASE_URL"                   = var.database_url
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "demo"
  }
}

variable "database_url" {
  description = "Database connection string for the function app"
  sensitive   = true
}
```

## Step 4: Application Insights for Monitoring

```hcl
resource "azurerm_application_insights" "ai" {
  name                = "ai-functions-demo"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"
}

# Add to function app app_settings:
# "APPINSIGHTS_INSTRUMENTATIONKEY" = azurerm_application_insights.ai.instrumentation_key
# "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.ai.connection_string
```

## Step 5: Deploy and Verify

```bash
tofu init
tofu plan
tofu apply

# Get the function app hostname
tofu output function_app_url
```

```hcl
# outputs.tf
output "function_app_url" {
  value = "https://${azurerm_linux_function_app.func.default_hostname}"
}

output "function_app_identity_principal_id" {
  value = azurerm_linux_function_app.func.identity[0].principal_id
}
```

## Step 6: Deploy Function Code via Azure CLI

```bash
# Package and deploy function code
cd my-function-app
func azure functionapp publish func-demo-<suffix>

# Or use zip deploy
zip -r function.zip . -x "*.git*"
az functionapp deployment source config-zip \
  --resource-group rg-functions-demo \
  --name func-demo-<suffix> \
  --src function.zip
```

## Conclusion

Azure Functions on a Consumption (`Y1`) plan provides true serverless scaling - you pay only per execution and the runtime scales to zero when idle. Use `SystemAssigned` managed identity to grant the function app access to other Azure resources (Key Vault, Storage, SQL) without storing credentials. Application Insights integration provides distributed tracing and live metrics. For predictable, high-throughput workloads, consider the Premium (`EP1/EP2/EP3`) plan which eliminates cold starts.

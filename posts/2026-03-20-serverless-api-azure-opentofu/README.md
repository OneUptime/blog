# How to Build a Serverless API Backend with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Serverless, Azure Function, API Management, OpenTofu, Cosmos DB

Description: Learn how to build a serverless API backend on Azure using OpenTofu with Azure Functions, API Management, Cosmos DB, and Azure AD authentication.

## Overview

A serverless API on Azure uses Azure Functions for compute, Cosmos DB for serverless data storage, and API Management for routing and governance. OpenTofu provisions the stack and assigns a system-assigned managed identity to the Function App for Key Vault references.

## Step 1: Storage and Function App Infrastructure

```hcl
# main.tf - Storage account required by Azure Functions

resource "azurerm_storage_account" "functions" {
  name                     = "funcappstorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# App Service Plan for Functions (Consumption or Premium)
resource "azurerm_service_plan" "functions" {
  name                = "serverless-func-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption (serverless)
}

# Azure Function App
resource "azurerm_linux_function_app" "api" {
  name                       = "serverless-api-func"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  service_plan_id            = azurerm_service_plan.functions.id
  storage_account_name       = azurerm_storage_account.functions.name
  storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_insights_connection_string = azurerm_application_insights.insights.connection_string

    application_stack {
      node_version = "20"
    }

    cors {
      allowed_origins = ["https://app.example.com"]
    }
  }

  app_settings = {
    COSMOS_DB_CONNECTION     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.cosmos_conn.versionless_id})"
    AAD_CLIENT_SECRET        = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.aad_client_secret.versionless_id})"
    WEBSITE_RUN_FROM_PACKAGE = var.function_package_url # Linux Consumption requires a package URL
  }

  auth_settings_v2 {
    auth_enabled           = true
    require_authentication = true
    unauthenticated_action = "Return401"

    active_directory_v2 {
      client_id                  = var.aad_client_id
      tenant_auth_endpoint       = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
      client_secret_setting_name = "AAD_CLIENT_SECRET"
    }

    login {
      token_store_enabled = true
    }
  }
}
```

## Step 2: Cosmos DB for Serverless Data

```hcl
# Cosmos DB with serverless capacity mode
resource "azurerm_cosmosdb_account" "serverless" {
  name                = "serverless-api-cosmos"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  offer_type          = "Standard"

  capabilities {
    name = "EnableServerless"
  }

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }
}

resource "azurerm_cosmosdb_sql_database" "api" {
  name                = "api-db"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.serverless.name
}

resource "azurerm_cosmosdb_sql_container" "items" {
  name                = "items"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.serverless.name
  database_name       = azurerm_cosmosdb_sql_database.api.name
  partition_key_paths = ["/userId"]
}
```

## Step 3: API Management Integration

```hcl
# Configure Function App as an APIM backend
resource "azurerm_api_management_backend" "functions" {
  name                = "functions-backend"
  resource_group_name = azurerm_resource_group.rg.name
  api_management_name = azurerm_api_management.apim.name
  protocol            = "http"
  url                 = "https://${azurerm_linux_function_app.api.default_hostname}/api"

  credentials {
    header = {
      x-functions-key = var.function_app_key
    }
  }
}
```

## Summary

The Function App in this OpenTofu stack can scale to zero during idle periods with Consumption plan billing, and Cosmos DB Serverless mode charges for request units and storage consumed. Microsoft Entra ID built-in authentication (Easy Auth) validates JWT tokens without writing authentication middleware. The Application Insights connection string enables built-in Azure Functions monitoring; use OpenTelemetry when you need end-to-end distributed tracing across services.

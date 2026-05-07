# How to Configure Azure App Service Deployment Slots with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Deployment Slots, OpenTofu, Blue-Green, CI/CD

Description: Learn how to configure Azure App Service deployment slots with OpenTofu to enable zero-downtime blue-green deployments and staging environment validation.

## Overview

Azure App Service deployment slots allow you to deploy to a staging slot, validate the application, and then swap it into production with zero downtime. OpenTofu manages the slot configuration, including which app settings stay with a specific slot during a swap.

## Step 1: Create the Production Web App

```hcl
# main.tf - Production web app

resource "azurerm_linux_web_app" "production" {
  name                = "my-app-production"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id
  https_only          = true

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    always_on = true
  }

  identity {
    type = "SystemAssigned"
  }

  sticky_settings {
    app_setting_names = [
      "SLOT_NAME",
      "DATABASE_URL",
      "APPLICATIONINSIGHTS_CONNECTION_STRING",
    ]
  }

  # Slot-specific settings should be marked as sticky
  app_settings = {
    SLOT_NAME                          = "production"
    DATABASE_URL                       = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.prod_db_url.versionless_id})"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.prod_insights.connection_string
  }
}
```

## Step 2: Create a Staging Slot

```hcl
# Staging deployment slot for pre-production validation
resource "azurerm_linux_web_app_slot" "staging" {
  name           = "staging"
  app_service_id = azurerm_linux_web_app.production.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    always_on = true
  }

  identity {
    type = "SystemAssigned"
  }

  # Slot-specific settings for the staging slot
  app_settings = {
    SLOT_NAME                          = "staging"
    DATABASE_URL                       = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.staging_db_url.versionless_id})"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.staging_insights.connection_string
  }
}
```

## Step 3: Configure Slot-Sticky Settings

```hcl
# Add this block to azurerm_linux_web_app.production
sticky_settings {
  app_setting_names = [
    "SLOT_NAME",
    "DATABASE_URL",
    "APPLICATIONINSIGHTS_CONNECTION_STRING",
  ]
}
```

## Step 4: Swap the Slot After Validation

Auto-swap isn't supported for App Service web apps on Linux. For Linux apps, promote the staging slot explicitly from your deployment pipeline after validation.

```bash
az webapp deployment slot swap \
  --resource-group <resource-group> \
  --name my-app-production \
  --slot staging \
  --target-slot production
```

## Step 5: Multiple Slots for Different Environments

```hcl
# Create slots for different pre-production environments
locals {
  slots = ["staging", "canary", "hotfix"]
}

resource "azurerm_linux_web_app_slot" "slots" {
  for_each = toset(local.slots)

  name           = each.value
  app_service_id = azurerm_linux_web_app.production.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    SLOT_NAME    = each.value
    ENVIRONMENT  = "pre-production"
  }
}
```

## Step 6: Outputs

```hcl
output "production_url" {
  value = "https://${azurerm_linux_web_app.production.default_hostname}"
}

output "staging_url" {
  value = "https://${azurerm_linux_web_app_slot.staging.default_hostname}"
}
```

## Summary

Azure App Service deployment slots with OpenTofu enable blue-green deployments with zero downtime. The staging slot receives new code, gets validated, and then swaps with production. Sticky settings ensure slot-specific secrets and configuration stay with their slot throughout the swap.

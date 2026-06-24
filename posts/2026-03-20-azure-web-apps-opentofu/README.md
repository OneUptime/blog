# How to Deploy Azure Web Apps with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Web Apps, App Service, OpenTofu, Deployment, PaaS

Description: Learn how to deploy Azure Web Apps with OpenTofu, including application settings, container deployments, managed identity configuration, and startup commands.

## Overview

Azure Web Apps (App Service) is a fully managed platform for hosting web applications. OpenTofu can deploy Linux and Windows web apps with application settings, connection strings, and container image configurations.

## Step 1: Create a Linux Web App

```hcl
# main.tf - Linux web app running Node.js

resource "azurerm_linux_web_app" "node_app" {
  name                = "my-nodejs-webapp"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  # Enable HTTPS-only traffic
  https_only = true

  site_config {
    # Node.js 20 LTS runtime
    application_stack {
      node_version = "20-lts"
    }

    # Health check path
    health_check_path = "/health"

    # Always on keeps the app warm (requires Standard or higher)
    always_on = true
  }

  # Application settings (environment variables)
  app_settings = {
    NODE_ENV              = "production"
    WEBSITE_RUN_FROM_PACKAGE = "1"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.insights.connection_string
  }

  # Managed identity for accessing Key Vault and other Azure services
  identity {
    type = "SystemAssigned"
  }
}
```

## Step 2: Container-Based Web App

```hcl
# Deploy a Docker container from Azure Container Registry
resource "azurerm_linux_web_app" "container_app" {
  name                = "my-container-webapp"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  https_only = true

  site_config {
    application_stack {
      docker_image_name        = "myregistry.azurecr.io/myapp:latest"
      docker_registry_url      = "https://myregistry.azurecr.io"
      docker_registry_username = azurerm_container_registry.acr.admin_username
      docker_registry_password = azurerm_container_registry.acr.admin_password
    }
  }

  app_settings = {
    DOCKER_ENABLE_CI              = "true"
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"
  }
}
```

## Step 3: Windows Web App for .NET

```hcl
# Windows Web App for ASP.NET Core
resource "azurerm_windows_web_app" "dotnet_app" {
  name                = "my-dotnet-webapp"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.windows_plan.id

  https_only = true

  site_config {
    application_stack {
      current_stack  = "dotnet"
      dotnet_version = "v8.0"
    }
  }

  # Required for Azure SQL authentication with a system-assigned managed identity
  identity {
    type = "SystemAssigned"
  }

  connection_string {
    name  = "DefaultConnection"
    type  = "SQLServer"
    value = "Server=${var.sql_server_fqdn};Database=appdb;Authentication=Active Directory Managed Identity;Encrypt=True"
  }
}
```

## Step 4: Application Insights Integration

```hcl
resource "azurerm_application_insights" "insights" {
  name                = "my-app-insights"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.law.id
}
```

## Step 5: Outputs

```hcl
output "web_app_url" {
  value       = "https://${azurerm_linux_web_app.node_app.default_hostname}"
  description = "Public URL of the web application"
}

output "web_app_managed_identity" {
  value = azurerm_linux_web_app.node_app.identity[0].principal_id
}
```

## Summary

Azure Web Apps deployed with OpenTofu cover a wide range of runtimes from Node.js and Python to .NET and containers. By combining App Service with Application Insights, managed identities, and Key Vault references, you build a production-ready web application platform with minimal boilerplate.

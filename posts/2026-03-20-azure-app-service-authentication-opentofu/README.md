# How to Set Up Azure App Service Authentication with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Authentication, OpenTofu, OAuth2, Azure AD

Description: Learn how to configure Azure App Service built-in authentication (Easy Auth) with OpenTofu to add identity provider authentication without changing application code.

## Overview

Azure App Service built-in authentication (Easy Auth) provides built-in authentication and authorization middleware that integrates with Microsoft Entra ID (Azure AD), Google, Facebook, GitHub, X, Apple, and custom OpenID Connect providers. OpenTofu configures the authentication settings declaratively.

## Step 1: Create Web App with Authentication

```hcl
# main.tf - Web App for Easy Auth configuration

resource "azurerm_linux_web_app" "app" {
  name                = "my-authenticated-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id
  https_only          = true

  site_config {
    application_stack {
      node_version = "20-lts"
    }
  }
}
```

## Step 2: Microsoft Entra ID (Azure AD) Authentication

```hcl
# Look up the current tenant for the Entra issuer URL
data "azuread_client_config" "current" {}

# Register an app in Microsoft Entra ID for authentication
resource "azuread_application" "app_auth" {
  display_name     = "MyAppAuthentication"
  sign_in_audience = "AzureADMyOrg"

  web {
    redirect_uris = [
      "https://${azurerm_linux_web_app.app.default_hostname}/.auth/login/aad/callback"
    ]
  }
}

resource "azuread_application_password" "app_auth_secret" {
  application_id    = azuread_application.app_auth.id
  display_name      = "Easy Auth Secret"
  end_date_relative = "8760h"
}

# Update the web app to enable Easy Auth
resource "azurerm_linux_web_app" "app" {
  name                = "my-authenticated-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id
  https_only          = true

  # Use a Key Vault reference in production.
  app_settings = {
    MICROSOFT_PROVIDER_AUTHENTICATION_SECRET = azuread_application_password.app_auth_secret.value
  }

  site_config {
    application_stack {
      node_version = "20-lts"
    }
  }

  auth_settings_v2 {
    # Require authentication for all requests
    auth_enabled           = true
    require_authentication = true
    unauthenticated_action = "RedirectToLoginPage"

    # Login settings
    login {
      token_store_enabled           = true
      token_refresh_extension_hours = 72
    }

    # Microsoft Entra ID provider
    active_directory_v2 {
      client_id                  = azuread_application.app_auth.client_id
      tenant_auth_endpoint       = "https://login.microsoftonline.com/${data.azuread_client_config.current.tenant_id}/v2.0/"
      client_secret_setting_name = "MICROSOFT_PROVIDER_AUTHENTICATION_SECRET"
    }
  }
}
```

## Step 3: Multi-Provider Authentication

```hcl
# Allow both Microsoft Entra ID and GitHub authentication
resource "azurerm_linux_web_app" "app" {
  name                = "my-authenticated-app"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id
  https_only          = true

  app_settings = {
    AAD_CLIENT_SECRET    = azuread_application_password.app_auth_secret.value
    GITHUB_CLIENT_SECRET = var.github_client_secret
  }

  site_config {
    application_stack {
      node_version = "20-lts"
    }
  }

  auth_settings_v2 {
    auth_enabled           = true
    require_authentication = true
    unauthenticated_action = "Return401"  # Return 401 for API apps

    login {
      token_store_enabled = true
    }

    active_directory_v2 {
      client_id                  = azuread_application.app_auth.client_id
      tenant_auth_endpoint       = "https://login.microsoftonline.com/${data.azuread_client_config.current.tenant_id}/v2.0/"
      client_secret_setting_name = "AAD_CLIENT_SECRET"
    }

    github_v2 {
      client_id                  = var.github_client_id
      client_secret_setting_name = "GITHUB_CLIENT_SECRET"
      login_scopes               = ["read:user", "user:email"]
    }
  }
}
```

## Step 4: Outputs

```hcl
output "auth_callback_url" {
  value = "https://${azurerm_linux_web_app.app.default_hostname}/.auth/login/aad/callback"
}

output "app_client_id" {
  value = azuread_application.app_auth.client_id
}
```

## Summary

Azure App Service Easy Auth configured with OpenTofu adds authentication to any web app without code changes. The `auth_settings_v2` block supports modern identity providers and token storage for session management, making it ideal for quickly securing internal tools and APIs.

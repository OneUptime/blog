# How to Configure Azure AD App Registrations with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Azure AD, App Registration, OAuth2, Infrastructure as Code

Description: Learn how to create and configure Azure Active Directory App Registrations for web apps, APIs, and service principals using OpenTofu.

## Introduction

Microsoft Entra ID app registrations (formerly Azure AD app registrations) are the foundation of application authentication in Azure. They define OAuth 2.0 settings, API permissions, and service principals. Managing them with OpenTofu ensures consistent identity configurations across environments.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azuread" {}

provider "azurerm" {
  features {}
}

data "azuread_client_config" "current" {}
```

## Web Application Registration

```hcl
resource "azuread_application" "web_app" {
  display_name = "${var.app_name}-web-${var.environment}"
  owners       = [data.azuread_client_config.current.object_id]

  # Application (client) type
  sign_in_audience = "AzureADMyOrg"  # single tenant

  web {
    redirect_uris = ["https://app.example.com/auth/callback"]

    implicit_grant {
      access_token_issuance_enabled = false
      id_token_issuance_enabled     = true
    }
  }

  # Declare Microsoft Graph delegated permissions
  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000"  # Microsoft Graph

    resource_access {
      id   = "e1fe6dd8-ba31-4d61-89e7-88639da4683d"  # User.Read (delegated)
      type = "Scope"
    }
  }
}
```

## API Application Registration

Register a backend API that other apps can call.

```hcl
resource "azuread_application" "api" {
  display_name    = "${var.app_name}-api-${var.environment}"
  owners          = [data.azuread_client_config.current.object_id]
  identifier_uris = ["api://${var.tenant_domain}/${var.app_name}-api-${var.environment}"]  # use a verified custom or initial domain

  api {
    requested_access_token_version = 2

    oauth2_permission_scope {
      admin_consent_description  = "Allow reading data from the API"
      admin_consent_display_name = "Read API Data"
      enabled                    = true
      id                         = "00000000-0000-0000-0000-000000000001"  # unique GUID
      type                       = "User"
      user_consent_description   = "Read data from the API"
      user_consent_display_name  = "Read API Data"
      value                      = "Data.Read"
    }
  }
}
```

## Service Principal

Create a service principal (enterprise application) for the app registration.

```hcl
resource "azuread_service_principal" "web_app" {
  client_id                    = azuread_application.web_app.client_id
  app_role_assignment_required = false
  owners                       = [data.azuread_client_config.current.object_id]
}

# Client secret for server-side authentication

resource "azuread_application_password" "web_app" {
  application_id    = azuread_application.web_app.id
  display_name      = "Managed by OpenTofu"
  end_date_relative = "8760h"  # 1 year
}
```

## Role Assignment

```hcl
data "azurerm_subscription" "current" {}

resource "azurerm_role_assignment" "contributor" {
  scope                            = data.azurerm_subscription.current.id
  role_definition_name             = "Contributor"
  principal_id                     = azuread_service_principal.web_app.object_id
  skip_service_principal_aad_check = true
}
```

## Outputs

```hcl
output "client_id" {
  value = azuread_application.web_app.client_id
}

output "client_secret" {
  value     = azuread_application_password.web_app.value
  sensitive = true
}

output "tenant_id" {
  value = data.azuread_client_config.current.tenant_id
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Managing Microsoft Entra ID app registrations with OpenTofu gives you version-controlled, reproducible identity configuration. You can define OAuth 2.0 scopes, API permissions, client secrets, and service principals together with the application infrastructure they support.

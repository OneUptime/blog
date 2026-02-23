# How to Create Azure Active Directory Applications in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure AD, Entra ID, Identity, Infrastructure as Code, Authentication

Description: Learn how to create and configure Azure Active Directory application registrations in Terraform with API permissions, redirect URIs, and credentials.

---

Azure Active Directory application registrations (now part of Microsoft Entra ID) are the foundation of identity and authentication in Azure. Every application that needs to authenticate users, access Microsoft APIs, or integrate with other Azure services starts with an app registration. Managing these through Terraform keeps your identity configuration version-controlled and consistent across environments.

This guide walks through creating Azure AD applications in Terraform, configuring OAuth settings, setting up API permissions, managing credentials, and defining app roles.

## Provider Configuration

Azure AD resources require the AzureAD provider, which is separate from the AzureRM provider.

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "azuread" {}
provider "azurerm" {
  features {}
}
```

## Data Sources

```hcl
# data.tf
# Get the current Azure AD tenant details
data "azuread_client_config" "current" {}
```

## Web Application Registration

This is a typical setup for a web application that authenticates users.

```hcl
# web-app.tf
# Application registration for a web application
resource "azuread_application" "web_app" {
  display_name = "Production Web Application"

  # Who can sign in
  sign_in_audience = "AzureADMyOrg"  # Single tenant

  # Identify the application owner
  owners = [data.azuread_client_config.current.object_id]

  # OAuth 2.0 web redirect URIs
  web {
    homepage_url  = "https://app.example.com"
    redirect_uris = [
      "https://app.example.com/auth/callback",
      "https://app.example.com/auth/silent-callback",
    ]

    implicit_grant {
      access_token_issuance_enabled = false  # Disable for security
      id_token_issuance_enabled     = true
    }
  }

  # Group membership claims in tokens
  group_membership_claims = ["SecurityGroup"]

  # Optional claims in tokens
  optional_claims {
    id_token {
      name = "email"
    }
    id_token {
      name = "preferred_username"
    }
    access_token {
      name = "email"
    }
  }

  tags = ["production", "web-application"]
}
```

## Single Page Application (SPA) Registration

SPAs use a different OAuth flow and configuration.

```hcl
# spa-app.tf
resource "azuread_application" "spa" {
  display_name     = "Frontend SPA"
  sign_in_audience = "AzureADMyOrg"
  owners           = [data.azuread_client_config.current.object_id]

  # SPA-specific redirect URIs (uses PKCE, no client secret needed)
  single_page_application {
    redirect_uris = [
      "https://app.example.com/",
      "https://app.example.com/auth/callback",
      "http://localhost:3000/",  # For local development
      "http://localhost:3000/auth/callback",
    ]
  }

  # The SPA needs to access our backend API
  required_resource_access {
    resource_app_id = azuread_application.api.client_id  # Our API app

    resource_access {
      id   = azuread_application.api.app_role_ids["User.Read"]
      type = "Role"
    }
  }
}
```

## API Application with App Roles

Define an API that exposes scopes and app roles.

```hcl
# api-app.tf
resource "random_uuid" "api_scope_id" {}
resource "random_uuid" "admin_role_id" {}
resource "random_uuid" "reader_role_id" {}

resource "azuread_application" "api" {
  display_name     = "Backend API"
  sign_in_audience = "AzureADMyOrg"
  owners           = [data.azuread_client_config.current.object_id]

  # Identifier URI for the API
  identifier_uris = ["api://backend-api-production"]

  # Define OAuth2 scopes that this API exposes
  api {
    # Map known client applications for pre-authorized access
    known_client_applications = []

    oauth2_permission_scope {
      admin_consent_description  = "Allow the application to access the API on behalf of the signed-in user"
      admin_consent_display_name = "Access API"
      enabled                    = true
      id                         = random_uuid.api_scope_id.result
      type                       = "User"
      user_consent_description   = "Allow the application to access the API on your behalf"
      user_consent_display_name  = "Access API"
      value                      = "api.access"
    }
  }

  # Define app roles for role-based access control
  app_role {
    allowed_member_types = ["User", "Application"]
    description          = "Administrators can manage all aspects of the application"
    display_name         = "Administrator"
    enabled              = true
    id                   = random_uuid.admin_role_id.result
    value                = "Admin"
  }

  app_role {
    allowed_member_types = ["User", "Application"]
    description          = "Readers can view data but not make changes"
    display_name         = "Reader"
    enabled              = true
    id                   = random_uuid.reader_role_id.result
    value                = "User.Read"
  }

  tags = ["production", "api"]
}
```

## API Permissions (Microsoft Graph)

Grant your application permissions to call Microsoft Graph or other APIs.

```hcl
# permissions.tf
# Well-known Microsoft Graph API application ID
locals {
  microsoft_graph_app_id = "00000003-0000-0000-c000-000000000000"
}

resource "azuread_application" "web_app" {
  # ... previous configuration ...

  # Permissions to Microsoft Graph
  required_resource_access {
    resource_app_id = local.microsoft_graph_app_id

    # Delegated permission: User.Read
    resource_access {
      id   = "e1fe6dd8-ba31-4d61-89e7-88639da4683d"  # User.Read
      type = "Scope"  # Delegated
    }

    # Delegated permission: email
    resource_access {
      id   = "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0"  # email
      type = "Scope"
    }

    # Delegated permission: profile
    resource_access {
      id   = "14dad69e-099b-42c9-810b-d002981feec1"  # profile
      type = "Scope"
    }
  }
}
```

## Application Credentials

Create client secrets and certificates for server-to-server authentication.

```hcl
# credentials.tf
# Client secret (password) - rotated every 6 months
resource "azuread_application_password" "web_app" {
  application_id    = azuread_application.web_app.id
  display_name      = "Terraform-managed secret"
  end_date_relative = "4320h"  # 180 days

  rotate_when_changed = {
    rotation = "1"  # Increment to force rotation
  }
}

# Client certificate for higher security
resource "azuread_application_certificate" "api" {
  application_id = azuread_application.api.id
  type           = "AsymmetricX509Cert"
  value          = filebase64("${path.module}/certs/api-cert.pem")
  end_date       = "2027-01-01T00:00:00Z"
}
```

## Daemon Application (Client Credentials Flow)

For background services that run without user interaction.

```hcl
# daemon-app.tf
resource "azuread_application" "daemon" {
  display_name     = "Background Worker Service"
  sign_in_audience = "AzureADMyOrg"
  owners           = [data.azuread_client_config.current.object_id]

  # No redirect URIs needed for daemon apps

  # Request application-level permissions (no user context)
  required_resource_access {
    resource_app_id = local.microsoft_graph_app_id

    # Application permission: Mail.Send
    resource_access {
      id   = "b633e1c5-b582-4048-a93e-9f11b44c7e96"  # Mail.Send
      type = "Role"  # Application permission
    }

    # Application permission: User.Read.All
    resource_access {
      id   = "df021288-bdef-4463-88db-98f22de89214"  # User.Read.All
      type = "Role"
    }
  }

  tags = ["production", "daemon"]
}

# Client secret for the daemon
resource "azuread_application_password" "daemon" {
  application_id    = azuread_application.daemon.id
  display_name      = "Daemon service secret"
  end_date_relative = "8760h"  # 1 year
}
```

## Admin Consent

Application permissions (type = "Role") require admin consent. You can grant this through Terraform.

```hcl
# consent.tf
# Grant admin consent for the daemon application
resource "azuread_service_principal" "daemon" {
  client_id = azuread_application.daemon.client_id
  owners    = [data.azuread_client_config.current.object_id]
}

resource "azuread_app_role_assignment" "daemon_mail_send" {
  app_role_id         = "b633e1c5-b582-4048-a93e-9f11b44c7e96"
  principal_object_id = azuread_service_principal.daemon.object_id
  resource_object_id  = azuread_service_principal.msgraph.object_id  # Microsoft Graph SP
}
```

## Outputs

```hcl
# outputs.tf
output "web_app_client_id" {
  value       = azuread_application.web_app.client_id
  description = "Client ID for the web application"
}

output "web_app_client_secret" {
  value       = azuread_application_password.web_app.value
  sensitive   = true
  description = "Client secret for the web application"
}

output "api_client_id" {
  value       = azuread_application.api.client_id
  description = "Client ID for the API application"
}

output "api_identifier_uri" {
  value       = azuread_application.api.identifier_uris[0]
  description = "Identifier URI for the API"
}

output "tenant_id" {
  value       = data.azuread_client_config.current.tenant_id
  description = "Azure AD tenant ID"
}
```

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

The Terraform service principal needs the Application Administrator or Cloud Application Administrator role in Azure AD to create and manage application registrations. Without sufficient permissions, the apply will fail with an authorization error.

Managing Azure AD applications in Terraform brings the same benefits as managing any other infrastructure - consistency, audit trails, and the ability to review changes before they take effect. This is especially important for identity configuration, where a misconfigured redirect URI or overly broad API permission can create security vulnerabilities.

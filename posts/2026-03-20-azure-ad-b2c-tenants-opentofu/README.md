# How to Create Azure AD B2C Tenants with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Azure AD B2C, Identity, Authentication, Infrastructure as Code

Description: Learn how to provision Azure Active Directory B2C tenants and configure them for customer identity and access management using OpenTofu.

## Introduction

Azure AD B2C is a customer identity and access management (CIAM) service that lets you customize and control how customers sign up, sign in, and manage their profiles. Effective May 1, 2025, Azure AD B2C is no longer available to purchase for new customers, but existing customers can continue creating and managing B2C tenants. OpenTofu can manage tenant creation and application registrations as code.

## Provider Configuration

Creating the B2C tenant uses the AzureRM provider, and managing application registrations inside the B2C tenant uses the AzureAD provider.

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Creating the B2C Tenant Resource

```hcl
resource "azurerm_aadb2c_directory" "main" {
  country_code            = "US"
  data_residency_location = "United States"
  display_name            = "${var.app_name} Customer Identity"
  domain_name             = "${var.app_name}.onmicrosoft.com"
  resource_group_name     = azurerm_resource_group.main.name

  # New Azure AD B2C tenants can only be created with PremiumP1.
  sku_name = "PremiumP1"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Configuring the AzureAD Provider for B2C

After the tenant is created, configure a second provider instance targeting the B2C tenant. Because provider configurations can only use values known before apply, pass the B2C tenant ID into this configuration as an input variable for a follow-up apply or separate OpenTofu root module.

```hcl
provider "azuread" {
  alias     = "b2c"
  tenant_id = var.b2c_tenant_id
}
```

## Creating Application Registrations in B2C

```hcl
resource "azuread_application" "web_app" {
  provider     = azuread.b2c
  display_name = "${var.app_name} Web Application"

  web {
    redirect_uris = ["https://app.example.com/auth/callback"]
    implicit_grant {
      access_token_issuance_enabled = false
      id_token_issuance_enabled     = true
    }
  }

  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000" # MS Graph

    resource_access {
      id   = "37f7f235-527c-4136-accd-4a02d197296e" # openid
      type = "Scope"
    }
  }
}
```

## Outputting Tenant and Application IDs

User flows define the sign-up/sign-in experience and are typically configured via the Azure portal or Microsoft Graph API. The following outputs expose the tenant and application identifiers created by the configuration.

```hcl
output "tenant_id" {
  value = azurerm_aadb2c_directory.main.tenant_id
}

output "b2c_domain" {
  value = azurerm_aadb2c_directory.main.domain_name
}

output "web_app_client_id" {
  value = azuread_application.web_app.client_id
}
```

## Variables

```hcl
variable "app_name"    { type = string }
variable "environment" { type = string }
variable "b2c_tenant_id" { type = string }

resource "azurerm_resource_group" "main" {
  name     = "rg-b2c-${var.environment}"
  location = "East US"
}
```

## Deploying

Run the tenant creation configuration first. Then use the resulting `tenant_id` output as `b2c_tenant_id` when you apply the B2C-tenant-scoped configuration.

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

For existing Azure AD B2C customers, OpenTofu can automate the creation of customer identity directories and application registrations. Azure AD B2C is no longer available to purchase for new customers, new B2C tenants must use Premium P1, and user flows or custom policies still require Azure portal or Microsoft Graph configuration.

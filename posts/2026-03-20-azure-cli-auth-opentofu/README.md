# How to Authenticate with Azure Using Azure CLI in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Azure CLI, Authentication, Local Development

Description: Learn how to use Azure CLI credentials for local OpenTofu development, enabling interactive authentication without managing service principal secrets.

## Introduction

How to Authenticate with Azure Using Azure CLI in OpenTofu provides a secure, credential-free way to authenticate OpenTofu with Azure. This guide walks through the setup and configuration for production and development environments.

## Configuration

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

## Authentication Setup

For managed identity, ensure the Azure resource (such as a VM or ACI) has the managed identity enabled and assigned appropriate RBAC roles on the target subscription or resource group:

```bash
# Assign Contributor role to the managed identity

az role assignment create \
  --assignee-object-id "<managed-identity-principal-id>" \
  --assignee-principal-type "ServicePrincipal" \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"
```

For Azure CLI authentication:

```bash
# Login interactively
az login

# Set the target subscription
az account set --subscription "$SUBSCRIPTION_ID"

# Verify active account
az account show
```

## Provider Configuration

```hcl
# For managed identity (no credentials needed in provider block)
provider "azurerm" {
  features {}
  use_msi         = true  # System-assigned managed identity
  subscription_id = var.subscription_id
}

# For user-assigned managed identity
provider "azurerm" {
  features {}
  use_msi         = true
  client_id       = var.managed_identity_client_id
  subscription_id = var.subscription_id
}
```

## Variables

```hcl
variable "subscription_id" {
  type        = string
  description = "Azure Subscription ID"
}

variable "managed_identity_client_id" {
  type        = string
  description = "Client ID of the user-assigned managed identity"
}
```

## Conclusion

Managed identity eliminates the need for stored credentials and is the recommended authentication method for workloads running on Azure compute services. For local development, Azure CLI credentials provide a seamless interactive authentication experience without managing secrets.

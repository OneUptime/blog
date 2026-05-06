# How to Configure the Azure Backend (azurerm) in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Azure, State Management

Description: Learn how to configure the OpenTofu azurerm backend to store state files in Azure Blob Storage with encryption, locking, and access control.

## Introduction

The `azurerm` backend stores OpenTofu state in Azure Blob Storage. It provides native state locking using blob leases, supports Microsoft Entra ID authentication, and integrates with Azure's built-in encryption. This guide walks through the complete setup.

## Step 1: Create the Azure Storage Resources

```hcl
# bootstrap/main.tf - Run once to create state storage

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "state" {
  name     = "rg-terraform-state"
  location = "East US"
}

resource "azurerm_storage_account" "state" {
  name                     = "stterraformstate001"  # Must be globally unique, 3-24 chars
  resource_group_name      = azurerm_resource_group.state.name
  location                 = azurerm_resource_group.state.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant storage for DR
  min_tls_version          = "TLS1_2"
  https_traffic_only_enabled = true

  # Enable blob versioning
  blob_properties {
    versioning_enabled  = true
    change_feed_enabled = true

    delete_retention_policy {
      days = 90
    }
  }
}

resource "azurerm_storage_container" "state" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.state.id
  container_access_type = "private"  # No public access
}
```

## Step 2: Configure the azurerm Backend

```hcl
# backend.tf

terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    # Authentication (choose one)
    # Option 1: Use Azure CLI credentials (local development)
    use_azuread_auth = true

    # Option 2: Service Principal (CI/CD)
    # subscription_id = "00000000-0000-0000-0000-000000000000"
    # tenant_id       = "00000000-0000-0000-0000-000000000000"
    # client_id       = "00000000-0000-0000-0000-000000000000"
    # client_secret   = var.client_secret  # Use env var instead
  }
}
```

## Step 3: Initialize the Backend

```bash
# Authenticate with Azure CLI
az login
az account set --subscription "my-subscription-id"

# Initialize
tofu init

# Output:
# Initializing the backend...
# Successfully configured the backend "azurerm"!
```

## State File Organization in Azure Blob Storage

```text
Storage Account: stterraformstate001
Container: tfstate
├── prod/terraform.tfstate           ← production state
├── staging/terraform.tfstate        ← staging state
├── dev/terraform.tfstate            ← dev state
└── networking/terraform.tfstate     ← networking stack
```

## Authentication Methods

### Azure CLI (Local Development)

```bash
az login
# Backend will use the current Azure CLI credentials
```

### Service Principal

```bash
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
```

### Managed Identity

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate001"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"
    use_azuread_auth     = true
    use_msi              = true  # Use Managed Identity
  }
}
```

## RBAC Permissions

Grant the service principal or managed identity this role:

```hcl
# Storage Blob Data Contributor role for reading and writing state
resource "azurerm_role_assignment" "terraform_state" {
  scope                = azurerm_storage_account.state.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.terraform_principal_id
}
```

## State Locking

Azure Blob Storage uses blob leases for state locking:
- Locks are acquired automatically during `plan` and `apply`
- OpenTofu acquires an infinite blob lease and releases it when the operation completes
- If a process crashes, the lease can remain until you break it manually

```bash
# Check for active leases (stuck locks)
az storage blob show \
  --account-name stterraformstate001 \
  --auth-mode login \
  --container-name tfstate \
  --name "prod/terraform.tfstate" \
  --query 'properties.lease'

# Break a stuck lease
az storage blob lease break \
  --account-name stterraformstate001 \
  --auth-mode login \
  --container-name tfstate \
  --blob-name "prod/terraform.tfstate"
```

## Conclusion

The azurerm backend provides a reliable, Azure-native state storage solution with built-in encryption, geo-redundant storage, and blob lease-based locking. It supports multiple authentication methods including Azure CLI, service principals, and managed identities. Enable blob versioning and soft delete for robust state backup capabilities.

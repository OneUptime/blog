# How to Configure Azure Blob Storage Backend for Terraform State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, State Management, Blob Storage, Infrastructure as Code

Description: Step-by-step guide to configuring Azure Blob Storage as a remote backend for Terraform state, including authentication methods, locking, and encryption.

---

If your infrastructure lives in Azure, storing your Terraform state in Azure Blob Storage is a natural fit. It keeps everything in one cloud provider, integrates with Azure Active Directory for access control, and supports state locking out of the box through blob leasing. This guide walks you through setting up the Azure backend from scratch.

## Prerequisites

Before configuring the backend, you need a few things in Azure:

- An Azure subscription
- Azure CLI installed and authenticated
- A resource group
- A storage account
- A blob container

Let's create these if you do not already have them.

## Creating the Storage Infrastructure

First, create the resources that will hold your state file:

```bash
# Set variables for reuse
RESOURCE_GROUP="terraform-state-rg"
STORAGE_ACCOUNT="tfstate$(openssl rand -hex 4)"  # Must be globally unique
CONTAINER="tfstate"
LOCATION="eastus"

# Create the resource group
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

# Create the storage account with recommended settings
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

# Create the blob container
az storage container create \
  --name "$CONTAINER" \
  --account-name "$STORAGE_ACCOUNT"

# Enable versioning for the storage account (for state history)
az storage account blob-service-properties update \
  --account-name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --enable-versioning true
```

Note the storage account name - you will need it for the backend configuration.

## Basic Backend Configuration

With the storage infrastructure ready, configure your Terraform backend:

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    # The resource group containing the storage account
    resource_group_name  = "terraform-state-rg"

    # The storage account name
    storage_account_name = "tfstatea1b2c3d4"

    # The blob container name
    container_name       = "tfstate"

    # The name of the blob (state file) within the container
    key                  = "prod/terraform.tfstate"
  }
}
```

The `key` parameter determines the blob name within the container. Using a path-like structure (e.g., `prod/terraform.tfstate`) helps organize state files for multiple projects or environments.

## Authentication Methods

The Azure backend supports several authentication approaches. Choosing the right one depends on your environment.

### Azure CLI Authentication

The simplest method - the backend uses your current Azure CLI session:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatea1b2c3d4"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    # Uses az login credentials automatically
    # No additional auth config needed
  }
}
```

This works well for local development but is not ideal for CI/CD pipelines.

### Service Principal with Client Secret

For automated pipelines, use a service principal:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatea1b2c3d4"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    # Service principal credentials
    subscription_id = "your-subscription-id"
    tenant_id       = "your-tenant-id"
    client_id       = "your-client-id"
    client_secret   = "your-client-secret"
  }
}
```

In practice, you should pass these values through environment variables rather than hardcoding them:

```bash
# Set environment variables for the backend
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"

# Initialize Terraform - it picks up the ARM_ variables automatically
terraform init
```

### Managed Identity

If running Terraform from an Azure VM or App Service with a managed identity:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatea1b2c3d4"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    # Enable managed identity authentication
    use_msi = true
  }
}
```

### Access Key

Direct storage account access key authentication:

```hcl
terraform {
  backend "azurerm" {
    storage_account_name = "tfstatea1b2c3d4"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"

    # You don't need resource_group_name with access key auth
    access_key = "your-storage-account-access-key"
  }
}
```

Again, prefer environment variables:

```bash
# Set the access key via environment variable
export ARM_ACCESS_KEY="your-storage-account-access-key"

terraform init
```

## State Locking

Azure Blob Storage provides state locking through blob leasing. This is enabled by default - you do not need to configure anything extra. When Terraform starts an operation that modifies state, it acquires a lease on the blob. Other Terraform processes trying to modify the same state will wait or fail.

You can verify locking is working by checking the blob properties during a long-running apply:

```bash
# Check lease status of the state blob
az storage blob show \
  --account-name "$STORAGE_ACCOUNT" \
  --container-name "$CONTAINER" \
  --name "prod/terraform.tfstate" \
  --query "properties.lease"
```

During an active operation, you will see `"status": "locked"` and `"state": "leased"`.

## Encryption

Azure Blob Storage encrypts all data at rest by default using Microsoft-managed keys. For additional control, you can use customer-managed keys:

```bash
# Create a Key Vault for encryption keys
az keyvault create \
  --name "tfstate-keyvault" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION"

# Create an encryption key
az keyvault key create \
  --vault-name "tfstate-keyvault" \
  --name "tfstate-key" \
  --protection software

# Configure the storage account to use customer-managed keys
az storage account update \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault "https://tfstate-keyvault.vault.azure.net" \
  --encryption-key-name "tfstate-key"
```

## Network Security

Restrict access to the storage account using network rules:

```bash
# Deny all traffic by default
az storage account update \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --default-action Deny

# Allow access from your VNet
az storage account network-rule add \
  --account-name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "my-vnet" \
  --subnet "my-subnet"

# Allow access from your CI/CD runner IP
az storage account network-rule add \
  --account-name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --ip-address "203.0.113.50"
```

## Using Partial Configuration

To keep credentials out of your code, use partial configuration:

```hcl
# backend.tf - only non-sensitive values
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"
  }
}
```

Then pass the remaining values at init time:

```bash
# Pass sensitive values at initialization
terraform init \
  -backend-config="storage_account_name=tfstatea1b2c3d4" \
  -backend-config="access_key=$(az storage account keys list \
    --account-name tfstatea1b2c3d4 \
    --query '[0].value' -o tsv)"
```

Or use a backend config file:

```hcl
# backend.hcl
storage_account_name = "tfstatea1b2c3d4"
access_key           = "your-access-key-here"
```

```bash
# Initialize with the config file
terraform init -backend-config=backend.hcl
```

## Multiple Environments

Organize state files for different environments using different keys:

```hcl
# For development
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatea1b2c3d4"
    container_name       = "tfstate"
    key                  = "dev/networking/terraform.tfstate"
  }
}
```

Alternatively, use separate containers:

```bash
# Create containers for each environment
az storage container create --name "tfstate-dev" --account-name "$STORAGE_ACCOUNT"
az storage container create --name "tfstate-staging" --account-name "$STORAGE_ACCOUNT"
az storage container create --name "tfstate-prod" --account-name "$STORAGE_ACCOUNT"
```

## Initializing and Verifying

Put it all together:

```bash
# Login to Azure
az login

# Initialize the backend
terraform init

# Verify the backend is working
terraform state list

# Check the blob was created in Azure
az storage blob list \
  --account-name "$STORAGE_ACCOUNT" \
  --container-name "$CONTAINER" \
  --output table
```

## Summary

Azure Blob Storage is a solid choice for Terraform state storage when working with Azure infrastructure. It provides built-in state locking through blob leases, encryption at rest by default, and integrates naturally with Azure's identity and access management. Whether you authenticate via CLI, service principal, or managed identity, the setup is straightforward and production-ready. For more on backend configuration patterns, check out our guide on [using backend partial configuration in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-backend-partial-configuration/view).

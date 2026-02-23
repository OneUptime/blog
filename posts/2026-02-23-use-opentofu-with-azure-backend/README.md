# How to Use OpenTofu with Azure Backend

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Azure, State Management, Backend

Description: A practical guide to configuring the Azure Blob Storage backend for OpenTofu state management, including storage setup, authentication methods, state locking, and security best practices.

---

If your infrastructure runs on Azure, storing your OpenTofu state in Azure Blob Storage is the natural choice. The `azurerm` backend provides remote state storage with built-in locking via blob leases, and integrates well with Azure Active Directory for authentication. This guide walks through the complete setup.

## Prerequisites

You need the Azure CLI installed and authenticated:

```bash
# Install Azure CLI (if not already installed)
# macOS
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Verify your subscription
az account show
```

## Creating the Storage Infrastructure

First, create the Azure resources needed for the backend:

```bash
# Set variables
RESOURCE_GROUP="opentofu-state-rg"
STORAGE_ACCOUNT="orgopentofu$(openssl rand -hex 4)"  # Must be globally unique
CONTAINER="tfstate"
LOCATION="eastus"

# Create resource group
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

# Create storage account
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

# Create blob container
az storage container create \
  --name "$CONTAINER" \
  --account-name "$STORAGE_ACCOUNT"

# Enable soft delete for blob recovery
az storage blob service-properties delete-policy update \
  --account-name "$STORAGE_ACCOUNT" \
  --enable true \
  --days-retained 30

# Enable versioning for state history
az storage account blob-service-properties update \
  --account-name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --enable-versioning true

echo "Storage account: $STORAGE_ACCOUNT"
```

Or do the same with OpenTofu (using local state initially):

```hcl
# backend-setup/main.tf
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "state" {
  name     = "opentofu-state-rg"
  location = "East US"
}

resource "azurerm_storage_account" "state" {
  name                     = "orgopentofu${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.state.name
  location                 = azurerm_resource_group.state.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }
  }
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "azurerm_storage_container" "state" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.state.name
  container_access_type = "private"
}

output "storage_account_name" {
  value = azurerm_storage_account.state.name
}
```

## Configuring the Azure Backend

With the storage infrastructure ready, configure your project:

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "opentofu-state-rg"
    storage_account_name = "orgopentofuabcd1234"
    container_name       = "tfstate"
    key                  = "production.tfstate"
  }
}
```

```bash
# Initialize with the Azure backend
tofu init

# If migrating from local state, confirm the migration when prompted
```

## Authentication Methods

The Azure backend supports several authentication methods.

### Azure CLI Authentication

The simplest method for local development:

```bash
# Login with Azure CLI
az login

# The backend automatically uses CLI credentials
tofu init
tofu plan
```

### Service Principal

For CI/CD pipelines, use a service principal:

```bash
# Create a service principal
az ad sp create-for-rbac \
  --name "opentofu-state-sp" \
  --role "Storage Blob Data Contributor" \
  --scopes "/subscriptions/<SUB_ID>/resourceGroups/opentofu-state-rg"
```

```hcl
# Set credentials via environment variables
# export ARM_CLIENT_ID="..."
# export ARM_CLIENT_SECRET="..."
# export ARM_TENANT_ID="..."
# export ARM_SUBSCRIPTION_ID="..."

terraform {
  backend "azurerm" {
    resource_group_name  = "opentofu-state-rg"
    storage_account_name = "orgopentofuabcd1234"
    container_name       = "tfstate"
    key                  = "production.tfstate"
    use_oidc             = false
  }
}
```

### Managed Identity

When running from an Azure VM or container:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "opentofu-state-rg"
    storage_account_name = "orgopentofuabcd1234"
    container_name       = "tfstate"
    key                  = "production.tfstate"
    use_msi              = true
    subscription_id      = "your-subscription-id"
    tenant_id            = "your-tenant-id"
  }
}
```

### OIDC (Workload Identity Federation)

For GitHub Actions and other OIDC-compatible CI systems:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "opentofu-state-rg"
    storage_account_name = "orgopentofuabcd1234"
    container_name       = "tfstate"
    key                  = "production.tfstate"
    use_oidc             = true
  }
}
```

```bash
# Set the OIDC token
export ARM_USE_OIDC=true
export ARM_CLIENT_ID="..."
export ARM_TENANT_ID="..."
export ARM_SUBSCRIPTION_ID="..."
```

### Storage Account Access Key

As a fallback, you can use the storage account access key:

```bash
# Get the access key
az storage account keys list \
  --resource-group opentofu-state-rg \
  --account-name orgopentofuabcd1234 \
  --query '[0].value' -o tsv

# Set it as an environment variable
export ARM_ACCESS_KEY="your-access-key"
```

```hcl
terraform {
  backend "azurerm" {
    storage_account_name = "orgopentofuabcd1234"
    container_name       = "tfstate"
    key                  = "production.tfstate"
    # No need for resource_group_name when using access key
  }
}
```

## State Locking

The Azure backend uses blob leases for locking. This is automatic and does not require any additional infrastructure (unlike S3 which needs DynamoDB).

```bash
# Locking is automatic
tofu plan   # Acquires blob lease, plans, releases lease
tofu apply  # Acquires blob lease, applies, releases lease

# If a lock is stuck
tofu force-unlock LOCK_ID
```

## Organizing State for Multiple Environments

Use different state keys for different environments:

```hcl
# Production
terraform {
  backend "azurerm" {
    resource_group_name  = "opentofu-state-rg"
    storage_account_name = "orgopentofuabcd1234"
    container_name       = "tfstate"
    key                  = "production/network.tfstate"
  }
}

# Staging
terraform {
  backend "azurerm" {
    resource_group_name  = "opentofu-state-rg"
    storage_account_name = "orgopentofuabcd1234"
    container_name       = "tfstate"
    key                  = "staging/network.tfstate"
  }
}
```

Or use separate containers:

```bash
# Create environment-specific containers
az storage container create --name "tfstate-prod" --account-name "$STORAGE_ACCOUNT"
az storage container create --name "tfstate-staging" --account-name "$STORAGE_ACCOUNT"
```

## Partial Configuration

Use partial configuration to avoid hardcoding values:

```hcl
# backend.tf
terraform {
  backend "azurerm" {}
}
```

```bash
# Pass values at init time
tofu init \
  -backend-config="resource_group_name=opentofu-state-rg" \
  -backend-config="storage_account_name=orgopentofuabcd1234" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=production.tfstate"

# Or use a config file
cat > backend-prod.hcl << 'EOF'
resource_group_name  = "opentofu-state-rg"
storage_account_name = "orgopentofuabcd1234"
container_name       = "tfstate"
key                  = "production.tfstate"
EOF

tofu init -backend-config=backend-prod.hcl
```

## Securing the State Storage

Apply these security measures to protect your state:

```bash
# Disable public network access
az storage account update \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --default-action Deny

# Add network rules for your IP/VNet
az storage account network-rule add \
  --account-name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --ip-address "203.0.113.0/24"

# Enable diagnostic logging
az monitor diagnostic-settings create \
  --name "state-audit" \
  --resource "/subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT" \
  --logs '[{"category": "StorageRead", "enabled": true}, {"category": "StorageWrite", "enabled": true}]' \
  --workspace "<LOG_ANALYTICS_WORKSPACE_ID>"
```

## Recovering State

If you need to recover a previous state version:

```bash
# List blob versions
az storage blob list \
  --account-name "$STORAGE_ACCOUNT" \
  --container-name tfstate \
  --include v \
  --query "[?name=='production.tfstate'].{name:name, version:versionId, modified:properties.lastModified}" \
  -o table

# Download a specific version
az storage blob download \
  --account-name "$STORAGE_ACCOUNT" \
  --container-name tfstate \
  --name production.tfstate \
  --version-id "2024-01-15T10:30:00.0000000Z" \
  --file restored-state.json

# Push the restored state
tofu state push restored-state.json
```

The Azure backend is well-suited for teams running infrastructure on Azure. Built-in lease-based locking means less infrastructure to manage compared to the S3 backend, and tight integration with Azure AD makes authentication straightforward.

For other backend options, see [How to Use OpenTofu with GCS Backend](https://oneuptime.com/blog/post/use-opentofu-with-gcs-backend/view).

# How to Use Azure Blob Storage with Terraform for Infrastructure as Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Terraform, Infrastructure as Code, DevOps, Automation, Cloud Storage

Description: Learn how to manage Azure Blob Storage resources with Terraform including storage accounts, containers, lifecycle policies, and using blob storage as a Terraform backend.

---

Managing Azure Blob Storage through the portal or CLI works fine for small environments, but it does not scale. When you have dozens of storage accounts across multiple environments, you need infrastructure as code. Terraform is the most popular tool for this job, and its Azure provider has comprehensive support for all storage resources.

This guide covers two aspects: using Terraform to manage blob storage infrastructure, and using blob storage as Terraform's state backend.

## Setting Up Terraform with Azure

Before writing any Terraform configuration, set up authentication. The recommended approach for CI/CD is a service principal:

```bash
# Create a service principal for Terraform
az ad sp create-for-rbac \
  --name "sp-terraform" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>
```

Configure the Azure provider in Terraform using the service principal credentials:

```hcl
# providers.tf
# Configure the Azure provider with required version constraints
terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }
  }
}

provider "azurerm" {
  features {}

  # These can also be set via environment variables:
  # ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_TENANT_ID, ARM_SUBSCRIPTION_ID
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
  client_id       = var.client_id
  client_secret   = var.client_secret
}
```

For local development, you can use `az login` and omit the service principal credentials from the provider block.

## Creating a Storage Account

Here is a complete Terraform configuration for a storage account with best-practice settings:

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
  default     = "prod"
}

variable "location" {
  type        = string
  description = "Azure region for resources"
  default     = "eastus2"
}

# main.tf
# Resource group for storage resources
resource "azurerm_resource_group" "storage" {
  name     = "rg-storage-${var.environment}"
  location = var.location

  tags = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Storage account with security best practices
resource "azurerm_storage_account" "main" {
  name                     = "stapp${var.environment}2026"
  resource_group_name      = azurerm_resource_group.storage.name
  location                 = azurerm_resource_group.storage.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind             = "StorageV2"

  # Security settings
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true
  https_traffic_only_enabled      = true

  # Enable blob versioning and soft delete
  blob_properties {
    versioning_enabled       = true
    delete_retention_policy {
      days = 30
    }
    container_delete_retention_policy {
      days = 30
    }
    change_feed_enabled = true
  }

  tags = {
    environment = var.environment
    managed_by  = "terraform"
  }
}
```

## Creating Containers with Access Policies

Define blob containers and configure access policies:

```hcl
# Blob containers
resource "azurerm_storage_container" "app_data" {
  name                  = "app-data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "logs" {
  name                  = "application-logs"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}
```

## Configuring Lifecycle Management Policies

Lifecycle policies automate data tiering and deletion. This is where Terraform really shines - you can version-control your lifecycle rules:

```hcl
# Lifecycle management policy
resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = azurerm_storage_account.main.id

  # Move old application data to cool storage after 30 days
  rule {
    name    = "move-app-data-to-cool"
    enabled = true

    filters {
      prefix_match = ["app-data/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = 30
        tier_to_archive_after_days_since_modification_greater_than = 180
        delete_after_days_since_modification_greater_than = 365
      }
      snapshot {
        delete_after_days_since_creation_greater_than = 90
      }
      version {
        delete_after_days_since_creation = 90
      }
    }
  }

  # Delete old log files after 90 days
  rule {
    name    = "cleanup-logs"
    enabled = true

    filters {
      prefix_match = ["application-logs/"]
      blob_types   = ["blockBlob", "appendBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 90
      }
    }
  }

  # Archive backups after 30 days, delete after 1 year
  rule {
    name    = "archive-backups"
    enabled = true

    filters {
      prefix_match = ["backups/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_archive_after_days_since_modification_greater_than = 30
        delete_after_days_since_modification_greater_than = 365
      }
    }
  }
}
```

## Configuring Network Rules

Lock down storage account access with network rules:

```hcl
# Network rules for the storage account
resource "azurerm_storage_account_network_rules" "main" {
  storage_account_id = azurerm_storage_account.main.id

  default_action = "Deny"

  # Allow specific subnets
  virtual_network_subnet_ids = [
    azurerm_subnet.app_subnet.id,
    azurerm_subnet.data_subnet.id,
  ]

  # Allow specific IP addresses (e.g., office IPs)
  ip_rules = [
    "203.0.113.0/24",
  ]

  # Allow Azure services to access storage
  bypass = ["AzureServices", "Logging", "Metrics"]
}
```

## Using Blob Storage as Terraform Backend

One of the most important uses of Azure Blob Storage with Terraform is storing the Terraform state file remotely. This allows team collaboration and prevents state conflicts.

First, create the backend storage account (do this once, manually or with a bootstrap script):

```bash
# Bootstrap script for Terraform backend storage
# Run this once before initializing Terraform

RESOURCE_GROUP="rg-terraform-state"
STORAGE_ACCOUNT="stterraformstate2026"
CONTAINER="tfstate"
LOCATION="eastus2"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account with versioning for state file protection
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_GRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

# Enable versioning to protect state file history
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --enable-versioning true

# Create the container
az storage container create \
  --name $CONTAINER \
  --account-name $STORAGE_ACCOUNT
```

Now configure Terraform to use this backend:

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate2026"
    container_name       = "tfstate"
    key                  = "prod/storage.tfstate"
  }
}
```

Initialize Terraform with the backend:

```bash
# Initialize Terraform with the Azure backend
terraform init

# Plan the changes
terraform plan -out=tfplan

# Apply the changes
terraform apply tfplan
```

## State Locking

Azure Blob Storage backend supports state locking using blob leases. When one team member is running `terraform apply`, others will see a lock message if they try to modify the same state:

```
Error: Error locking state: Error acquiring the state lock
Lock Info:
  ID:        xxxxx-xxxx-xxxx-xxxx
  Path:      tfstate/prod/storage.tfstate
  Operation: OperationTypeApply
  Who:       user@machine
  Created:   2026-02-16 10:30:00
```

This prevents concurrent modifications that could corrupt the state. If a lock is stuck (e.g., a CI/CD pipeline crashed), you can force unlock:

```bash
# Force unlock a stuck state lock (use with caution)
terraform force-unlock <lock-id>
```

## Multi-Environment Setup

Use Terraform workspaces or separate state files for different environments:

```hcl
# Use a variable file per environment
# terraform.tfvars (prod)
environment = "prod"
location    = "eastus2"
replication = "GRS"

# dev.tfvars
environment = "dev"
location    = "eastus2"
replication = "LRS"
```

Apply for a specific environment:

```bash
# Deploy dev environment
terraform plan -var-file=dev.tfvars -out=dev.tfplan
terraform apply dev.tfplan

# Deploy prod environment
terraform plan -var-file=prod.tfvars -out=prod.tfplan
terraform apply prod.tfplan
```

## Outputs for Integration

Export useful values for other systems to consume:

```hcl
# outputs.tf
output "storage_account_name" {
  value       = azurerm_storage_account.main.name
  description = "The name of the storage account"
}

output "storage_account_primary_connection_string" {
  value       = azurerm_storage_account.main.primary_connection_string
  description = "Primary connection string"
  sensitive   = true
}

output "primary_blob_endpoint" {
  value       = azurerm_storage_account.main.primary_blob_endpoint
  description = "Primary blob service endpoint URL"
}

output "container_names" {
  value = {
    app_data = azurerm_storage_container.app_data.name
    backups  = azurerm_storage_container.backups.name
    logs     = azurerm_storage_container.logs.name
  }
  description = "Map of container names"
}
```

## Wrapping Up

Terraform provides a robust way to manage Azure Blob Storage infrastructure as code. You get version-controlled configurations, repeatable deployments, and easy multi-environment management. Using blob storage as Terraform's own backend closes the loop - your infrastructure code manages the very storage that holds its state. Start with a bootstrap script for the backend, then build your storage configurations incrementally. Always use separate state files for different environments, and take advantage of lifecycle policies to automate data management from day one.

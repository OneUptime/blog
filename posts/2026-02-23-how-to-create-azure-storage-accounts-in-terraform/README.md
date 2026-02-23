# How to Create Azure Storage Accounts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Storage Account, Infrastructure as Code, Blob Storage, Cloud Storage

Description: Complete guide to creating Azure Storage Accounts in Terraform with configuration for replication, networking, lifecycle management, and encryption.

---

Azure Storage Accounts are one of the most fundamental building blocks in Azure. They back everything from blob storage and file shares to table storage and queue messaging. Almost every Azure project needs at least one storage account, and Terraform makes it easy to define them consistently with the right security and networking settings from day one.

This post covers creating storage accounts in Terraform with all the production-ready configuration options including replication, networking rules, lifecycle management, and encryption.

## Provider Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Resource Group

```hcl
# main.tf
resource "azurerm_resource_group" "storage" {
  name     = "rg-storage-production"
  location = "East US"
}
```

## Basic Storage Account

Start with a straightforward storage account configuration.

```hcl
# storage.tf
# General purpose v2 storage account
resource "azurerm_storage_account" "main" {
  name                     = "stprodapp2026"
  resource_group_name      = azurerm_resource_group.storage.name
  location                 = azurerm_resource_group.storage.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant storage
  account_kind             = "StorageV2"

  # Require HTTPS for all connections
  enable_https_traffic_only = true

  # Minimum TLS version
  min_tls_version = "TLS1_2"

  # Enable infrastructure encryption (double encryption)
  infrastructure_encryption_enabled = true

  # Access tier for blob storage
  access_tier = "Hot"

  # Allow or deny public blob access at the account level
  allow_nested_items_to_be_public = false

  # Enable shared key access (disable if using only Azure AD auth)
  shared_access_key_enabled = true

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Network Rules

Lock down access to specific networks and services.

```hcl
# networking.tf
# Network rules for the storage account
resource "azurerm_storage_account_network_rules" "main" {
  storage_account_id = azurerm_storage_account.main.id

  # Default action is to deny all traffic
  default_action = "Deny"

  # Allow specific IP ranges
  ip_rules = ["203.0.113.0/24"]

  # Allow specific subnets
  virtual_network_subnet_ids = [var.app_subnet_id]

  # Allow trusted Azure services to bypass network rules
  bypass = ["AzureServices", "Metrics", "Logging"]
}
```

## Blob Properties

Configure blob-specific settings like versioning and soft delete.

```hcl
# blob-properties.tf
# This is configured directly in the storage account resource
resource "azurerm_storage_account" "main" {
  # ... (previous settings) ...

  blob_properties {
    # Enable versioning to keep previous versions of blobs
    versioning_enabled = true

    # Enable change feed for event-driven architectures
    change_feed_enabled = true

    # Soft delete for blobs - recoverable for 30 days after deletion
    delete_retention_policy {
      days = 30
    }

    # Soft delete for containers
    container_delete_retention_policy {
      days = 30
    }

    # CORS rules for web applications
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "POST", "PUT"]
      allowed_origins    = ["https://app.example.com"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }
}
```

Note: In practice, you define `blob_properties` inside the `azurerm_storage_account` resource block rather than as a separate resource. The example above shows it separately for clarity.

## Lifecycle Management

Automatically move or delete data based on age to reduce storage costs.

```hcl
# lifecycle.tf
# Lifecycle management policy
resource "azurerm_storage_management_policy" "main" {
  storage_account_id = azurerm_storage_account.main.id

  rule {
    name    = "move-to-cool"
    enabled = true

    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["logs/", "backups/"]
    }

    actions {
      base_blob {
        # Move to cool storage after 30 days
        tier_to_cool_after_days_since_modification_greater_than = 30
        # Move to archive storage after 90 days
        tier_to_archive_after_days_since_modification_greater_than = 90
        # Delete after 365 days
        delete_after_days_since_modification_greater_than = 365
      }

      snapshot {
        # Delete old snapshots after 90 days
        delete_after_days_since_creation_greater_than = 90
      }

      version {
        # Delete old versions after 90 days
        delete_after_days_since_creation = 90
      }
    }
  }

  rule {
    name    = "cleanup-temp"
    enabled = true

    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["temp/"]
    }

    actions {
      base_blob {
        # Delete temporary files after 7 days
        delete_after_days_since_modification_greater_than = 7
      }
    }
  }
}
```

## Premium Storage Account

For workloads that need low latency, like VM disks or high-performance file shares, use a Premium storage account.

```hcl
# premium-storage.tf
# Premium block blob storage for high-performance workloads
resource "azurerm_storage_account" "premium" {
  name                     = "stpremiumprod2026"
  resource_group_name      = azurerm_resource_group.storage.name
  location                 = azurerm_resource_group.storage.location
  account_tier             = "Premium"
  account_replication_type = "LRS"  # Premium only supports LRS and ZRS
  account_kind             = "BlockBlobStorage"

  enable_https_traffic_only = true
  min_tls_version           = "TLS1_2"

  tags = {
    environment = "production"
    purpose     = "high-performance"
  }
}
```

## Customer-Managed Encryption Keys

For compliance requirements, encrypt storage with your own keys stored in Key Vault.

```hcl
# encryption.tf
# Create a Key Vault for encryption keys
resource "azurerm_key_vault" "storage" {
  name                = "kv-storage-encrypt"
  location            = azurerm_resource_group.storage.location
  resource_group_name = azurerm_resource_group.storage.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  purge_protection_enabled   = true  # Required for CMK
  soft_delete_retention_days = 90
}

# Create an encryption key
resource "azurerm_key_vault_key" "storage" {
  name         = "storage-encryption-key"
  key_vault_id = azurerm_key_vault.storage.id
  key_type     = "RSA"
  key_size     = 2048
  key_opts     = ["decrypt", "encrypt", "wrapKey", "unwrapKey"]
}

# Reference the current client configuration
data "azurerm_client_config" "current" {}

# Apply customer-managed key to the storage account
resource "azurerm_storage_account_customer_managed_key" "main" {
  storage_account_id = azurerm_storage_account.main.id
  key_vault_id       = azurerm_key_vault.storage.id
  key_name           = azurerm_key_vault_key.storage.name
}
```

## Variables

```hcl
# variables.tf
variable "app_subnet_id" {
  type        = string
  description = "Subnet ID for storage account network rules"
  default     = ""
}

variable "storage_account_name" {
  type        = string
  description = "Name of the storage account (3-24 chars, lowercase alphanumeric only)"
  default     = "stprodapp2026"

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "Storage account name must be 3-24 characters, lowercase letters and numbers only."
  }
}
```

## Outputs

```hcl
# outputs.tf
output "storage_account_id" {
  value       = azurerm_storage_account.main.id
  description = "Resource ID of the storage account"
}

output "primary_blob_endpoint" {
  value       = azurerm_storage_account.main.primary_blob_endpoint
  description = "Primary blob service endpoint"
}

output "primary_access_key" {
  value       = azurerm_storage_account.main.primary_access_key
  sensitive   = true
  description = "Primary access key for the storage account"
}

output "primary_connection_string" {
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
  description = "Primary connection string"
}
```

## Replication Options

Azure offers several replication types for storage accounts:

- **LRS (Locally Redundant)**: Three copies within one datacenter. Cheapest option. Good for non-critical data.
- **ZRS (Zone Redundant)**: Three copies across availability zones in one region. Protects against datacenter failures.
- **GRS (Geo-Redundant)**: LRS in primary region plus LRS in a paired region. Protects against regional outages.
- **RAGRS (Read-Access Geo-Redundant)**: Same as GRS but allows read access to the secondary region copy.
- **GZRS (Geo-Zone-Redundant)**: ZRS in primary region plus LRS in a paired region. Best durability.
- **RAGZRS**: GZRS with read access to the secondary region.

For production data, GRS is the minimum recommendation. Use GZRS for critical data that needs both zone and regional redundancy.

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Storage accounts are naming-constrained - the name must be globally unique, 3-24 characters, and can only contain lowercase letters and numbers. Keep this in mind when designing your naming convention. Terraform will catch naming violations at plan time, which is another reason to use it instead of manual provisioning.

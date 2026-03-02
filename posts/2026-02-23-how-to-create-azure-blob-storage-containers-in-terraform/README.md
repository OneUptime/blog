# How to Create Azure Blob Storage Containers in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Blob Storage, Container, Infrastructure as Code, Cloud Storage

Description: Learn how to create and configure Azure Blob Storage containers in Terraform with access levels, lifecycle policies, and immutability settings.

---

Blob Storage containers are the organizational units inside Azure Storage Accounts where you store your blobs - files, images, backups, logs, and anything else unstructured. While creating a container through the portal takes a few clicks, defining them in Terraform ensures your storage structure is version-controlled and consistent across all your environments.

This guide covers creating blob containers with different access levels, configuring lifecycle policies per container, uploading initial blobs, and setting up immutability for compliance scenarios.

## Prerequisites

You need a storage account before creating containers. If you do not have one yet, check out our guide on [creating Azure Storage Accounts in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-storage-accounts-in-terraform/view).

## Provider and Base Resources

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

# main.tf
resource "azurerm_resource_group" "storage" {
  name     = "rg-blobstorage-production"
  location = "East US"
}

# Storage account that will hold our containers
resource "azurerm_storage_account" "main" {
  name                          = "stblobprod2026"
  resource_group_name           = azurerm_resource_group.storage.name
  location                      = azurerm_resource_group.storage.location
  account_tier                  = "Standard"
  account_replication_type      = "GRS"
  allow_nested_items_to_be_public = false
  min_tls_version               = "TLS1_2"
  enable_https_traffic_only     = true

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }
}
```

## Creating Basic Containers

```hcl
# containers.tf
# Private container for application data
resource "azurerm_storage_container" "app_data" {
  name                  = "app-data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"  # No anonymous access
}

# Container for application logs
resource "azurerm_storage_container" "logs" {
  name                  = "logs"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Container for backup files
resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Container for user uploads
resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}
```

## Container Access Levels

Azure Blob containers support three access levels:

- **private**: No anonymous access. All requests must be authenticated. This is the recommended default.
- **blob**: Anonymous read access to individual blobs, but not to the container listing. Useful for public assets when you know the URL.
- **container**: Anonymous read access to blobs and the container listing. Rarely appropriate in production.

```hcl
# Public assets container - use blob-level access for CDN-backed content
resource "azurerm_storage_container" "public_assets" {
  name                  = "public-assets"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "blob"  # Anyone with the URL can read
}
```

For most use cases, stick with `private` and use SAS tokens or Azure AD authentication to grant access.

## Creating Multiple Containers with for_each

When you need several containers with similar configuration, use `for_each` to avoid repetition.

```hcl
# Dynamic container creation
variable "containers" {
  description = "Map of containers to create"
  type = map(object({
    access_type = string
  }))
  default = {
    "raw-data" = {
      access_type = "private"
    }
    "processed-data" = {
      access_type = "private"
    }
    "reports" = {
      access_type = "private"
    }
    "staging" = {
      access_type = "private"
    }
    "archive" = {
      access_type = "private"
    }
  }
}

resource "azurerm_storage_container" "dynamic" {
  for_each              = var.containers
  name                  = each.key
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = each.value.access_type
}
```

## Uploading Initial Blobs

Sometimes you need to seed a container with initial files - configuration files, seed data, or static assets.

```hcl
# blobs.tf
# Upload a configuration file
resource "azurerm_storage_blob" "config" {
  name                   = "config/settings.json"
  storage_account_name   = azurerm_storage_account.main.name
  storage_container_name = azurerm_storage_container.app_data.name
  type                   = "Block"
  source                 = "${path.module}/files/settings.json"
  content_type           = "application/json"
}

# Upload content from a string (inline content)
resource "azurerm_storage_blob" "readme" {
  name                   = "README.txt"
  storage_account_name   = azurerm_storage_account.main.name
  storage_container_name = azurerm_storage_container.app_data.name
  type                   = "Block"
  source_content         = "This container holds application data managed by Terraform."
  content_type           = "text/plain"
}
```

## Lifecycle Management Per Container

Apply different lifecycle policies to different containers based on their data retention requirements.

```hcl
# lifecycle.tf
resource "azurerm_storage_management_policy" "main" {
  storage_account_id = azurerm_storage_account.main.id

  # Logs: move to cool after 30 days, archive after 90, delete after 180
  rule {
    name    = "logs-lifecycle"
    enabled = true

    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["logs/"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 180
      }
    }
  }

  # Backups: archive after 30 days, keep for 1 year
  rule {
    name    = "backups-lifecycle"
    enabled = true

    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["backups/"]
    }

    actions {
      base_blob {
        tier_to_archive_after_days_since_modification_greater_than = 30
        delete_after_days_since_modification_greater_than          = 365
      }
    }
  }

  # Uploads: delete incomplete uploads after 7 days
  rule {
    name    = "cleanup-incomplete-uploads"
    enabled = true

    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["uploads/"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 90
      }
    }
  }
}
```

## Immutability Policies

For regulatory compliance (WORM - Write Once, Read Many), configure immutability on containers.

```hcl
# compliance.tf
# Container for compliance-critical documents
resource "azurerm_storage_container" "compliance" {
  name                  = "compliance-records"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Note: Immutability policies can be set via azurerm_storage_container
# using the metadata or via Azure CLI after creation.
# Terraform support for immutability policies depends on provider version.
# As of azurerm 3.x, use azapi_resource or CLI provisioner for full control.
```

## Outputs

```hcl
# outputs.tf
output "container_names" {
  value = {
    app_data = azurerm_storage_container.app_data.name
    logs     = azurerm_storage_container.logs.name
    backups  = azurerm_storage_container.backups.name
    uploads  = azurerm_storage_container.uploads.name
  }
  description = "Names of the created containers"
}

output "blob_endpoint" {
  value       = azurerm_storage_account.main.primary_blob_endpoint
  description = "Primary blob endpoint URL"
}
```

## Naming Rules

Container names in Azure have specific rules:

- Must be 3 to 63 characters long
- Can only contain lowercase letters, numbers, and hyphens
- Must start with a letter or number
- Cannot have consecutive hyphens

Terraform will validate these at plan time, but knowing the rules upfront saves debugging time.

## Connecting Applications

After creating containers, applications typically connect using one of these methods:

```bash
# Connection string (from Terraform output)
terraform output -raw primary_connection_string

# SAS token generation via Azure CLI
az storage container generate-sas \
  --account-name stblobprod2026 \
  --name app-data \
  --permissions rwl \
  --expiry 2026-12-31 \
  --output tsv
```

For applications running in Azure, prefer managed identity authentication over connection strings or SAS tokens. It eliminates the need to manage credentials entirely.

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Blob containers are the building blocks of Azure storage. Defining them in Terraform gives you a clear picture of your storage structure, makes it easy to replicate across environments, and ensures that access levels and lifecycle policies are applied consistently every time.

# How to Create Azure File Shares in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, File Share, Azure Files, Infrastructure as Code, Cloud Storage, SMB

Description: Learn how to create and manage Azure File Shares in Terraform with quotas, access tiers, snapshots, and integration with on-premises or AKS workloads.

---

Azure Files provides fully managed file shares in the cloud that you can access via the SMB and NFS protocols. They work as drop-in replacements for on-premises file servers and integrate well with both cloud and hybrid workloads. Using Terraform to manage your file shares means the quota, access tier, and networking configuration are all codified and reproducible.

This guide covers creating file shares in Terraform, configuring access tiers, setting up backup, and connecting shares to VMs and Kubernetes clusters.

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
resource "azurerm_resource_group" "fileshare" {
  name     = "rg-fileshares-production"
  location = "East US"
}
```

## Storage Account for File Shares

File shares live inside storage accounts. The storage account configuration affects what features are available.

```hcl
# storage.tf
# Standard storage account for SMB file shares
resource "azurerm_storage_account" "files" {
  name                     = "stfilesprod2026"
  resource_group_name      = azurerm_resource_group.fileshare.name
  location                 = azurerm_resource_group.fileshare.location
  account_tier             = "Standard"
  account_replication_type = "ZRS"  # Zone-redundant for availability
  account_kind             = "StorageV2"

  enable_https_traffic_only = true
  min_tls_version           = "TLS1_2"

  # Enable large file shares (up to 100 TiB per share)
  large_file_share_enabled = true

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Creating SMB File Shares

```hcl
# file-shares.tf
# Shared documents file share
resource "azurerm_storage_share" "documents" {
  name                 = "documents"
  storage_account_name = azurerm_storage_account.files.name
  quota                = 100  # Size in GiB
  access_tier          = "Hot"

  # Enable SMB protocol settings
  acl {
    id = "docs-access-policy"

    access_policy {
      permissions = "rwdl"  # read, write, delete, list
      start       = "2026-01-01T00:00:00Z"
      expiry      = "2027-01-01T00:00:00Z"
    }
  }
}

# Application configuration share
resource "azurerm_storage_share" "app_config" {
  name                 = "app-config"
  storage_account_name = azurerm_storage_account.files.name
  quota                = 10  # 10 GiB
  access_tier          = "Hot"
}

# Log archive share
resource "azurerm_storage_share" "log_archive" {
  name                 = "log-archive"
  storage_account_name = azurerm_storage_account.files.name
  quota                = 500  # 500 GiB
  access_tier          = "Cool"  # Lower cost for infrequently accessed data
}
```

## Premium File Shares

For workloads needing low latency and high IOPS, use a Premium storage account.

```hcl
# premium-files.tf
# Premium storage account for high-performance file shares
resource "azurerm_storage_account" "premium_files" {
  name                     = "stpremiumfiles2026"
  resource_group_name      = azurerm_resource_group.fileshare.name
  location                 = azurerm_resource_group.fileshare.location
  account_tier             = "Premium"
  account_replication_type = "ZRS"
  account_kind             = "FileStorage"  # Must be FileStorage for Premium

  enable_https_traffic_only = true
  min_tls_version           = "TLS1_2"

  tags = {
    environment = "production"
    purpose     = "high-performance"
  }
}

# Premium file share with provisioned IOPS
resource "azurerm_storage_share" "database_files" {
  name                 = "database-files"
  storage_account_name = azurerm_storage_account.premium_files.name
  quota                = 256  # 256 GiB - IOPS scale with quota for Premium
  enabled_protocol     = "SMB"
}
```

## NFS File Shares

For Linux workloads, NFS shares avoid the overhead of SMB.

```hcl
# nfs-share.tf
# Premium storage account with NFS support
resource "azurerm_storage_account" "nfs" {
  name                     = "stnfsprod2026"
  resource_group_name      = azurerm_resource_group.fileshare.name
  location                 = azurerm_resource_group.fileshare.location
  account_tier             = "Premium"
  account_replication_type = "LRS"
  account_kind             = "FileStorage"

  # NFS requires HTTPS to be disabled and specific network settings
  enable_https_traffic_only = false

  network_rules {
    default_action             = "Deny"
    virtual_network_subnet_ids = [var.app_subnet_id]
  }
}

# NFS file share
resource "azurerm_storage_share" "nfs_data" {
  name                 = "nfs-data"
  storage_account_name = azurerm_storage_account.nfs.name
  quota                = 100
  enabled_protocol     = "NFS"
}
```

## Creating Multiple Shares with for_each

```hcl
# dynamic-shares.tf
variable "file_shares" {
  description = "Map of file shares to create"
  type = map(object({
    quota       = number
    access_tier = string
  }))
  default = {
    "team-engineering" = { quota = 50, access_tier = "Hot" }
    "team-marketing"   = { quota = 50, access_tier = "Hot" }
    "team-finance"     = { quota = 25, access_tier = "Hot" }
    "shared-templates" = { quota = 10, access_tier = "Hot" }
    "cold-archive"     = { quota = 500, access_tier = "Cool" }
  }
}

resource "azurerm_storage_share" "teams" {
  for_each             = var.file_shares
  name                 = each.key
  storage_account_name = azurerm_storage_account.files.name
  quota                = each.value.quota
  access_tier          = each.value.access_tier
}
```

## Uploading Initial Files

Seed a file share with initial content using Terraform.

```hcl
# seed-files.tf
# Create a directory in the file share
resource "azurerm_storage_share_directory" "config" {
  name             = "config"
  storage_share_id = azurerm_storage_share.app_config.id
}

# Upload a file to the share
resource "azurerm_storage_share_file" "app_settings" {
  name             = "appsettings.json"
  storage_share_id = azurerm_storage_share.app_config.id
  path             = "config"
  source           = "${path.module}/files/appsettings.json"
  content_type     = "application/json"

  depends_on = [azurerm_storage_share_directory.config]
}
```

## Backup Configuration

Protect file shares with Azure Backup.

```hcl
# backup.tf
# Recovery Services vault for file share backups
resource "azurerm_recovery_services_vault" "main" {
  name                = "rsv-fileshare-backup"
  location            = azurerm_resource_group.fileshare.location
  resource_group_name = azurerm_resource_group.fileshare.name
  sku                 = "Standard"
}

# Backup policy for file shares
resource "azurerm_backup_policy_file_share" "daily" {
  name                = "daily-backup-policy"
  resource_group_name = azurerm_resource_group.fileshare.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name

  backup {
    frequency = "Daily"
    time      = "02:00"  # 2 AM UTC
  }

  retention_daily {
    count = 30  # Keep 30 daily backups
  }

  retention_weekly {
    count    = 12  # Keep 12 weekly backups
    weekdays = ["Sunday"]
  }

  retention_monthly {
    count    = 12  # Keep 12 monthly backups
    weekdays = ["Sunday"]
    weeks    = ["First"]
  }
}

# Enable backup for the documents share
resource "azurerm_backup_container_storage_account" "main" {
  resource_group_name = azurerm_resource_group.fileshare.name
  recovery_vault_name = azurerm_recovery_services_vault.main.name
  storage_account_id  = azurerm_storage_account.files.id
}

resource "azurerm_backup_protected_file_share" "documents" {
  resource_group_name       = azurerm_resource_group.fileshare.name
  recovery_vault_name       = azurerm_recovery_services_vault.main.name
  source_storage_account_id = azurerm_storage_account.files.id
  source_file_share_name    = azurerm_storage_share.documents.name
  backup_policy_id          = azurerm_backup_policy_file_share.daily.id

  depends_on = [azurerm_backup_container_storage_account.main]
}
```

## Mounting on VMs

After creating the shares, mount them on Azure VMs:

```bash
# Linux - mount SMB share
sudo mkdir -p /mnt/documents
sudo mount -t cifs //stfilesprod2026.file.core.windows.net/documents /mnt/documents \
  -o vers=3.0,username=stfilesprod2026,password=<storage-account-key>,dir_mode=0777,file_mode=0777

# Persist the mount in /etc/fstab
echo "//stfilesprod2026.file.core.windows.net/documents /mnt/documents cifs vers=3.0,username=stfilesprod2026,password=<key>,dir_mode=0777,file_mode=0777 0 0" | sudo tee -a /etc/fstab
```

## Outputs

```hcl
# outputs.tf
output "storage_account_name" {
  value       = azurerm_storage_account.files.name
  description = "Name of the storage account"
}

output "file_share_urls" {
  value = {
    documents   = "${azurerm_storage_account.files.primary_file_endpoint}${azurerm_storage_share.documents.name}"
    app_config  = "${azurerm_storage_account.files.primary_file_endpoint}${azurerm_storage_share.app_config.name}"
    log_archive = "${azurerm_storage_account.files.primary_file_endpoint}${azurerm_storage_share.log_archive.name}"
  }
  description = "URLs for the file shares"
}
```

## Access Tier Comparison

Standard file shares support three access tiers:

- **Hot**: Lowest access cost, highest storage cost. For actively used data.
- **Cool**: Lower storage cost, higher access cost. For data accessed infrequently.
- **Transaction Optimized**: Balanced for high-transaction workloads. Default tier.

Premium file shares do not have access tiers - IOPS and throughput scale with the provisioned quota size.

Azure File Shares managed through Terraform give you a clean, auditable way to handle shared storage across your organization. Whether you need simple team file shares or high-performance NFS volumes for application workloads, the configuration patterns in this post cover the common scenarios.

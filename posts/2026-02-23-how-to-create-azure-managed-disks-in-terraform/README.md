# How to Create Azure Managed Disks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Managed Disks, Storage, Infrastructure as Code, Virtual Machines

Description: Learn how to create and manage Azure Managed Disks with Terraform, including disk types, encryption, snapshots, and attaching disks to virtual machines.

---

Azure Managed Disks are the storage backbone of your virtual machines. Unlike unmanaged disks where you had to deal with storage accounts and VHD files yourself, managed disks abstract away the storage account layer and give you built-in redundancy, snapshots, and encryption. Terraform makes it straightforward to define your disk configuration as code and manage it alongside the rest of your infrastructure.

This post covers everything from creating basic managed disks to advanced scenarios like disk encryption, snapshots, and shared disks.

## Disk Types and When to Use Them

Azure offers four managed disk types, each with different performance and cost characteristics:

- **Ultra Disk**: Highest performance, sub-millisecond latency. Use for IO-intensive workloads like SAP HANA and top-tier databases.
- **Premium SSD v2**: Flexible performance tuning without tier changes. Good for production databases that need predictable performance.
- **Premium SSD**: Consistent low-latency performance. The default choice for production VMs.
- **Standard SSD**: Lower cost with reasonable performance. Good for web servers and light workloads.
- **Standard HDD**: Cheapest option. Use for backups, archives, and dev/test environments.

## Basic Managed Disk

Let's start with a straightforward managed disk:

```hcl
# Resource group for our storage resources
resource "azurerm_resource_group" "storage" {
  name     = "rg-storage-prod-eastus"
  location = "East US"
}

# A Premium SSD managed disk
resource "azurerm_managed_disk" "data" {
  name                 = "disk-data-app01"
  location             = azurerm_resource_group.storage.location
  resource_group_name  = azurerm_resource_group.storage.name

  # Storage account type determines performance tier
  storage_account_type = "Premium_LRS"

  # How the disk is created - Empty means a new blank disk
  create_option        = "Empty"

  # Size in GB
  disk_size_gb         = 256

  tags = {
    environment = "production"
    application = "app01"
    managed_by  = "terraform"
  }
}
```

The `storage_account_type` maps to disk types: `Premium_LRS` for Premium SSD, `StandardSSD_LRS` for Standard SSD, `Standard_LRS` for Standard HDD, `PremiumV2_LRS` for Premium SSD v2, and `UltraSSD_LRS` for Ultra Disks.

## Attaching a Disk to a VM

Creating a disk is only half the story. You need to attach it to a virtual machine:

```hcl
# Attach the managed disk to a VM
resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_linux_virtual_machine.app.id

  # Logical Unit Number - must be unique per VM
  lun                = 0

  # Caching setting - ReadWrite for data, ReadOnly for read-heavy, None for logs
  caching            = "ReadWrite"
}
```

The `lun` value must be unique for each disk attached to a VM. Start at 0 and increment for additional disks. The `caching` setting significantly affects performance:

- `ReadWrite`: Best for general data disks where you read and write frequently
- `ReadOnly`: Best for disks with read-heavy patterns
- `None`: Best for write-heavy workloads like database transaction logs

## Creating a Disk from a Snapshot

Snapshots are point-in-time copies of a disk. You can create new disks from them:

```hcl
# Take a snapshot of an existing disk
resource "azurerm_snapshot" "data_backup" {
  name                = "snap-data-app01-20240115"
  location            = azurerm_resource_group.storage.location
  resource_group_name = azurerm_resource_group.storage.name
  create_option       = "Copy"
  source_uri          = azurerm_managed_disk.data.id

  tags = {
    source_disk = azurerm_managed_disk.data.name
    created     = "2024-01-15"
  }
}

# Create a new disk from the snapshot
resource "azurerm_managed_disk" "restored" {
  name                 = "disk-data-app01-restored"
  location             = azurerm_resource_group.storage.location
  resource_group_name  = azurerm_resource_group.storage.name
  storage_account_type = "Premium_LRS"

  # Create from an existing snapshot
  create_option        = "Copy"
  source_resource_id   = azurerm_snapshot.data_backup.id

  disk_size_gb         = 256

  tags = {
    source_snapshot = azurerm_snapshot.data_backup.name
  }
}
```

## Disk Encryption with Customer-Managed Keys

By default, Azure encrypts managed disks at rest with platform-managed keys. For additional control, use customer-managed keys with Azure Key Vault:

```hcl
# Key Vault for storing encryption keys
resource "azurerm_key_vault" "encryption" {
  name                        = "kv-diskenc-prod"
  location                    = azurerm_resource_group.storage.location
  resource_group_name         = azurerm_resource_group.storage.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  enabled_for_disk_encryption = true
  purge_protection_enabled    = true
}

# Encryption key for disk encryption
resource "azurerm_key_vault_key" "disk_encryption" {
  name         = "key-disk-encryption"
  key_vault_id = azurerm_key_vault.encryption.id
  key_type     = "RSA"
  key_size     = 2048

  key_opts = [
    "decrypt",
    "encrypt",
    "sign",
    "unwrapKey",
    "verify",
    "wrapKey",
  ]
}

# Disk encryption set links the key to your disks
resource "azurerm_disk_encryption_set" "main" {
  name                = "des-prod-eastus"
  resource_group_name = azurerm_resource_group.storage.name
  location            = azurerm_resource_group.storage.location
  key_vault_key_id    = azurerm_key_vault_key.disk_encryption.id

  identity {
    type = "SystemAssigned"
  }
}

# Grant the disk encryption set access to the key vault
resource "azurerm_key_vault_access_policy" "disk_encryption" {
  key_vault_id = azurerm_key_vault.encryption.id
  tenant_id    = azurerm_disk_encryption_set.main.identity[0].tenant_id
  object_id    = azurerm_disk_encryption_set.main.identity[0].principal_id

  key_permissions = [
    "Get",
    "WrapKey",
    "UnwrapKey",
  ]
}

# Managed disk encrypted with customer-managed key
resource "azurerm_managed_disk" "encrypted" {
  name                   = "disk-data-encrypted-01"
  location               = azurerm_resource_group.storage.location
  resource_group_name    = azurerm_resource_group.storage.name
  storage_account_type   = "Premium_LRS"
  create_option          = "Empty"
  disk_size_gb           = 128
  disk_encryption_set_id = azurerm_disk_encryption_set.main.id

  depends_on = [
    azurerm_key_vault_access_policy.disk_encryption,
  ]
}
```

## Shared Disks

Shared disks let multiple VMs access the same disk simultaneously, which is useful for clustered workloads like Windows Server Failover Clustering or shared storage for databases:

```hcl
# Shared Premium SSD disk
resource "azurerm_managed_disk" "shared" {
  name                 = "disk-shared-cluster"
  location             = azurerm_resource_group.storage.location
  resource_group_name  = azurerm_resource_group.storage.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 256

  # Maximum number of VMs that can attach this disk simultaneously
  max_shares           = 2

  tags = {
    purpose = "cluster-shared-storage"
  }
}
```

Not all disk sizes support sharing, and the maximum number of shares depends on the disk size. Premium SSDs of 256 GB or larger support up to 10 shares.

## Creating Multiple Disks with for_each

When you need several disks with different configurations, use `for_each`:

```hcl
# Define disk configurations
variable "data_disks" {
  description = "Map of data disk configurations"
  type = map(object({
    size_gb      = number
    storage_type = string
    caching      = string
    lun          = number
  }))
  default = {
    "data" = {
      size_gb      = 256
      storage_type = "Premium_LRS"
      caching      = "ReadWrite"
      lun          = 0
    }
    "logs" = {
      size_gb      = 128
      storage_type = "Premium_LRS"
      caching      = "None"
      lun          = 1
    }
    "temp" = {
      size_gb      = 64
      storage_type = "StandardSSD_LRS"
      caching      = "ReadOnly"
      lun          = 2
    }
  }
}

# Create all disks
resource "azurerm_managed_disk" "disks" {
  for_each = var.data_disks

  name                 = "disk-${each.key}-app01"
  location             = azurerm_resource_group.storage.location
  resource_group_name  = azurerm_resource_group.storage.name
  storage_account_type = each.value.storage_type
  create_option        = "Empty"
  disk_size_gb         = each.value.size_gb

  tags = {
    purpose = each.key
  }
}

# Attach all disks to the VM
resource "azurerm_virtual_machine_data_disk_attachment" "disks" {
  for_each = var.data_disks

  managed_disk_id    = azurerm_managed_disk.disks[each.key].id
  virtual_machine_id = azurerm_linux_virtual_machine.app.id
  lun                = each.value.lun
  caching            = each.value.caching
}
```

## Disk Performance Tuning

For Premium SSD v2 disks, you can tune IOPS and throughput independently:

```hcl
# Premium SSD v2 with custom performance settings
resource "azurerm_managed_disk" "high_perf" {
  name                 = "disk-data-highperf-01"
  location             = azurerm_resource_group.storage.location
  resource_group_name  = azurerm_resource_group.storage.name
  storage_account_type = "PremiumV2_LRS"
  create_option        = "Empty"
  disk_size_gb         = 512

  # Custom IOPS - baseline is 3000, max depends on disk size
  disk_iops_read_write = 10000

  # Custom throughput in MB/s - baseline is 125
  disk_mbps_read_write = 500

  # Zone is required for Premium SSD v2
  zone                 = "1"
}
```

## Best Practices

**Choose the right caching mode.** This is the most common mistake. Using ReadWrite caching on a database transaction log disk can cause data corruption. Use None for write-heavy workloads.

**Size disks appropriately.** Disk performance scales with size for Premium SSDs. A P10 (128 GB) disk gives you 500 IOPS, while a P30 (1 TB) gives you 5000 IOPS. Sometimes provisioning a larger disk just for the IOPS makes sense.

**Use snapshots before destructive operations.** Always snapshot a disk before resizing, changing encryption, or performing any operation that modifies the disk.

**Lifecycle management.** Add `lifecycle { prevent_destroy = true }` to critical data disks in Terraform to prevent accidental deletion.

## Wrapping Up

Azure Managed Disks with Terraform give you a clean, repeatable way to provision and manage storage for your VMs. Pick the right disk type for each workload, set caching appropriately, encrypt with customer-managed keys if your compliance requirements demand it, and use snapshots for point-in-time recovery. With Terraform managing the configuration, your disk setup becomes just another piece of your infrastructure code.

# How to Configure Azure VM Managed Disks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Managed Disks, Storage, Performance, Encryption, Infrastructure as Code

Description: Learn how to create and configure Azure Managed Disks with OpenTofu for VM storage, including Premium SSD, Ultra Disk, disk snapshots, and customer-managed encryption keys.

## Introduction

Azure Managed Disks are block-level storage volumes managed by Azure, eliminating the need to manage storage accounts. Common managed disk types include Standard HDD (archival/dev), Standard SSD (light production), Premium SSD (production workloads), Premium SSD v2 (high-performance configurable workloads), and Ultra Disk (latency-sensitive databases). Managed Disks support encryption with platform-managed or customer-managed keys, incremental snapshots for backup, and some disk types support disk bursting for handling traffic spikes.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- A Resource Group and optionally an existing VM for data disk attachment
- If using customer-managed keys, an Azure Key Vault in the same region as the Disk Encryption Set with soft delete and purge protection enabled

## Step 1: Create Premium SSD Managed Disk

```hcl
resource "azurerm_managed_disk" "data" {
  name                 = "${var.project_name}-data-disk"
  location             = var.location
  resource_group_name  = var.resource_group_name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 1024

  # On-demand bursting requires a Premium SSD larger than 512 GiB
  on_demand_bursting_enabled = true

  # Optional availability zone for a zonal deployment
  zone = "1"

  tags = {
    Name    = "${var.project_name}-data-disk"
    Purpose = "application-data"
  }
}
```

## Step 2: Ultra Disk for High-Performance Workloads

```hcl
resource "azurerm_managed_disk" "ultra" {
  name                 = "${var.project_name}-ultra-disk"
  location             = var.location
  resource_group_name  = var.resource_group_name
  storage_account_type = "UltraSSD_LRS"
  create_option        = "Empty"
  disk_size_gb         = 1024

  # Configure provisioned IOPS and throughput for Ultra Disk
  disk_iops_read_write = 8000    # Up to 400,000 IOPS
  disk_mbps_read_write = 512     # Up to 10,000 MB/s

  zone = "1"  # Use the same availability zone as the VM for zonal deployments
}
```

## Step 3: Customer-Managed Encryption

```hcl
resource "azurerm_key_vault_key" "disk_encryption" {
  name         = "${var.project_name}-disk-key"
  key_vault_id = var.key_vault_id
  key_type     = "RSA"
  key_size     = 4096

  key_opts = ["decrypt", "encrypt", "sign", "unwrapKey", "verify", "wrapKey"]
}

resource "azurerm_disk_encryption_set" "main" {
  name                = "${var.project_name}-disk-encryption-set"
  resource_group_name = var.resource_group_name
  location            = var.location
  key_vault_key_id    = azurerm_key_vault_key.disk_encryption.id

  identity {
    type = "SystemAssigned"
  }
}

# Grant the disk encryption set access to the Key Vault when using access policies

resource "azurerm_key_vault_access_policy" "disk_encryption" {
  key_vault_id = var.key_vault_id
  tenant_id    = azurerm_disk_encryption_set.main.identity[0].tenant_id
  object_id    = azurerm_disk_encryption_set.main.identity[0].principal_id

  key_permissions = ["Get", "WrapKey", "UnwrapKey"]
}

resource "azurerm_managed_disk" "encrypted" {
  name                   = "${var.project_name}-encrypted-disk"
  location               = var.location
  resource_group_name    = var.resource_group_name
  storage_account_type   = "Premium_LRS"
  create_option          = "Empty"
  disk_size_gb           = 256
  disk_encryption_set_id = azurerm_disk_encryption_set.main.id

  depends_on = [azurerm_key_vault_access_policy.disk_encryption]
}
```

## Step 4: Disk Snapshot

```hcl
resource "azurerm_snapshot" "data_backup" {
  name                = "${var.project_name}-snapshot-${formatdate("YYYYMMDD", timestamp())}"
  location            = var.location
  resource_group_name = var.resource_group_name
  create_option       = "Copy"
  source_uri          = azurerm_managed_disk.data.id

  # The first incremental snapshot is a full copy; later snapshots store only changes
  incremental_enabled = true

  tags = {
    Name      = "${var.project_name}-disk-snapshot"
    CreatedAt = timestamp()
  }

  lifecycle {
    ignore_changes = [name, tags["CreatedAt"]]
  }
}
```

## Step 5: Attach Disk to VM

```hcl
resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = var.vm_id
  lun                = 0       # Logical unit number (0-63)
  caching            = "ReadWrite"  # None, ReadOnly, ReadWrite
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check disk performance metrics
az monitor metrics list \
  --resource <disk-id> \
  --metrics "Composite Disk Read Operations/sec" "Composite Disk Write Operations/sec" \
  --interval PT1M

# Resize a disk; data disks can often be expanded online, but OS disks require deallocation first
az disk update \
  --resource-group <rg> \
  --name <disk-name> \
  --size-gb 1024
```

## Conclusion

Use `incremental_enabled = true` for snapshots in production: the first incremental snapshot is a full copy, and later snapshots store only block-level changes since the last snapshot, which can reduce snapshot storage costs. Premium SSD v2 disks can only be attached to zonal VMs in regions that support availability zones, and Ultra Disks don't support availability sets. Set `on_demand_bursting_enabled = true` on Premium SSD disks larger than 512 GiB to handle occasional IOPS spikes without permanently paying for a higher performance tier.

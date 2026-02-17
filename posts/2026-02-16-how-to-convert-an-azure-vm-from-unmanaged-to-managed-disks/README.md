# How to Convert an Azure VM from Unmanaged to Managed Disks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Managed Disks, Unmanaged Disks, Virtual Machine, Storage Migration, Azure CLI, Cloud Infrastructure

Description: Step-by-step guide to migrating Azure VMs from unmanaged disks (VHDs in storage accounts) to managed disks for better reliability and management.

---

If you have Azure VMs that were created a few years ago, there is a good chance they are running on unmanaged disks. Unmanaged disks store VHD files in Azure Storage accounts that you manage yourself. Managed disks, on the other hand, abstract away the storage account entirely - Azure handles the storage, replication, and availability for you.

Microsoft has been encouraging migration to managed disks for a while now, and for good reason. Managed disks are simpler to manage, have better availability guarantees, and support features like Azure Disk Encryption, disk snapshots, and RBAC-based access control that unmanaged disks do not support well. In this guide, I will walk through the conversion process.

## Why Migrate to Managed Disks?

Before diving into the how, let me explain why this migration is worth the effort:

**Simplified management**: With unmanaged disks, you have to create and manage storage accounts, monitor their IOPS limits, and handle VHD file placement yourself. With managed disks, you just specify the disk size and type, and Azure takes care of the rest.

**Better availability**: Managed disks in an availability set are automatically distributed across different storage fault domains. Unmanaged disks can end up on the same storage stamp, creating a single point of failure.

**Snapshot and backup support**: Managed disks support native snapshots and integrate cleanly with Azure Backup. With unmanaged disks, you have to deal with blob snapshots and storage account-level operations.

**Encryption support**: Azure Disk Encryption works seamlessly with managed disks. Setting it up with unmanaged disks is significantly more work.

**RBAC integration**: You can assign role-based access control directly to managed disk resources. Unmanaged disks are just blobs in a storage account, so access control is coarser.

**Performance tiers**: Managed disks let you change performance tiers (Standard HDD, Standard SSD, Premium SSD) without recreating the disk.

## Prerequisites

Before starting the conversion:

1. **Back up your VMs.** Always have a backup before making changes to disk configurations. Use Azure Backup or take a manual snapshot of your VHDs.

2. **Check for Azure Site Recovery.** If the VM is protected by Azure Site Recovery, you need to disable replication first, perform the conversion, and then re-enable replication.

3. **Plan for downtime.** The conversion requires deallocating the VM. Plan a maintenance window.

4. **Check your subscription quotas.** The conversion creates new managed disk resources. Make sure your subscription has enough disk quota.

## Checking Current Disk Type

First, verify whether your VM is using managed or unmanaged disks:

```bash
# Check the OS disk type - if managedDisk is null, it is unmanaged
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query storageProfile.osDisk.managedDisk \
  --output json
```

If the output is `null`, the VM is using unmanaged disks. If it returns an object with an `id` field, the disks are already managed.

You can also check the storage profile for VHD URIs:

```bash
# Look for VHD URIs which indicate unmanaged disks
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query storageProfile.osDisk.vhd \
  --output json
```

If this returns a URI like `https://mystorageaccount.blob.core.windows.net/vhds/osdisk.vhd`, the disk is unmanaged.

## Converting a Single VM

The conversion process for a single VM is straightforward:

```bash
# Step 1: Deallocate the VM
az vm deallocate \
  --resource-group myResourceGroup \
  --name myVM

# Step 2: Convert to managed disks
az vm convert \
  --resource-group myResourceGroup \
  --name myVM

# Step 3: Start the VM back up
az vm start \
  --resource-group myResourceGroup \
  --name myVM
```

That is it. The `az vm convert` command handles the conversion of both the OS disk and all attached data disks. Azure creates new managed disk resources and updates the VM configuration to point to them.

## Converting VMs in an Availability Set

If your VMs are in an availability set, you need to convert all VMs in the set at once. Azure cannot have a mix of managed and unmanaged disks within the same availability set.

```bash
# Step 1: Deallocate ALL VMs in the availability set
az vm deallocate --ids $(az vm list \
  --resource-group myResourceGroup \
  --query "[].id" \
  --output tsv)

# Step 2: Convert the availability set to support managed disks
az vm availability-set convert \
  --resource-group myResourceGroup \
  --name myAvailabilitySet

# Step 3: Convert each VM
for VM_ID in $(az vm list \
  --resource-group myResourceGroup \
  --query "[].id" \
  --output tsv); do
  az vm convert --ids $VM_ID
done

# Step 4: Start all VMs
for VM_ID in $(az vm list \
  --resource-group myResourceGroup \
  --query "[].id" \
  --output tsv); do
  az vm start --ids $VM_ID
done
```

The availability set itself needs to be converted first using `az vm availability-set convert`. This updates the availability set to track managed disk fault domains instead of storage account fault domains.

## What Happens During Conversion

Understanding what happens behind the scenes helps with troubleshooting:

1. Azure reads the VHD blob from your storage account.
2. It creates a new managed disk resource from the VHD data.
3. The VM's configuration is updated to reference the managed disk instead of the VHD URI.
4. The original VHD blob in the storage account is not deleted.

Because the original VHDs are preserved, you have a fallback if something goes wrong. However, you are paying for both the managed disk and the storage account blob until you clean up the old VHDs.

## Post-Conversion Cleanup

After the conversion is successful and you have verified that the VM is running properly, you can clean up the old storage:

```bash
# List VHD blobs in the storage account container
az storage blob list \
  --account-name mystorageaccount \
  --container-name vhds \
  --output table

# Delete the old OS disk VHD (after confirming the VM works on managed disks)
az storage blob delete \
  --account-name mystorageaccount \
  --container-name vhds \
  --name osdisk.vhd
```

If the storage account was used exclusively for VM disks and is now empty, you can delete it entirely:

```bash
# Delete the storage account if it is no longer needed
az storage account delete \
  --resource-group myResourceGroup \
  --name mystorageaccount \
  --yes
```

## Post-Conversion: Changing Disk Type

One of the immediate benefits of managed disks is the ability to change the disk type. If your VM was running on Standard HDD blobs, you can upgrade to Premium SSD:

```bash
# Deallocate the VM first (required for disk type change)
az vm deallocate \
  --resource-group myResourceGroup \
  --name myVM

# Get the OS disk name
DISK_NAME=$(az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query storageProfile.osDisk.name \
  --output tsv)

# Change the disk type to Premium SSD
az disk update \
  --resource-group myResourceGroup \
  --name $DISK_NAME \
  --sku Premium_LRS

# Start the VM
az vm start \
  --resource-group myResourceGroup \
  --name myVM
```

## Converting at Scale with PowerShell

If you have many VMs to convert, PowerShell can be more efficient:

```powershell
# Get all VMs in a resource group that use unmanaged disks
$vms = Get-AzVM -ResourceGroupName "myResourceGroup"
$unmanagedVMs = $vms | Where-Object {
    $_.StorageProfile.OsDisk.ManagedDisk -eq $null
}

# Convert each VM
foreach ($vm in $unmanagedVMs) {
    Write-Host "Converting $($vm.Name)..."

    # Deallocate
    Stop-AzVM -ResourceGroupName $vm.ResourceGroupName -Name $vm.Name -Force

    # Convert
    ConvertTo-AzVMManagedDisk -ResourceGroupName $vm.ResourceGroupName -VMName $vm.Name

    # Start
    Start-AzVM -ResourceGroupName $vm.ResourceGroupName -Name $vm.Name

    Write-Host "$($vm.Name) converted successfully."
}
```

## Troubleshooting Common Issues

**Conversion fails with a quota error**: Check your managed disk quota in the region. Each subscription has limits on the number of managed disks. Request a quota increase if needed.

**VM fails to start after conversion**: Check the boot diagnostics for errors. In rare cases, the OS might not handle the disk controller change well. This is more common with very old OS versions.

**Availability set conversion fails**: Make sure all VMs in the availability set are deallocated. The conversion cannot proceed if any VM is still running.

**Performance changes after conversion**: If you were using premium storage accounts for your VHDs, the managed disks should be created as Premium SSD. Verify the disk SKU after conversion:

```bash
# Check the SKU of the converted managed disk
az disk show \
  --resource-group myResourceGroup \
  --name myDisk \
  --query sku.name \
  --output tsv
```

## Wrapping Up

Converting from unmanaged to managed disks is a one-time migration that pays dividends in simplified management and better feature support. The conversion itself is quick and the Azure CLI makes it a single command per VM. Plan for the downtime, take backups before starting, and clean up the old VHD blobs once you have confirmed everything is working. If you still have VMs on unmanaged disks, now is the time to make the switch.

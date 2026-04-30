# How to Import Azure Virtual Machines into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Azure, Virtual Machine, Import, Compute

Description: Learn how to import existing Azure Virtual Machines into OpenTofu state, including network interfaces, managed disks, and OS disk configurations.

## Introduction

Azure VMs are complex resources that consist of the VM itself plus associated network interfaces and managed disks. This guide covers importing the core VM resources and matching their existing configuration closely.

## Step 1: Gather VM Configuration

```bash
RG="my-app-rg"
VM_NAME="my-app-vm"

# Get VM details

az vm show --resource-group $RG --name $VM_NAME --output json | jq '{
  location: .location,
  vm_size: .hardwareProfile.vmSize,
  admin_username: .osProfile.adminUsername,
  ssh_public_key: .osProfile.linuxConfiguration.ssh.publicKeys[0].keyData,
  os_type: .storageProfile.osDisk.osType,
  availability_set_id: .availabilitySet.id,
  plan: .plan,
  os_disk: {
    caching: .storageProfile.osDisk.caching,
    storage_account_type: .storageProfile.osDisk.managedDisk.storageAccountType,
    disk_size_gb: .storageProfile.osDisk.diskSizeGb
  },
  image: .storageProfile.imageReference,
  data_disks: [.storageProfile.dataDisks[]? | {
    name: .name,
    lun: .lun,
    caching: .caching,
    managed_disk_id: .managedDisk.id
  }],
  tags: .tags,
  nic_ids: [.networkProfile.networkInterfaces[].id]
}'

# Get the NIC details
NIC_NAME=$(az vm show -g $RG -n $VM_NAME --query 'networkProfile.networkInterfaces[0].id' -o tsv | xargs basename)
az network nic show --resource-group $RG --name $NIC_NAME --output json | jq '{
  nic_name: .name,
  ip_configuration_name: .ipConfigurations[0].name,
  subnet_id: .ipConfigurations[0].subnet.id,
  private_ip_allocation: .ipConfigurations[0].privateIPAllocationMethod,
  private_ip: .ipConfigurations[0].privateIPAddress,
  tags: .tags
}'

# Get managed disk details
DATA_DISK_NAME="my-app-vm-data-disk"
az disk show --resource-group $RG --name $DATA_DISK_NAME --output json | jq '{
  name: .name,
  storage_account_type: .sku.name,
  create_option: .creationData.createOption,
  disk_size_gb: .diskSizeGb,
  tags: .tags
}'
```

## Step 2: Write Matching HCL

```hcl
# Network interface must be imported first
resource "azurerm_network_interface" "app" {
  name                = var.nic_name
  resource_group_name = var.resource_group_name
  location            = var.location

  ip_configuration {
    name                          = var.nic_ip_configuration_name
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = var.private_ip_allocation
    private_ip_address            = var.private_ip_allocation == "Static" ? var.private_ip_address : null
  }

  tags = var.nic_tags
}

resource "azurerm_linux_virtual_machine" "app" {
  name                = var.vm_name
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = var.vm_size
  admin_username      = var.admin_username
  availability_set_id = var.availability_set_id

  network_interface_ids = [azurerm_network_interface.app.id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.admin_ssh_public_key
  }

  os_disk {
    caching              = var.os_disk_caching
    storage_account_type = var.os_disk_storage_account_type
    disk_size_gb         = var.os_disk_size_gb
  }

  # If the VM was created from a custom image, use source_image_id instead.
  source_image_reference {
    publisher = var.image_publisher
    offer     = var.image_offer
    sku       = var.image_sku
    version   = var.image_version
  }

  # If az vm show returned plan information, add a matching plan block here.
  tags = var.vm_tags
}
```

## Import Blocks

```hcl
# import.tf
import {
  to = azurerm_network_interface.app
  id = "/subscriptions/SUBSCRIPTION_ID/resourceGroups/my-app-rg/providers/Microsoft.Network/networkInterfaces/my-app-vm-nic"
}

import {
  to = azurerm_linux_virtual_machine.app
  id = "/subscriptions/SUBSCRIPTION_ID/resourceGroups/my-app-rg/providers/Microsoft.Compute/virtualMachines/my-app-vm"
}
```

## Importing Managed Data Disks

```hcl
resource "azurerm_managed_disk" "data" {
  name                 = var.data_disk_name
  resource_group_name  = var.resource_group_name
  location             = var.location
  storage_account_type = var.data_disk_storage_account_type
  create_option        = var.data_disk_create_option
  disk_size_gb         = var.data_disk_size_gb
  tags                 = var.data_disk_tags
}

resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_linux_virtual_machine.app.id
  lun                = var.data_disk_lun
  caching            = var.data_disk_caching
}

import {
  to = azurerm_managed_disk.data
  id = "/subscriptions/SUBSCRIPTION_ID/resourceGroups/my-app-rg/providers/Microsoft.Compute/disks/my-app-vm-data-disk"
}

import {
  to = azurerm_virtual_machine_data_disk_attachment.data
  id = "/subscriptions/SUBSCRIPTION_ID/resourceGroups/my-app-rg/providers/Microsoft.Compute/virtualMachines/my-app-vm/dataDisks/my-app-vm-data-disk"
}
```

## Conclusion

Azure VM import requires matching the imported NIC, VM, and disk attachment settings as closely as possible, and importing the NIC before the VM keeps the dependency order clear. Import the `azurerm_virtual_machine_data_disk_attachment` resource as well as the managed disk for existing data disks. If you intentionally change `source_image_reference.version` to `latest` after import, use `ignore_changes = [source_image_reference]` to avoid replacement plans. For Windows VMs, use `azurerm_windows_virtual_machine` and match the existing administrator settings.

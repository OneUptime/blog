# How to Create Azure VM Images with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, VM Image, Managed Images, Image Builder, Golden Image, Infrastructure as Code

Description: Learn how to create and manage Azure VM images with OpenTofu, including managed images from generalized VMs and Azure Image Builder for automated image pipelines.

## Introduction

Azure VM images capture VM or disk state so you can create multiple identical VMs. Managed images are the simplest legacy form-captured from a generalized VM or prepared disk and usable within a single region. For multi-region distribution and versioning, images should be stored in Azure Compute Gallery. Azure Image Builder provides a fully managed pipeline for creating customized VM images using Packer-like templates with built-in Azure integration.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- A generalized VM or VHD to capture from
- The required resource providers registered if you plan to use Azure Image Builder (`Microsoft.VirtualMachineImages`, `Microsoft.Compute`, `Microsoft.KeyVault`, `Microsoft.Storage`, `Microsoft.Network`, and `Microsoft.ContainerInstance`)

## Step 1: Create Managed Image from Generalized VM

```hcl
# First, generalize the VM (run on Linux VM):

# sudo waagent -deprovision+user -force
# Then from Azure CLI:
# az vm deallocate --resource-group <rg> --name <vm-name>
# az vm generalize --resource-group <rg> --name <vm-name>

resource "azurerm_image" "app_server" {
  name                      = "${var.project_name}-app-image"
  location                  = var.location
  resource_group_name       = var.resource_group_name
  source_virtual_machine_id = var.generalized_vm_id

  tags = {
    Name        = "${var.project_name}-app-server-image"
    Version     = var.image_version
    BuildDate   = timestamp()
    Environment = "production"
  }

  lifecycle {
    ignore_changes = [tags["BuildDate"]]
  }
}

# Use the captured image to create VMs
resource "azurerm_linux_virtual_machine" "from_image" {
  name                = "${var.project_name}-vm"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D2s_v3"

  network_interface_ids           = [azurerm_network_interface.main.id]
  admin_username                  = "azureuser"
  disable_password_authentication = true

  admin_ssh_key {
    username   = "azureuser"
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_id = azurerm_image.app_server.id
}
```

## Step 2: Image from OS Disk Snapshot

```hcl
# Create snapshot from OS managed disk
resource "azurerm_snapshot" "os_disk" {
  name                = "${var.project_name}-os-snapshot"
  location            = var.location
  resource_group_name = var.resource_group_name
  create_option       = "Copy"
  source_uri          = var.os_disk_id
}

# Restore managed disks from the snapshots
resource "azurerm_managed_disk" "os_from_snapshot" {
  name                 = "${var.project_name}-os-from-snapshot"
  location             = var.location
  resource_group_name  = var.resource_group_name
  storage_account_type = "Premium_LRS"
  create_option        = "Copy"
  source_resource_id   = azurerm_snapshot.os_disk.id
  os_type              = "Linux"
}

resource "azurerm_managed_disk" "data_from_snapshot" {
  name                 = "${var.project_name}-data-from-snapshot"
  location             = var.location
  resource_group_name  = var.resource_group_name
  storage_account_type = "Premium_LRS"
  create_option        = "Copy"
  source_resource_id   = var.data_disk_snapshot_id
}

# Create managed image from the restored disks
resource "azurerm_image" "from_snapshot" {
  name                = "${var.project_name}-snapshot-image"
  location            = var.location
  resource_group_name = var.resource_group_name

  os_disk {
    os_type         = "Linux"
    os_state        = "Generalized"
    managed_disk_id = azurerm_managed_disk.os_from_snapshot.id
    storage_type    = "Premium_LRS"
    caching         = "ReadWrite"
  }

  # Include data disk snapshots
  data_disk {
    lun             = 0
    managed_disk_id = azurerm_managed_disk.data_from_snapshot.id
    storage_type    = "Premium_LRS"
    caching         = "ReadWrite"
  }
}
```

## Step 3: Azure Image Builder Template

```hcl
# Managed identity for Image Builder
resource "azurerm_user_assigned_identity" "image_builder" {
  name                = "${var.project_name}-image-builder-identity"
  location            = var.location
  resource_group_name = var.resource_group_name
}

resource "azurerm_role_assignment" "image_builder" {
  scope                = var.resource_group_id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.image_builder.principal_id
}

# Azure Image Builder template via AzAPI
resource "azapi_resource" "ubuntu" {
  type      = "Microsoft.VirtualMachineImages/imageTemplates@2024-02-01"
  name      = "${var.project_name}-ubuntu-template"
  parent_id = var.resource_group_id
  location  = var.location

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.image_builder.id]
  }

  body = {
    properties = {
      source = {
        type      = "PlatformImage"
        publisher = "Canonical"
        offer     = "0001-com-ubuntu-server-jammy"
        sku       = "22_04-lts-gen2"
        version   = "latest"
      }

      customize = [
        {
          type = "Shell"
          inline = [
            "sudo apt-get update",
            "sudo apt-get install -y nginx",
            "sudo systemctl enable nginx"
          ]
        }
      ]

      distribute = [
        {
          type           = "SharedImage"
          galleryImageId = var.gallery_image_id
          runOutputName  = "ubuntu"
          targetRegions = [
            {
              name               = var.location
              storageAccountType = "Standard_LRS"
            },
            {
              name               = var.secondary_location
              storageAccountType = "Standard_LRS"
            }
          ]
          versioning = {
            scheme = "Latest"
            major  = 1
          }
        }
      ]
    }
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Trigger image build
az image builder run \
  --resource-group <rg> \
  --name <template-name> \
  --no-wait

# Wait for the build to finish
az image builder wait \
  --resource-group <rg> \
  --name <template-name> \
  --custom "lastRunStatus.runState!='Running'"

# Check build status
az image builder show \
  --resource-group <rg> \
  --name <template-name> \
  --query "lastRunStatus"

# List available gallery image versions
az sig image-version list \
  --resource-group <rg> \
  --gallery-name <gallery-name> \
  --gallery-image-definition <image-definition> \
  --output table
```

## Conclusion

Managed images are region-specific-to use an image in multiple regions, copy it to Azure Compute Gallery with multi-region replication. Keep managed images from old VM versions for rollback purposes by tagging them with version numbers and creation dates. Azure Image Builder is the recommended approach for automated image pipelines as it handles generalization, testing, and distribution; use it in CI/CD pipelines triggered by OS or application updates. Delete old images when they are no longer needed-managed images incur storage costs based on the captured disk size.

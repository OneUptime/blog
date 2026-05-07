# How to Use Custom Images for Azure VMs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Custom Image, Shared Image Gallery, VMs, Golden Image, Infrastructure as Code

Description: Learn how to create and use custom VM images with OpenTofu on Azure, including Azure Compute Gallery for image versioning and multi-region distribution.

## Introduction

Custom VM images (golden images) bake application dependencies, OS hardening, and configuration into a reusable image that ensures consistent VM deployments across environments. Azure Compute Gallery (formerly Shared Image Gallery) provides image versioning, replication across regions, and sharing across subscriptions and tenants. Using custom images reduces VM boot time and eliminates configuration drift from post-boot scripts.

## Prerequisites

- OpenTofu v1.6+
- A managed image, snapshot, or existing VM to use as the image source
- Azure credentials with Compute Gallery permissions

## Step 1: Create Azure Compute Gallery

```hcl
resource "azurerm_shared_image_gallery" "main" {
  name                = "${var.project_name}gallery"
  resource_group_name = var.resource_group_name
  location            = var.location
  description         = "Custom VM images for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-compute-gallery"
  }
}

resource "azurerm_shared_image" "app" {
  name                = "${var.project_name}-app-image"
  gallery_name        = azurerm_shared_image_gallery.main.name
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"

  identifier {
    publisher = var.project_name
    offer     = "AppServer"
    sku       = "production"
  }

  # Match the source VM/image
  hyper_v_generation = var.hyper_v_generation
  architecture       = var.image_architecture

  tags = {
    Name = "${var.project_name}-app-image-definition"
  }
}
```

## Step 2: Create Image Version

```hcl
resource "azurerm_shared_image_version" "v1" {
  name                = "1.0.0"
  gallery_name        = azurerm_shared_image_gallery.main.name
  image_name          = azurerm_shared_image.app.name
  resource_group_name = var.resource_group_name
  location            = var.location

  # Source: managed image (use os_disk_snapshot_id for a snapshot)
  managed_image_id = var.source_managed_image_id

  target_region {
    name                   = var.location           # Primary region
    regional_replica_count = 1
    storage_account_type   = "Premium_LRS"
  }

  target_region {
    name                   = var.secondary_location  # DR region
    regional_replica_count = 1
    storage_account_type   = "Standard_LRS"
  }

  # Include in latest immediately; set to true while testing if needed
  exclude_from_latest = false
}
```

## Step 3: Create VM from Custom Image

```hcl
# Look up latest image version

data "azurerm_shared_image_version" "latest" {
  name                = "latest"
  gallery_name        = azurerm_shared_image_gallery.main.name
  image_name          = azurerm_shared_image.app.name
  resource_group_name = var.resource_group_name
}

resource "azurerm_linux_virtual_machine" "from_custom_image" {
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

  # Use the custom image instead of marketplace image
  source_image_id = data.azurerm_shared_image_version.latest.id
}
```

## Step 4: Create Image from Existing VM

```hcl
# Step 1: Capture the VM into a managed image (the source VM must be generalized first)
resource "azurerm_image" "captured" {
  name                = "${var.project_name}-captured-image"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Source VM that was generalized
  source_virtual_machine_id = var.generalized_vm_id

  tags = {
    Name = "${var.project_name}-captured"
  }
}
```

## Step 5: Deploy

```bash
# For Linux sources, run this inside the source VM first
sudo waagent -deprovision+user

# Deallocate the VM, then mark it generalized (irreversible; you can't restart it)
az vm deallocate \
  --resource-group <rg> \
  --name <vm-name>

az vm generalize \
  --resource-group <rg> \
  --name <vm-name>

tofu init
tofu plan
tofu apply

# List available image versions
az sig image-version list \
  --gallery-name <gallery-name> \
  --gallery-image-definition <image-def> \
  --resource-group <rg> \
  --output table
```

## Conclusion

Generalize (sysprep/waagent -deprovision) the source VM when you need a generalized image or when creating a legacy managed image from a VM; Azure Compute Gallery also supports specialized images. Use Azure Compute Gallery over simple managed images for production: it supports replication, versioning, and sharing. Set `exclude_from_latest = true` on new image versions during testing, then set it to `false` after validation to promote the version to "latest". Replicate images to all regions where VMs will be deployed to reduce deployment time and avoid cross-region data transfer costs.

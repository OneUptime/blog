# How to Use Packer-Built Images in OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Packer, Azure, Custom Image, Immutable Infrastructure

Description: Learn how to use Packer to build custom Azure Managed Images and reference them in OpenTofu configurations for consistent, immutable VM deployments on Azure.

## Introduction

Packer builds Azure Managed Images or Azure Compute Gallery images with pre-installed software. OpenTofu uses these images to launch VMs via VMSS or individual deployments, ensuring consistency across scale-out events and eliminating post-deployment configuration steps.

## Packer Template for Azure

```hcl
# packer/azure-web-server.pkr.hcl

packer {
  required_plugins {
    azure = {
      version = ">= 2.0.0"
      source  = "github.com/hashicorp/azure"
    }
  }
}

variable "app_version" {
  type    = string
  default = "1.0.0"
}

source "azure-arm" "web_server" {
  # Azure credentials from environment variables:
  # ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_TENANT_ID, ARM_SUBSCRIPTION_ID

  # Use a managed image (recommended)
  managed_image_resource_group_name = "packer-images-rg"
  managed_image_name               = "web-server-${var.app_version}"

  os_type         = "Linux"
  image_publisher = "Canonical"
  image_offer     = "0001-com-ubuntu-server-jammy"
  image_sku       = "22_04-lts"
  image_version   = "latest"

  location        = "eastus"
  vm_size         = "Standard_DS2_v2"

  azure_tags = {
    Application = "web-server"
    Version     = var.app_version
    ManagedBy   = "Packer"
    Environment = "base"
  }
}

build {
  sources = ["source.azure-arm.web_server"]

  provisioner "shell" {
    execute_command = "chmod +x {{ .Path }}; {{ .Vars }} sudo -E sh '{{ .Path }}'"
    inline = [
      "apt-get update -y",
      "apt-get install -y nginx curl",
      "systemctl enable nginx",
    ]
  }

  provisioner "shell" {
    execute_command = "chmod +x {{ .Path }}; {{ .Vars }} sudo -E sh '{{ .Path }}'"
    script          = "scripts/install-app.sh"
    environment_vars = [
      "APP_VERSION=${var.app_version}"
    ]
  }

  # Generalize the image (required for Azure)
  provisioner "shell" {
    execute_command = "chmod +x {{ .Path }}; {{ .Vars }} sudo -E sh '{{ .Path }}'"
    inline = [
      "/usr/sbin/waagent -force -deprovision+user && export HISTSIZE=0 && sync"
    ]
  }
}
```

## OpenTofu Data Source for Azure Managed Image

```hcl
# Find the Packer-built managed image
data "azurerm_image" "web_server" {
  name                = "web-server-${var.app_version}"
  resource_group_name = "packer-images-rg"
}

# Or find the most recent image with a name prefix
data "azurerm_image" "web_server_latest" {
  name_regex          = "^web-server-"
  sort_descending     = true
  resource_group_name = "packer-images-rg"
}
```

## Using the Image in a VMSS

```hcl
resource "azurerm_linux_virtual_machine_scale_set" "web" {
  name                = "web-vmss"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard_DS2_v2"
  instances           = 2

  admin_username = "adminuser"
  admin_ssh_key {
    username   = "adminuser"
    public_key = file(var.ssh_public_key_path)
  }

  # Use the Packer-built image
  source_image_id = data.azurerm_image.web_server.id

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  network_interface {
    name    = "web-nic"
    primary = true

    ip_configuration {
      name                                   = "internal"
      primary                                = true
      subnet_id                              = azurerm_subnet.web.id
      load_balancer_backend_address_pool_ids = [azurerm_lb_backend_address_pool.web.id]
    }
  }

  # Minimal user data - most config is in the image
  custom_data = base64encode(<<-EOF
    #!/bin/bash
    echo "APP_ENV=${var.environment}" >> /etc/app/environment
    systemctl start app
  EOF
  )

  upgrade_mode = "Rolling"
  rolling_upgrade_policy {
    max_batch_instance_percent              = 20
    max_unhealthy_instance_percent          = 20
    max_unhealthy_upgraded_instance_percent = 5
    pause_time_between_batches              = "PT0S"
  }

  tags = {
    Environment = var.environment
    ImageVersion = var.app_version
  }
}
```

## Azure Compute Gallery for Versioned Images

```hcl
# Create a Compute Gallery for image versioning
resource "azurerm_shared_image_gallery" "main" {
  name                = "companyimagegallery"
  resource_group_name = azurerm_resource_group.images.name
  location            = azurerm_resource_group.images.location
}

resource "azurerm_shared_image" "web_server" {
  name                = "web-server"
  gallery_name        = azurerm_shared_image_gallery.main.name
  resource_group_name = azurerm_resource_group.images.name
  location            = azurerm_resource_group.images.location
  os_type             = "Linux"

  identifier {
    publisher = "MyCompany"
    offer     = "WebServer"
    sku       = "Ubuntu22"
  }
}

# Data source for gallery image version
data "azurerm_shared_image_version" "web_server" {
  name                = "latest"
  image_name          = "web-server"
  gallery_name        = "companyimagegallery"
  resource_group_name = "packer-images-rg"
}
```

## Conclusion

Azure Managed Images from Packer provide the same immutable infrastructure benefits as AWS AMIs. Use the `azurerm_image` data source with `sort_descending` to always pick up the latest version, or pin to a specific version during testing. The Azure Compute Gallery adds versioning and multi-region replication capabilities essential for large-scale deployments.

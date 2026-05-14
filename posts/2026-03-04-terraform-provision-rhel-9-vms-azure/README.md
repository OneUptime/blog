# How to Use Terraform to Provision RHEL 9 VMs on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Terraform, Azure, Infrastructure as Code

Description: Learn how to use Terraform to automate provisioning of RHEL 9 virtual machines on Azure.

---

## Overview

Use Terraform to provision RHEL 9 VMs on Azure. RHEL 9 is fully supported on Azure with official marketplace images and integrated tooling.

## Prerequisites

- A RHEL 9 subscription or Azure Marketplace entitlement
- An Azure account and subscription
- Terraform and the Azure CLI installed

## Step 1 - Choose Your Deployment Method

You can deploy RHEL 9 on Azure using:

1. **Marketplace images** - pre-built, official Red Hat images
2. **Custom images** - built with Image Builder and uploaded
3. **Terraform** - infrastructure as code provisioning
4. **Red Hat Hybrid Cloud Console** - centralized management

## Step 2 - Launch a RHEL 9 Instance

Create a Terraform configuration:

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rhel" {
  name     = "myRG"
  location = "eastus"
}

resource "azurerm_virtual_network" "rhel" {
  name                = "rhel-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rhel.location
  resource_group_name = azurerm_resource_group.rhel.name
}

resource "azurerm_subnet" "rhel" {
  name                 = "rhel-subnet"
  resource_group_name  = azurerm_resource_group.rhel.name
  virtual_network_name = azurerm_virtual_network.rhel.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_network_interface" "rhel" {
  name                = "rhel-nic"
  location            = azurerm_resource_group.rhel.location
  resource_group_name = azurerm_resource_group.rhel.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.rhel.id
    private_ip_address_allocation = "Dynamic"
  }
}

resource "azurerm_linux_virtual_machine" "rhel" {
  name                = "myVM"
  resource_group_name = azurerm_resource_group.rhel.name
  location            = azurerm_resource_group.rhel.location
  size                = "Standard_D2s_v3"
  admin_username      = "azureuser"
  network_interface_ids = [
    azurerm_network_interface.rhel.id
  ]

  admin_ssh_key {
    username   = "azureuser"
    public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "RedHat"
    offer     = "RHEL"
    sku       = "9-lvm-gen2"
    version   = "latest"
  }
}
```

Then apply it:

```bash
terraform init
terraform apply
```

## Step 3 - Configure cloud-init

RHEL 9 cloud images use cloud-init for first-boot customization. Create a cloud-init file:

```yaml
#cloud-config
hostname: my-rhel-server
users:
  - name: admin
    groups: [wheel]
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-rsa AAAA...your-key-here
packages:
  - vim
  - tmux
```

Pass it to the Terraform VM resource with `custom_data`:

```hcl
custom_data = base64encode(file("cloud-init.yaml"))
```

## Step 4 - Register with Red Hat

```bash
sudo subscription-manager register
# Or connect to Red Hat Lightspeed:

sudo insights-client --register --display-name myVM
```

## Step 5 - Configure Security and Networking

Set up NSGs and firewall rules to allow only necessary traffic. Enable SELinux (it is on by default) and configure firewalld.

## Step 6 - Set Up Monitoring

Connect your cloud instances to your monitoring infrastructure:

```bash
# Install Node Exporter for Prometheus
# Or register with Red Hat Lightspeed
sudo insights-client --register --display-name myVM
```

## Summary

You have learned how to use Terraform to provision RHEL 9 VMs on Azure. RHEL 9 on Azure benefits from official support, pre-configured images, and integration with Red Hat management tools.

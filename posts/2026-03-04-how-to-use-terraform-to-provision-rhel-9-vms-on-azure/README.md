# How to Use Terraform to Provision RHEL 9 VMs on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Azure, Terraform

Description: Step-by-step guide on use terraform to provision rhel 9 vms on azure with practical examples and commands.

---

This guide demonstrates using Terraform to provision RHEL 9 virtual machines on Microsoft Azure with networking and security configurations.

## Prerequisites

- Terraform 1.5 or later
- Azure CLI installed and authenticated
- An Azure subscription

## Define Variables

```hcl
# variables.tf
variable "resource_group_name" {
  default = "rhel9-rg"
}

variable "location" {
  default = "eastus"
}

variable "vm_size" {
  default = "Standard_B2s"
}

variable "admin_username" {
  default = "azureuser"
}

variable "vm_count" {
  default = 2
}
```

## Main Configuration

```hcl
# main.tf
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_virtual_network" "vnet" {
  name                = "rhel9-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet" {
  name                 = "rhel9-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_network_security_group" "nsg" {
  name                = "rhel9-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_public_ip" "pip" {
  count               = var.vm_count
  name                = "rhel9-pip-${count.index}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "nic" {
  count               = var.vm_count
  name                = "rhel9-nic-${count.index}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip[count.index].id
  }
}

resource "azurerm_linux_virtual_machine" "vm" {
  count               = var.vm_count
  name                = "rhel9-vm-${count.index}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = var.vm_size
  admin_username      = var.admin_username
  network_interface_ids = [azurerm_network_interface.nic[count.index].id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file("~/.ssh/id_rsa.pub")
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 30
  }

  source_image_reference {
    publisher = "RedHat"
    offer     = "RHEL"
    sku       = "9-lvm-gen2"
    version   = "latest"
  }
}
```

## Deploy and Verify

```bash
terraform init
terraform plan
terraform apply -auto-approve
terraform output
ssh azureuser@<public-ip>
```

## Clean Up

```bash
terraform destroy -auto-approve
```

## Conclusion

You can now automate RHEL 9 VM provisioning on Azure using Terraform. Extend this configuration with data disks, availability sets, or load balancers based on your workload requirements.


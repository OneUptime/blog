# How to Use Terraform to Provision RHEL VMs on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Terraform, Azure, IaC, Automation, Cloud

Description: Use Terraform to provision RHEL virtual machines on Azure, including configuring resource groups, virtual networks, and the VM itself.

---

Terraform integrates with Azure through the AzureRM provider, allowing you to provision RHEL VMs declaratively. This guide walks through a complete configuration.

## Terraform Configuration

Create a `main.tf` file:

```hcl
# main.tf - Provision a RHEL 9 VM on Azure

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}

# Resource group

resource "azurerm_resource_group" "rg" {
  name     = "rhel-terraform-rg"
  location = "East US"
}

# Virtual network and subnet
resource "azurerm_virtual_network" "vnet" {
  name                = "rhel-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet" {
  name                 = "rhel-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Public IP
resource "azurerm_public_ip" "public_ip" {
  name                = "rhel-public-ip"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# Network security group
resource "azurerm_network_security_group" "nsg" {
  name                = "rhel-nsg"
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

# Network interface
resource "azurerm_network_interface" "nic" {
  name                = "rhel-nic"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.public_ip.id
  }
}

resource "azurerm_network_interface_security_group_association" "nic_nsg" {
  network_interface_id      = azurerm_network_interface.nic.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}

# RHEL 9 Virtual Machine
resource "azurerm_linux_virtual_machine" "rhel" {
  name                  = "rhel9-vm"
  resource_group_name   = azurerm_resource_group.rg.name
  location              = azurerm_resource_group.rg.location
  size                  = "Standard_B2s"
  admin_username        = "azureuser"
  network_interface_ids = [azurerm_network_interface.nic.id]

  admin_ssh_key {
    username   = "azureuser"
    public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  # Use the RHEL 9 PAYG image from Red Hat
  source_image_reference {
    publisher = "RedHat"
    offer     = "RHEL"
    sku       = "9-lvm-gen2"
    version   = "latest"
  }
}

output "public_ip_address" {
  value = azurerm_public_ip.public_ip.ip_address
}
```

## Deploy

```bash
# Initialize, plan, and apply
terraform init
terraform plan -var "subscription_id=<subscription-id>"
terraform apply -var "subscription_id=<subscription-id>" -auto-approve
```

## Verify

After provisioning, SSH into the VM:

```bash
ssh azureuser@<public-ip-address>
cat /etc/redhat-release
# Red Hat Enterprise Linux release 9.x (Plow)
```

To tear down all resources, run `terraform destroy -var "subscription_id=<subscription-id>"`.

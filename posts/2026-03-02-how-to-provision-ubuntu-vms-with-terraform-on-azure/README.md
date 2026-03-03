# How to Provision Ubuntu VMs with Terraform on Azure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Terraform, Azure, Infrastructure as Code, Cloud

Description: Step-by-step guide to provisioning Ubuntu virtual machines on Azure using Terraform, covering networking, SSH configuration, storage, and common patterns for production deployments.

---

Provisioning Ubuntu VMs on Azure with Terraform gives you repeatable, version-controlled infrastructure. Instead of clicking through the portal or writing complex ARM templates, you define your infrastructure in Terraform's HCL syntax and let it manage the create/update/destroy lifecycle. This guide covers everything from a minimal VM to a production-ready configuration with networking, managed disks, and cloud-init integration.

## Prerequisites

You need Terraform and the Azure CLI installed:

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set your subscription
az account set --subscription "your-subscription-id"

# Verify
az account show
```

Install Terraform using the HashiCorp APT repository:

```bash
wget -O- https://apt.releases.hashicorp.com/gpg | \
    gpg --dearmor | \
    sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null

echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/hashicorp.list

sudo apt update && sudo apt install -y terraform
```

## Project Structure

Organize your Terraform files logically:

```text
azure-ubuntu-vm/
  main.tf          # Core resources
  variables.tf     # Input variables
  outputs.tf       # Output values
  terraform.tfvars # Variable values (gitignored if has secrets)
  cloud-init.yaml  # cloud-init user data
```

## Provider Configuration

```hcl
# main.tf

terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }
  }
}

provider "azurerm" {
  features {}
  # Credentials come from Azure CLI login or environment variables
}
```

## Variables

```hcl
# variables.tf

variable "resource_group_name" {
  type        = string
  description = "Name of the Azure resource group"
  default     = "ubuntu-vm-rg"
}

variable "location" {
  type        = string
  description = "Azure region for resources"
  default     = "East US"
}

variable "vm_name" {
  type        = string
  description = "Name of the virtual machine"
  default     = "ubuntu-vm"
}

variable "vm_size" {
  type        = string
  description = "Azure VM size"
  default     = "Standard_B2s"
}

variable "admin_username" {
  type        = string
  description = "Administrator username for the VM"
  default     = "azureuser"
}

variable "ssh_public_key_path" {
  type        = string
  description = "Path to SSH public key file"
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ubuntu_version" {
  type        = string
  description = "Ubuntu image version"
  default     = "22_04-lts-gen2"
}
```

## Core Infrastructure Resources

```hcl
# main.tf (continued)

# Resource group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Virtual network
resource "azurerm_virtual_network" "main" {
  name                = "${var.vm_name}-vnet"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.0.0.0/16"]
}

# Subnet
resource "azurerm_subnet" "main" {
  name                 = "${var.vm_name}-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Public IP address
resource "azurerm_public_ip" "main" {
  name                = "${var.vm_name}-pip"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
}

# Network security group
resource "azurerm_network_security_group" "main" {
  name                = "${var.vm_name}-nsg"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

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

  security_rule {
    name                       = "HTTP"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Network interface
resource "azurerm_network_interface" "main" {
  name                = "${var.vm_name}-nic"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.main.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.main.id
  }
}

# Associate NSG with NIC
resource "azurerm_network_interface_security_group_association" "main" {
  network_interface_id      = azurerm_network_interface.main.id
  network_security_group_id = azurerm_network_security_group.main.id
}
```

## The Virtual Machine Resource

```hcl
# Virtual machine
resource "azurerm_linux_virtual_machine" "main" {
  name                = var.vm_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = var.vm_size
  admin_username      = var.admin_username

  network_interface_ids = [
    azurerm_network_interface.main.id,
  ]

  # SSH key authentication - no password
  disable_password_authentication = true

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.ssh_public_key_path)
  }

  # OS disk configuration
  os_disk {
    name                 = "${var.vm_name}-osdisk"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 30
  }

  # Ubuntu 22.04 LTS image
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = var.ubuntu_version
    version   = "latest"
  }

  # Pass cloud-init user data
  custom_data = base64encode(file("${path.module}/cloud-init.yaml"))

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Adding a Data Disk

For persistent data storage:

```hcl
# Managed data disk
resource "azurerm_managed_disk" "data" {
  name                 = "${var.vm_name}-datadisk"
  resource_group_name  = azurerm_resource_group.main.name
  location             = azurerm_resource_group.main.location
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 100
}

# Attach disk to VM
resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_linux_virtual_machine.main.id
  lun                = 0
  caching            = "ReadWrite"
}
```

Format and mount the data disk via cloud-init:

```yaml
# cloud-init.yaml
#cloud-config
runcmd:
  # Wait for the data disk to appear (Azure attaches it asynchronously)
  - |
    for i in $(seq 1 30); do
      if [ -b /dev/sdc ]; then
        echo "Data disk found"
        break
      fi
      echo "Waiting for data disk... ($i)"
      sleep 5
    done

  # Format the disk if it's not already formatted
  - |
    if ! blkid /dev/sdc; then
      mkfs.ext4 -L data /dev/sdc
    fi

  # Create mount point and add to fstab
  - mkdir -p /data
  - |
    echo "LABEL=data /data ext4 defaults,nofail 0 2" >> /etc/fstab
  - mount -a
```

## Outputs

```hcl
# outputs.tf

output "public_ip_address" {
  value       = azurerm_public_ip.main.ip_address
  description = "Public IP address of the VM"
}

output "private_ip_address" {
  value       = azurerm_network_interface.main.private_ip_address
  description = "Private IP address of the VM"
}

output "ssh_connection_string" {
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
  description = "SSH command to connect to the VM"
}

output "vm_id" {
  value = azurerm_linux_virtual_machine.main.id
}
```

## Deploying the Configuration

```bash
# Initialize Terraform and download the Azure provider
terraform init

# Review the plan
terraform plan

# Apply - creates all resources
terraform apply

# After apply completes, get the connection string
terraform output ssh_connection_string

# Connect to the VM
ssh azureuser@$(terraform output -raw public_ip_address)
```

## Using Multiple VMs

For a set of identical VMs, use `count` or `for_each`:

```hcl
# Variables for count
variable "vm_count" {
  type    = number
  default = 3
}

# Create multiple VMs
resource "azurerm_linux_virtual_machine" "workers" {
  count               = var.vm_count
  name                = "${var.vm_name}-worker-${count.index}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = var.vm_size
  admin_username      = var.admin_username

  network_interface_ids = [
    azurerm_network_interface.workers[count.index].id,
  ]

  # ... rest of configuration
}

resource "azurerm_network_interface" "workers" {
  count               = var.vm_count
  name                = "${var.vm_name}-nic-${count.index}"
  # ... configuration
}
```

## Cleaning Up

```bash
# Destroy all resources created by Terraform
terraform destroy

# Destroy a specific resource
terraform destroy -target azurerm_linux_virtual_machine.main
```

Terraform maintains a state file that tracks which Azure resources it manages. Always use `terraform destroy` rather than deleting resources manually through the portal, as manual deletion will cause the state to drift and cause errors on subsequent runs.

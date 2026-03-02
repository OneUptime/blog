# How to Create Azure Virtual Machines in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Virtual Machine, Compute, Infrastructure as Code

Description: Step-by-step guide to creating Azure Virtual Machines with Terraform, covering Linux and Windows VMs, managed disks, networking, and custom configurations.

---

Azure Virtual Machines give you full control over the operating system, runtime, and configuration of your compute resources. Whether you need a single development box or a fleet of application servers, VMs remain a core building block in Azure infrastructure.

Terraform makes VM provisioning repeatable and reviewable. Instead of clicking through the Azure portal or writing imperative scripts, you declare exactly what you want and Terraform figures out how to get there. This guide walks through creating both Linux and Windows VMs, configuring networking, attaching data disks, and using cloud-init for automated setup.

## Prerequisites

- Terraform 1.0 or later
- Azure CLI authenticated
- An existing resource group and VNet (or create them in the same configuration)
- An SSH key pair for Linux VMs

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Variables
variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-compute-prod-eus"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "admin_username" {
  description = "Admin username for the VM"
  type        = string
  default     = "azureuser"
}
```

## Creating a Resource Group and Networking

Every VM needs a network interface, which requires a VNet and subnet:

```hcl
# Resource group
resource "azurerm_resource_group" "compute" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = "production"
  }
}

# Virtual network
resource "azurerm_virtual_network" "main" {
  name                = "vnet-compute-prod"
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name
  address_space       = ["10.0.0.0/16"]
}

# Subnet for VMs
resource "azurerm_subnet" "vms" {
  name                 = "snet-vms"
  resource_group_name  = azurerm_resource_group.compute.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}
```

## Creating a Linux VM

```hcl
# Public IP address (optional - for direct internet access)
resource "azurerm_public_ip" "linux_vm" {
  name                = "pip-linux-vm-01"
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = {
    Environment = "production"
  }
}

# Network interface for the VM
resource "azurerm_network_interface" "linux_vm" {
  name                = "nic-linux-vm-01"
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.vms.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.linux_vm.id
  }

  tags = {
    Environment = "production"
  }
}

# Linux Virtual Machine
resource "azurerm_linux_virtual_machine" "app_server" {
  name                = "vm-app-prod-01"
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name

  # VM size determines CPU, memory, and disk performance
  size = "Standard_D2s_v3"

  # Admin credentials
  admin_username = var.admin_username

  # Use SSH key authentication (recommended over password)
  admin_ssh_key {
    username   = var.admin_username
    public_key = file("~/.ssh/id_rsa.pub")
  }

  # Disable password authentication for security
  disable_password_authentication = true

  # Attach the network interface
  network_interface_ids = [azurerm_network_interface.linux_vm.id]

  # OS disk configuration
  os_disk {
    name                 = "osdisk-app-prod-01"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 64
  }

  # Source image - Ubuntu 22.04 LTS
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  # Boot diagnostics for troubleshooting
  boot_diagnostics {
    # Use managed storage account
  }

  # Custom data for cloud-init
  custom_data = base64encode(<<-EOF
    #cloud-config
    package_update: true
    package_upgrade: true
    packages:
      - nginx
      - docker.io
    runcmd:
      - systemctl enable nginx
      - systemctl start nginx
      - systemctl enable docker
      - systemctl start docker
  EOF
  )

  tags = {
    Environment = "production"
    Role        = "app-server"
  }
}
```

## Creating a Windows VM

```hcl
# Network interface for Windows VM
resource "azurerm_network_interface" "windows_vm" {
  name                = "nic-windows-vm-01"
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.vms.id
    private_ip_address_allocation = "Dynamic"
  }
}

# Windows Virtual Machine
resource "azurerm_windows_virtual_machine" "web_server" {
  name                = "vm-web-prod-01"
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name
  size                = "Standard_D2s_v3"

  # Admin credentials (store password in Key Vault for production)
  admin_username = "adminuser"
  admin_password = var.windows_admin_password

  network_interface_ids = [azurerm_network_interface.windows_vm.id]

  os_disk {
    name                 = "osdisk-web-prod-01"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 128
  }

  # Windows Server 2022 Datacenter
  source_image_reference {
    publisher = "MicrosoftWindowsServer"
    offer     = "WindowsServer"
    sku       = "2022-Datacenter"
    version   = "latest"
  }

  # Enable automatic Windows updates
  patch_mode = "AutomaticByPlatform"

  # Boot diagnostics
  boot_diagnostics {}

  tags = {
    Environment = "production"
    Role        = "web-server"
  }
}

variable "windows_admin_password" {
  description = "Admin password for Windows VM"
  type        = string
  sensitive   = true
}
```

## Attaching Data Disks

Separate data disks from the OS disk for better performance and management:

```hcl
# Managed data disk
resource "azurerm_managed_disk" "data" {
  name                 = "disk-data-app-prod-01"
  location             = azurerm_resource_group.compute.location
  resource_group_name  = azurerm_resource_group.compute.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 256

  tags = {
    Environment = "production"
    Purpose     = "application-data"
  }
}

# Attach the disk to the VM
resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_linux_virtual_machine.app_server.id
  lun                = 0
  caching            = "ReadWrite"
}
```

## VM with Availability Zone

For high availability, place VMs in specific availability zones:

```hcl
resource "azurerm_linux_virtual_machine" "ha_server" {
  name                = "vm-ha-prod-01"
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name
  size                = "Standard_D4s_v3"
  admin_username      = var.admin_username

  # Place in availability zone 1
  zone = "1"

  admin_ssh_key {
    username   = var.admin_username
    public_key = file("~/.ssh/id_rsa.pub")
  }

  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.linux_vm.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  tags = {
    Environment      = "production"
    AvailabilityZone = "1"
  }
}
```

## Multiple VMs with for_each

Deploy a fleet of similar VMs efficiently:

```hcl
variable "vm_configs" {
  description = "Map of VM configurations"
  type = map(object({
    size = string
    zone = string
    role = string
  }))
  default = {
    "vm-app-01" = { size = "Standard_D2s_v3", zone = "1", role = "app" }
    "vm-app-02" = { size = "Standard_D2s_v3", zone = "2", role = "app" }
    "vm-app-03" = { size = "Standard_D2s_v3", zone = "3", role = "app" }
  }
}

# Network interfaces for each VM
resource "azurerm_network_interface" "fleet" {
  for_each = var.vm_configs

  name                = "nic-${each.key}"
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.vms.id
    private_ip_address_allocation = "Dynamic"
  }
}

# Create VMs from the configuration map
resource "azurerm_linux_virtual_machine" "fleet" {
  for_each = var.vm_configs

  name                = each.key
  location            = azurerm_resource_group.compute.location
  resource_group_name = azurerm_resource_group.compute.name
  size                = each.value.size
  zone                = each.value.zone
  admin_username      = var.admin_username

  admin_ssh_key {
    username   = var.admin_username
    public_key = file("~/.ssh/id_rsa.pub")
  }

  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.fleet[each.key].id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  tags = {
    Environment = "production"
    Role        = each.value.role
    Zone        = each.value.zone
  }
}
```

## Outputs

```hcl
output "linux_vm_id" {
  description = "ID of the Linux VM"
  value       = azurerm_linux_virtual_machine.app_server.id
}

output "linux_vm_private_ip" {
  description = "Private IP of the Linux VM"
  value       = azurerm_network_interface.linux_vm.private_ip_address
}

output "linux_vm_public_ip" {
  description = "Public IP of the Linux VM"
  value       = azurerm_public_ip.linux_vm.ip_address
}

output "fleet_private_ips" {
  description = "Private IPs of all fleet VMs"
  value = {
    for k, v in azurerm_network_interface.fleet : k => v.private_ip_address
  }
}
```

## Monitoring VMs

VM health goes beyond just "is it running." Use OneUptime to monitor CPU, memory, disk utilization, and application-level health checks. This gives you early warning when a VM is struggling before it starts affecting your users. For scaling beyond individual VMs, see our guide on VM Scale Sets at https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-vm-scale-sets-in-terraform/view.

## Summary

Azure VMs in Terraform give you a declarative, repeatable way to provision compute resources. Use SSH keys instead of passwords for Linux, leverage cloud-init for automated setup, and separate data disks from OS disks. For production deployments, spread VMs across availability zones and consider using VM Scale Sets for workloads that need to scale automatically.

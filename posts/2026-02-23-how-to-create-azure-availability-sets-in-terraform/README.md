# How to Create Azure Availability Sets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Availability Sets, High Availability, Infrastructure as Code, Virtual Machine

Description: Learn how to create Azure Availability Sets with Terraform to ensure your virtual machines are distributed across fault and update domains for high availability.

---

If you are running virtual machines in Azure and care about uptime, you need to understand availability sets. They are one of the simplest ways to protect your workloads against planned and unplanned downtime. An availability set tells Azure to distribute your VMs across multiple physical servers, racks, and network switches so that a single hardware failure or maintenance event does not take down all your instances at once.

This guide shows you how to create and use availability sets with Terraform, when to use them versus availability zones, and how to structure your configuration for production workloads.

## How Availability Sets Work

Azure uses two concepts within an availability set:

**Fault Domains (FD)**: These represent separate physical racks in the data center. VMs in different fault domains have independent power, cooling, and network switches. If a rack fails, only VMs in that fault domain are affected. Azure supports up to 3 fault domains per availability set.

**Update Domains (UD)**: These determine how Azure groups VMs during planned maintenance. Azure reboots one update domain at a time, so your application stays available during patching. Azure supports up to 20 update domains per availability set.

When you put VMs in an availability set with 2 fault domains and 5 update domains, Azure spreads them so that no single hardware failure or maintenance event brings down more than a fraction of your VMs.

## Availability Sets vs Availability Zones

Before you commit to availability sets, consider whether availability zones are a better fit:

- **Availability Sets**: Protect against rack-level failures within a single data center. No extra cost. Good when you need the VMs to be physically close for low latency.
- **Availability Zones**: Protect against entire data center failures. VMs are placed in separate physical buildings within a region. Slightly higher latency between VMs but stronger protection.

Availability zones are generally the better choice for new deployments, but availability sets still make sense when:
- The region does not support availability zones
- Your application requires very low latency between nodes
- You are running legacy workloads that need proximity

## Creating a Basic Availability Set

Here is how to create an availability set with Terraform:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource group
resource "azurerm_resource_group" "app" {
  name     = "rg-app-prod-eastus"
  location = "East US"
}

# Availability set with custom fault and update domain counts
resource "azurerm_availability_set" "web" {
  name                         = "avset-web-prod"
  location                     = azurerm_resource_group.app.location
  resource_group_name          = azurerm_resource_group.app.name

  # Number of fault domains (max 3 in most regions)
  platform_fault_domain_count  = 3

  # Number of update domains (max 20, default 5)
  platform_update_domain_count = 5

  # Use managed disks - always set this to true unless you have unmanaged disks
  managed                      = true

  tags = {
    environment = "production"
    tier        = "web"
    managed_by  = "terraform"
  }
}
```

The `managed` parameter is important. Set it to `true` if your VMs use managed disks (which they should). This aligns the disk fault domains with the VM fault domains, so your disks are protected by the same fault domain boundaries as your VMs.

## Placing VMs in an Availability Set

To place a VM in an availability set, reference its ID in the VM resource:

```hcl
# Network interface for the VM
resource "azurerm_network_interface" "web" {
  count               = 3
  name                = "nic-web-${count.index + 1}"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.web.id
    private_ip_address_allocation = "Dynamic"
  }
}

# Create 3 VMs in the availability set
resource "azurerm_linux_virtual_machine" "web" {
  count               = 3
  name                = "vm-web-${count.index + 1}"
  location            = azurerm_resource_group.app.location
  resource_group_name = azurerm_resource_group.app.name
  size                = "Standard_D2s_v5"

  # This is the key - place the VM in the availability set
  availability_set_id = azurerm_availability_set.web.id

  admin_username = "azureuser"

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  network_interface_ids = [
    azurerm_network_interface.web[count.index].id,
  ]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  tags = {
    environment = "production"
    role        = "web-server"
    instance    = count.index + 1
  }
}
```

Azure automatically distributes these 3 VMs across the 3 fault domains and 5 update domains. You do not need to specify which domain each VM goes into - Azure handles that.

## Multiple Availability Sets for Multi-Tier Applications

For a multi-tier application, create separate availability sets for each tier:

```hcl
# Availability set for the web tier
resource "azurerm_availability_set" "web" {
  name                         = "avset-web-prod"
  location                     = azurerm_resource_group.app.location
  resource_group_name          = azurerm_resource_group.app.name
  platform_fault_domain_count  = 3
  platform_update_domain_count = 5
  managed                      = true

  tags = { tier = "web" }
}

# Availability set for the application tier
resource "azurerm_availability_set" "app" {
  name                         = "avset-app-prod"
  location                     = azurerm_resource_group.app.location
  resource_group_name          = azurerm_resource_group.app.name
  platform_fault_domain_count  = 3
  platform_update_domain_count = 5
  managed                      = true

  tags = { tier = "application" }
}

# Availability set for the database tier
resource "azurerm_availability_set" "db" {
  name                         = "avset-db-prod"
  location                     = azurerm_resource_group.app.location
  resource_group_name          = azurerm_resource_group.app.name
  platform_fault_domain_count  = 3
  platform_update_domain_count = 5
  managed                      = true

  tags = { tier = "database" }
}
```

## Using a Module for Reusability

If you create availability sets frequently, wrap it in a module:

```hcl
# modules/availability-set/variables.tf
variable "name" {
  description = "Name of the availability set"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "fault_domain_count" {
  description = "Number of fault domains"
  type        = number
  default     = 3
}

variable "update_domain_count" {
  description = "Number of update domains"
  type        = number
  default     = 5
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/availability-set/main.tf
resource "azurerm_availability_set" "this" {
  name                         = var.name
  location                     = var.location
  resource_group_name          = var.resource_group_name
  platform_fault_domain_count  = var.fault_domain_count
  platform_update_domain_count = var.update_domain_count
  managed                      = true
  tags                         = var.tags
}
```

```hcl
# modules/availability-set/outputs.tf
output "id" {
  description = "ID of the availability set"
  value       = azurerm_availability_set.this.id
}

output "name" {
  description = "Name of the availability set"
  value       = azurerm_availability_set.this.name
}
```

Then use it in your main configuration:

```hcl
# Use the module for each tier
module "avset_web" {
  source              = "./modules/availability-set"
  name                = "avset-web-prod"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  tags                = { tier = "web", environment = "production" }
}

module "avset_app" {
  source              = "./modules/availability-set"
  name                = "avset-app-prod"
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  tags                = { tier = "application", environment = "production" }
}
```

## Combining with Load Balancers

Availability sets work best with a load balancer in front of them. The load balancer distributes traffic across healthy VMs:

```hcl
# Load balancer backend pool
resource "azurerm_lb_backend_address_pool" "web" {
  loadbalancer_id = azurerm_lb.web.id
  name            = "pool-web"
}

# Associate each VM's NIC with the backend pool
resource "azurerm_network_interface_backend_address_pool_association" "web" {
  count                   = 3
  network_interface_id    = azurerm_network_interface.web[count.index].id
  ip_configuration_name   = "internal"
  backend_address_pool_id = azurerm_lb_backend_address_pool.web.id
}
```

## Important Limitations

There are a few things to keep in mind:

- A VM can only belong to one availability set, and you must assign it at creation time. You cannot move an existing VM into an availability set.
- All VMs in an availability set must be in the same resource group and region.
- You cannot mix availability sets and availability zones. Pick one or the other for each workload.
- The maximum number of VMs in an availability set is 200.

## Wrapping Up

Availability sets are a straightforward way to improve the uptime of your VM-based workloads. They cost nothing extra and protect against rack-level failures and planned maintenance events. While availability zones offer stronger protection against data center failures, availability sets remain relevant for low-latency workloads and regions without zone support. Define them in Terraform, place your VMs in the right sets, put a load balancer in front, and you have a resilient foundation for your applications.

For related reading, check out [How to Create Azure Proximity Placement Groups in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-proximity-placement-groups-in-terraform/view) if you need to optimize network latency between VMs.

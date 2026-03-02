# How to Create Azure Virtual Networks and Subnets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Virtual Network, Subnet, Networking, Infrastructure as Code

Description: Complete guide to creating Azure Virtual Networks and Subnets with Terraform, including address planning, peering, service endpoints, and hub-spoke architectures.

---

Azure Virtual Networks (VNets) are the foundation of private networking in Azure. They isolate your resources from the public internet, let you control traffic flow with subnets and network security groups, and connect to on-premises networks or other VNets through peering and VPN gateways.

Getting your network architecture right at the start is critical because changing it later means migrating workloads. Terraform makes it straightforward to define, version, and replicate your network topology. This guide covers creating VNets and subnets, configuring service endpoints, setting up peering, and implementing a hub-spoke pattern.

## Prerequisites

- Terraform 1.0 or later
- Azure CLI authenticated (`az login`)
- An Azure subscription
- A resource group (or we will create one)

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
```

## Creating a Basic VNet with Subnets

```hcl
# Resource group for networking
resource "azurerm_resource_group" "networking" {
  name     = "rg-networking-prod-eus"
  location = "East US"

  tags = {
    Environment = "production"
    Purpose     = "networking"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "vnet-main-prod-eus"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name

  # Address space for the entire VNet
  address_space = ["10.0.0.0/16"]

  # Optional DNS servers (defaults to Azure-provided DNS)
  dns_servers = []

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Subnet for web tier
resource "azurerm_subnet" "web" {
  name                 = "snet-web"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]

  # Enable service endpoints for web tier
  service_endpoints = ["Microsoft.Sql", "Microsoft.Storage"]
}

# Subnet for application tier
resource "azurerm_subnet" "app" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]

  service_endpoints = ["Microsoft.Sql", "Microsoft.KeyVault"]
}

# Subnet for database tier
resource "azurerm_subnet" "db" {
  name                 = "snet-db"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.3.0/24"]

  # Delegate this subnet to a specific service
  delegation {
    name = "mysql-delegation"

    service_delegation {
      name    = "Microsoft.DBforMySQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}
```

## Creating Subnets Dynamically

For complex network topologies, define subnets in a variable:

```hcl
variable "subnets" {
  description = "Map of subnet configurations"
  type = map(object({
    address_prefix    = string
    service_endpoints = list(string)
    delegation        = optional(object({
      name    = string
      service = string
      actions = list(string)
    }))
  }))
  default = {
    web = {
      address_prefix    = "10.0.1.0/24"
      service_endpoints = ["Microsoft.Sql", "Microsoft.Storage"]
      delegation        = null
    }
    app = {
      address_prefix    = "10.0.2.0/24"
      service_endpoints = ["Microsoft.Sql", "Microsoft.KeyVault"]
      delegation        = null
    }
    data = {
      address_prefix    = "10.0.3.0/24"
      service_endpoints = ["Microsoft.Sql"]
      delegation        = null
    }
    aks = {
      address_prefix    = "10.0.4.0/22"
      service_endpoints = ["Microsoft.Sql", "Microsoft.Storage", "Microsoft.ContainerRegistry"]
      delegation        = null
    }
    bastion = {
      address_prefix    = "10.0.255.0/26"
      service_endpoints = []
      delegation        = null
    }
  }
}

# Create subnets from the variable map
resource "azurerm_subnet" "subnets" {
  for_each = var.subnets

  name                 = "snet-${each.key}"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [each.value.address_prefix]
  service_endpoints    = each.value.service_endpoints

  dynamic "delegation" {
    for_each = each.value.delegation != null ? [each.value.delegation] : []

    content {
      name = delegation.value.name

      service_delegation {
        name    = delegation.value.service
        actions = delegation.value.actions
      }
    }
  }
}
```

## VNet Peering

Connect two VNets so resources in each can communicate directly:

```hcl
# Second VNet (could be in a different region or subscription)
resource "azurerm_virtual_network" "secondary" {
  name                = "vnet-secondary-prod-wus"
  location            = "West US"
  resource_group_name = azurerm_resource_group.networking.name
  address_space       = ["10.1.0.0/16"]

  tags = {
    Environment = "production"
  }
}

# Peering from main to secondary
resource "azurerm_virtual_network_peering" "main_to_secondary" {
  name                      = "peer-main-to-secondary"
  resource_group_name       = azurerm_resource_group.networking.name
  virtual_network_name      = azurerm_virtual_network.main.name
  remote_virtual_network_id = azurerm_virtual_network.secondary.id

  # Allow traffic between the peered VNets
  allow_virtual_network_access = true

  # Allow forwarded traffic (from other peered VNets)
  allow_forwarded_traffic = true

  # Allow gateway transit (if this VNet has a gateway)
  allow_gateway_transit = false
}

# Peering from secondary to main (peering must be created in both directions)
resource "azurerm_virtual_network_peering" "secondary_to_main" {
  name                      = "peer-secondary-to-main"
  resource_group_name       = azurerm_resource_group.networking.name
  virtual_network_name      = azurerm_virtual_network.secondary.name
  remote_virtual_network_id = azurerm_virtual_network.main.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}
```

## Hub-Spoke Network Architecture

A common enterprise pattern with a central hub VNet for shared services:

```hcl
# Hub VNet for shared services
resource "azurerm_virtual_network" "hub" {
  name                = "vnet-hub-prod-eus"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
  address_space       = ["10.0.0.0/16"]

  tags = {
    Role = "hub"
  }
}

# Spoke VNets for different workloads
locals {
  spokes = {
    app1 = {
      address_space = "10.1.0.0/16"
    }
    app2 = {
      address_space = "10.2.0.0/16"
    }
    shared_services = {
      address_space = "10.3.0.0/16"
    }
  }
}

resource "azurerm_virtual_network" "spokes" {
  for_each = local.spokes

  name                = "vnet-${each.key}-prod-eus"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
  address_space       = [each.value.address_space]

  tags = {
    Role  = "spoke"
    Spoke = each.key
  }
}

# Peering from each spoke to hub
resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  for_each = local.spokes

  name                         = "peer-${each.key}-to-hub"
  resource_group_name          = azurerm_resource_group.networking.name
  virtual_network_name         = azurerm_virtual_network.spokes[each.key].name
  remote_virtual_network_id    = azurerm_virtual_network.hub.id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  use_remote_gateways          = false
}

# Peering from hub to each spoke
resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  for_each = local.spokes

  name                         = "peer-hub-to-${each.key}"
  resource_group_name          = azurerm_resource_group.networking.name
  virtual_network_name         = azurerm_virtual_network.hub.name
  remote_virtual_network_id    = azurerm_virtual_network.spokes[each.key].id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}
```

## Private DNS Zones

Azure Private DNS lets your VNet resources resolve custom domain names:

```hcl
# Private DNS zone
resource "azurerm_private_dns_zone" "main" {
  name                = "internal.example.com"
  resource_group_name = azurerm_resource_group.networking.name

  tags = {
    Purpose = "internal-dns"
  }
}

# Link the DNS zone to the VNet
resource "azurerm_private_dns_zone_virtual_network_link" "main" {
  name                  = "vnet-link"
  resource_group_name   = azurerm_resource_group.networking.name
  private_dns_zone_name = azurerm_private_dns_zone.main.name
  virtual_network_id    = azurerm_virtual_network.main.id

  # Enable auto-registration of VM DNS records
  registration_enabled = true

  tags = {
    Purpose = "dns-resolution"
  }
}
```

## Outputs

```hcl
output "vnet_id" {
  description = "ID of the main virtual network"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Name of the main virtual network"
  value       = azurerm_virtual_network.main.name
}

output "subnet_ids" {
  description = "Map of subnet name to subnet ID"
  value = {
    for k, v in azurerm_subnet.subnets : k => v.id
  }
}
```

## Monitoring Your Network

Network issues are some of the hardest to troubleshoot because they affect everything. Set up monitoring with OneUptime to track VNet connectivity, DNS resolution, and peering health. Catching a peering state change or DNS timeout early can save hours of debugging downstream service failures.

For securing your subnets, see our guide on Azure Network Security Groups at https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-network-security-groups-in-terraform/view.

## Summary

Virtual networks and subnets are the foundation everything else builds on in Azure. Take the time to plan your address spaces carefully - overlapping ranges will prevent peering later. Use Terraform's `for_each` to keep subnet definitions clean, enable service endpoints only where needed, and implement hub-spoke architecture if you have more than a couple of workloads. The investment in getting networking right upfront pays for itself many times over.

# How to Configure IPv6 in Azure Virtual Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Virtual Network, VNet, Dual-Stack, Cloud Networking

Description: Configure IPv6 address spaces and subnets in Azure Virtual Networks, creating dual-stack VNets that support both IPv4 and IPv6 workloads.

## Introduction

Azure Virtual Networks support IPv6 through dual-stack configuration: you add an IPv6 address space alongside the existing IPv4 address space. Azure lets you define the IPv6 address space for the VNet, while IPv6 subnets must be exactly `/64`. Azure supports both unique local IPv6 space and global unicast space in a dual-stack VNet, but internet reachability requires explicit IPv6 public configuration. This guide covers creating and configuring dual-stack Azure VNets.

## Create Dual-Stack VNet with Azure CLI

```bash
RESOURCE_GROUP="rg-ipv6-network"
LOCATION="eastus"

# Create resource group

az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Create VNet with both IPv4 and IPv6 address spaces
az network vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --name vnet-dualstack \
    --address-prefixes "10.0.0.0/16" "fd00:db8::/48" \
    --location "$LOCATION"

# Add IPv6 subnet to existing VNet
az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name vnet-dualstack \
    --name subnet-web \
    --address-prefixes "10.0.1.0/24" "fd00:db8:0:1::/64"

# Add private subnet with IPv6
az network vnet subnet create \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name vnet-dualstack \
    --name subnet-app \
    --address-prefixes "10.0.2.0/24" "fd00:db8:0:2::/64"

# Verify VNet IPv6 configuration
az network vnet show \
    --resource-group "$RESOURCE_GROUP" \
    --name vnet-dualstack \
    --query "{name:name, addressSpace:addressSpace, subnets:subnets[*].{name:name, prefixes:addressPrefixes}}"
```

## Terraform Azure VNet with IPv6

```hcl
# vnet_ipv6.tf

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

resource "azurerm_resource_group" "main" {
  name     = "rg-ipv6-network"
  location = "East US"
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-dualstack"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  # Dual-stack: IPv4 + IPv6 address spaces
  address_space = [
    "10.0.0.0/16",      # IPv4
    "fd00:db8::/48",    # IPv6 (ULA)
  ]

  tags = { environment = "production" }
}

resource "azurerm_subnet" "web" {
  name                 = "subnet-web"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name

  address_prefixes = [
    "10.0.1.0/24",          # IPv4
    "fd00:db8:0:1::/64",    # IPv6
  ]
}

resource "azurerm_subnet" "app" {
  name                 = "subnet-app"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name

  address_prefixes = [
    "10.0.2.0/24",
    "fd00:db8:0:2::/64",
  ]
}

resource "azurerm_subnet" "db" {
  name                 = "subnet-db"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name

  address_prefixes = [
    "10.0.3.0/24",
    "fd00:db8:0:3::/64",
  ]
}
```

## Azure VNet IPv6 Considerations

```bash
# Azure IPv6 differences from IPv4:
# 1. VNet peering supports IPv6 (dual-stack to dual-stack)
# 2. Unique local IPv6 addresses (within fc00::/7, such as fd00::/8) are supported
# 3. Internet-facing IPv6 uses IPv6 public IPs or public IP prefixes
# 4. ExpressRoute supports IPv6
# 5. VPN Gateway supports IPv6 dual-stack (currently in preview)

# Add IPv6 address space to existing VNet
az network vnet update \
    --resource-group "$RESOURCE_GROUP" \
    --name existing-vnet \
    --address-prefixes "10.10.0.0/16" "fd00:10:0::/56"

# Update subnet to add IPv6
az network vnet subnet update \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name existing-vnet \
    --name existing-subnet \
    --address-prefixes "10.10.1.0/24" "fd00:10:0:1::/64"
```

## VNet Peering with IPv6

```hcl
# Create peering in both directions between dual-stack VNets
resource "azurerm_virtual_network_peering" "a_to_b" {
  name                      = "peer-a-to-b"
  resource_group_name       = azurerm_resource_group.main.name
  virtual_network_name      = azurerm_virtual_network.vnet_a.name
  remote_virtual_network_id = azurerm_virtual_network.vnet_b.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
  use_remote_gateways          = false
}

resource "azurerm_virtual_network_peering" "b_to_a" {
  name                      = "peer-b-to-a"
  resource_group_name       = azurerm_resource_group.main.name
  virtual_network_name      = azurerm_virtual_network.vnet_b.name
  remote_virtual_network_id = azurerm_virtual_network.vnet_a.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
  use_remote_gateways          = false
}
```

## Conclusion

Azure dual-stack VNets combine IPv4 and IPv6 address spaces in the same virtual network. Add an IPv6 address space that matches your addressing plan, and use `/64` for each IPv6 subnet. Most Azure networking features (NSGs, route tables, load balancers) support IPv6 when properly configured. Start with unique local addresses for internal-only IPv6, and use IPv6 public IPs or public IP prefixes when you need internet-facing IPv6 connectivity.

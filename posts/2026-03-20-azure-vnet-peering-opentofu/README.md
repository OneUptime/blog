# How to Create Azure Virtual Network Peering with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, VNet Peering, Network, Connectivity, Hub-Spoke, Infrastructure as Code

Description: Learn how to configure Azure Virtual Network peering with OpenTofu to connect VNets within the same region or across regions for private traffic routing without gateways.

## Introduction

Azure VNet Peering connects two VNets using the Azure backbone network-traffic between peered VNets routes through Microsoft's private network at low latency and high bandwidth without internet exposure. Peering can connect VNets in the same region (regional peering) or across regions (global peering). Hub-spoke topologies use peering to connect spoke VNets to a central hub VNet that hosts shared services like firewalls, VPN gateways, and monitoring infrastructure.

## Prerequisites

- OpenTofu v1.6+
- Two or more Azure VNets with non-overlapping address spaces
- Azure credentials with Network Contributor permissions on both VNets

## Step 1: Basic VNet Peering (Same Region)

```hcl
# Peering from VNet A to VNet B

resource "azurerm_virtual_network_peering" "a_to_b" {
  name                      = "${var.project_name}-a-to-b"
  resource_group_name       = var.vnet_a_resource_group
  virtual_network_name      = var.vnet_a_name
  remote_virtual_network_id = var.vnet_b_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true  # Allow traffic forwarded from other networks
  allow_gateway_transit        = false # VNet A doesn't share its gateway
  use_remote_gateways          = false
}

# Peering from VNet B to VNet A (peering is not bidirectional by default)
resource "azurerm_virtual_network_peering" "b_to_a" {
  name                      = "${var.project_name}-b-to-a"
  resource_group_name       = var.vnet_b_resource_group
  virtual_network_name      = var.vnet_b_name
  remote_virtual_network_id = var.vnet_a_id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
  use_remote_gateways          = false
}
```

## Step 2: Hub-Spoke Topology

```hcl
# Hub VNet with VPN Gateway or ExpressRoute
resource "azurerm_virtual_network" "hub" {
  name                = "${var.project_name}-hub-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = ["10.0.0.0/16"]
}

variable "spoke_vnets" {
  description = "Spoke VNet configurations"
  type = map(object({
    id                  = string
    resource_group_name = string
    name                = string
  }))
}

# Hub to each spoke
resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  for_each = var.spoke_vnets

  name                      = "hub-to-${each.key}"
  resource_group_name       = var.resource_group_name
  virtual_network_name      = azurerm_virtual_network.hub.name
  remote_virtual_network_id = each.value.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = true  # Hub shares its gateway with spokes
  use_remote_gateways          = false
}

# Each spoke to hub
resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  for_each = var.spoke_vnets

  name                      = "${each.key}-to-hub"
  resource_group_name       = each.value.resource_group_name
  virtual_network_name      = each.value.name
  remote_virtual_network_id = azurerm_virtual_network.hub.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
  use_remote_gateways          = true  # Spokes use hub's gateway for on-prem connectivity
}
```

## Step 3: Cross-Region Global Peering

```hcl
provider "azurerm" {
  alias = "east_us"
  features {}
  # ... configuration
}

provider "azurerm" {
  alias = "west_europe"
  features {}
  # ... configuration
}

resource "azurerm_virtual_network" "east" {
  provider            = azurerm.east_us
  name                = "${var.project_name}-east-vnet"
  location            = "East US"
  resource_group_name = var.east_resource_group
  address_space       = ["10.1.0.0/16"]
}

resource "azurerm_virtual_network" "west" {
  provider            = azurerm.west_europe
  name                = "${var.project_name}-west-vnet"
  location            = "West Europe"
  resource_group_name = var.west_resource_group
  address_space       = ["10.2.0.0/16"]
}

resource "azurerm_virtual_network_peering" "east_to_west" {
  provider                  = azurerm.east_us
  name                      = "east-to-west"
  resource_group_name       = var.east_resource_group
  virtual_network_name      = azurerm_virtual_network.east.name
  remote_virtual_network_id = azurerm_virtual_network.west.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}

resource "azurerm_virtual_network_peering" "west_to_east" {
  provider                  = azurerm.west_europe
  name                      = "west-to-east"
  resource_group_name       = var.west_resource_group
  virtual_network_name      = azurerm_virtual_network.west.name
  remote_virtual_network_id = azurerm_virtual_network.east.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify peering status
az network vnet peering list \
  --resource-group <rg> \
  --vnet-name <vnet-name> \
  --output table

# Test connectivity between peered VNets
# From a VM in VNet A, if NSGs and guest firewalls allow ICMP:
ping <vm-private-ip-in-vnet-b>
```

## Conclusion

Peering is non-transitive: if VNet A peers with hub, and hub peers with VNet B, VNet A cannot route to VNet B without direct peering or using Azure Firewall/NVA in the hub as a router. For hub-spoke architectures, set `allow_gateway_transit = true` on hub-to-spoke peerings and `use_remote_gateways = true` on spoke-to-hub peerings to allow spokes to use the hub's VPN or ExpressRoute gateway for on-premises connectivity. VNet address spaces must not overlap-plan IP ranges carefully before peering, and if you later resize a peered VNet address space, sync the peering so the remote VNet picks up the updated prefixes.

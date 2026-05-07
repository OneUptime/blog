# How to Configure Azure Virtual WAN with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Virtual WAN, SDWAN, Hub-Spoke, Global Transit Network, Infrastructure as Code

Description: Learn how to configure Azure Virtual WAN with OpenTofu to build a global transit network connecting branches, VNets, and cloud regions through Microsoft's backbone.

## Introduction

Azure Virtual WAN is a managed networking service that provides optimized routing between branches, VNets, ExpressRoute circuits, and VPN sites through Microsoft's global backbone. Virtual WAN hubs act as regional transit points with built-in routing, VPN gateways, ExpressRoute gateways, and Azure Firewall integration. Standard Virtual WAN supports any-to-any connectivity and custom routing policies, making it ideal for global enterprise network architectures.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with Network permissions
- Multiple VNets or branch locations to connect

## Step 1: Create Virtual WAN and Hub

```hcl
resource "azurerm_virtual_wan" "main" {
  name                = "${var.project_name}-vwan"
  resource_group_name = var.resource_group_name
  location            = var.location
  type                = "Standard"  # Basic or Standard

  allow_branch_to_branch_traffic = true
  office365_local_breakout_category = "None"

  tags = {
    Name = "${var.project_name}-virtual-wan"
  }
}

# Primary hub in East US

resource "azurerm_virtual_hub" "east_us" {
  name                = "${var.project_name}-hub-eastus"
  resource_group_name = var.resource_group_name
  location            = "East US"
  virtual_wan_id      = azurerm_virtual_wan.main.id
  address_prefix      = "10.100.0.0/23"  # Hub's private address space

  tags = {
    Name = "${var.project_name}-hub-eastus"
  }
}

# Secondary hub in West Europe
resource "azurerm_virtual_hub" "west_europe" {
  name                = "${var.project_name}-hub-westeurope"
  resource_group_name = var.resource_group_name
  location            = "West Europe"
  virtual_wan_id      = azurerm_virtual_wan.main.id
  address_prefix      = "10.101.0.0/23"
}
```

## Step 2: Connect VNets to the Hub

```hcl
resource "azurerm_virtual_hub_connection" "spoke_1" {
  name                      = "spoke-1-connection"
  virtual_hub_id            = azurerm_virtual_hub.east_us.id
  remote_virtual_network_id = var.spoke_1_vnet_id
}

resource "azurerm_virtual_hub_connection" "spoke_2" {
  name                      = "spoke-2-connection"
  virtual_hub_id            = azurerm_virtual_hub.east_us.id
  remote_virtual_network_id = var.spoke_2_vnet_id

  routing {
    associated_route_table_id = azurerm_virtual_hub_route_table.custom.id

    propagated_route_table {
      route_table_ids = [
        azurerm_virtual_hub.east_us.default_route_table_id
      ]
    }
  }
}
```

## Step 3: Create VPN Gateway in Hub

```hcl
resource "azurerm_vpn_gateway" "east_us" {
  name                = "${var.project_name}-vpn-gateway-eastus"
  location            = "East US"
  resource_group_name = var.resource_group_name
  virtual_hub_id      = azurerm_virtual_hub.east_us.id

  scale_unit = 1  # 1 scale unit = 500 Mbps aggregate throughput
}

# VPN site representing branch office
resource "azurerm_vpn_site" "branch" {
  name                = "${var.project_name}-branch-site"
  location            = var.location
  resource_group_name = var.resource_group_name
  virtual_wan_id      = azurerm_virtual_wan.main.id

  address_cidrs = ["192.168.10.0/24"]  # Branch network CIDR

  link {
    name       = "primary"
    ip_address = var.branch_vpn_ip
    speed_in_mbps = 100

    bgp {
      asn             = 65001  # Branch BGP ASN
      peering_address = "192.168.10.1"
    }
  }
}

resource "azurerm_vpn_gateway_connection" "branch" {
  name               = "${var.project_name}-branch-connection"
  vpn_gateway_id     = azurerm_vpn_gateway.east_us.id
  remote_vpn_site_id = azurerm_vpn_site.branch.id

  vpn_link {
    name             = "primary"
    vpn_site_link_id = azurerm_vpn_site.branch.link[0].id
    protocol         = "IKEv2"

    bgp_enabled = true
  }

  routing {
    associated_route_table = azurerm_virtual_hub.east_us.default_route_table_id

    propagated_route_table {
      route_table_ids = [
        azurerm_virtual_hub.east_us.default_route_table_id,
        azurerm_virtual_hub_route_table.custom.id
      ]
    }
  }
}
```

## Step 4: Custom Routing Table

```hcl
resource "azurerm_virtual_hub_route_table" "custom" {
  name           = "custom-route-table"
  virtual_hub_id = azurerm_virtual_hub.east_us.id

  route {
    name              = "to-shared-services"
    destinations_type = "CIDR"
    destinations      = ["10.200.0.0/16"]
    next_hop_type     = "ResourceId"
    next_hop          = azurerm_virtual_hub_connection.spoke_1.id
  }

  labels = ["production"]
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check hub status
az network vhub show \
  --resource-group <rg> \
  --name <hub-name> \
  --query "{State: routingState, Address: addressPrefix}"

# List effective routes
az network vhub get-effective-routes \
  --resource-group <rg> \
  --name <hub-name> \
  --resource-type VpnConnection \
  --resource-id <connection-id>
```

## Conclusion

Virtual WAN Standard supports any-to-any routing (branch-to-branch, branch-to-VNet, and VNet-to-VNet across hubs) when connections use the default association and propagation behavior. Each VPN gateway scale unit represents 500 Mbps of aggregate site-to-site capacity, so size the gateway based on aggregate branch bandwidth. Integrate Azure Firewall into Virtual WAN hubs (Secured Virtual Hubs) with routing intent to inspect traffic between spokes and branches without deploying individual firewalls in each VNet. Use current Virtual WAN pricing to compare gateway, connection unit, routing, and security costs for your topology rather than relying on a fixed branch-count rule of thumb.

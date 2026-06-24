# How to Configure Subnet-Level Peering in Azure VNet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VNet, Peering, IPv4, Networking, Cloud

Description: Set up Azure Virtual Network peering between VNets to enable private IPv4 communication between subnets in different VNets without traversing the public internet.

## Introduction

Azure subnet peering connects two virtual networks by linking specific subnets instead of entire virtual network address spaces. Resources in the peered subnets can communicate using private IPv4 addresses, as if they were on the same network. Like regular VNet peering, subnet peering works within the same region or across regions (Global VNet peering) and supports both Azure-to-Azure and hub-and-spoke topologies.

## Prerequisites

- Two Azure VNets and the subnets you want to peer
- The participating subnets must be unique and belong to unique address spaces across peering links
- Register the subscription for subnet peering allowlisting
- Azure CLI 2.31.0 or later if you use the CLI examples
- The VNets must be in the same Microsoft Entra tenant (or use cross-tenant peering)
- Network Contributor role on both VNets

## VNet Address Space Planning

For subnet peering, the subnets that participate in the peering must be unique and belong to unique address spaces across peering links:

```text
VNet A: 10.1.0.0/16
  - Subnet A1 (peered): 10.1.1.0/24
  - Subnet A2: 10.1.2.0/24

VNet B: 10.2.0.0/16
  - Subnet B1 (peered): 10.2.1.0/24
```

## Creating Subnet Peering with Azure CLI

Peering is bidirectional - you must create a peering link from A to B AND from B to A. For subnet peering, set `--peer-complete-vnets false` and specify the local and remote subnet names on each side:

```bash
# Peer subnet A1 in VNet A to subnet B1 in VNet B

az network vnet peering create \
  --name "vnetA-to-vnetB" \
  --resource-group rg-network \
  --vnet-name vnet-a \
  --remote-vnet /subscriptions/SUB_ID/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-b \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --peer-complete-vnets false \
  --local-subnet-names subnet-a1 \
  --remote-subnet-names subnet-b1

# Peer subnet B1 in VNet B to subnet A1 in VNet A (required for bidirectional communication)
az network vnet peering create \
  --name "vnetB-to-vnetA" \
  --resource-group rg-network \
  --vnet-name vnet-b \
  --remote-vnet /subscriptions/SUB_ID/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-a \
  --allow-vnet-access true \
  --allow-forwarded-traffic true \
  --peer-complete-vnets false \
  --local-subnet-names subnet-b1 \
  --remote-subnet-names subnet-a1
```

## Verifying Peering Status

```bash
# Check peering state (should be "Connected")
az network vnet peering show \
  --name "vnetA-to-vnetB" \
  --resource-group rg-network \
  --vnet-name vnet-a \
  --query "{State:peeringState, LocalSubnets:localSubnetNames, RemoteSubnets:remoteSubnetNames}"
```

## Allowing Gateway Transit

For hub-and-spoke, allow spokes to use the hub's VPN or ExpressRoute gateway:

```bash
# On the hub peering (allow gateway transit)
az network vnet peering update \
  --name "hub-to-spoke" \
  --resource-group rg-network \
  --vnet-name hub-vnet \
  --set allowGatewayTransit=true

# On the spoke peering (use remote gateways)
az network vnet peering update \
  --name "spoke-to-hub" \
  --resource-group rg-network \
  --vnet-name spoke-vnet \
  --set useRemoteGateways=true
```

## Terraform Configuration

```hcl
resource "azurerm_virtual_network_peering" "a_to_b" {
  name                      = "vnetA-to-vnetB"
  resource_group_name       = azurerm_resource_group.net.name
  virtual_network_name      = azurerm_virtual_network.a.name
  remote_virtual_network_id = azurerm_virtual_network.b.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  peer_complete_virtual_networks_enabled = false
  local_subnet_names                     = ["subnet-a1"]
  remote_subnet_names                    = ["subnet-b1"]
}

resource "azurerm_virtual_network_peering" "b_to_a" {
  name                      = "vnetB-to-vnetA"
  resource_group_name       = azurerm_resource_group.net.name
  virtual_network_name      = azurerm_virtual_network.b.name
  remote_virtual_network_id = azurerm_virtual_network.a.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  peer_complete_virtual_networks_enabled = false
  local_subnet_names                     = ["subnet-b1"]
  remote_subnet_names                    = ["subnet-a1"]
}
```

## Network Security Groups and Peering

Subnet peering creates routes for the participating subnets, but NSG rules still apply. Ensure NSGs on the participating subnets allow traffic from the peered subnet CIDR or address space you intend to reach:

```bash
# Allow traffic from VNet A's peered subnet to VNet B's peered subnet
az network nsg rule create \
  --resource-group rg-network \
  --nsg-name nsg-subnet-b1 \
  --name allow-subnet-a1 \
  --priority 200 \
  --source-address-prefixes 10.1.1.0/24 \
  --destination-port-ranges '*' \
  --access Allow
```

## Conclusion

Azure subnet peering gives you the same low-latency, high-throughput connectivity as VNet peering while letting you choose exactly which subnets participate. It uses the Azure backbone network and avoids the public internet entirely, making it useful when you need tighter scope than full-VNet peering.

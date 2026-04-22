# How to Set Up Azure VNet Peering for IPv4 Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VNet Peering, IPv4, Networking, Cloud, Connectivity

Description: Configure Azure VNet peering between two virtual networks to enable direct IPv4 communication without gateways, including both same-region and cross-region peering.

## Introduction

Azure VNet peering connects two VNets so VMs in each can communicate using private IPv4 addresses. Traffic routes through Microsoft's backbone network, not over the public internet. Peering is non-transitive - if VNet A peers with VNet B and VNet B peers with VNet C, VNet A cannot reach VNet C without direct peering.

## Prerequisites

The two VNets must have non-overlapping IPv4 address spaces.

```bash
RESOURCE_GROUP="my-network-rg"

# VNet 1: 10.1.0.0/16 in eastus

az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name vnet-hub \
  --address-prefix 10.1.0.0/16 \
  --location eastus

# VNet 2: 10.2.0.0/16 in eastus
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name vnet-spoke \
  --address-prefix 10.2.0.0/16 \
  --location eastus
```

## Creating Peering - Both Directions Required

VNet peering requires a peering link from each side:

```bash
# Get VNet IDs
HUB_ID=$(az network vnet show \
  --resource-group $RESOURCE_GROUP \
  --name vnet-hub \
  --query id --output tsv)

SPOKE_ID=$(az network vnet show \
  --resource-group $RESOURCE_GROUP \
  --name vnet-spoke \
  --query id --output tsv)

# Peering from hub to spoke
az network vnet peering create \
  --resource-group $RESOURCE_GROUP \
  --name hub-to-spoke \
  --vnet-name vnet-hub \
  --remote-vnet $SPOKE_ID \
  --allow-vnet-access true

# Peering from spoke to hub
az network vnet peering create \
  --resource-group $RESOURCE_GROUP \
  --name spoke-to-hub \
  --vnet-name vnet-spoke \
  --remote-vnet $HUB_ID \
  --allow-vnet-access true
```

## Verifying Peering Status

```bash
# Check peering state (should show "Connected")
az network vnet peering show \
  --resource-group $RESOURCE_GROUP \
  --name hub-to-spoke \
  --vnet-name vnet-hub \
  --query '{state:peeringState, syncLevel:peeringSyncLevel}' \
  --output table
```

## Allow Gateway Transit (Hub-Spoke Architecture)

Enable spoke VNets to use the hub's VPN or ExpressRoute gateway:

```bash
# Hub side: allow gateway transit
az network vnet peering update \
  --resource-group $RESOURCE_GROUP \
  --name hub-to-spoke \
  --vnet-name vnet-hub \
  --set allowGatewayTransit=true

# Spoke side: use remote gateways
az network vnet peering update \
  --resource-group $RESOURCE_GROUP \
  --name spoke-to-hub \
  --vnet-name vnet-spoke \
  --set useRemoteGateways=true
```

## Cross-Region (Global) VNet Peering

Global peering works the same way but VNets are in different regions:

```bash
# Get VNet IDs
EAST_ID=$(az network vnet show \
  --resource-group $RESOURCE_GROUP \
  --name vnet-hub \
  --query id --output tsv)

WEST_ID=$(az network vnet show \
  --resource-group $RESOURCE_GROUP \
  --name vnet-west \
  --query id --output tsv)

# Peer eastus to westus
az network vnet peering create \
  --resource-group $RESOURCE_GROUP \
  --name east-to-west \
  --vnet-name vnet-hub \
  --remote-vnet $WEST_ID \
  --allow-vnet-access true

# Peer westus to eastus
az network vnet peering create \
  --resource-group $RESOURCE_GROUP \
  --name west-to-east \
  --vnet-name vnet-west \
  --remote-vnet $EAST_ID \
  --allow-vnet-access true
```

Note: Global peering uses zone-based bandwidth charges and typically has higher latency than same-region peering.

## Testing Connectivity After Peering

```bash
# From a VM in vnet-hub, ping a VM in vnet-spoke
# (ensure NSGs allow ICMP or the test protocol)
az vm run-command invoke \
  --resource-group $RESOURCE_GROUP \
  --name hub-vm \
  --command-id RunShellScript \
  --scripts "ping -c 3 10.2.0.4"
```

## Listing All VNet Peerings

```bash
az network vnet peering list \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-hub \
  --output table
```

## Conclusion

VNet peering requires two peering links (one from each VNet). Both VNets must have non-overlapping address spaces. Enable `allowGatewayTransit` on the hub and `useRemoteGateways` on spokes for a hub-spoke topology where spokes share a central VPN or ExpressRoute gateway.

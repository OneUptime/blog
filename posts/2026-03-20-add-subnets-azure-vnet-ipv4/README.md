# How to Add Subnets to an Azure VNet with Specific IPv4 CIDR Blocks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VNet, Subnets, IPv4, Networking, CIDR

Description: Add subnets to an existing Azure Virtual Network with specific IPv4 CIDR blocks using the Azure CLI, and understand subnet delegation and service endpoints.

## Introduction

Subnets divide your VNet address space into smaller segments, enabling isolation between tiers (web, app, data) and integration with Azure services like App Service Environments, AKS node pools, and private endpoints. Every subnet is a subdivision of the VNet's address space.

## Adding a Subnet to an Existing VNet

```bash
RESOURCE_GROUP="my-network-rg"
VNET_NAME="prod-vnet"

# Add a web tier subnet

az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name web-subnet \
  --address-prefixes 10.100.1.0/24

# Add an app tier subnet
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name app-subnet \
  --address-prefixes 10.100.2.0/24

# Add a database subnet
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name db-subnet \
  --address-prefixes 10.100.3.0/24
```

## Listing Subnets in a VNet

```bash
# List all subnets with their CIDR blocks
az network vnet subnet list \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --query '[].{Name:name, CIDR:addressPrefix}' \
  --output table
```

## Reserved Azure IP Addresses per Subnet

Azure reserves 5 IP addresses in every subnet:

| Reserved | Purpose |
|---|---|
| x.x.x.0 | Network address |
| x.x.x.1 | Default gateway |
| x.x.x.2 | Azure DNS mapping |
| x.x.x.3 | Azure DNS mapping |
| Last IP in the subnet range | Reserved by Azure |

A /24 subnet provides 256 - 5 = **251 usable host addresses**.

## Subnet Delegation for Azure Services

Subnet delegation gives an Azure service explicit permission to use a subnet:

```bash
# Delegate a subnet to Azure Kubernetes Service
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name aks-subnet \
  --address-prefixes 10.100.10.0/22 \
  --delegations Microsoft.ContainerService/managedClusters

# Delegate to App Service Environment
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name ase-subnet \
  --address-prefixes 10.100.20.0/24 \
  --delegations Microsoft.Web/hostingEnvironments
```

## Adding Service Endpoints to a Subnet

Service endpoints enable direct connectivity from a subnet to Azure PaaS services:

```bash
# Add Storage and SQL service endpoints to the db subnet
az network vnet subnet update \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name db-subnet \
  --service-endpoints Microsoft.Storage Microsoft.Sql
```

## Gateway Subnet for VPN or ExpressRoute

The gateway subnet must be named `GatewaySubnet`:

```bash
# Create a dedicated gateway subnet
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name GatewaySubnet \
  --address-prefixes 10.100.255.0/27
```

Use /27 or larger for gateway subnets. A /29 is only applicable to the Basic SKU.

## Updating a Subnet's Address Prefix

You can resize a subnet if the new range still includes any assigned IP addresses:

```bash
# Expand a subnet from /24 to /23 (the new range must still include any allocated IPs)
az network vnet subnet update \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name web-subnet \
  --address-prefixes 10.100.0.0/23
```

## Subnet Planning Example

```text
VNet: 10.100.0.0/16
├── web-subnet:      10.100.1.0/24   (web servers)
├── app-subnet:      10.100.2.0/24   (application tier)
├── db-subnet:       10.100.3.0/24   (databases)
├── aks-subnet:      10.100.10.0/22  (Kubernetes nodes)
├── pe-subnet:       10.100.50.0/24  (private endpoints)
└── GatewaySubnet:   10.100.255.0/27 (VPN gateway)
```

## Conclusion

Use `az network vnet subnet create` with `--address-prefixes` to add subnets inside a VNet. Delegate subnets for Azure-managed services, add service endpoints for direct PaaS access, and always create a dedicated `GatewaySubnet` if you plan to use VPN or ExpressRoute.

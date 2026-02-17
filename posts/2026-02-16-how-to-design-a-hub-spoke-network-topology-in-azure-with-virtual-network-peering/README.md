# How to Design a Hub-Spoke Network Topology in Azure with Virtual Network Peering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Networking, Hub-Spoke, Virtual Network, VNet Peering, Architecture, Cloud Infrastructure

Description: Design and implement a hub-spoke network topology in Azure using virtual network peering for centralized security and shared services.

---

The hub-spoke network topology is the most widely recommended network architecture for Azure deployments. Microsoft endorses it as part of the Cloud Adoption Framework, and for good reason. It provides centralized security controls, shared services, and network isolation between workloads while keeping the architecture manageable.

In this post, I will walk through the complete design and implementation of a hub-spoke topology using VNet peering, including the hub network, spoke networks, routing, and DNS configuration.

## What is Hub-Spoke Topology

The hub is a central virtual network that contains shared services like firewalls, VPN gateways, DNS servers, and monitoring infrastructure. The spokes are separate virtual networks, each containing a specific workload or business unit. Spokes connect to the hub through VNet peering, and all traffic between spokes (and to the internet or on-premises) flows through the hub.

```mermaid
graph TD
    subgraph "Hub VNet (10.0.0.0/16)"
        FW[Azure Firewall]
        VPN[VPN Gateway]
        DNS[Private DNS]
        BASTION[Azure Bastion]
    end

    subgraph "Spoke 1 - Production (10.1.0.0/16)"
        WEB1[Web Tier]
        APP1[App Tier]
        DB1[Data Tier]
    end

    subgraph "Spoke 2 - Development (10.2.0.0/16)"
        WEB2[Dev Web]
        APP2[Dev App]
    end

    subgraph "Spoke 3 - Shared Services (10.3.0.0/16)"
        AD[Active Directory]
        MONITOR[Monitoring]
    end

    subgraph "On-Premises"
        ONPREM[Corporate Network]
    end

    Spoke 1 -- Peering --> Hub VNet
    Spoke 2 -- Peering --> Hub VNet
    Spoke 3 -- Peering --> Hub VNet
    VPN -- Site-to-Site --> ONPREM
```

## Why Hub-Spoke Over a Flat Network

You could connect everything in one large VNet, but that creates problems as you grow:

- **No isolation.** Every workload can reach every other workload. A compromised dev server could access production databases.
- **No centralized security.** You cannot force all traffic through a firewall without complex routing.
- **No delegation.** You cannot give a team control over their own network without giving them access to the entire network.
- **IP address management.** A single large VNet wastes IP space and makes address planning difficult.

Hub-spoke solves all of these by isolating workloads in their own VNets and centralizing shared services and security controls in the hub.

## Creating the Hub Network

Start with the hub VNet and its subnets:

```bash
# Create the hub virtual network
az network vnet create \
  --resource-group hub-rg \
  --name hub-vnet \
  --address-prefix 10.0.0.0/16 \
  --location eastus

# Create subnets for each shared service
# Azure Firewall requires a subnet named exactly "AzureFirewallSubnet"
az network vnet subnet create \
  --resource-group hub-rg \
  --vnet-name hub-vnet \
  --name AzureFirewallSubnet \
  --address-prefixes 10.0.1.0/24

# Gateway subnet for VPN/ExpressRoute
# Must be named "GatewaySubnet"
az network vnet subnet create \
  --resource-group hub-rg \
  --vnet-name hub-vnet \
  --name GatewaySubnet \
  --address-prefixes 10.0.2.0/24

# Azure Bastion subnet for secure remote access
# Must be named "AzureBastionSubnet"
az network vnet subnet create \
  --resource-group hub-rg \
  --vnet-name hub-vnet \
  --name AzureBastionSubnet \
  --address-prefixes 10.0.3.0/24

# Management subnet for jump boxes and shared tools
az network vnet subnet create \
  --resource-group hub-rg \
  --vnet-name hub-vnet \
  --name management-subnet \
  --address-prefixes 10.0.4.0/24
```

## Deploying Azure Firewall in the Hub

Azure Firewall is the central point for controlling traffic between spokes, to the internet, and to on-premises:

```bash
# Create a public IP for the firewall
az network public-ip create \
  --resource-group hub-rg \
  --name firewall-pip \
  --sku Standard \
  --allocation-method Static

# Deploy Azure Firewall
az network firewall create \
  --resource-group hub-rg \
  --name hub-firewall \
  --location eastus \
  --vnet-name hub-vnet \
  --sku AZFW_VNet \
  --tier Standard

# Configure the firewall IP
az network firewall ip-config create \
  --resource-group hub-rg \
  --firewall-name hub-firewall \
  --name fw-config \
  --public-ip-address firewall-pip \
  --vnet-name hub-vnet

# Get the firewall private IP for route tables
FIREWALL_IP=$(az network firewall show \
  --resource-group hub-rg \
  --name hub-firewall \
  --query "ipConfigurations[0].privateIPAddress" \
  --output tsv)

echo "Firewall private IP: $FIREWALL_IP"
```

## Creating Spoke Networks

Each spoke VNet represents a workload or environment:

```bash
# Create the production spoke
az network vnet create \
  --resource-group prod-rg \
  --name prod-spoke-vnet \
  --address-prefix 10.1.0.0/16 \
  --location eastus

# Create subnets with proper tiering
az network vnet subnet create \
  --resource-group prod-rg \
  --vnet-name prod-spoke-vnet \
  --name web-subnet \
  --address-prefixes 10.1.1.0/24

az network vnet subnet create \
  --resource-group prod-rg \
  --vnet-name prod-spoke-vnet \
  --name app-subnet \
  --address-prefixes 10.1.2.0/24

az network vnet subnet create \
  --resource-group prod-rg \
  --vnet-name prod-spoke-vnet \
  --name data-subnet \
  --address-prefixes 10.1.3.0/24

# Create the development spoke
az network vnet create \
  --resource-group dev-rg \
  --name dev-spoke-vnet \
  --address-prefix 10.2.0.0/16 \
  --location eastus

az network vnet subnet create \
  --resource-group dev-rg \
  --vnet-name dev-spoke-vnet \
  --name dev-subnet \
  --address-prefixes 10.2.1.0/24
```

## Setting Up VNet Peering

VNet peering creates a low-latency, high-bandwidth connection between VNets over the Azure backbone. Peering must be created in both directions:

```bash
# Get VNet resource IDs
HUB_VNET_ID=$(az network vnet show \
  --resource-group hub-rg --name hub-vnet \
  --query id --output tsv)

PROD_VNET_ID=$(az network vnet show \
  --resource-group prod-rg --name prod-spoke-vnet \
  --query id --output tsv)

DEV_VNET_ID=$(az network vnet show \
  --resource-group dev-rg --name dev-spoke-vnet \
  --query id --output tsv)

# Peer hub to production spoke
# allow-gateway-transit lets the spoke use the hub's VPN gateway
az network vnet peering create \
  --resource-group hub-rg \
  --name hub-to-prod \
  --vnet-name hub-vnet \
  --remote-vnet $PROD_VNET_ID \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit

# Peer production spoke to hub
# use-remote-gateways lets this spoke use the hub's VPN/ExpressRoute gateway
az network vnet peering create \
  --resource-group prod-rg \
  --name prod-to-hub \
  --vnet-name prod-spoke-vnet \
  --remote-vnet $HUB_VNET_ID \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --use-remote-gateways

# Peer hub to dev spoke
az network vnet peering create \
  --resource-group hub-rg \
  --name hub-to-dev \
  --vnet-name hub-vnet \
  --remote-vnet $DEV_VNET_ID \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit

# Peer dev spoke to hub
az network vnet peering create \
  --resource-group dev-rg \
  --name dev-to-hub \
  --vnet-name dev-spoke-vnet \
  --remote-vnet $HUB_VNET_ID \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --use-remote-gateways
```

## Routing Traffic Through the Firewall

By default, VNet peering allows direct communication between peered networks. To force traffic through the firewall, create User Defined Routes (UDRs):

```bash
# Create a route table for spoke subnets
az network route-table create \
  --resource-group prod-rg \
  --name prod-route-table \
  --disable-bgp-route-propagation true

# Route all traffic to other spokes through the firewall
az network route-table route create \
  --resource-group prod-rg \
  --route-table-name prod-route-table \
  --name to-dev-spoke \
  --address-prefix 10.2.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $FIREWALL_IP

# Route internet-bound traffic through the firewall
az network route-table route create \
  --resource-group prod-rg \
  --route-table-name prod-route-table \
  --name to-internet \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address $FIREWALL_IP

# Associate the route table with spoke subnets
az network vnet subnet update \
  --resource-group prod-rg \
  --vnet-name prod-spoke-vnet \
  --name web-subnet \
  --route-table prod-route-table

az network vnet subnet update \
  --resource-group prod-rg \
  --vnet-name prod-spoke-vnet \
  --name app-subnet \
  --route-table prod-route-table
```

## Firewall Rules

Configure the firewall to control what traffic is allowed between spokes:

```bash
# Create a network rule collection for spoke-to-spoke traffic
az network firewall network-rule create \
  --resource-group hub-rg \
  --firewall-name hub-firewall \
  --collection-name "spoke-to-spoke" \
  --name "prod-to-shared" \
  --protocols TCP UDP \
  --source-addresses "10.1.0.0/16" \
  --destination-addresses "10.3.0.0/16" \
  --destination-ports 443 1433 \
  --action Allow \
  --priority 200

# Create application rules for internet access
az network firewall application-rule create \
  --resource-group hub-rg \
  --firewall-name hub-firewall \
  --collection-name "internet-access" \
  --name "allow-azure-services" \
  --protocols Https=443 \
  --source-addresses "10.1.0.0/16" "10.2.0.0/16" \
  --fqdn-tags AzureKubernetesService AppServiceEnvironment \
  --action Allow \
  --priority 300
```

## DNS Configuration

For private DNS resolution across the hub-spoke topology, use Azure Private DNS Zones linked to all VNets:

```bash
# Create a private DNS zone
az network private-dns zone create \
  --resource-group hub-rg \
  --name "privatelink.database.windows.net"

# Link the DNS zone to all VNets
az network private-dns link vnet create \
  --resource-group hub-rg \
  --zone-name "privatelink.database.windows.net" \
  --name hub-link \
  --virtual-network $HUB_VNET_ID \
  --registration-enabled false

az network private-dns link vnet create \
  --resource-group hub-rg \
  --zone-name "privatelink.database.windows.net" \
  --name prod-link \
  --virtual-network $PROD_VNET_ID \
  --registration-enabled false
```

## IP Address Planning

Plan your address spaces carefully before you start building. Here is a recommended approach:

| Network | Address Space | Purpose |
|---------|--------------|---------|
| Hub VNet | 10.0.0.0/16 | Shared services, firewall, gateways |
| Prod Spoke | 10.1.0.0/16 | Production workloads |
| Dev Spoke | 10.2.0.0/16 | Development environment |
| Shared Services | 10.3.0.0/16 | AD, monitoring, build agents |
| Future Spokes | 10.4.0.0/16 - 10.10.0.0/16 | Reserved for growth |
| On-Premises | 172.16.0.0/12 | Corporate network |

Leave gaps between address ranges to allow expansion. Using /16 per VNet gives you 65,534 addresses per network, which is plenty for most workloads.

## Summary

The hub-spoke topology gives you the best balance of security, isolation, and manageability for Azure network deployments. The hub centralizes security through Azure Firewall, provides shared connectivity through VPN/ExpressRoute gateways, and enables consistent DNS resolution. Each spoke gets its own isolated network where teams can deploy workloads independently. Start with a hub and two spokes, add the firewall and routing, and expand with additional spokes as your Azure footprint grows.

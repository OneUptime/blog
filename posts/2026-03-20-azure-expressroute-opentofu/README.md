# How to Set Up Azure ExpressRoute with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, ExpressRoute, Hybrid Cloud, Private Connectivity, BGP, Infrastructure as Code

Description: Learn how to configure Azure ExpressRoute resources with OpenTofu to establish dedicated private connections between on-premises networks and Azure with predictable performance and no internet...

## Introduction

Azure ExpressRoute establishes private, dedicated connections between on-premises networks and Azure through connectivity providers or directly at colocation facilities. Unlike VPN over the internet, ExpressRoute provides consistent latency and does not traverse the public internet. Provider-provisioned circuits support bandwidths up to 10 Gbps, while ExpressRoute Direct supports 10 Gbps, 100 Gbps, or 400 Gbps connectivity. ExpressRoute supports two peering types: Azure Private Peering (connects to Azure VNets) and Microsoft Peering (connects to Microsoft 365 and Azure public services).

## Prerequisites

- OpenTofu v1.6+
- An ExpressRoute connectivity provider selected for your target peering location
- Azure credentials with Network permissions
- BGP ASN from your network team

## Step 1: Create ExpressRoute Circuit

```hcl
resource "azurerm_express_route_circuit" "main" {
  name                  = "${var.project_name}-er-circuit"
  resource_group_name   = var.resource_group_name
  location              = var.location
  service_provider_name = "Equinix"  # Provider name
  peering_location      = "Silicon Valley"
  bandwidth_in_mbps     = 1000  # 50, 100, 200, 500, 1000, 2000, 5000, 10000

  sku {
    tier   = "Standard"   # Standard or Premium
    family = "MeteredData"  # MeteredData or UnlimitedData
  }

  tags = {
    Name = "${var.project_name}-expressroute"
  }
}

output "service_key" {
  value       = azurerm_express_route_circuit.main.service_key
  description = "Service key to provide to your connectivity provider"
  sensitive   = true
}
```

## Step 2: Configure Private Peering

```hcl
# Wait for provider to provision the circuit before configuring peering
# For managed Layer 3 provider circuits, the connectivity provider configures routing for you

resource "azurerm_express_route_circuit_peering" "private" {
  peering_type                  = "AzurePrivatePeering"
  express_route_circuit_name    = azurerm_express_route_circuit.main.name
  resource_group_name           = var.resource_group_name

  primary_peer_address_prefix   = "169.254.1.0/30"   # /30 subnet for primary link
  secondary_peer_address_prefix = "169.254.2.0/30"   # /30 subnet for secondary link

  vlan_id                       = 100
  peer_asn                      = 65001  # Your on-premises BGP ASN

  # Optional MD5 authentication
  shared_key = var.bgp_shared_key
}
```

## Step 3: Connect to VNet via Virtual Network Gateway

```hcl
# ExpressRoute Gateway in the hub VNet
resource "azurerm_subnet" "gateway" {
  name                 = "GatewaySubnet"  # Must be exactly "GatewaySubnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.hub_vnet_name
  address_prefixes     = ["10.0.255.0/27"]
}

# Azure manages the public IP for ExpressRoute gateways
resource "azurerm_virtual_network_gateway" "expressroute" {
  name                = "${var.project_name}-er-gateway"
  location            = var.location
  resource_group_name = var.resource_group_name
  type                = "ExpressRoute"
  sku                 = "ErGw1AZ"  # ErGw1AZ, ErGw2AZ, ErGw3AZ (zone-redundant)

  ip_configuration {
    name                          = "default"
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }
}

# Connect ExpressRoute circuit to VNet Gateway
resource "azurerm_virtual_network_gateway_connection" "expressroute" {
  name                = "${var.project_name}-er-connection"
  location            = var.location
  resource_group_name = var.resource_group_name
  type                = "ExpressRoute"

  virtual_network_gateway_id = azurerm_virtual_network_gateway.expressroute.id
  express_route_circuit_id   = azurerm_express_route_circuit.main.id

  # Enable FastPath to bypass the gateway for data forwarding on supported gateway SKUs
  express_route_gateway_bypass = false
}
```

## Step 4: ExpressRoute Global Reach

```hcl
# Connect two ExpressRoute circuits to enable on-premises to on-premises traffic via Azure
resource "azurerm_express_route_circuit_connection" "global_reach" {
  name                = "${var.project_name}-global-reach"
  peering_id          = azurerm_express_route_circuit_peering.private.id
  peer_peering_id     = var.second_circuit_peering_id

  # Address space for global reach connections
  address_prefix_ipv4 = "192.168.100.0/29"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check circuit provisioning state
az network express-route show \
  --resource-group <rg> \
  --name <circuit-name> \
  --query "{State: serviceProviderProvisioningState, CircuitState: circuitProvisioningState}"

# Check BGP peering status
az network express-route peering show \
  --resource-group <rg> \
  --circuit-name <circuit-name> \
  --name AzurePrivatePeering
```

## Conclusion

Provider provisioning time varies after you share the service key, so plan for lead time in project timelines and wait until `serviceProviderProvisioningState` is `Provisioned` before you continue. Use zone-redundant gateway SKUs (`ErGw1AZ`, `ErGw2AZ`, `ErGw3AZ`) for production to protect against availability zone failures. For the highest resilience, deploy two circuits from different providers in different peering locations and configure both for active-active BGP. ExpressRoute Global Reach allows on-premises sites connected to different ExpressRoute circuits to communicate with each other through the Azure backbone, eliminating the need for dedicated on-premises cross-site links.

# How to Configure Azure ExpressRoute IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, ExpressRoute, IPv6, BGP, Private Peering, Dual-Stack, Hybrid

Description: Configure Azure ExpressRoute circuits for IPv6 private peering to extend your on-premises IPv6 network into Azure.

## Introduction

Azure ExpressRoute IPv6 enables private IPv6 connectivity between Azure virtual networks and on-premises networks. Proper configuration requires setting up dual-stack support on the virtual network and gateway subnet, configuring IPv6 private peering with BGP, and linking the virtual network gateway to the ExpressRoute circuit.

## Prerequisites

- VNet with dual-stack (IPv4 + IPv6) address space and subnets
- An existing Azure account with appropriate Azure RBAC permissions
- IPv6 address space allocated for the VNet and a pair of /126 IPv6 subnets for ExpressRoute private peering

## Step 1: Verify IPv6 Prerequisites

```bash
# Check the VNet address spaces

az network vnet show --resource-group myRG --name myVNet --query "addressSpace.addressPrefixes"
```

## Step 2: Enable IPv6 on the Virtual Network

```bash
# Verify VNet has IPv6 address space
az network vnet show \
    --resource-group myRG \
    --name myVNet \
    --query "addressSpace.addressPrefixes"

# Add IPv6 address space if missing
az network vnet update \
    --resource-group myRG \
    --name myVNet \
    --address-prefixes 10.0.0.0/16 2001:db8:100::/56

# Add IPv6 to the GatewaySubnet for the ExpressRoute gateway
az network vnet subnet update \
    --resource-group myRG \
    --vnet-name myVNet \
    --name GatewaySubnet \
    --address-prefixes 10.0.0.0/27 2001:db8:100:1::/64
```

## Step 3: Configure IPv6 Private Peering

```bash
# Create the ExpressRoute circuit
az network express-route create \
    --resource-group myRG \
    --name myCircuit \
    --location eastus \
    --provider "Equinix" \
    --peering-location "SiliconValley" \
    --bandwidth 1000 \
    --sku-family MeteredData \
    --sku-tier Standard

# Configure IPv6 private peering
az network express-route peering create \
    --resource-group myRG \
    --circuit-name myCircuit \
    --peering-type AzurePrivatePeering \
    --peer-asn 65000 \
    --vlan-id 100 \
    --ip-version ipv6 \
    --primary-peer-subnet "2001:db8:100::/126" \
    --secondary-peer-subnet "2001:db8:100::4/126"
```

## Step 4: Link the Virtual Network to the Circuit

```bash
# Update an existing zone-redundant ExpressRoute gateway to enable IPv6
az network vnet-gateway update \
    --resource-group myRG \
    --name myErGateway

# Link the VNet gateway to the ExpressRoute circuit
az network vpn-connection create \
    --resource-group myRG \
    --name myERConnection \
    --vnet-gateway1 myErGateway \
    --express-route-circuit2 myCircuit
```

## Step 5: Test IPv6 Connectivity

```bash
# Test from a Linux VM in the VNet
ping -6 -c 3 <on-premises-ipv6-address>

# Show the effective routes on the VM NIC
az network nic show-effective-route-table \
    --resource-group myRG \
    --name myNIC
```

## Step 6: Terraform Example

```hcl
# Terraform for Azure ExpressRoute IPv6
resource "azurerm_express_route_circuit_peering" "ipv6" {
  peering_type               = "AzurePrivatePeering"
  express_route_circuit_name = azurerm_express_route_circuit.main.name
  resource_group_name        = azurerm_resource_group.main.name
  peer_asn                   = 65000
  vlan_id                    = 100
  ipv4_enabled               = false

  ipv6 {
    primary_peer_address_prefix   = "2001:db8:100::/126"
    secondary_peer_address_prefix = "2001:db8:100::4/126"
  }
}
```

## Conclusion

Azure ExpressRoute IPv6 requires enabling dual-stack on the virtual network and gateway subnet, configuring IPv6 private peering with BGP, and linking an ExpressRoute virtual network gateway to the circuit. Test connectivity end-to-end after configuration. Use Terraform for declarative, repeatable deployments. Monitor IPv6 BGP session state and route advertisement with OneUptime's network health checks.

# How to Configure Azure Private Link IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Private Link, IPv6, Private Endpoint, Dual-Stack, Service

Description: Configure Azure Private Link endpoints with IPv6 addresses for private connectivity to Azure PaaS services.

## Introduction

Azure Private Link uses a private endpoint in your Azure virtual network. Private endpoints can use IPv4, IPv6, or dual-stack private IPs. To use IPv6, place the private endpoint in a dual-stack subnet and configure DNS for the target Azure service. ExpressRoute private peering or VPN is only required if clients outside Azure need to reach the private endpoint.

## Prerequisites

- VNet with dual-stack (IPv4 + IPv6) address space and subnets
- An existing Azure service that supports Private Link
- An Azure account with appropriate IAM permissions
- The subscriptions for the private endpoint and target resource registered with the `Microsoft.Network` resource provider
- DNS planning for the target service. For on-premises resolution, use DNS forwarding or Azure Private Resolver.

## Step 1: Verify IPv6 Prerequisites

```bash
# Check the VNet address space
az network vnet show \
    --resource-group myRG \
    --name myVNet \
    --query "addressSpace.addressPrefixes"

# Check the subnet address space
az network vnet subnet show \
    --resource-group myRG \
    --vnet-name myVNet \
    --name mySubnet \
    --query "addressPrefixes"
```

## Step 2: Enable IPv6 on the VNet and Subnet

```bash
# Add IPv6 address space to the VNet if missing
az network vnet update \
    --resource-group myRG \
    --name myVNet \
    --address-prefixes 10.0.0.0/16 2001:db8:1::/56

# Add IPv6 to the subnet. Azure IPv6 subnets must be exactly /64.
az network vnet subnet update \
    --resource-group myRG \
    --vnet-name myVNet \
    --name mySubnet \
    --address-prefixes 10.0.1.0/24 2001:db8:1:1::/64
```

## Step 3: Discover the Private Link Subresource

```bash
# Example: inspect a Storage account to find the groupId and required member names
az network private-link-resource list \
    --resource-group myRG \
    --name mystorage \
    --type Microsoft.Storage/storageAccounts \
    --query "[].{groupId:groupId, requiredMembers:requiredMembers}"
```

## Step 4: Create the Private Endpoint

```bash
# Deploy the Bicep template from Step 6 with DualStack private IPs
az deployment group create \
    --resource-group myRG \
    --template-file private-endpoint-ipv6.bicep \
    --parameters \
        privateEndpointName=myPE \
        location=eastus \
        subnetId=/subscriptions/<sub>/resourceGroups/myRG/providers/Microsoft.Network/virtualNetworks/myVNet/subnets/mySubnet \
        targetResourceId=/subscriptions/<sub>/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorage \
        groupId=blob \
        memberName=blob \
        ipv4Address=10.0.1.4 \
        ipv6Address=2001:db8:1:1::4
```

## Step 5: Configure DNS and Test IPv6 Connectivity

```bash
# Create the recommended private DNS zone for the target service.
# This example uses Azure Storage blob.
az network private-dns zone create \
    --resource-group myRG \
    --name privatelink.blob.core.windows.net

# Link the DNS zone to the VNet
az network private-dns link vnet create \
    --resource-group myRG \
    --name myVNetLink \
    --zone-name privatelink.blob.core.windows.net \
    --virtual-network /subscriptions/<sub>/resourceGroups/myRG/providers/Microsoft.Network/virtualNetworks/myVNet \
    --registration-enabled false

# Associate the private endpoint with the DNS zone
az network private-endpoint dns-zone-group create \
    --resource-group myRG \
    --endpoint-name myPE \
    --name default \
    --private-dns-zone privatelink.blob.core.windows.net \
    --zone-name privatelink.blob.core.windows.net

# Verify the private endpoint IP configurations
az network private-endpoint ip-config list \
    --endpoint-name myPE \
    --resource-group myRG

# Verify the DNS values reported by the private endpoint
az network private-endpoint show \
    --resource-group myRG \
    --name myPE \
    --query "customDnsConfigs[].{fqdn:fqdn,ips:ipAddresses}"

# From a VM in the same VNet, confirm the service name resolves to the private endpoint
nslookup <resource-fqdn>
```

## Step 6: Bicep Example

```bicep
param location string = resourceGroup().location
param privateEndpointName string = 'myPE'
param subnetId string
param targetResourceId string
param groupId string = 'blob'
param memberName string = 'blob'
param ipv4Address string = '10.0.1.4'
param ipv6Address string = '2001:db8:1:1::4'

resource privateEndpoint 'Microsoft.Network/privateEndpoints@2025-05-01' = {
  name: privateEndpointName
  location: location
  properties: {
    subnet: {
      id: subnetId
    }
    ipVersionType: 'DualStack'
    ipConfigurations: [
      {
        name: 'ipv4config'
        properties: {
          groupId: groupId
          memberName: memberName
          privateIPAddress: ipv4Address
        }
      }
      {
        name: 'ipv6config'
        properties: {
          groupId: groupId
          memberName: memberName
          privateIPAddress: ipv6Address
        }
      }
    ]
    privateLinkServiceConnections: [
      {
        name: 'myConnection'
        properties: {
          privateLinkServiceId: targetResourceId
          groupIds: [
            groupId
          ]
        }
      }
    ]
  }
}
```

## Conclusion

Azure Private Link IPv6 is configured on the private endpoint itself, not through ExpressRoute BGP. Use a dual-stack subnet, deploy the private endpoint with `ipVersionType` set to `IPv6` or `DualStack`, and configure the recommended private DNS zone for the target service. If you need on-premises access, add ExpressRoute private peering or VPN and DNS forwarding on top of the private endpoint.

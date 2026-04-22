# How to Set Up Azure ExpressRoute for Private IPv4 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, ExpressRoute, IPv4, Private Connectivity, Hybrid, BGP

Description: Configure Azure ExpressRoute to establish a private, dedicated IPv4 connection between an on-premises network and Azure Virtual Networks, bypassing the public internet.

## Introduction

ExpressRoute provides a private, dedicated network connection from your on-premises infrastructure to Azure through a connectivity provider. Unlike VPN connections, ExpressRoute does not traverse the public internet, offering more reliability, consistent latency, and higher throughput. Provider circuits support up to 10 Gbps, while ExpressRoute Direct supports dual 10-Gbps, 100-Gbps, or 400-Gbps connectivity.

## ExpressRoute Components

```text
On-Premises Network
    ↓
Customer Edge Router (CE)
    ↓
ExpressRoute Provider (MSS/NSP)
    ↓
Microsoft Enterprise Edge (MSEE) Routers [BGP peering]
    ↓
Azure Virtual Network (via ExpressRoute Gateway)
```

## Step 1: Create the ExpressRoute Circuit

```bash
RESOURCE_GROUP="my-network-rg"

az network express-route create \
  --resource-group $RESOURCE_GROUP \
  --name my-er-circuit \
  --location eastus \
  --provider "Equinix" \
  --peering-location "Washington DC" \
  --bandwidth 1000 \
  --sku-tier Standard \
  --sku-family MeteredData
```

After creating the circuit, get the service key:

```bash
az network express-route show \
  --resource-group $RESOURCE_GROUP \
  --name my-er-circuit \
  --query '{serviceKey:serviceKey, provisioningState:provisioningState, circuitProvisioningState:circuitProvisioningState, serviceProviderProvisioningState:serviceProviderProvisioningState}'
```

Provide the service key to your connectivity provider to provision the physical circuit. Wait for `serviceProviderProvisioningState` to show `Provisioned` and `circuitProvisioningState` to show `Enabled`.

## Step 2: Configure Private Peering (BGP)

```bash
# Configure Azure private peering

az network express-route peering create \
  --resource-group $RESOURCE_GROUP \
  --circuit-name my-er-circuit \
  --peering-type AzurePrivatePeering \
  --peer-asn 65001 \
  --primary-peer-subnet 10.200.0.0/30 \
  --secondary-peer-subnet 10.200.0.4/30 \
  --vlan-id 100
```

- `--primary-peer-subnet` and `--secondary-peer-subnet`: /30 subnets for BGP sessions (primary and secondary MSEE routers)
- `--peer-asn`: Your on-premises ASN
- `--vlan-id`: VLAN for the peering

## Step 3: Create an ExpressRoute Gateway

```bash
# Create ExpressRoute gateway (not VPN gateway)
az network vnet-gateway create \
  --resource-group $RESOURCE_GROUP \
  --name er-gateway \
  --location eastus \
  --vnet prod-vnet \
  --gateway-type ExpressRoute \
  --sku UltraPerformance \
  --no-wait
```

## Step 4: Connect the Gateway to the Circuit

```bash
CIRCUIT_ID=$(az network express-route show \
  --resource-group $RESOURCE_GROUP \
  --name my-er-circuit \
  --query id --output tsv)

az network vpn-connection create \
  --resource-group $RESOURCE_GROUP \
  --name er-connection \
  --vnet-gateway1 er-gateway \
  --express-route-circuit2 $CIRCUIT_ID \
  --routing-weight 10
```

## Verifying the Connection

```bash
# Check circuit state
az network express-route show \
  --resource-group $RESOURCE_GROUP \
  --name my-er-circuit \
  --query '{serviceProviderState:serviceProviderProvisioningState, bandwidth:serviceProviderProperties.bandwidthInMbps}'

# View learned BGP routes (from on-premises)
az network express-route list-route-tables \
  --resource-group $RESOURCE_GROUP \
  --name my-er-circuit \
  --peering-name AzurePrivatePeering \
  --path primary
```

## ExpressRoute SKU Options

| SKU Tier | Coverage | Max VNet links per circuit |
|---|---|---|
| Standard | Azure regions in the same geopolitical region | 10 |
| Premium | Global Azure regions | More than 10, depending on circuit bandwidth |

| SKU Family | Billing |
|---|---|
| MeteredData | Per-GB outbound |
| UnlimitedData | Flat monthly rate |

## Route Filter for Microsoft Peering

Route filters apply to Microsoft peering only; the `MicrosoftPeering` peering must already exist on the circuit.

```bash
# Create route filter for selected Microsoft 365 services
az network route-filter create \
  --resource-group $RESOURCE_GROUP \
  --name er-route-filter \
  --location eastus

az network route-filter rule create \
  --resource-group $RESOURCE_GROUP \
  --filter-name er-route-filter \
  --name allow-m365 \
  --access Allow \
  --communities 12076:5010 12076:5020

az network express-route peering update \
  --resource-group $RESOURCE_GROUP \
  --circuit-name my-er-circuit \
  --name MicrosoftPeering \
  --route-filter er-route-filter
```

## Conclusion

ExpressRoute requires a connectivity provider to provision a physical or virtual cross-connect. Configure private peering with BGP using /30 subnets, create an ExpressRoute gateway in your VNet's GatewaySubnet, then connect the gateway to the circuit. Monitor with `az network express-route list-route-tables` to verify BGP route exchange.

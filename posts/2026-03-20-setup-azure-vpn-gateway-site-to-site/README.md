# How to Set Up Azure VPN Gateway for Site-to-Site IPv4 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, VPN Gateway, Site-to-Site, IPv4, Hybrid Connectivity, IPsec

Description: Configure an Azure VPN Gateway and site-to-site IPSec/IKE VPN connection to securely connect an on-premises IPv4 network to an Azure Virtual Network.

## Introduction

Azure VPN Gateway creates encrypted IPsec/IKE tunnels between Azure VNets and on-premises networks or other VNets. Site-to-site connections use a VPN device on-premises (or another Azure gateway) as the remote endpoint. Gateway creation can often take 45 minutes or more.

## Step 1: Create the GatewaySubnet

```bash
RESOURCE_GROUP="my-network-rg"

# Gateway subnet must be named exactly "GatewaySubnet"

az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name prod-vnet \
  --name GatewaySubnet \
  --address-prefixes 10.100.255.0/27
```

## Step 2: Create a Public IP for the Gateway

```bash
az network public-ip create \
  --resource-group $RESOURCE_GROUP \
  --name vpngw-pip \
  --sku Standard \
  --allocation-method Static \
  --zone 1 2 3 \
  --location eastus
```

## Step 3: Create the VPN Gateway

```bash
# VpnGw1AZ supports up to 650 Mbps; creation can often take 45 minutes or more
az network vnet-gateway create \
  --resource-group $RESOURCE_GROUP \
  --name vpn-gateway \
  --location eastus \
  --vnet prod-vnet \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw1AZ \
  --public-ip-address vpngw-pip \
  --no-wait
```

Monitor progress:

```bash
az network vnet-gateway show \
  --resource-group $RESOURCE_GROUP \
  --name vpn-gateway \
  --query provisioningState
```

## Step 4: Create a Local Network Gateway (On-Premises)

```bash
# Represents the on-premises VPN device
az network local-gateway create \
  --resource-group $RESOURCE_GROUP \
  --name onprem-local-gw \
  --location eastus \
  --gateway-ip-address 203.0.113.1 \
  --local-address-prefixes 192.168.0.0/24 192.168.1.0/24
```

- `--gateway-ip-address`: Public IP of the on-premises VPN device
- `--local-address-prefixes`: On-premises subnets to route via the VPN

## Step 5: Create the Connection

```bash
az network vpn-connection create \
  --resource-group $RESOURCE_GROUP \
  --name azure-to-onprem \
  --vnet-gateway1 vpn-gateway \
  --local-gateway2 onprem-local-gw \
  --shared-key "MyVPNPreSharedKey123!" \
  --location eastus
```

## Step 6: Configure the On-Premises VPN Device

Get the Azure gateway's public IP:

```bash
az network public-ip show \
  --resource-group $RESOURCE_GROUP \
  --name vpngw-pip \
  --query ipAddress --output tsv
```

Use this IP and the pre-shared key to configure your on-premises device. Azure's [VPN device configuration scripts](https://docs.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpn-devices) are available for common vendors (Cisco, Juniper, Palo Alto, etc.).

## Checking Connection Status

```bash
az network vpn-connection show \
  --resource-group $RESOURCE_GROUP \
  --name azure-to-onprem \
  --query '{status:connectionStatus, egress:egressBytesTransferred, ingress:ingressBytesTransferred}'
```

`connectionStatus` should show `Connected` once both ends are configured.

## IKE Policy Customization

```bash
# Create a custom IPsec/IKE policy
az network vpn-connection ipsec-policy add \
  --resource-group $RESOURCE_GROUP \
  --connection-name azure-to-onprem \
  --ike-encryption AES256 \
  --ike-integrity SHA256 \
  --dh-group DHGroup14 \
  --ipsec-encryption AES256 \
  --ipsec-integrity SHA256 \
  --pfs-group PFS2048 \
  --sa-lifetime 27000 \
  --sa-max-size 1024
```

## VPN Gateway SKU Comparison

| SKU | Throughput | Max S2S Tunnels |
|---|---|---|
| VpnGw1 | 650 Mbps | 30 |
| VpnGw2 | 1 Gbps | 30 |
| VpnGw3 | 1.25 Gbps | 30 |
| VpnGw1AZ | 650 Mbps | 30 (zone-redundant) |

For new gateways, use the corresponding AZ SKU (for example, VpnGw1AZ) because new non-AZ VpnGw1-5 gateway creation ended on November 1, 2025.

## Conclusion

Site-to-site VPN requires: GatewaySubnet, VPN gateway, local network gateway (on-premises device), and a VPN connection with a shared key. Gateway provisioning can often take 45 minutes or more. Use RouteBased for modern devices and flexibility with multiple connections; IKEv2 is used by default where applicable.

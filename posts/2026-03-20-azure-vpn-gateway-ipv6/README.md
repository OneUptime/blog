# How to Configure Azure VPN Gateway with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, VPN Gateway, Site-to-Site, Point-to-Site, Dual-Stack

Description: Configure Azure VPN Gateway with IPv6 for site-to-site VPN connections, enabling dual-stack connectivity between Azure VNets and on-premises networks over IPv6.

## Introduction

Azure VPN Gateway supports IPv6 in a dual-stack configuration for both site-to-site (S2S) and point-to-site (P2S) VPN connections. IPv6 in dual stack for Azure VPN Gateway is currently in preview and requires subscription opt-in. For S2S, Azure supports IPv6 as inner traffic through the tunnel, and IPv6 inner traffic is supported only with IKEv2. For P2S, you can assign IPv6 addresses to VPN clients from a custom IPv6 address pool when using OpenVPN or IKEv2. This enables IPv6 connectivity extension from on-premises networks into Azure virtual networks.

Before you start, send your subscription ID to `vpngwipv6preview@microsoft.com` to enable the preview for your subscription.

## Create Dual-Stack VPN Gateway

```bash
RG="rg-vpn"
LOCATION="eastus"

az group create \
    --name "$RG" \
    --location "$LOCATION"

# VNet and GatewaySubnet with IPv4 + IPv6 address spaces
az network vnet create \
    --resource-group "$RG" \
    --name vnet-vpn \
    --location "$LOCATION" \
    --address-prefixes "10.1.0.0/16" "fd:0:1::/48"

# GatewaySubnet should be /27 or larger for most VPN Gateway SKUs
az network vnet subnet create \
    --resource-group "$RG" \
    --vnet-name vnet-vpn \
    --name GatewaySubnet \
    --address-prefixes "10.1.0.0/27" "fd:0:1:e::/64"

# Create IPv4 public IP for VPN gateway.
# IPv6 public IPs aren't supported for VPN Gateways.
az network public-ip create \
    --resource-group "$RG" \
    --name pip-vpngw \
    --location "$LOCATION" \
    --version IPv4 \
    --sku Standard \
    --allocation-method Static

# Create dual-stack VPN Gateway for IPv4 + IPv6 inner traffic
az network vnet-gateway create \
    --resource-group "$RG" \
    --name vpngw-dualstack \
    --location "$LOCATION" \
    --vnet vnet-vpn \
    --public-ip-addresses pip-vpngw \
    --gateway-type Vpn \
    --vpn-type RouteBased \
    --sku VpnGw2 \
    --no-wait

echo "VPN Gateway creation started (takes 45 minutes or more)..."
az network vnet-gateway wait \
    --resource-group "$RG" \
    --name vpngw-dualstack \
    --created
```

## Terraform VPN Gateway with IPv6

```hcl
# vpn_gateway_ipv6.tf

resource "azurerm_public_ip" "vpngw_ipv4" {
  name                = "pip-vpngw"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv4"
}

resource "azurerm_virtual_network_gateway" "main" {
  name                = "vpngw-dualstack"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  type     = "Vpn"
  vpn_type = "RouteBased"
  sku      = "VpnGw2"
  generation = "Generation2"

  active_active = false
  bgp_enabled   = false

  # VPN Gateway public IP is IPv4; IPv6 is supported only for inner traffic.
  ip_configuration {
    name                          = "ipconfig"
    public_ip_address_id          = azurerm_public_ip.vpngw_ipv4.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }

  # Point-to-site with IPv4 + IPv6 client address pools
  vpn_client_configuration {
    address_space = ["172.16.0.0/24", "fd:0:10::/64"]

    vpn_client_protocols = ["OpenVPN"]

    aad_tenant   = "https://login.microsoftonline.com/${var.tenant_id}"
    aad_audience = "c632b3df-fb67-4d84-bdcf-b95ad541b5c8"
    aad_issuer   = "https://sts.windows.net/${var.tenant_id}/"
  }
}

# Site-to-site connection with dual-stack address spaces
resource "azurerm_local_network_gateway" "onprem" {
  name                = "lgw-onprem"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  gateway_address = "203.0.113.1"  # On-premises public IPv4 address

  address_space = [
    "192.168.0.0/24",    # On-premises IPv4
    "fd:0:2::/48",       # On-premises IPv6
  ]
}

resource "azurerm_virtual_network_gateway_connection" "s2s" {
  name                = "conn-s2s"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  type                            = "IPsec"
  virtual_network_gateway_id      = azurerm_virtual_network_gateway.main.id
  local_network_gateway_id        = azurerm_local_network_gateway.onprem.id
  connection_protocol             = "IKEv2"
  shared_key                      = var.vpn_shared_key
}
```

## Verify VPN Gateway IPv6

```bash
# Get the VPN gateway public IP
az network public-ip show \
    --resource-group "$RG" \
    --name pip-vpngw \
    --query "{name:name, ipAddress:ipAddress}"

# If you created a site-to-site connection named conn-s2s, check its status
az network vpn-connection show \
    --resource-group "$RG" \
    --name conn-s2s \
    --query "{provisioningState:provisioningState, connectionStatus:connectionStatus}"
```

## Conclusion

Azure VPN Gateway dual-stack lets you route IPv6 traffic through both S2S and P2S connections, but the feature is currently in preview and IPv6 is supported only as inner traffic. Use IPv4 public IPs for the gateway. For S2S connections, add IPv6 address spaces to the local network gateway and use IKEv2. For P2S, add an IPv6 address pool in the VPN client configuration and use OpenVPN or IKEv2. The example here uses VpnGw2, but IPv6 preview is available for new deployments on VpnGw1-5 and VpnGw1AZ-5AZ SKUs.

# How to Configure Azure VPN Gateway with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure VPN, Azure, Networking, Site-to-Site VPN, Infrastructure as Code

Description: Learn how to configure Azure VPN Gateway using OpenTofu - setting up virtual network gateways, local network gateways, and VPN connections for site-to-site connectivity.

## Introduction

Azure VPN Gateway connects on-premises networks or other clouds to Azure virtual networks via IPsec/IKE tunnels. OpenTofu manages the `azurerm_virtual_network_gateway` (Azure endpoint), `azurerm_local_network_gateway` (on-premises definition), and `azurerm_virtual_network_gateway_connection` (the tunnel).

## GatewaySubnet

```hcl
# Azure requires a subnet named exactly "GatewaySubnet"

resource "azurerm_subnet" "gateway" {
  name                 = "GatewaySubnet"   # Must be exactly this name
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.255.0/27"]  # /27 or larger required
}
```

## Public IP for VPN Gateway

```hcl
resource "azurerm_public_ip" "vpn" {
  name                = "${var.environment}-vpn-pip"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]  # Zone-redundant

  tags = { Environment = var.environment }
}

# For active-active configuration, second public IP
resource "azurerm_public_ip" "vpn2" {
  count               = var.vpn_active_active ? 1 : 0
  name                = "${var.environment}-vpn-pip2"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
}
```

## Virtual Network Gateway

```hcl
resource "azurerm_virtual_network_gateway" "vpn" {
  name                = "${var.environment}-vng"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  type     = "Vpn"
  vpn_type = "RouteBased"
  sku      = var.vpn_sku  # "VpnGw1", "VpnGw2", "VpnGw3", "VpnGw1AZ"

  active_active = var.vpn_active_active
  bgp_enabled   = true

  bgp_settings {
    asn = 65515  # Azure default ASN
  }

  ip_configuration {
    name                          = "vnetGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.vpn.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }

  dynamic "ip_configuration" {
    for_each = var.vpn_active_active ? [1] : []
    content {
      name                          = "vnetGatewayConfig2"
      public_ip_address_id          = azurerm_public_ip.vpn2[0].id
      private_ip_address_allocation = "Dynamic"
      subnet_id                     = azurerm_subnet.gateway.id
    }
  }

  tags = { Environment = var.environment }
}
```

## Local Network Gateway (On-Premises)

```hcl
resource "azurerm_local_network_gateway" "on_prem" {
  name                = "on-prem-lng"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  gateway_address     = var.on_prem_public_ip

  # On-premises address spaces
  address_space = var.on_prem_address_spaces  # ["192.168.0.0/16", "172.16.0.0/12"]

  bgp_settings {
    asn                 = var.on_prem_bgp_asn  # Your on-premises ASN
    bgp_peering_address = var.on_prem_bgp_ip
  }

  tags = { Environment = var.environment }
}
```

## VPN Connection

```hcl
resource "azurerm_virtual_network_gateway_connection" "to_on_prem" {
  name                = "to-on-prem"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  type                = "IPsec"

  virtual_network_gateway_id = azurerm_virtual_network_gateway.vpn.id
  local_network_gateway_id   = azurerm_local_network_gateway.on_prem.id

  shared_key = var.vpn_psk

  bgp_enabled = true

  ipsec_policy {
    ike_encryption    = "AES256"
    ike_integrity     = "SHA256"
    dh_group          = "DHGroup14"
    ipsec_encryption  = "AES256"
    ipsec_integrity   = "SHA256"
    pfs_group         = "PFS14"
    sa_lifetime       = 27000
    sa_datasize       = 102400000
  }

  tags = { Environment = var.environment }
}
```

## Monitoring

```hcl
resource "azurerm_monitor_metric_alert" "vpn_disconnect" {
  name                = "${var.environment}-vpn-tunnel-disconnected"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_virtual_network_gateway.vpn.id]
  severity            = 2

  criteria {
    metric_namespace = "Microsoft.Network/virtualNetworkGateways"
    metric_name      = "TunnelAverageBandwidth"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 1000  # Less than 1 Kbps = disconnected
  }

  action {
    action_group_id = azurerm_monitor_action_group.alerts.id
  }
}
```

## Outputs

```hcl
output "vpn_gateway_public_ip" {
  value = azurerm_public_ip.vpn.ip_address
}

output "vpn_gateway_bgp_asn" {
  value = azurerm_virtual_network_gateway.vpn.bgp_settings[0].asn
}

output "vpn_gateway_bgp_peering_address" {
  value = azurerm_virtual_network_gateway.vpn.bgp_settings[0].peering_addresses[0].default_addresses[0]
}
```

## Conclusion

Azure VPN Gateway with OpenTofu requires a GatewaySubnet (exactly that name), a public IP, the virtual network gateway, a local network gateway for each on-premises site, and a connection resource. The VpnGw1AZ SKU provides zone-redundant deployment for production. Enable BGP for dynamic routing - it exchanges routes automatically as your on-premises network changes. Use active-active mode for higher availability in critical connections.

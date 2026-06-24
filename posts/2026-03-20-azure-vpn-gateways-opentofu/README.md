# How to Create Azure VPN Gateways with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, VPN Gateway, Networking, Hybrid Cloud, Infrastructure as Code

Description: Learn how to create Azure VPN Gateways for site-to-site and point-to-site connectivity using OpenTofu.

## Introduction

Azure VPN Gateway connects your Azure VNets to on-premises networks or other VNets over encrypted IPSec/IKE tunnels. OpenTofu manages gateway resources, local network gateways, and connections as code.

## Creating the Gateway Subnet

A VPN Gateway requires a dedicated subnet named `GatewaySubnet`.

```hcl
resource "azurerm_subnet" "gateway" {
  name                 = "GatewaySubnet"  # this name is required by Azure
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.255.0/27"]  # /27 or larger is required for non-Basic SKUs
}
```

## Creating a Public IP for the Gateway

```hcl
resource "azurerm_public_ip" "vpn_gateway" {
  name                = "pip-vpn-gateway-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
}
```

## Creating the VPN Gateway

```hcl
resource "azurerm_virtual_network_gateway" "main" {
  name                = "vpn-gateway-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  type     = "Vpn"
  vpn_type = "RouteBased"

  # SKU determines throughput and features
  # Basic, VpnGw1-VpnGw5 (and AZ variants)
  sku            = "VpnGw1"
  generation     = "Generation1"

  active_active = false
  bgp_enabled   = false

  ip_configuration {
    name                          = "vnetGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.vpn_gateway.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Local Network Gateway (On-Premises)

```hcl
resource "azurerm_local_network_gateway" "onprem" {
  name                = "lng-onprem"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  gateway_address = var.onprem_public_ip
  address_space   = [var.onprem_cidr]
}
```

## Creating the VPN Connection

```hcl
resource "azurerm_virtual_network_gateway_connection" "site_to_site" {
  name                = "conn-onprem-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  type                       = "IPsec"
  virtual_network_gateway_id = azurerm_virtual_network_gateway.main.id
  local_network_gateway_id   = azurerm_local_network_gateway.onprem.id

  shared_key = var.vpn_shared_key  # pre-shared key (PSK)

  ipsec_policy {
    ike_encryption   = "AES256"
    ike_integrity    = "SHA256"
    dh_group         = "DHGroup14"
    ipsec_encryption = "AES256"
    ipsec_integrity  = "SHA256"
    pfs_group        = "PFS2048"
    sa_lifetime      = 27000
  }
}
```

## Variables and Outputs

```hcl
variable "environment"       { type = string }
variable "onprem_public_ip"  { type = string }
variable "onprem_cidr"       { type = string }
variable "vpn_shared_key" {
  type      = string
  sensitive = true
}

output "gateway_public_ip" {
  value = azurerm_public_ip.vpn_gateway.ip_address
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure VPN Gateways enable encrypted connectivity between Azure VNets and on-premises networks. OpenTofu manages the gateway, public IP, local network gateway, and connection configuration - making hybrid connectivity reproducible and version controlled.

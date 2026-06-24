# How to Create Azure Point-to-Site VPN with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, VPN, Point-to-Site, Remote Access, Infrastructure as Code

Description: Learn how to configure Azure Point-to-Site VPN for individual remote user access to Azure VNets using certificate or Azure AD authentication with OpenTofu.

## Introduction

Azure Point-to-Site (P2S) VPN allows individual computers to connect to your Azure VNet without requiring a physical VPN device. OpenTofu manages the VPN Gateway P2S configuration with certificate or Microsoft Entra ID authentication.

## Creating the VPN Gateway with P2S

```hcl
resource "azurerm_virtual_network_gateway" "p2s" {
  name                = "vpn-gw-p2s-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  type     = "Vpn"
  vpn_type = "RouteBased"
  sku      = "VpnGw1"

  active_active = false
  bgp_enabled   = false

  ip_configuration {
    name                          = "p2sGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.p2s_gateway.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }

  # Point-to-Site VPN configuration
  vpn_client_configuration {
    # Address pool for VPN clients (must not overlap with VNet or on-premises)
    address_space = ["172.16.0.0/24"]

    # VPN protocols
    vpn_client_protocols = ["OpenVPN", "IkeV2"]

    # Certificate-based authentication
    root_certificate {
      name             = "P2SRootCert"
      public_cert_data = var.vpn_root_certificate_public_data
    }
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Microsoft Entra ID Authentication for P2S

Use this gateway configuration instead of the certificate-based example above when you want Microsoft Entra ID authentication.

```hcl
resource "azurerm_virtual_network_gateway" "p2s_aad" {
  name                = "vpn-gw-p2s-aad-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  type                = "Vpn"
  vpn_type            = "RouteBased"
  sku                 = "VpnGw1"

  ip_configuration {
    name                          = "config"
    public_ip_address_id          = azurerm_public_ip.p2s_gateway.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }

  vpn_client_configuration {
    address_space        = ["172.16.0.0/24"]
    vpn_client_protocols = ["OpenVPN"]

    aad_tenant   = "https://login.microsoftonline.com/${var.tenant_id}"
    aad_audience = "c632b3df-fb67-4d84-bdcf-b95ad541b5c8"  # Microsoft-registered Azure VPN Client app ID (Azure Public)
    aad_issuer   = "https://sts.windows.net/${var.tenant_id}/"
  }
}
```

## Generating a Self-Signed Root Certificate

You can use OpenSSL to generate a test root certificate. Each VPN client also needs a client certificate signed by this root certificate.

```bash
# Generate root CA key and certificate

openssl genrsa -out root-ca.key 4096
openssl req -new -x509 -days 1826 -key root-ca.key \
  -subj "/CN=P2S Root CA" -out root-ca.crt

# Export public key in base64 for OpenTofu variable
openssl x509 -in root-ca.crt -outform der | base64 -w 0 > root-ca.b64
```

## Supporting Resources

```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-vpn-${var.environment}"
  location = var.location
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-main"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "gateway" {
  name                 = "GatewaySubnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.255.0/27"]
}

resource "azurerm_public_ip" "p2s_gateway" {
  name                = "pip-p2s-gw"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure Point-to-Site VPN enables secure remote access for individual users. OpenTofu manages the VPN Gateway P2S configuration including client address pools, protocol selection, and either certificate or Microsoft Entra ID authentication - all as version-controlled infrastructure code.

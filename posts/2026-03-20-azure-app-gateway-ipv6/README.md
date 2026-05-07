# How to Configure Azure Application Gateway with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Application Gateway, WAF, Load Balancer, Dual-Stack

Description: Configure Azure Application Gateway v2 with dual-stack frontend IPs to accept IPv6 client connections, enable WAF for IPv6 traffic, and route to IPv4 backends.

## Introduction

Azure Application Gateway v2 supports dual-stack configuration with both IPv4 and IPv6 frontend IP configurations. This enables IPv6 clients to connect to web applications while backends can remain IPv4-only. The Application Gateway also integrates with WAF (Web Application Firewall), which applies managed protection to both IPv4 and IPv6 traffic, though some IPv6 WAF custom rule match conditions remain unsupported.

## Create Dual-Stack Application Gateway

```bash
RG="rg-appgw"
LOCATION="eastus"

az group create \
    --name "$RG" \
    --location "$LOCATION"

# Create VNet with a dedicated dual-stack Application Gateway subnet (/24 is recommended for v2)

az network vnet create \
    --resource-group "$RG" \
    --name vnet-appgw \
    --address-prefixes "10.0.0.0/16" "fd00:db8:deca::/48" \
    --subnet-name subnet-appgw \
    --subnet-prefixes "10.0.0.0/24" "fd00:db8:deca:1::/64" \
    --location "$LOCATION"

# Create IPv6 public IP for Application Gateway frontend
az network public-ip create \
    --resource-group "$RG" \
    --name pip-appgw-ipv6 \
    --version IPv6 \
    --sku Standard \
    --allocation-method Static \
    --location "$LOCATION"

az network public-ip create \
    --resource-group "$RG" \
    --name pip-appgw-ipv4 \
    --version IPv4 \
    --sku Standard \
    --allocation-method Static \
    --location "$LOCATION"
```

## Terraform Application Gateway with IPv6

```hcl
# app_gateway_ipv6.tf

resource "azurerm_application_gateway" "main" {
  name                = "appgw-dualstack"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "appgw-ip-config"
    subnet_id = azurerm_subnet.appgw.id
  }

  # IPv4 frontend
  frontend_ip_configuration {
    name                 = "frontend-ipv4"
    public_ip_address_id = azurerm_public_ip.appgw_ipv4.id
  }

  # IPv6 frontend
  frontend_ip_configuration {
    name                 = "frontend-ipv6"
    public_ip_address_id = azurerm_public_ip.appgw_ipv6.id
  }

  frontend_port {
    name = "port-80"
    port = 80
  }

  # Backend pool (IPv4 backends)
  backend_address_pool {
    name         = "backend-pool"
    ip_addresses = ["10.0.1.10", "10.0.1.11"]
  }

  backend_http_settings {
    name                  = "http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 60
  }

  # IPv4 HTTP listener
  http_listener {
    name                           = "listener-ipv4-http"
    frontend_ip_configuration_name = "frontend-ipv4"
    frontend_port_name             = "port-80"
    protocol                       = "Http"
  }

  # IPv6 HTTP listener
  http_listener {
    name                           = "listener-ipv6-http"
    frontend_ip_configuration_name = "frontend-ipv6"
    frontend_port_name             = "port-80"
    protocol                       = "Http"
  }

  # Routing rules for IPv4
  request_routing_rule {
    name                       = "rule-ipv4"
    rule_type                  = "Basic"
    http_listener_name         = "listener-ipv4-http"
    backend_address_pool_name  = "backend-pool"
    backend_http_settings_name = "http-settings"
    priority                   = 100
  }

  # Routing rules for IPv6 (same backend pool)
  request_routing_rule {
    name                       = "rule-ipv6"
    rule_type                  = "Basic"
    http_listener_name         = "listener-ipv6-http"
    backend_address_pool_name  = "backend-pool"
    backend_http_settings_name = "http-settings"
    priority                   = 200
  }

  # WAF configuration applies to IPv4 and IPv6 client traffic
  waf_configuration {
    enabled          = true
    firewall_mode    = "Prevention"
    rule_set_type    = "OWASP"
    rule_set_version = "3.2"
  }

  tags = { Name = "appgw-dualstack" }
}
```

## Test Application Gateway IPv6

```bash
# Get IPv6 frontend address
IPV6_ADDR=$(az network public-ip show \
    --resource-group "$RG" \
    --name pip-appgw-ipv6 \
    --query "ipAddress" \
    --output text)

echo "Application Gateway IPv6: $IPV6_ADDR"

# Test HTTP over IPv6
curl -6 "http://[${IPV6_ADDR}]/"

# Check WAF is blocking a malicious IPv6 request (expect HTTP 403)
curl -6 -i "http://[${IPV6_ADDR}]/admin.php?id=1%20OR%201=1"
```

## Conclusion

Azure Application Gateway v2 supports dual-stack by adding both IPv4 and IPv6 frontend IP configurations with separate HTTP listeners. Create both IPv4 and IPv6 public IPs (Standard SKU, Static allocation) and configure a listener for each frontend IP. WAF applies to both IPv4 and IPv6 client traffic, but some IPv6 custom rule match conditions remain unsupported. The Application Gateway subnet must support IPv6 by having an IPv6 CIDR block assigned - ensure the VNet and subnet have IPv6 address spaces configured before deploying the gateway.

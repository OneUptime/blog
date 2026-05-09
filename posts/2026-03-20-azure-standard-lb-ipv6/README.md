# How to Configure Azure Standard Load Balancer with IPv6 Frontend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Standard Load Balancer, Dual-Stack, Cloud, Terraform

Description: A guide to configuring Azure Standard Load Balancer with an IPv6 frontend IP configuration for dual-stack load balancing in Azure Virtual Networks.

Azure Standard Load Balancer supports dual-stack configurations with both IPv4 and IPv6 frontend IP addresses. This guide covers configuring an IPv6 frontend alongside an IPv4 frontend to serve both types of clients.

## Azure IPv6 Load Balancer Architecture

Azure's approach requires:
- IPv6 frontend IP configuration on the load balancer
- dual-stack VNet, subnet, and backend NIC IP configurations
- separate IPv4 and IPv6 backend pool associations and load balancing rules

## Terraform Configuration

```hcl
# Virtual Network with IPv6

resource "azurerm_virtual_network" "main" {
  name                = "main-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16", "fd00::/48"]
}

# Subnet with IPv6
resource "azurerm_subnet" "main" {
  name                 = "main-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24", "fd00:0:0:1::/64"]
}

# Public IP for IPv4 frontend
resource "azurerm_public_ip" "lb_ipv4" {
  name                = "lb-ipv4-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv4"
}

# Public IP for IPv6 frontend
resource "azurerm_public_ip" "lb_ipv6" {
  name                = "lb-ipv6-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv6"
}

# Standard Load Balancer
resource "azurerm_lb" "main" {
  name                = "main-lb"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"

  # IPv4 Frontend
  frontend_ip_configuration {
    name                 = "frontend-ipv4"
    public_ip_address_id = azurerm_public_ip.lb_ipv4.id
  }

  # IPv6 Frontend
  frontend_ip_configuration {
    name                 = "frontend-ipv6"
    public_ip_address_id = azurerm_public_ip.lb_ipv6.id
  }
}

# Backend pool for IPv4 NIC configurations
resource "azurerm_lb_backend_address_pool" "ipv4" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "main-backend-pool-ipv4"
}

# Backend pool for IPv6 NIC configurations
resource "azurerm_lb_backend_address_pool" "ipv6" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "main-backend-pool-ipv6"
}

# IPv4 Load Balancing Rule
resource "azurerm_lb_rule" "http_ipv4" {
  loadbalancer_id                = azurerm_lb.main.id
  name                           = "http-ipv4"
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "frontend-ipv4"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.ipv4.id]
  probe_id                       = azurerm_lb_probe.http.id
}

# IPv6 Load Balancing Rule
resource "azurerm_lb_rule" "http_ipv6" {
  loadbalancer_id                = azurerm_lb.main.id
  name                           = "http-ipv6"
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "frontend-ipv6"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.ipv6.id]
  probe_id                       = azurerm_lb_probe.http.id
}

# Health probe
resource "azurerm_lb_probe" "http" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "http-probe"
  port            = 80
  protocol        = "Http"
  request_path    = "/health"
}
```

## Azure CLI Configuration

```bash
# Create IPv6 public IP
az network public-ip create \
  --name lb-ipv6-pip \
  --resource-group main-rg \
  --sku Standard \
  --version IPv6

# Add IPv6 frontend to an existing dual-stack-ready LB
az network lb frontend-ip create \
  --resource-group main-rg \
  --lb-name main-lb \
  --name frontend-ipv6 \
  --public-ip-address lb-ipv6-pip

# Add IPv6 backend pool for IPv6 NIC configurations
az network lb address-pool create \
  --resource-group main-rg \
  --lb-name main-lb \
  --name main-backend-pool-ipv6

# Add IPv6 health probe
az network lb probe create \
  --resource-group main-rg \
  --lb-name main-lb \
  --name http-ipv6-probe \
  --protocol http \
  --port 80 \
  --path /health

# Add IPv6 load balancing rule
az network lb rule create \
  --resource-group main-rg \
  --lb-name main-lb \
  --name http-ipv6-rule \
  --protocol tcp \
  --frontend-port 80 \
  --backend-port 80 \
  --frontend-ip-name frontend-ipv6 \
  --backend-pool-name main-backend-pool-ipv6 \
  --probe-name http-ipv6-probe
```

## Verifying Azure IPv6 LB

```bash
# Get IPv6 public IP
az network public-ip show \
  --name lb-ipv6-pip \
  --resource-group main-rg \
  --query ipAddress -o tsv

# Test IPv6 connectivity
curl -6 http://[<IPv6-address>]/

# Check DNS record
dig AAAA your-domain.com
```

Azure Standard Load Balancer supports parallel IPv4 and IPv6 frontend configurations, enabling dual-stack connectivity when the backend network and pool associations are configured for both IP versions.

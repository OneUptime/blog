# How to Configure Azure Load Balancer for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Load Balancer, Dual-Stack, Standard Load Balancer, Cloud

Description: Configure Azure Standard Load Balancer with IPv6 frontend configurations, load balancing rules, and backend pool to enable dual-stack load balancing for applications.

## Introduction

Azure Standard Load Balancer supports dual-stack (IPv4 + IPv6) configuration through multiple frontend IP configurations. You create one frontend for IPv4 (Standard public IP) and one for IPv6 (Standard public IP with IPv6), then define separate load balancing rules and backend pools for each. Backend VMs must have IPv4 and IPv6 IP configurations on their NICs to receive traffic on both protocols, and dual-stack deployments need an active Network Security Group for IPv6 health probes to function.

## Create Standard Load Balancer with IPv6

```bash
RG="rg-ipv6-lb"
LOCATION="eastus"

az group create --name "$RG" --location "$LOCATION"

# Create IPv6 public IP

az network public-ip create \
    --resource-group "$RG" \
    --name pip-ipv6-frontend \
    --allocation-method Static \
    --version IPv6 \
    --sku Standard \
    --tier Regional

# Create IPv4 public IP
az network public-ip create \
    --resource-group "$RG" \
    --name pip-ipv4-frontend \
    --allocation-method Static \
    --version IPv4 \
    --sku Standard

# Create Standard Load Balancer
az network lb create \
    --resource-group "$RG" \
    --name lb-dualstack \
    --sku Standard \
    --frontend-ip-name frontend-ipv4 \
    --public-ip-address pip-ipv4-frontend

# Add IPv6 frontend configuration
az network lb frontend-ip create \
    --resource-group "$RG" \
    --lb-name lb-dualstack \
    --name frontend-ipv6 \
    --public-ip-address pip-ipv6-frontend

# Create IPv4 backend pool
az network lb address-pool create \
    --resource-group "$RG" \
    --lb-name lb-dualstack \
    --name backendpool-ipv4

# Create IPv6 backend pool
az network lb address-pool create \
    --resource-group "$RG" \
    --lb-name lb-dualstack \
    --name backendpool-ipv6

# Create health probe
az network lb probe create \
    --resource-group "$RG" \
    --lb-name lb-dualstack \
    --name health-probe \
    --protocol tcp \
    --port 80

# Add IPv4 load balancing rule
az network lb rule create \
    --resource-group "$RG" \
    --lb-name lb-dualstack \
    --name rule-http-ipv4 \
    --protocol tcp \
    --frontend-port 80 \
    --backend-port 80 \
    --frontend-ip-name frontend-ipv4 \
    --backend-pool-name backendpool-ipv4 \
    --probe-name health-probe

# Add IPv6 load balancing rule
az network lb rule create \
    --resource-group "$RG" \
    --lb-name lb-dualstack \
    --name rule-http-ipv6 \
    --protocol tcp \
    --frontend-port 80 \
    --backend-port 80 \
    --frontend-ip-name frontend-ipv6 \
    --backend-pool-name backendpool-ipv6 \
    --probe-name health-probe
```

## Terraform Azure Load Balancer with IPv6

```hcl
# azure_lb_ipv6.tf

resource "azurerm_public_ip" "lb_ipv4" {
  name                = "pip-lb-ipv4"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv4"
}

resource "azurerm_public_ip" "lb_ipv6" {
  name                = "pip-lb-ipv6"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  ip_version          = "IPv6"
}

resource "azurerm_lb" "main" {
  name                = "lb-dualstack"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"

  # IPv4 frontend
  frontend_ip_configuration {
    name                 = "frontend-ipv4"
    public_ip_address_id = azurerm_public_ip.lb_ipv4.id
  }

  # IPv6 frontend
  frontend_ip_configuration {
    name                 = "frontend-ipv6"
    public_ip_address_id = azurerm_public_ip.lb_ipv6.id
  }
}

resource "azurerm_lb_backend_address_pool" "ipv4" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "backend-pool-ipv4"
}

resource "azurerm_lb_backend_address_pool" "ipv6" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "backend-pool-ipv6"
}

resource "azurerm_lb_probe" "http" {
  loadbalancer_id = azurerm_lb.main.id
  name            = "http-probe"
  protocol        = "Tcp"
  port            = 80
}

# IPv4 load balancing rule
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

# IPv6 load balancing rule
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
```

## Add VMs to Backend Pool with IPv6 NICs

```bash
VNET="vnet-dualstack"
SUBNET="subnet-dualstack"

# The NIC's primary IPv4 IP configuration should already be in backendpool-ipv4
az network nic ip-config create \
    --resource-group "$RG" \
    --nic-name vm-nic-1 \
    --name ipv6-config \
    --vnet-name "$VNET" \
    --subnet "$SUBNET" \
    --private-ip-address-version IPv6 \
    --lb-name lb-dualstack \
    --lb-address-pools backendpool-ipv6
```

## Conclusion

Azure Standard Load Balancer supports dual-stack IPv6 through multiple frontend IP configurations. Create separate frontend configurations, load balancing rules, and backend pools for IPv4 and IPv6 traffic. Backend VMs need dual-stack NIC configurations with both IPv4 and IPv6 private IP addresses, and an active Network Security Group is required for IPv6 health probes to function. Use Standard Load Balancer for new deployments; Basic Load Balancer was retired on September 30, 2025. After configuration, verify with `curl -6 http://[IPv6-public-ip]/` from an external IPv6 client.

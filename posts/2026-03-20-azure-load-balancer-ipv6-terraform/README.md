# How to Configure Azure Load Balancer IPv6 with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, IPv6, Load Balancer, Dual-Stack, Networking

Description: A guide to creating an Azure Standard Load Balancer with IPv6 frontend IP configurations and dual-stack backend pools using Terraform.

Azure Standard Load Balancer supports dual-stack configurations with separate IPv4 and IPv6 frontend IP addresses. Backend pool members (VMs) must also have IPv6 private addresses configured on their NICs to receive IPv6 traffic. In dual-stack deployments, keep a Network Security Group associated with the subnet or NIC so Standard public load balancer inbound traffic and IPv6 health probes can function correctly.

## Step 1: Create Public IPs for the Load Balancer

```hcl
# public-ips.tf

resource "azurerm_public_ip" "lb_ipv4" {
  name                = "pip-lb-ipv4"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku               = "Standard"
  ip_version        = "IPv4"
  allocation_method = "Static"
}

resource "azurerm_public_ip" "lb_ipv6" {
  name                = "pip-lb-ipv6"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku               = "Standard"
  ip_version        = "IPv6"
  allocation_method = "Static"
}
```

## Step 2: Create the Standard Load Balancer

```hcl
# lb.tf - Azure Standard Load Balancer with dual-stack frontends
resource "azurerm_lb" "main" {
  name                = "lb-dual-stack"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  # Standard SKU is the supported option for new Azure Load Balancer deployments
  sku = "Standard"

  # IPv4 frontend configuration
  frontend_ip_configuration {
    name                 = "frontend-ipv4"
    public_ip_address_id = azurerm_public_ip.lb_ipv4.id
  }

  # IPv6 frontend configuration
  frontend_ip_configuration {
    name                 = "frontend-ipv6"
    public_ip_address_id = azurerm_public_ip.lb_ipv6.id
  }
}
```

## Step 3: Create Backend Address Pools

```hcl
# backend-pools.tf - Separate backend pools for IPv4 and IPv6
resource "azurerm_lb_backend_address_pool" "ipv4" {
  name            = "backend-ipv4"
  loadbalancer_id = azurerm_lb.main.id
}

resource "azurerm_lb_backend_address_pool" "ipv6" {
  name            = "backend-ipv6"
  loadbalancer_id = azurerm_lb.main.id
}
```

## Step 4: Create Load Balancing Rules

```hcl
# lb-rules.tf - HTTP load balancing rules for IPv4 and IPv6
resource "azurerm_lb_rule" "http_ipv4" {
  name                           = "http-rule-ipv4"
  loadbalancer_id                = azurerm_lb.main.id
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "frontend-ipv4"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.ipv4.id]
  probe_id                       = azurerm_lb_probe.http.id
}

resource "azurerm_lb_rule" "http_ipv6" {
  name                           = "http-rule-ipv6"
  loadbalancer_id                = azurerm_lb.main.id
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "frontend-ipv6"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.ipv6.id]
  probe_id                       = azurerm_lb_probe.http.id
}

# Health probe (shared between IPv4 and IPv6 rules)
resource "azurerm_lb_probe" "http" {
  name            = "http-probe"
  loadbalancer_id = azurerm_lb.main.id
  protocol        = "Http"
  port            = 80
  request_path    = "/health"
}
```

## Step 5: Associate VM NICs with Both Backend Pools

```hcl
# backend-association.tf - Associate NICs with both backend pools
resource "azurerm_network_interface_backend_address_pool_association" "ipv4" {
  count                   = length(azurerm_network_interface.vm)
  network_interface_id    = azurerm_network_interface.vm[count.index].id
  ip_configuration_name   = "ipv4"
  backend_address_pool_id = azurerm_lb_backend_address_pool.ipv4.id
}

resource "azurerm_network_interface_backend_address_pool_association" "ipv6" {
  count                   = length(azurerm_network_interface.vm)
  network_interface_id    = azurerm_network_interface.vm[count.index].id
  ip_configuration_name   = "ipv6"
  backend_address_pool_id = azurerm_lb_backend_address_pool.ipv6.id
}
```

## Step 6: Test the Load Balancer

```bash
terraform apply

# Get the IPv6 public IP used by the frontend configuration
LB_IPV6=$(az network public-ip show \
  --name pip-lb-ipv6 \
  --resource-group rg-main \
  --query ipAddress -o tsv)

# Test HTTP over IPv6
curl -6 "http://[$LB_IPV6]/health"
```

Azure Standard Load Balancer with dual-stack frontends enables organizations to serve both IPv4 and IPv6 clients from a single load balancer resource, reducing infrastructure complexity during IPv6 migration.

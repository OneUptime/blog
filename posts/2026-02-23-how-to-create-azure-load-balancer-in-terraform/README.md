# How to Create Azure Load Balancer in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Load Balancer, Networking, Infrastructure as Code, High Availability

Description: Learn how to create and configure Azure Load Balancer in Terraform with frontend IPs, backend pools, health probes, and load balancing rules.

---

Azure Load Balancer distributes incoming network traffic across multiple backend resources. It operates at Layer 4 (TCP/UDP) and provides high availability by routing traffic only to healthy instances. When defined in Terraform, your load balancing configuration becomes repeatable and easy to modify as your architecture evolves.

This guide walks through creating both public and internal load balancers in Terraform, including frontend configurations, backend pools, health probes, load balancing rules, and NAT rules.

## Provider Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Base Infrastructure

```hcl
# main.tf
resource "azurerm_resource_group" "lb" {
  name     = "rg-loadbalancer-production"
  location = "East US"
}

# Virtual network for backend resources
resource "azurerm_virtual_network" "main" {
  name                = "vnet-production"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.lb.location
  resource_group_name = azurerm_resource_group.lb.name
}

# Subnet for backend VMs
resource "azurerm_subnet" "backend" {
  name                 = "snet-backend"
  resource_group_name  = azurerm_resource_group.lb.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}
```

## Public Load Balancer

A public load balancer distributes internet-facing traffic to your backend resources.

```hcl
# public-lb.tf
# Public IP for the load balancer frontend
resource "azurerm_public_ip" "lb" {
  name                = "pip-lb-frontend"
  location            = azurerm_resource_group.lb.location
  resource_group_name = azurerm_resource_group.lb.name
  allocation_method   = "Static"
  sku                 = "Standard"  # Standard SKU required for Standard LB
  zones               = ["1", "2", "3"]  # Zone-redundant

  tags = {
    environment = "production"
  }
}

# The load balancer resource
resource "azurerm_lb" "public" {
  name                = "lb-public-production"
  location            = azurerm_resource_group.lb.location
  resource_group_name = azurerm_resource_group.lb.name
  sku                 = "Standard"  # Standard supports availability zones and more features

  # Frontend IP configuration
  frontend_ip_configuration {
    name                 = "frontend-public"
    public_ip_address_id = azurerm_public_ip.lb.id
  }

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}

# Backend address pool - where traffic gets sent
resource "azurerm_lb_backend_address_pool" "web" {
  loadbalancer_id = azurerm_lb.public.id
  name            = "backend-web-servers"
}

# Health probe - checks if backends are healthy
resource "azurerm_lb_probe" "http" {
  loadbalancer_id     = azurerm_lb.public.id
  name                = "probe-http"
  protocol            = "Http"
  port                = 80
  request_path        = "/health"
  interval_in_seconds = 15
  number_of_probes    = 2  # Mark unhealthy after 2 failed probes
}

# HTTPS health probe
resource "azurerm_lb_probe" "https" {
  loadbalancer_id     = azurerm_lb.public.id
  name                = "probe-https"
  protocol            = "Https"
  port                = 443
  request_path        = "/health"
  interval_in_seconds = 15
  number_of_probes    = 2
}

# Load balancing rule for HTTP traffic
resource "azurerm_lb_rule" "http" {
  loadbalancer_id                = azurerm_lb.public.id
  name                           = "rule-http"
  protocol                       = "Tcp"
  frontend_port                  = 80
  backend_port                   = 80
  frontend_ip_configuration_name = "frontend-public"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.web.id]
  probe_id                       = azurerm_lb_probe.http.id
  idle_timeout_in_minutes        = 4
  enable_tcp_reset               = true
  disable_outbound_snat          = true  # Use outbound rules instead
}

# Load balancing rule for HTTPS traffic
resource "azurerm_lb_rule" "https" {
  loadbalancer_id                = azurerm_lb.public.id
  name                           = "rule-https"
  protocol                       = "Tcp"
  frontend_port                  = 443
  backend_port                   = 443
  frontend_ip_configuration_name = "frontend-public"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.web.id]
  probe_id                       = azurerm_lb_probe.https.id
  idle_timeout_in_minutes        = 4
  enable_tcp_reset               = true
  disable_outbound_snat          = true
}
```

## Outbound Rules

Standard Load Balancer requires explicit outbound rules for internet-bound traffic from backend instances.

```hcl
# outbound.tf
# Public IP for outbound traffic (separate from inbound)
resource "azurerm_public_ip" "outbound" {
  name                = "pip-lb-outbound"
  location            = azurerm_resource_group.lb.location
  resource_group_name = azurerm_resource_group.lb.name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]
}

# Outbound rule for backend instances to reach the internet
resource "azurerm_lb_outbound_rule" "main" {
  loadbalancer_id         = azurerm_lb.public.id
  name                    = "outbound-rule"
  protocol                = "All"
  backend_address_pool_id = azurerm_lb_backend_address_pool.web.id

  frontend_ip_configuration {
    name = "frontend-public"
  }

  allocated_outbound_ports = 1024  # Ports per instance
  idle_timeout_in_minutes  = 4
}
```

## Internal Load Balancer

An internal load balancer distributes traffic within a VNet. Useful for multi-tier architectures.

```hcl
# internal-lb.tf
# Subnet for internal load balancer
resource "azurerm_subnet" "internal_lb" {
  name                 = "snet-internal-lb"
  resource_group_name  = azurerm_resource_group.lb.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]
}

# Internal load balancer
resource "azurerm_lb" "internal" {
  name                = "lb-internal-production"
  location            = azurerm_resource_group.lb.location
  resource_group_name = azurerm_resource_group.lb.name
  sku                 = "Standard"

  # Frontend with a private IP from the subnet
  frontend_ip_configuration {
    name                          = "frontend-internal"
    subnet_id                     = azurerm_subnet.internal_lb.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.2.10"
    zones                         = ["1", "2", "3"]
  }

  tags = {
    environment = "production"
    tier        = "backend"
  }
}

# Backend pool for API servers
resource "azurerm_lb_backend_address_pool" "api" {
  loadbalancer_id = azurerm_lb.internal.id
  name            = "backend-api-servers"
}

# Health probe for the API
resource "azurerm_lb_probe" "api" {
  loadbalancer_id     = azurerm_lb.internal.id
  name                = "probe-api"
  protocol            = "Http"
  port                = 8080
  request_path        = "/api/health"
  interval_in_seconds = 10
  number_of_probes    = 3
}

# Rule to forward traffic to API servers
resource "azurerm_lb_rule" "api" {
  loadbalancer_id                = azurerm_lb.internal.id
  name                           = "rule-api"
  protocol                       = "Tcp"
  frontend_port                  = 8080
  backend_port                   = 8080
  frontend_ip_configuration_name = "frontend-internal"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.api.id]
  probe_id                       = azurerm_lb_probe.api.id
  idle_timeout_in_minutes        = 4
  enable_tcp_reset               = true
  enable_floating_ip             = false
}
```

## NAT Rules for Direct Access

Inbound NAT rules let you reach specific backend instances through port mapping.

```hcl
# nat-rules.tf
# NAT rule for SSH access to a specific backend instance
resource "azurerm_lb_nat_rule" "ssh_vm1" {
  loadbalancer_id                = azurerm_lb.public.id
  resource_group_name            = azurerm_resource_group.lb.name
  name                           = "ssh-vm1"
  protocol                       = "Tcp"
  frontend_port                  = 50001  # External port
  backend_port                   = 22     # SSH port on the VM
  frontend_ip_configuration_name = "frontend-public"
}

resource "azurerm_lb_nat_rule" "ssh_vm2" {
  loadbalancer_id                = azurerm_lb.public.id
  resource_group_name            = azurerm_resource_group.lb.name
  name                           = "ssh-vm2"
  protocol                       = "Tcp"
  frontend_port                  = 50002
  backend_port                   = 22
  frontend_ip_configuration_name = "frontend-public"
}
```

## Outputs

```hcl
# outputs.tf
output "public_lb_ip" {
  value       = azurerm_public_ip.lb.ip_address
  description = "Public IP address of the load balancer"
}

output "internal_lb_ip" {
  value       = azurerm_lb.internal.frontend_ip_configuration[0].private_ip_address
  description = "Private IP address of the internal load balancer"
}

output "backend_pool_ids" {
  value = {
    web = azurerm_lb_backend_address_pool.web.id
    api = azurerm_lb_backend_address_pool.api.id
  }
  description = "Backend address pool IDs for associating with NICs or VMSS"
}
```

## Standard vs Basic SKU

Always use the Standard SKU for production workloads. Here is why:

- **Standard** supports availability zones, multiple frontend IPs, outbound rules, and has a 99.99% SLA.
- **Basic** does not support zones, has fewer features, and a lower SLA.
- Basic is being retired. Microsoft recommends Standard for all new deployments.

## Deployment

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

After deployment, associate VM network interfaces or Virtual Machine Scale Sets with the backend address pool to start receiving traffic. The load balancer will begin health checking and routing traffic automatically once backends are registered and healthy.

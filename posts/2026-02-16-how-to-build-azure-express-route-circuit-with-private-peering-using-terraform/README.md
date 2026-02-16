# How to Build Azure Express Route Circuit with Private Peering Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, ExpressRoute, Terraform, Networking, Private Peering, Hybrid Cloud, Infrastructure as Code

Description: A complete guide to provisioning Azure ExpressRoute circuits with private peering configuration using Terraform for dedicated hybrid cloud connectivity.

---

Azure ExpressRoute provides a private, dedicated connection between your on-premises network and Azure. Unlike a VPN that goes over the public internet, ExpressRoute runs through a connectivity provider's network, giving you higher bandwidth, lower latency, and more predictable performance. Private peering is the most common configuration, enabling your on-premises resources to communicate directly with Azure virtual networks.

Provisioning ExpressRoute with Terraform requires coordinating between your Terraform configuration and your connectivity provider. Terraform handles the Azure side (the circuit, peering, and VNet gateway), while the provider handles the physical connection. This post covers the full Terraform setup.

## ExpressRoute Architecture

The deployment creates these components:

```mermaid
graph LR
    A[On-Premises Network] -->|Dedicated Connection| B[Connectivity Provider]
    B -->|ExpressRoute Circuit| C[Microsoft Edge Router]
    C -->|Private Peering| D[ExpressRoute Gateway]
    D -->|Connected to| E[Virtual Network]
    E --> F[Azure VMs and Services]
```

The ExpressRoute circuit is the logical representation of the physical connection. Private peering creates a BGP session between your network and Azure, exchanging routes for your VNet address spaces.

## Provider and Variables

```hcl
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

variable "location" {
  type    = string
  default = "eastus2"
}

variable "environment" {
  type    = string
  default = "prod"
}

# ExpressRoute circuit parameters
variable "service_provider_name" {
  type        = string
  description = "The name of the ExpressRoute connectivity provider"
  # Examples: "Equinix", "AT&T", "Megaport", "Verizon"
}

variable "peering_location" {
  type        = string
  description = "The peering location - must match the provider's available locations"
  # Examples: "Washington DC", "Silicon Valley", "London"
}

variable "bandwidth_in_mbps" {
  type        = number
  default     = 1000   # 1 Gbps
  description = "Circuit bandwidth in Mbps. Common values: 50, 100, 200, 500, 1000, 2000, 5000, 10000"
}

# BGP peering configuration
variable "primary_peer_subnet" {
  type        = string
  default     = "172.16.0.0/30"
  description = "Primary peer-to-peer /30 subnet for BGP peering"
}

variable "secondary_peer_subnet" {
  type        = string
  default     = "172.16.0.4/30"
  description = "Secondary peer-to-peer /30 subnet for BGP peering"
}

variable "vlan_id" {
  type        = number
  default     = 100
  description = "VLAN ID for the private peering"
}

variable "peer_asn" {
  type        = number
  description = "Your on-premises BGP ASN"
}

variable "shared_key" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Optional MD5 hash for BGP authentication"
}

locals {
  name_prefix = "er-${var.environment}"
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Service     = "expressroute"
  }
}
```

## Resource Group and ExpressRoute Circuit

The circuit is the first resource to create. After creation, you share the service key with your connectivity provider so they can provision the physical connection on their side.

```hcl
# Resource group for ExpressRoute resources
resource "azurerm_resource_group" "er" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = local.tags
}

# ExpressRoute Circuit
resource "azurerm_express_route_circuit" "main" {
  name                  = "erc-${local.name_prefix}"
  resource_group_name   = azurerm_resource_group.er.name
  location              = azurerm_resource_group.er.location
  service_provider_name = var.service_provider_name
  peering_location      = var.peering_location
  bandwidth_in_mbps     = var.bandwidth_in_mbps

  sku {
    tier   = "Standard"    # Standard or Premium (Premium for global reach and more routes)
    family = "MeteredData" # MeteredData or UnlimitedData
  }

  # Allow classic operations for hybrid environments
  allow_classic_operations = false

  tags = local.tags
}
```

After creating the circuit, Terraform outputs the service key. You need to give this key to your connectivity provider. The provider uses it to establish the physical connection. This is an out-of-band step that happens outside of Terraform.

```bash
# After terraform apply, get the service key
terraform output express_route_service_key
# Share this key with your connectivity provider
```

## Private Peering Configuration

Once the connectivity provider has provisioned the circuit (the circuit status changes to "Provisioned"), you can configure private peering. Private peering sets up BGP sessions for routing between your on-premises network and Azure VNets.

```hcl
# Private Peering configuration
resource "azurerm_express_route_circuit_peering" "private" {
  peering_type                  = "AzurePrivatePeering"
  express_route_circuit_name    = azurerm_express_route_circuit.main.name
  resource_group_name           = azurerm_resource_group.er.name

  # BGP peering addresses - /30 subnets for point-to-point links
  primary_peer_address_prefix   = var.primary_peer_subnet     # e.g., 172.16.0.0/30
  secondary_peer_address_prefix = var.secondary_peer_subnet   # e.g., 172.16.0.4/30

  # VLAN ID for the peering (agreed upon with your provider)
  vlan_id = var.vlan_id

  # Your on-premises BGP ASN
  peer_asn = var.peer_asn

  # Optional: MD5 authentication for the BGP session
  shared_key = var.shared_key != "" ? var.shared_key : null
}
```

The `/30` subnets provide exactly two usable addresses each - one for the Azure router and one for your on-premises router. Azure always uses the first usable address in the range and your router uses the second.

For example, with `172.16.0.0/30`:
- Azure router: 172.16.0.1
- Your router: 172.16.0.2
- Network address: 172.16.0.0
- Broadcast: 172.16.0.3

## Virtual Network and Gateway

To connect Azure VNets to the ExpressRoute circuit, you need an ExpressRoute Gateway in a GatewaySubnet.

```hcl
# Virtual Network that will be connected via ExpressRoute
resource "azurerm_virtual_network" "main" {
  name                = "vnet-${local.name_prefix}"
  location            = azurerm_resource_group.er.location
  resource_group_name = azurerm_resource_group.er.name
  address_space       = ["10.0.0.0/16"]
  tags                = local.tags
}

# GatewaySubnet - must be named exactly "GatewaySubnet"
resource "azurerm_subnet" "gateway" {
  name                 = "GatewaySubnet"   # This name is mandatory
  resource_group_name  = azurerm_resource_group.er.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.255.0/27"]   # /27 is the minimum recommended size
}

# Workload subnet
resource "azurerm_subnet" "workload" {
  name                 = "snet-workload"
  resource_group_name  = azurerm_resource_group.er.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Public IP for the ExpressRoute Gateway
resource "azurerm_public_ip" "gw" {
  name                = "pip-ergw-${local.name_prefix}"
  location            = azurerm_resource_group.er.location
  resource_group_name = azurerm_resource_group.er.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.tags
}

# ExpressRoute Gateway
resource "azurerm_virtual_network_gateway" "er" {
  name                = "ergw-${local.name_prefix}"
  location            = azurerm_resource_group.er.location
  resource_group_name = azurerm_resource_group.er.name

  type = "ExpressRoute"   # Not "Vpn" - this is specifically for ExpressRoute

  # Gateway SKU - determines throughput and features
  # ErGw1AZ: Up to 1 Gbps, zone-redundant
  # ErGw2AZ: Up to 2 Gbps, zone-redundant
  # ErGw3AZ: Up to 10 Gbps, zone-redundant
  sku = "ErGw2AZ"

  ip_configuration {
    name                          = "gw-ipconfig"
    public_ip_address_id          = azurerm_public_ip.gw.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }

  tags = local.tags
}
```

The gateway SKU matters significantly for throughput:

- **ErGw1AZ** - Up to 1 Gbps, good for general workloads
- **ErGw2AZ** - Up to 2 Gbps, recommended for production
- **ErGw3AZ** - Up to 10 Gbps, for high-throughput scenarios

The `AZ` suffix means the gateway is zone-redundant, which you want for production.

## Connecting the Gateway to the Circuit

The connection resource links the ExpressRoute Gateway to the ExpressRoute circuit.

```hcl
# Connection between the Gateway and the ExpressRoute Circuit
resource "azurerm_virtual_network_gateway_connection" "er" {
  name                = "conn-er-${local.name_prefix}"
  location            = azurerm_resource_group.er.location
  resource_group_name = azurerm_resource_group.er.name

  type                       = "ExpressRoute"
  virtual_network_gateway_id = azurerm_virtual_network_gateway.er.id
  express_route_circuit_id   = azurerm_express_route_circuit.main.id

  # Enable FastPath for high-throughput scenarios (requires ErGw3AZ or Ultra Performance)
  # express_route_gateway_bypass = true

  tags = local.tags
}
```

## Route Filters (Optional)

If you use Microsoft peering in addition to private peering, route filters control which Microsoft services' routes are advertised to your network.

```hcl
# Route filter for Microsoft peering (optional)
resource "azurerm_route_filter" "main" {
  name                = "rf-${local.name_prefix}"
  resource_group_name = azurerm_resource_group.er.name
  location            = azurerm_resource_group.er.location

  rule {
    name        = "allow-azure-services"
    access      = "Allow"
    rule_type   = "Community"
    communities = [
      "12076:5040",    # Azure Storage
      "12076:5100",    # Azure SQL
    ]
  }

  tags = local.tags
}
```

## Monitoring and Diagnostics

ExpressRoute circuits should be monitored for BGP session status, bandwidth utilization, and errors.

```hcl
# Log Analytics workspace for ExpressRoute monitoring
resource "azurerm_log_analytics_workspace" "er" {
  name                = "log-${local.name_prefix}"
  location            = azurerm_resource_group.er.location
  resource_group_name = azurerm_resource_group.er.name
  sku                 = "PerGB2018"
  retention_in_days   = 90   # Longer retention for network forensics
  tags                = local.tags
}

# Diagnostic settings for the ExpressRoute circuit
resource "azurerm_monitor_diagnostic_setting" "circuit" {
  name                       = "er-circuit-diagnostics"
  target_resource_id         = azurerm_express_route_circuit.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.er.id

  enabled_log {
    category = "PeeringRouteLog"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Diagnostic settings for the gateway
resource "azurerm_monitor_diagnostic_setting" "gateway" {
  name                       = "er-gateway-diagnostics"
  target_resource_id         = azurerm_virtual_network_gateway.er.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.er.id

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Outputs

```hcl
output "express_route_service_key" {
  value       = azurerm_express_route_circuit.main.service_key
  sensitive   = true
  description = "Service key to share with the connectivity provider"
}

output "circuit_id" {
  value       = azurerm_express_route_circuit.main.id
  description = "ExpressRoute circuit resource ID"
}

output "gateway_id" {
  value       = azurerm_virtual_network_gateway.er.id
  description = "ExpressRoute Gateway resource ID"
}

output "vnet_id" {
  value       = azurerm_virtual_network.main.id
  description = "Virtual Network ID connected via ExpressRoute"
}
```

## Deployment Workflow

ExpressRoute deployment is a multi-step process that involves both Terraform and your connectivity provider.

```bash
# Step 1: Deploy the circuit
terraform apply -target=azurerm_express_route_circuit.main

# Step 2: Share the service key with your provider
terraform output -raw express_route_service_key
# Provider provisions the physical connection (can take days to weeks)

# Step 3: Once the circuit shows "Provisioned", deploy the rest
terraform apply
```

## Wrapping Up

ExpressRoute with private peering in Terraform gives you a code-managed dedicated connection between on-premises and Azure. The key steps are creating the circuit, sharing the service key with your connectivity provider, configuring private peering after the circuit is provisioned, and linking it to your VNet through an ExpressRoute Gateway. The Terraform configuration handles the Azure side cleanly, but remember that the provider provisioning step happens outside of Terraform and can take days to complete.

# How to Create Azure Virtual WAN in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Virtual WAN, Networking, Infrastructure as Code, Hub-and-Spoke

Description: Learn how to provision Azure Virtual WAN with Terraform, including virtual hubs, VNet connections, VPN sites, and routing configuration for enterprise networking.

---

Azure Virtual WAN is a networking service that brings together many networking, security, and routing functionalities into a single operational interface. It provides a hub-and-spoke architecture at scale, connecting your branch offices, remote users, and Azure virtual networks through Microsoft's global backbone network.

If you are managing a network that spans multiple Azure regions with connections to on-premises sites and remote users, Virtual WAN simplifies what would otherwise be a complex web of VPN gateways, peering connections, and route tables. Managing this through Terraform gives you a single source of truth for your entire network topology.

## When Virtual WAN Makes Sense

Virtual WAN is designed for organizations that need:

- Connectivity between multiple branch offices and Azure
- Multiple Azure regions connected together
- Centralized routing and security policies
- Integration with SD-WAN devices
- Point-to-site VPN for remote workers at scale

If you have a single VNet or a simple hub-and-spoke that does not need branch connectivity, standard VNet peering and VPN gateways might be simpler and cheaper.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access (Network Contributor at minimum)
- Azure CLI authenticated

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.3.0"

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

## Creating a Virtual WAN

```hcl
resource "azurerm_resource_group" "networking" {
  name     = "rg-networking-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Create the Virtual WAN resource
resource "azurerm_virtual_wan" "main" {
  name                = "vwan-prod-001"
  resource_group_name = azurerm_resource_group.networking.name
  location            = azurerm_resource_group.networking.location

  # Type: Basic or Standard
  # Standard supports VPN, ExpressRoute, and User VPN gateways
  # Basic only supports site-to-site VPN
  type = "Standard"

  # Allow traffic between VNets connected to different hubs
  allow_branch_to_branch_traffic = true

  # Disable VPN encryption (only for testing, keep true in production)
  disable_vpn_encryption = false

  tags = {
    Environment = "Production"
  }
}
```

## Creating Virtual Hubs

Virtual Hubs are the regional connection points within your Virtual WAN:

```hcl
# East US hub
resource "azurerm_virtual_hub" "eastus" {
  name                = "vhub-eastus-prod"
  resource_group_name = azurerm_resource_group.networking.name
  location            = "eastus"
  virtual_wan_id      = azurerm_virtual_wan.main.id

  # Hub address space - must not overlap with connected VNets
  address_prefix = "10.100.0.0/23"

  # Hub routing preference
  hub_routing_preference = "VpnGateway"

  tags = {
    Environment = "Production"
    Region      = "EastUS"
  }
}

# West US hub for multi-region connectivity
resource "azurerm_virtual_hub" "westus" {
  name                = "vhub-westus-prod"
  resource_group_name = azurerm_resource_group.networking.name
  location            = "westus2"
  virtual_wan_id      = azurerm_virtual_wan.main.id

  address_prefix = "10.101.0.0/23"

  tags = {
    Environment = "Production"
    Region      = "WestUS2"
  }
}
```

## Connecting Virtual Networks to Hubs

```hcl
# Spoke VNet in East US
resource "azurerm_virtual_network" "workload_eastus" {
  name                = "vnet-workload-eastus-prod"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.networking.name
  address_space       = ["10.10.0.0/16"]

  tags = {
    Environment = "Production"
  }
}

resource "azurerm_subnet" "workload_eastus" {
  name                 = "snet-workload"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.workload_eastus.name
  address_prefixes     = ["10.10.1.0/24"]
}

# Spoke VNet in West US
resource "azurerm_virtual_network" "workload_westus" {
  name                = "vnet-workload-westus-prod"
  location            = "westus2"
  resource_group_name = azurerm_resource_group.networking.name
  address_space       = ["10.20.0.0/16"]

  tags = {
    Environment = "Production"
  }
}

# Connect East US VNet to the East US hub
resource "azurerm_virtual_hub_connection" "workload_eastus" {
  name                      = "conn-workload-eastus"
  virtual_hub_id            = azurerm_virtual_hub.eastus.id
  remote_virtual_network_id = azurerm_virtual_network.workload_eastus.id

  # Enable internet security (routes internet traffic through the hub)
  internet_security_enabled = true
}

# Connect West US VNet to the West US hub
resource "azurerm_virtual_hub_connection" "workload_westus" {
  name                      = "conn-workload-westus"
  virtual_hub_id            = azurerm_virtual_hub.westus.id
  remote_virtual_network_id = azurerm_virtual_network.workload_westus.id

  internet_security_enabled = true
}
```

## Adding a VPN Gateway to the Hub

```hcl
# VPN Gateway in the East US hub for branch connectivity
resource "azurerm_vpn_gateway" "eastus" {
  name                = "vpngw-eastus-prod"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.networking.name
  virtual_hub_id      = azurerm_virtual_hub.eastus.id

  # Scale units determine throughput (1 unit = 500 Mbps)
  scale_unit = 1

  # BGP settings are automatically configured
  bgp_settings {
    asn         = 65515
    peer_weight = 0
  }

  tags = {
    Environment = "Production"
  }
}
```

## Configuring VPN Sites (Branch Offices)

```hcl
# Define a branch office VPN site
resource "azurerm_vpn_site" "branch_nyc" {
  name                = "vpnsite-branch-nyc"
  resource_group_name = azurerm_resource_group.networking.name
  location            = "eastus"
  virtual_wan_id      = azurerm_virtual_wan.main.id

  # Branch office details
  address_cidrs = ["192.168.1.0/24"]

  link {
    name       = "link-primary"
    ip_address = "203.0.113.10" # Public IP of the branch VPN device

    bgp {
      asn             = 65010
      peering_address = "192.168.1.1"
    }

    speed_in_mbps = 100
    provider_name = "ISP-Primary"
  }

  link {
    name       = "link-secondary"
    ip_address = "203.0.113.20" # Secondary link for redundancy

    speed_in_mbps = 50
    provider_name = "ISP-Secondary"
  }

  tags = {
    Branch   = "NYC"
    Location = "New York"
  }
}

# Connect the VPN site to the hub gateway
resource "azurerm_vpn_gateway_connection" "branch_nyc" {
  name               = "conn-branch-nyc"
  vpn_gateway_id     = azurerm_vpn_gateway.eastus.id
  remote_vpn_site_id = azurerm_vpn_site.branch_nyc.id

  vpn_link {
    name             = "link-primary"
    vpn_site_link_id = azurerm_vpn_site.branch_nyc.link[0].id

    # Bandwidth in Mbps allocated to this link
    bandwidth_mbps = 100

    # IPsec policy (optional - defaults are usually fine)
    ipsec_policy {
      dh_group                 = "DHGroup14"
      ike_encryption_algorithm = "AES256"
      ike_integrity_algorithm  = "SHA256"
      encryption_algorithm     = "AES256"
      integrity_algorithm      = "SHA256"
      pfs_group                = "PFS14"
      sa_data_size_in_kilobytes = 102400000
      sa_lifetime_in_seconds   = 3600
    }

    bgp_enabled  = true
    protocol     = "IKEv2"
  }
}
```

## Hub Route Tables

Custom route tables let you control traffic flow within the Virtual WAN:

```hcl
# Custom route table for isolating workloads
resource "azurerm_virtual_hub_route_table" "isolated" {
  name           = "rt-isolated"
  virtual_hub_id = azurerm_virtual_hub.eastus.id

  labels = ["isolated"]

  route {
    name              = "to-firewall"
    destinations_type = "CIDR"
    destinations      = ["0.0.0.0/0"]
    next_hop_type     = "ResourceId"
    next_hop          = azurerm_firewall.hub.id # If using Azure Firewall in the hub
  }
}
```

## Monitoring

```hcl
# Log Analytics for Virtual WAN monitoring
resource "azurerm_log_analytics_workspace" "networking" {
  name                = "law-networking-prod"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Diagnostic settings for the VPN Gateway
resource "azurerm_monitor_diagnostic_setting" "vpn_gateway" {
  name                       = "diag-vpngw-to-law"
  target_resource_id         = azurerm_vpn_gateway.eastus.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.networking.id

  enabled_log {
    category = "GatewayDiagnosticLog"
  }

  enabled_log {
    category = "TunnelDiagnosticLog"
  }

  enabled_log {
    category = "RouteDiagnosticLog"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Outputs

```hcl
output "virtual_wan_id" {
  description = "Virtual WAN resource ID"
  value       = azurerm_virtual_wan.main.id
}

output "hub_eastus_id" {
  description = "East US hub ID"
  value       = azurerm_virtual_hub.eastus.id
}

output "hub_westus_id" {
  description = "West US hub ID"
  value       = azurerm_virtual_hub.westus.id
}

output "vpn_gateway_id" {
  description = "VPN Gateway ID in East US hub"
  value       = azurerm_vpn_gateway.eastus.id
}
```

## Best Practices

**Use Standard type for production.** The Basic type only supports site-to-site VPN. Standard supports all gateway types including ExpressRoute, Point-to-Site VPN, and inter-hub transit.

**Plan your address spaces carefully.** Hub address prefixes, spoke VNet ranges, and on-premises networks must not overlap. Document your IP address plan before writing any Terraform code.

**Enable branch-to-branch traffic.** This allows branches connected to different hubs to communicate through the Microsoft backbone, which is faster and more reliable than routing through the public internet.

**Use BGP when possible.** BGP enables dynamic route exchange with your branch devices. This means routes update automatically when you add or remove networks, rather than requiring manual static route changes.

**Monitor tunnel health.** Set up alerts on VPN tunnel connectivity status and throughput. A dropped tunnel should trigger an immediate notification.

## Conclusion

Azure Virtual WAN with Terraform gives you a declarative way to build enterprise-scale network topologies. From single-hub setups to multi-region architectures with branch connectivity, the Terraform resources cover the full Virtual WAN feature set. The key is planning your address spaces and connectivity requirements upfront, then letting Terraform handle the provisioning and configuration of all the moving parts.

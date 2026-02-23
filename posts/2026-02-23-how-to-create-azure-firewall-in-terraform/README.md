# How to Create Azure Firewall in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Firewall, Network Security, Infrastructure as Code, Zero Trust

Description: A complete guide to deploying Azure Firewall with Terraform, including firewall policies, rule collections, DNAT rules, threat intelligence, and premium features.

---

Azure Firewall is a cloud-native, managed network security service that protects your Azure Virtual Network resources. It is a fully stateful firewall as a service with built-in high availability and unrestricted cloud scalability. Unlike NSGs that work at the network interface level, Azure Firewall provides centralized network and application-level filtering, threat intelligence-based blocking, TLS inspection, and URL filtering.

If you are building a hub-and-spoke network architecture, Azure Firewall typically sits in the hub VNet and inspects all traffic flowing between spokes, to the internet, and from on-premises networks. Managing this through Terraform is the right call because firewall rules tend to grow over time and become difficult to manage through the portal.

## Azure Firewall SKUs

Azure Firewall comes in three tiers:

- **Basic** - for small environments with throughput up to 250 Mbps
- **Standard** - L3-L7 filtering, threat intelligence, fixed public IP
- **Premium** - adds TLS inspection, IDPS, URL filtering, and web categories

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
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

## Creating Azure Firewall with a Policy

```hcl
resource "azurerm_resource_group" "firewall" {
  name     = "rg-firewall-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Hub virtual network
resource "azurerm_virtual_network" "hub" {
  name                = "vnet-hub-prod"
  location            = azurerm_resource_group.firewall.location
  resource_group_name = azurerm_resource_group.firewall.name
  address_space       = ["10.0.0.0/16"]

  tags = {
    Environment = "Production"
  }
}

# Firewall requires a dedicated subnet named exactly "AzureFirewallSubnet"
# Minimum size is /26
resource "azurerm_subnet" "firewall" {
  name                 = "AzureFirewallSubnet"
  resource_group_name  = azurerm_resource_group.firewall.name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = ["10.0.0.0/26"]
}

# Management subnet (required for forced tunneling configurations)
resource "azurerm_subnet" "firewall_management" {
  name                 = "AzureFirewallManagementSubnet"
  resource_group_name  = azurerm_resource_group.firewall.name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = ["10.0.0.64/26"]
}

# Public IP for the firewall
resource "azurerm_public_ip" "firewall" {
  name                = "pip-firewall-prod"
  location            = azurerm_resource_group.firewall.location
  resource_group_name = azurerm_resource_group.firewall.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = {
    Environment = "Production"
  }
}

# Firewall Policy (recommended over classic rules)
resource "azurerm_firewall_policy" "main" {
  name                = "fwp-prod-001"
  resource_group_name = azurerm_resource_group.firewall.name
  location            = azurerm_resource_group.firewall.location

  # Standard SKU
  sku = "Standard"

  # DNS settings
  dns {
    proxy_enabled = true
    servers       = ["168.63.129.16"] # Azure DNS
  }

  # Threat intelligence mode: Alert, Deny, or Off
  threat_intelligence_mode = "Deny"

  # Allowlist IPs/FQDNs from threat intelligence
  threat_intelligence_allowlist {
    fqdns        = []
    ip_addresses = []
  }

  tags = {
    Environment = "Production"
  }
}

# Create the Azure Firewall
resource "azurerm_firewall" "main" {
  name                = "fw-prod-eastus-001"
  location            = azurerm_resource_group.firewall.location
  resource_group_name = azurerm_resource_group.firewall.name

  sku_name = "AZFW_VNet"
  sku_tier = "Standard"

  # Link to the firewall policy
  firewall_policy_id = azurerm_firewall_policy.main.id

  ip_configuration {
    name                 = "fw-ip-config"
    subnet_id            = azurerm_subnet.firewall.id
    public_ip_address_id = azurerm_public_ip.firewall.id
  }

  tags = {
    Environment = "Production"
  }
}
```

## Creating Rule Collection Groups

Firewall policies use rule collection groups to organize rules. Groups have a priority that determines processing order:

```hcl
# Rule collection group for network rules
resource "azurerm_firewall_policy_rule_collection_group" "network" {
  name               = "rcg-network-rules"
  firewall_policy_id = azurerm_firewall_policy.main.id
  priority           = 200

  # Network rule collection - allow outbound DNS
  network_rule_collection {
    name     = "allow-dns"
    priority = 100
    action   = "Allow"

    rule {
      name                  = "dns-udp"
      protocols             = ["UDP"]
      source_addresses      = ["10.0.0.0/8"]
      destination_addresses = ["168.63.129.16"]
      destination_ports     = ["53"]
    }

    rule {
      name                  = "dns-tcp"
      protocols             = ["TCP"]
      source_addresses      = ["10.0.0.0/8"]
      destination_addresses = ["168.63.129.16"]
      destination_ports     = ["53"]
    }
  }

  # Network rule collection - allow outbound NTP
  network_rule_collection {
    name     = "allow-ntp"
    priority = 110
    action   = "Allow"

    rule {
      name                  = "ntp"
      protocols             = ["UDP"]
      source_addresses      = ["10.0.0.0/8"]
      destination_addresses = ["*"]
      destination_ports     = ["123"]
    }
  }

  # Network rule collection - allow inter-spoke traffic
  network_rule_collection {
    name     = "allow-spoke-to-spoke"
    priority = 120
    action   = "Allow"

    rule {
      name                  = "spoke1-to-spoke2"
      protocols             = ["Any"]
      source_addresses      = ["10.1.0.0/16"]
      destination_addresses = ["10.2.0.0/16"]
      destination_ports     = ["*"]
    }

    rule {
      name                  = "spoke2-to-spoke1"
      protocols             = ["Any"]
      source_addresses      = ["10.2.0.0/16"]
      destination_addresses = ["10.1.0.0/16"]
      destination_ports     = ["*"]
    }
  }
}

# Rule collection group for application rules
resource "azurerm_firewall_policy_rule_collection_group" "application" {
  name               = "rcg-application-rules"
  firewall_policy_id = azurerm_firewall_policy.main.id
  priority           = 300

  # Application rule collection - allow web access
  application_rule_collection {
    name     = "allow-web"
    priority = 100
    action   = "Allow"

    rule {
      name = "allow-azure-services"
      protocols {
        type = "Https"
        port = 443
      }
      source_addresses  = ["10.0.0.0/8"]
      destination_fqdns = [
        "*.microsoft.com",
        "*.azure.com",
        "*.windows.net",
        "*.windowsupdate.com"
      ]
    }

    rule {
      name = "allow-package-managers"
      protocols {
        type = "Https"
        port = 443
      }
      protocols {
        type = "Http"
        port = 80
      }
      source_addresses  = ["10.0.0.0/8"]
      destination_fqdns = [
        "*.ubuntu.com",
        "*.docker.io",
        "*.docker.com",
        "*.npmjs.org",
        "*.pypi.org"
      ]
    }
  }
}

# Rule collection group for DNAT rules (inbound NAT)
resource "azurerm_firewall_policy_rule_collection_group" "dnat" {
  name               = "rcg-dnat-rules"
  firewall_policy_id = azurerm_firewall_policy.main.id
  priority           = 100

  nat_rule_collection {
    name     = "inbound-web"
    priority = 100
    action   = "Dnat"

    rule {
      name                = "web-server-https"
      protocols           = ["TCP"]
      source_addresses    = ["*"]
      destination_address = azurerm_public_ip.firewall.ip_address
      destination_ports   = ["443"]
      translated_address  = "10.1.1.10" # Internal web server
      translated_port     = "443"
    }

    rule {
      name                = "web-server-http"
      protocols           = ["TCP"]
      source_addresses    = ["*"]
      destination_address = azurerm_public_ip.firewall.ip_address
      destination_ports   = ["80"]
      translated_address  = "10.1.1.10"
      translated_port     = "80"
    }
  }
}
```

## Route Table for Forcing Traffic Through the Firewall

```hcl
# Spoke VNet
resource "azurerm_virtual_network" "spoke1" {
  name                = "vnet-spoke1-prod"
  location            = azurerm_resource_group.firewall.location
  resource_group_name = azurerm_resource_group.firewall.name
  address_space       = ["10.1.0.0/16"]
}

resource "azurerm_subnet" "spoke1_workload" {
  name                 = "snet-workload"
  resource_group_name  = azurerm_resource_group.firewall.name
  virtual_network_name = azurerm_virtual_network.spoke1.name
  address_prefixes     = ["10.1.1.0/24"]
}

# Route table that sends all traffic to the firewall
resource "azurerm_route_table" "spoke1" {
  name                = "rt-spoke1-to-firewall"
  location            = azurerm_resource_group.firewall.location
  resource_group_name = azurerm_resource_group.firewall.name

  # Disable BGP route propagation to ensure traffic goes through firewall
  disable_bgp_route_propagation = true

  # Route all traffic to the firewall
  route {
    name                   = "default-to-firewall"
    address_prefix         = "0.0.0.0/0"
    next_hop_type          = "VirtualAppliance"
    next_hop_in_ip_address = azurerm_firewall.main.ip_configuration[0].private_ip_address
  }

  tags = {
    Environment = "Production"
  }
}

# Associate the route table with the spoke subnet
resource "azurerm_subnet_route_table_association" "spoke1" {
  subnet_id      = azurerm_subnet.spoke1_workload.id
  route_table_id = azurerm_route_table.spoke1.id
}

# Peer the spoke with the hub
resource "azurerm_virtual_network_peering" "spoke1_to_hub" {
  name                      = "peer-spoke1-to-hub"
  resource_group_name       = azurerm_resource_group.firewall.name
  virtual_network_name      = azurerm_virtual_network.spoke1.name
  remote_virtual_network_id = azurerm_virtual_network.hub.id
  allow_forwarded_traffic   = true
  allow_gateway_transit     = false
  use_remote_gateways       = false
}

resource "azurerm_virtual_network_peering" "hub_to_spoke1" {
  name                      = "peer-hub-to-spoke1"
  resource_group_name       = azurerm_resource_group.firewall.name
  virtual_network_name      = azurerm_virtual_network.hub.name
  remote_virtual_network_id = azurerm_virtual_network.spoke1.id
  allow_forwarded_traffic   = true
  allow_gateway_transit     = true
}
```

## Monitoring and Diagnostics

```hcl
resource "azurerm_log_analytics_workspace" "firewall" {
  name                = "law-firewall-prod"
  location            = azurerm_resource_group.firewall.location
  resource_group_name = azurerm_resource_group.firewall.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

# Diagnostic settings for the firewall
resource "azurerm_monitor_diagnostic_setting" "firewall" {
  name                       = "diag-firewall-to-law"
  target_resource_id         = azurerm_firewall.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.firewall.id

  enabled_log {
    category = "AzureFirewallApplicationRule"
  }

  enabled_log {
    category = "AzureFirewallNetworkRule"
  }

  enabled_log {
    category = "AzureFirewallDnsProxy"
  }

  enabled_log {
    category = "AZFWThreatIntel"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Outputs

```hcl
output "firewall_private_ip" {
  description = "Azure Firewall private IP address"
  value       = azurerm_firewall.main.ip_configuration[0].private_ip_address
}

output "firewall_public_ip" {
  description = "Azure Firewall public IP address"
  value       = azurerm_public_ip.firewall.ip_address
}

output "firewall_id" {
  description = "Azure Firewall resource ID"
  value       = azurerm_firewall.main.id
}

output "firewall_policy_id" {
  description = "Firewall policy resource ID"
  value       = azurerm_firewall_policy.main.id
}
```

## Best Practices

**Use Firewall Policies over classic rules.** Firewall policies are the modern approach and support features like rule collection groups, hierarchical policies (parent-child), and integration with Azure Firewall Manager. Classic rules are limited and cannot be mixed with policies.

**Organize rules with clear priorities.** DNAT rules process first (lowest priority number), then network rules, then application rules. Within each group, lower priority numbers process first. Use consistent numbering ranges (e.g., 100-199 for infrastructure, 200-299 for applications).

**Enable DNS proxy.** This allows the firewall to resolve FQDNs in network rules and provides better visibility into DNS queries. Without it, FQDN-based rules in network rule collections will not work.

**Enable threat intelligence in Deny mode.** In production, threat intelligence should actively block traffic to/from known malicious IPs and domains, not just alert on it.

**Log everything.** Firewall logs are essential for security monitoring, troubleshooting, and compliance. Send them to Log Analytics and set up alerts for denied traffic patterns that might indicate misconfigurations or attack attempts.

**Start with deny-all, then add allow rules.** Azure Firewall implicitly denies traffic that does not match any rule. Build your rules by adding specific allow rules rather than relying on broad permissions.

## Conclusion

Azure Firewall with Terraform provides a systematic way to build and manage network security for your Azure environment. From basic traffic filtering to advanced scenarios with DNAT rules, threat intelligence, and hub-and-spoke routing, Terraform handles the full configuration. The key is organizing your rules into logical collection groups, enabling proper diagnostics, and treating your firewall configuration as code that goes through the same review process as application code.

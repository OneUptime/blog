# How to Configure Azure Firewall with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure Firewall, Azure, Networking, Security, Infrastructure as Code

Description: Learn how to deploy and configure Azure Firewall using OpenTofu - including firewall policies, network rules, application rules, and hub-spoke routing integration.

## Introduction

Azure Firewall is a cloud-native stateful firewall for Azure Virtual Networks. OpenTofu manages the firewall instance, firewall policy with rule collections, and the route tables that force spoke traffic through the firewall hub.

## AzureFirewallSubnet

```hcl
# Azure Firewall requires a subnet named exactly "AzureFirewallSubnet"

resource "azurerm_subnet" "firewall" {
  name                 = "AzureFirewallSubnet"   # Must be exactly this
  resource_group_name  = azurerm_resource_group.hub.name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = ["10.0.255.0/26"]  # /26 or larger required
}

# Public IP for Azure Firewall
resource "azurerm_public_ip" "firewall" {
  name                = "${var.environment}-fw-pip"
  resource_group_name = azurerm_resource_group.hub.name
  location            = azurerm_resource_group.hub.location
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]
}
```

## Firewall Policy

```hcl
resource "azurerm_firewall_policy" "main" {
  name                = "${var.environment}-fw-policy"
  resource_group_name = azurerm_resource_group.hub.name
  location            = azurerm_resource_group.hub.location
  sku                 = "Standard"

  threat_intelligence_mode = "Alert"  # Alert or Deny

  dns {
    proxy_enabled = true  # Required for FQDNs in network rules; use the firewall IP as client DNS
  }

  tags = { Environment = var.environment }
}
```

## Network Rule Collection

```hcl
resource "azurerm_firewall_policy_rule_collection_group" "main" {
  name               = "${var.environment}-rules"
  firewall_policy_id = azurerm_firewall_policy.main.id
  priority           = 100

  # Network rules - IP/port based
  network_rule_collection {
    name     = "allow-internal"
    priority = 100
    action   = "Allow"

    rule {
      name                  = "allow-spoke-to-spoke"
      protocols             = ["TCP", "UDP"]
      source_addresses      = ["10.0.0.0/8"]
      destination_addresses = ["10.0.0.0/8"]
      destination_ports     = ["*"]
    }

    rule {
      name                  = "allow-dns"
      protocols             = ["UDP"]
      source_addresses      = ["10.0.0.0/8"]
      destination_addresses = ["*"]
      destination_ports     = ["53"]
    }
  }

  # Application rules - FQDN and FQDN tag based
  application_rule_collection {
    name     = "allow-web"
    priority = 200
    action   = "Allow"

    rule {
      name             = "allow-windows-update"
      source_addresses = ["10.0.0.0/8"]
      destination_fqdn_tags = ["WindowsUpdate"]
      protocols {
        type = "Https"
        port = 443
      }
    }

    rule {
      name             = "allow-azure-services"
      source_addresses = ["10.0.0.0/8"]
      destination_fqdn_tags = [
        "AzureBackup",
        "WindowsVirtualDesktop"
      ]
      protocols {
        type = "Https"
        port = 443
      }
    }
  }

  # NAT rules - for inbound traffic
  nat_rule_collection {
    name     = "inbound-nat"
    priority = 300
    action   = "Dnat"

    rule {
      name                = "rdp-to-jumpbox"
      protocols           = ["TCP"]
      source_addresses    = [var.admin_cidr]
      destination_address = azurerm_public_ip.firewall.ip_address
      destination_ports   = ["3389"]
      translated_address  = var.jumpbox_private_ip
      translated_port     = "3389"
    }
  }
}
```

## Azure Firewall Instance

```hcl
resource "azurerm_firewall" "main" {
  name                = "${var.environment}-firewall"
  resource_group_name = azurerm_resource_group.hub.name
  location            = azurerm_resource_group.hub.location
  sku_name            = "AZFW_VNet"
  sku_tier            = "Standard"  # Basic also requires AzureFirewallManagementSubnet and a management IP config
  firewall_policy_id  = azurerm_firewall_policy.main.id
  zones               = ["1", "2", "3"]

  ip_configuration {
    name                 = "fw-ip-config"
    subnet_id            = azurerm_subnet.firewall.id
    public_ip_address_id = azurerm_public_ip.firewall.id
  }

  tags = { Environment = var.environment }
}
```

## Force Traffic Through Firewall (Route Table)

```hcl
# Route spoke traffic to Azure Firewall
resource "azurerm_route_table" "spoke" {
  name                          = "${var.environment}-spoke-rt"
  resource_group_name           = azurerm_resource_group.spoke.name
  location                      = azurerm_resource_group.spoke.location
  disable_bgp_route_propagation = true

  route {
    name                   = "force-to-firewall"
    address_prefix         = "0.0.0.0/0"
    next_hop_type          = "VirtualAppliance"
    next_hop_in_ip_address = azurerm_firewall.main.ip_configuration[0].private_ip_address
  }
}

resource "azurerm_subnet_route_table_association" "spoke" {
  subnet_id      = azurerm_subnet.spoke_app.id
  route_table_id = azurerm_route_table.spoke.id
}
```

## Outputs

```hcl
output "firewall_private_ip" {
  value = azurerm_firewall.main.ip_configuration[0].private_ip_address
}

output "firewall_public_ip" {
  value = azurerm_public_ip.firewall.ip_address
}
```

## Conclusion

Azure Firewall with OpenTofu requires a dedicated AzureFirewallSubnet, a firewall policy with rule collections, and route tables that force spoke subnet traffic through the firewall's private IP. Use Firewall Policy (rather than classic firewall rules) for centrally managed, hierarchical rule sets. Application rules can use FQDNs directly; enable DNS proxy when you use FQDNs in network rules, and point clients at the firewall for DNS. Use zone-redundant deployment (zones = ["1", "2", "3"]) in availability zone-supported regions for production availability.

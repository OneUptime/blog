# How to Configure Azure Network Security Group Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, NSG, Networking, OpenTofu, Security, Firewall

Description: Learn how to create and configure Azure Network Security Group (NSG) rules with OpenTofu to control inbound and outbound traffic for Azure virtual networks and subnets.

## Overview

Azure Network Security Groups (NSGs) contain a list of security rules that allow or deny inbound and outbound network traffic based on source/destination, port, and protocol. Managing NSGs with OpenTofu ensures your network security rules are version-controlled and consistently applied.

## Step 1: Create an NSG with Rules

```hcl
# main.tf - NSG for a web application tier

resource "azurerm_network_security_group" "web_nsg" {
  name                = "web-tier-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  # Allow HTTPS from the internet
  security_rule {
    name                       = "allow-https-inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  # Allow HTTP (for redirect to HTTPS)
  security_rule {
    name                       = "allow-http-inbound"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  # Deny all other inbound traffic
  security_rule {
    name                       = "deny-all-inbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}
```

## Step 2: Separate NSG Rule Resources

```hcl
# Use azurerm_network_security_rule for individual rule management
resource "azurerm_network_security_group" "app_nsg" {
  name                = "app-tier-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

# Allow traffic from web tier to app tier on port 8080
resource "azurerm_network_security_rule" "web_to_app" {
  name                        = "allow-web-to-app"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "8080"
  source_address_prefix       = "10.0.1.0/24"  # Web tier subnet
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.rg.name
  network_security_group_name = azurerm_network_security_group.app_nsg.name
}
```

## Step 3: Dynamic NSG Rules with for_each

```hcl
# Define rules as a map for dynamic creation
locals {
  inbound_rules = {
    allow-ssh = {
      priority   = 100
      port       = "22"
      source     = "10.0.0.0/8"  # Only allow from corporate network
      access     = "Allow"
    }
    allow-rdp = {
      priority   = 110
      port       = "3389"
      source     = "10.0.0.0/8"
      access     = "Allow"
    }
    deny-public-ssh = {
      priority   = 200
      port       = "22"
      source     = "Internet"
      access     = "Deny"
    }
  }
}

resource "azurerm_network_security_rule" "dynamic_rules" {
  for_each = local.inbound_rules

  name                        = each.key
  priority                    = each.value.priority
  direction                   = "Inbound"
  access                      = each.value.access
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = each.value.port
  source_address_prefix       = each.value.source
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.rg.name
  network_security_group_name = azurerm_network_security_group.app_nsg.name
}
```

## Step 4: Associate NSG with Subnet

```hcl
resource "azurerm_subnet_network_security_group_association" "web_nsg_assoc" {
  subnet_id                 = azurerm_subnet.web_subnet.id
  network_security_group_id = azurerm_network_security_group.web_nsg.id
}
```

## Summary

Azure NSG rules managed with OpenTofu provide declarative network security that's version-controlled and auditable. Using the `for_each` pattern for rules makes it easy to manage large rule sets and helps surface drift from manual portal changes during `plan` and `apply`.

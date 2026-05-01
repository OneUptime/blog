# How to Use Dynamic Blocks for Azure NSG Rules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Azure, NSG, Network Security Group, Dynamic Blocks

Description: Learn how to use dynamic blocks in OpenTofu to generate Azure Network Security Group rules from variable-driven lists, replacing repetitive static rule definitions.

## Introduction

Azure Network Security Groups (NSGs) enforce network access controls through security rules. Each rule requires multiple fields, making static definitions verbose. OpenTofu dynamic blocks let you define NSG rules as a list of objects and generate the rule blocks automatically.

## Basic Dynamic NSG Rule Generation

```hcl
variable "nsg_security_rules" {
  description = "List of security rules for the NSG"
  type = list(object({
    name                       = string
    priority                   = number
    direction                  = string  # Inbound or Outbound
    access                     = string  # Allow or Deny
    protocol                   = string  # Tcp, Udp, Icmp, Esp, Ah, *
    source_port_range          = string
    destination_port_range     = string
    source_address_prefix      = string
    destination_address_prefix = string
    description                = string
  }))
  default = [
    {
      name                       = "allow-https-inbound"
      priority                   = 100
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "443"
      source_address_prefix      = "Internet"
      destination_address_prefix = "VirtualNetwork"
      description                = "Allow HTTPS from Internet"
    },
    {
      name                       = "allow-http-inbound"
      priority                   = 110
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "80"
      source_address_prefix      = "Internet"
      destination_address_prefix = "VirtualNetwork"
      description                = "Allow HTTP for redirect"
    },
    {
      name                       = "deny-all-inbound"
      priority                   = 4096
      direction                  = "Inbound"
      access                     = "Deny"
      protocol                   = "*"
      source_port_range          = "*"
      destination_port_range     = "*"
      source_address_prefix      = "*"
      destination_address_prefix = "*"
      description                = "Deny all other inbound traffic"
    }
  ]
}

resource "azurerm_network_security_group" "app" {
  name                = "app-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Generate one security_rule block for each entry in the variable
  dynamic "security_rule" {
    for_each = var.nsg_security_rules
    content {
      name                       = security_rule.value.name
      priority                   = security_rule.value.priority
      direction                  = security_rule.value.direction
      access                     = security_rule.value.access
      protocol                   = security_rule.value.protocol
      source_port_range          = security_rule.value.source_port_range
      destination_port_range     = security_rule.value.destination_port_range
      source_address_prefix      = security_rule.value.source_address_prefix
      destination_address_prefix = security_rule.value.destination_address_prefix
      description                = security_rule.value.description
    }
  }

  tags = var.tags
}
```

## Per-Tier NSG with Different Rule Sets

In a multi-tier architecture, each tier (web, app, database) needs different rules. Use `for_each` at the resource level combined with dynamic blocks.

```hcl
locals {
  tier_nsg_rules = {
    "web" = [
      { name = "allow-https", priority = 100, direction = "Inbound", access = "Allow",
        protocol = "Tcp", source_port_range = "*", destination_port_range = "443",
        source_address_prefix = "Internet", destination_address_prefix = "*",
        description = "Public HTTPS" }
    ]
    "app" = [
      { name = "allow-from-web", priority = 100, direction = "Inbound", access = "Allow",
        protocol = "Tcp", source_port_range = "*", destination_port_range = "8080",
        source_address_prefix = "10.0.1.0/24", destination_address_prefix = "*",
        description = "Traffic from web tier" }
    ]
    "database" = [
      { name = "allow-from-app", priority = 100, direction = "Inbound", access = "Allow",
        protocol = "Tcp", source_port_range = "*", destination_port_range = "5432",
        source_address_prefix = "10.0.2.0/24", destination_address_prefix = "*",
        description = "PostgreSQL from app tier" }
    ]
  }
}

resource "azurerm_network_security_group" "tier" {
  for_each = local.tier_nsg_rules

  name                = "${each.key}-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  dynamic "security_rule" {
    for_each = each.value
    content {
      name                       = security_rule.value.name
      priority                   = security_rule.value.priority
      direction                  = security_rule.value.direction
      access                     = security_rule.value.access
      protocol                   = security_rule.value.protocol
      source_port_range          = security_rule.value.source_port_range
      destination_port_range     = security_rule.value.destination_port_range
      source_address_prefix      = security_rule.value.source_address_prefix
      destination_address_prefix = security_rule.value.destination_address_prefix
      description                = security_rule.value.description
    }
  }
}
```

## Conclusion

Dynamic blocks for Azure NSGs make security rule management data-driven. Define rules in variables or data files, and the same resource block generates the correct NSG configuration for any number of rules. This approach also makes code reviews clearer - reviewers can focus on the rule data rather than parsing repetitive HCL blocks.

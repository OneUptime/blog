# How to Create IP Whitelisting with Security Groups Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Security Group, IP Whitelisting, OpenTofu, Network Security

Description: Learn how to implement IP whitelisting with AWS Security Groups, Azure NSGs, and GCP firewall rules using OpenTofu for restricting access to specific IP ranges.

## Overview

IP whitelisting restricts service access to known IP ranges. OpenTofu manages network access rules dynamically, supporting CIDR-based rules, prefix list references, and provider-specific targeting features for maintainable, auditable access control.

## Step 1: AWS Security Group with IP Whitelisting

```hcl
# main.tf - Centralized IP whitelist via variables

locals {
  allowed_office_cidrs = ["10.0.0.0/8", "203.0.113.0/24"]
  allowed_vpn_cidrs    = ["198.51.100.0/28"]

  all_allowed_cidrs = concat(local.allowed_office_cidrs, local.allowed_vpn_cidrs)
}

resource "aws_security_group" "whitelisted" {
  name        = "ip-whitelisted"
  vpc_id      = module.vpc.vpc_id
  description = "Allow access from whitelisted IPs only"
}

# Create ingress rules for each CIDR dynamically
resource "aws_vpc_security_group_ingress_rule" "https_whitelist" {
  for_each = toset(local.all_allowed_cidrs)

  security_group_id = aws_security_group.whitelisted.id
  cidr_ipv4         = each.value
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS from ${each.value}"
}
```

## Step 2: AWS Managed Prefix Lists

```hcl
# Managed prefix list for corporate IPs (easier to maintain)
resource "aws_ec2_managed_prefix_list" "corporate" {
  name           = "corporate-ips"
  address_family = "IPv4"
  max_entries    = 50

  dynamic "entry" {
    for_each = local.allowed_office_cidrs

    content {
      cidr        = entry.value
      description = "Corporate IP ${entry.key + 1}"
    }
  }
}

# Reference prefix list in security group (single rule, easy to update)
resource "aws_vpc_security_group_ingress_rule" "from_corporate_pl" {
  security_group_id    = aws_security_group.whitelisted.id
  prefix_list_id       = aws_ec2_managed_prefix_list.corporate.id
  from_port            = 443
  to_port              = 443
  ip_protocol          = "tcp"
}
```

## Step 3: Azure NSG IP Whitelisting

```hcl
# Azure NSG with whitelisted IPs
resource "azurerm_network_security_group" "whitelisted" {
  name                = "ip-whitelisted-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_network_security_rule" "allow_whitelisted" {
  name                        = "allow-whitelisted-ips"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefixes     = local.all_allowed_cidrs
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.rg.name
  network_security_group_name = azurerm_network_security_group.whitelisted.name
}

# Deny all other inbound traffic
resource "azurerm_network_security_rule" "deny_all" {
  name                        = "deny-all-inbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.rg.name
  network_security_group_name = azurerm_network_security_group.whitelisted.name
}
```

## Step 4: GCP Firewall IP Whitelisting

```hcl
# GCP firewall rule with IP whitelisting
resource "google_compute_firewall" "allow_whitelisted" {
  name    = "allow-whitelisted-ips"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["443", "8443"]
  }

  source_ranges = local.all_allowed_cidrs
  target_tags   = ["whitelisted-service"]
  direction     = "INGRESS"
  priority      = 1000
}

# Deny all other traffic (lower priority number = higher priority in GCP)
resource "google_compute_firewall" "deny_all_ingress" {
  name    = "deny-all-ingress"
  network = google_compute_network.vpc.name

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["whitelisted-service"]
  direction     = "INGRESS"
  priority      = 65534
}
```

## Summary

IP whitelisting with OpenTofu uses `for_each` and `toset()` to create rules dynamically from a centralized list, making updates a single-variable change that propagates to all providers. AWS Managed Prefix Lists are the most maintainable approach - a single security group rule references the list, so adding or removing IPs doesn't require rule changes. On Azure and GCP, explicit deny-all rules can override broader inbound allows, but basic whitelisting already relies on the platforms' default or implied deny behavior. AWS security groups support allow rules only and start with no inbound rules.

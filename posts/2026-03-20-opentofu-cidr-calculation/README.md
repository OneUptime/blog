# How to Calculate Subnet CIDR Blocks Programmatically in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CIDR, Networking, Cidrsubnet, Cidrhost, IP Addressing

Description: Learn how to use OpenTofu's CIDR functions (cidrsubnet, cidrhost, cidrcontains) to programmatically calculate subnet addresses for dynamic network provisioning.

## Overview

OpenTofu's CIDR functions enable dynamic subnet calculation without hardcoding IP addresses. `cidrsubnet` divides a CIDR block into subnets, `cidrhost` computes specific host addresses, and `cidrcontains` validates IP membership.

## Step 1: cidrsubnet for Subnet Division

```hcl
# main.tf - Dynamic CIDR calculation

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

locals {
  # Divide /16 into /24 subnets
  # cidrsubnet(base, newbits, netnum)
  # newbits: how many bits to extend the prefix
  # netnum: which subnet to use (0-indexed)

  azs = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # Public subnets: 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24
  public_subnets = [for i, az in local.azs : cidrsubnet(var.vpc_cidr, 8, i)]

  # Private subnets: 10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24
  private_subnets = [for i, az in local.azs : cidrsubnet(var.vpc_cidr, 8, i + 10)]

  # Database subnets: 10.0.20.0/24, 10.0.21.0/24, 10.0.22.0/24
  database_subnets = [for i, az in local.azs : cidrsubnet(var.vpc_cidr, 8, i + 20)]

  # Management subnet: 10.0.100.0/24 (single subnet)
  management_subnet = cidrsubnet(var.vpc_cidr, 8, 100)
}

resource "aws_subnet" "public" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.public_subnets[count.index]
  availability_zone = local.azs[count.index]
}
```

## Step 2: Hierarchical CIDR Allocation

```hcl
# Multi-level CIDR allocation for complex networks
locals {
  # Base /8 network
  base_cidr = "10.0.0.0/8"

  # Divide into /16 per region
  region_cidrs = {
    us-east-1    = cidrsubnet(local.base_cidr, 8, 1)    # 10.1.0.0/16
    eu-west-1    = cidrsubnet(local.base_cidr, 8, 2)    # 10.2.0.0/16
    ap-southeast-1 = cidrsubnet(local.base_cidr, 8, 3)  # 10.3.0.0/16
  }

  # Divide each region /16 into /20 for environments
  env_cidrs = {
    for region, cidr in local.region_cidrs : region => {
      production    = cidrsubnet(cidr, 4, 1)   # 10.X.16.0/20
      staging       = cidrsubnet(cidr, 4, 2)   # 10.X.32.0/20
      development   = cidrsubnet(cidr, 4, 3)   # 10.X.48.0/20
    }
  }
}

output "cidr_map" {
  value = local.env_cidrs
}
```

## Step 3: cidrhost for Specific Addresses

```hcl
# Calculate specific host addresses within a subnet
locals {
  vpc_cidr    = "10.0.0.0/16"
  subnet_cidr = cidrsubnet(local.vpc_cidr, 8, 1)  # 10.0.1.0/24

  # Reserved addresses in subnet
  gateway_ip    = cidrhost(local.subnet_cidr, 1)   # 10.0.1.1 (gateway)
  ntp_server_ip = cidrhost(local.subnet_cidr, 2)   # 10.0.1.2 (NTP)
  dns_server_ip = cidrhost(local.subnet_cidr, 3)   # 10.0.1.3 (DNS)

  # First usable host = 4 (1-3 reserved)
  first_instance_ip = cidrhost(local.subnet_cidr, 4)

  # Last usable host (-2 = .254 for /24)
  last_instance_ip = cidrhost(local.subnet_cidr, -2)
}
```

## Step 4: cidrcontains for Validation

```hcl
# Validate that a given IP is within expected CIDR range
variable "allowed_cidr" {
  default = "10.0.0.0/8"
}

variable "target_ip" {
  default = "10.1.2.3"
}

locals {
  is_internal_ip = cidrcontains(var.allowed_cidr, var.target_ip)
}

# Conditional security group rule based on IP validation
resource "aws_vpc_security_group_ingress_rule" "conditional" {
  count = local.is_internal_ip ? 1 : 0

  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "${var.target_ip}/32"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

# Validation using postconditions
resource "null_resource" "ip_validation" {
  lifecycle {
    postcondition {
      condition     = cidrcontains(var.allowed_cidr, var.target_ip)
      error_message = "IP ${var.target_ip} is not within allowed CIDR ${var.allowed_cidr}"
    }
  }
}
```

## Summary

OpenTofu CIDR functions enable dynamic network configuration without spreadsheets or manual IP management. `cidrsubnet(base, newbits, netnum)` divides a CIDR block - adding 8 newbits to a /16 creates /24 subnets, with netnum selecting which one (0=first, 1=second). Hierarchical allocation using nested `cidrsubnet` calls creates clean, non-overlapping address spaces across regions and environments. `cidrcontains` validates IP membership, useful for conditional resource creation and lifecycle postconditions.

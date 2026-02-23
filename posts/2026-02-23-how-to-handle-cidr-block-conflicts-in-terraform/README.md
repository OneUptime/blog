# How to Handle CIDR Block Conflicts in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CIDR, VPC, IP Address Management, Networking, Infrastructure as Code

Description: Learn how to handle CIDR block conflicts in Terraform with strategies for IP address planning, conflict detection, dynamic CIDR allocation, and VPC IPAM integration.

---

CIDR block conflicts are one of the most common and frustrating networking issues in cloud environments. When two VPCs have overlapping IP address ranges, you cannot peer them, connect them via Transit Gateway, or route traffic between them. Planning and managing CIDR allocations carefully from the start saves enormous headaches later. This guide covers strategies for preventing and handling CIDR conflicts in Terraform.

## Understanding CIDR Conflicts

A CIDR conflict occurs when two networks have overlapping IP address ranges. For example, if VPC A uses 10.0.0.0/16 and VPC B uses 10.0.0.0/16, they cannot be peered because any IP in one VPC could also exist in the other. Even partial overlaps like 10.0.0.0/16 and 10.0.1.0/24 cause conflicts because the second range is a subset of the first.

This becomes especially problematic when connecting to on-premises networks, peering VPCs, establishing Transit Gateway connections, or setting up VPN tunnels. The default VPC CIDR of 172.31.0.0/16 in every AWS account is a common source of conflicts.

## Prerequisites

You need Terraform 1.0 or later and an AWS account. Understanding of CIDR notation and IP address math is helpful.

## CIDR Planning Strategy

The best defense against CIDR conflicts is a well-planned address space. Define your entire allocation scheme upfront.

```hcl
# Define the master CIDR allocation plan as local values
locals {
  # Master /8 allocation for the organization
  master_cidr = "10.0.0.0/8"

  # Regional allocations (/12 per region = 1,048,576 IPs each)
  regional_cidrs = {
    us_east_1      = "10.0.0.0/12"     # 10.0.0.0 - 10.15.255.255
    eu_west_1      = "10.16.0.0/12"    # 10.16.0.0 - 10.31.255.255
    ap_southeast_1 = "10.32.0.0/12"    # 10.32.0.0 - 10.47.255.255
    us_west_2      = "10.48.0.0/12"    # 10.48.0.0 - 10.63.255.255
  }

  # Environment allocations within us-east-1 (/16 per environment)
  us_east_1_envs = {
    production  = "10.0.0.0/16"
    staging     = "10.1.0.0/16"
    development = "10.2.0.0/16"
    sandbox     = "10.3.0.0/16"
    shared      = "10.4.0.0/16"
    management  = "10.5.0.0/16"
  }

  # On-premises network ranges (for reference and conflict checking)
  onprem_cidrs = [
    "172.16.0.0/12",   # Main data center
    "192.168.0.0/16",  # Branch offices
  ]
}
```

## Using Terraform Functions for CIDR Calculation

Terraform provides built-in functions for CIDR math that help avoid conflicts.

```hcl
# Use cidrsubnet to calculate non-overlapping subnets
locals {
  vpc_cidr = "10.0.0.0/16"

  # Calculate subnets automatically
  # cidrsubnet(prefix, newbits, netnum)
  # newbits = additional bits to add to the prefix
  # netnum = the sequential number of the subnet
  subnets = {
    public_1  = cidrsubnet(local.vpc_cidr, 8, 0)   # 10.0.0.0/24
    public_2  = cidrsubnet(local.vpc_cidr, 8, 1)   # 10.0.1.0/24
    public_3  = cidrsubnet(local.vpc_cidr, 8, 2)   # 10.0.2.0/24
    app_1     = cidrsubnet(local.vpc_cidr, 8, 10)  # 10.0.10.0/24
    app_2     = cidrsubnet(local.vpc_cidr, 8, 11)  # 10.0.11.0/24
    app_3     = cidrsubnet(local.vpc_cidr, 8, 12)  # 10.0.12.0/24
    data_1    = cidrsubnet(local.vpc_cidr, 8, 20)  # 10.0.20.0/24
    data_2    = cidrsubnet(local.vpc_cidr, 8, 21)  # 10.0.21.0/24
    data_3    = cidrsubnet(local.vpc_cidr, 8, 22)  # 10.0.22.0/24
  }
}

# Verify no conflicts with cidrcontains (Terraform 1.7+)
locals {
  # Check if a proposed CIDR falls within on-premises ranges
  proposed_cidr   = "10.0.0.0/16"
  conflicts_onprem = [
    for cidr in local.onprem_cidrs :
    cidr if can(cidrcontains(cidr, local.proposed_cidr)) || can(cidrcontains(local.proposed_cidr, cidr))
  ]
}

output "cidr_conflicts" {
  description = "List of on-premises CIDRs that conflict with the proposed VPC CIDR"
  value       = local.conflicts_onprem
}
```

## AWS VPC IPAM for Automated CIDR Management

AWS VPC IPAM (IP Address Manager) provides centralized IP address management and automated CIDR allocation.

```hcl
# Create an IPAM for centralized IP management
resource "aws_vpc_ipam" "main" {
  description = "Organization IP Address Manager"

  operating_regions {
    region_name = "us-east-1"
  }

  operating_regions {
    region_name = "eu-west-1"
  }

  tags = {
    Name = "organization-ipam"
  }
}

# Top-level pool for the entire organization
resource "aws_vpc_ipam_pool" "root" {
  address_family = "ipv4"
  ipam_scope_id  = aws_vpc_ipam.main.private_default_scope_id
  description    = "Root pool for all IP allocations"

  tags = {
    Name = "root-pool"
  }
}

# Provision the master CIDR to the root pool
resource "aws_vpc_ipam_pool_cidr" "root" {
  ipam_pool_id = aws_vpc_ipam_pool.root.id
  cidr         = "10.0.0.0/8"
}

# Regional pool for us-east-1
resource "aws_vpc_ipam_pool" "us_east_1" {
  address_family      = "ipv4"
  ipam_scope_id       = aws_vpc_ipam.main.private_default_scope_id
  source_ipam_pool_id = aws_vpc_ipam_pool.root.id
  description         = "Pool for us-east-1 region"
  locale              = "us-east-1"

  # Restrict allocations to /16 through /24
  allocation_min_netmask_length     = 16
  allocation_max_netmask_length     = 24
  allocation_default_netmask_length = 20

  tags = {
    Name   = "us-east-1-pool"
    Region = "us-east-1"
  }
}

# Provision CIDR to the regional pool
resource "aws_vpc_ipam_pool_cidr" "us_east_1" {
  ipam_pool_id = aws_vpc_ipam_pool.us_east_1.id
  cidr         = "10.0.0.0/12"

  depends_on = [aws_vpc_ipam_pool_cidr.root]
}

# Environment pool within the region
resource "aws_vpc_ipam_pool" "production" {
  address_family      = "ipv4"
  ipam_scope_id       = aws_vpc_ipam.main.private_default_scope_id
  source_ipam_pool_id = aws_vpc_ipam_pool.us_east_1.id
  description         = "Pool for production VPCs"
  locale              = "us-east-1"

  allocation_min_netmask_length     = 16
  allocation_max_netmask_length     = 22
  allocation_default_netmask_length = 20

  # Require environment tag on allocations
  allocation_resource_tags = {
    Environment = "production"
  }

  tags = {
    Name        = "production-pool"
    Environment = "production"
  }
}

resource "aws_vpc_ipam_pool_cidr" "production" {
  ipam_pool_id = aws_vpc_ipam_pool.production.id
  cidr         = "10.0.0.0/14"

  depends_on = [aws_vpc_ipam_pool_cidr.us_east_1]
}
```

## Creating VPCs with IPAM-Managed CIDRs

```hcl
# VPC with IPAM-allocated CIDR (no manual CIDR specification)
resource "aws_vpc" "production" {
  ipv4_ipam_pool_id   = aws_vpc_ipam_pool.production.id
  ipv4_netmask_length = 20  # Request a /20 from the pool

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "production-vpc"
    Environment = "production"
  }

  depends_on = [aws_vpc_ipam_pool_cidr.production]
}
```

IPAM automatically assigns a non-conflicting /20 CIDR block from the production pool. This eliminates the risk of manual CIDR conflicts.

## Secondary CIDR Blocks for Expansion

When a VPC runs out of IP addresses, add secondary CIDR blocks instead of recreating the VPC.

```hcl
# Original VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/20"  # Original /20 with 4,096 IPs

  tags = {
    Name = "expandable-vpc"
  }
}

# Add secondary CIDR when more addresses are needed
resource "aws_vpc_ipv4_cidr_block_association" "secondary" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.1.0.0/20"  # Additional /20 - must not overlap!

  # Or use IPAM for automatic allocation
  # ipv4_ipam_pool_id   = aws_vpc_ipam_pool.production.id
  # ipv4_netmask_length = 20
}

# Create subnets in the secondary CIDR
resource "aws_subnet" "expansion" {
  count      = 3
  vpc_id     = aws_vpc.main.id
  cidr_block = cidrsubnet("10.1.0.0/20", 4, count.index)

  depends_on = [aws_vpc_ipv4_cidr_block_association.secondary]

  tags = {
    Name = "expansion-subnet-${count.index + 1}"
  }
}
```

## Validating CIDR Allocations

Use Terraform validation to catch CIDR issues before they reach AWS.

```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "The vpc_cidr must be a valid CIDR block."
  }

  validation {
    condition     = tonumber(split("/", var.vpc_cidr)[1]) >= 16 && tonumber(split("/", var.vpc_cidr)[1]) <= 24
    error_message = "The VPC CIDR must be between /16 and /24."
  }

  validation {
    condition     = !startswith(var.vpc_cidr, "172.31.")
    error_message = "Cannot use 172.31.0.0/16 - reserved for default VPC."
  }
}

variable "existing_vpc_cidrs" {
  description = "List of existing VPC CIDRs to check for conflicts"
  type        = list(string)
  default     = []
}
```

## Documenting CIDR Allocations

Keep a clear record of all allocations using Terraform outputs.

```hcl
output "cidr_allocation_summary" {
  description = "Summary of all CIDR allocations"
  value = {
    vpc_cidr       = aws_vpc.main.cidr_block
    public_subnets = { for idx, s in aws_subnet.public : "public-${idx + 1}" => s.cidr_block }
    app_subnets    = { for idx, s in aws_subnet.application : "app-${idx + 1}" => s.cidr_block }
    data_subnets   = { for idx, s in aws_subnet.data : "data-${idx + 1}" => s.cidr_block }
  }
}
```

## Conclusion

Preventing CIDR block conflicts requires upfront planning and automated tooling. Use a hierarchical allocation scheme, leverage Terraform's CIDR functions for calculations, and adopt AWS VPC IPAM for centralized management. When conflicts do arise, secondary CIDR blocks and IPAM pools provide escape hatches. The key is treating IP address space as a shared organizational resource, not something each team manages independently.

For more subnet planning, check out our guide on [How to Calculate Available IP Addresses in Subnets with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-calculate-available-ip-addresses-in-subnets-with-terraform/view).

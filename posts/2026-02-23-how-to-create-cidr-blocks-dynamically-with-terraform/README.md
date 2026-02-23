# How to Create CIDR Blocks Dynamically with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CIDR, Networking, VPC, Subnets, Infrastructure as Code

Description: Learn how to create CIDR blocks dynamically in Terraform using cidrsubnet, cidrhost, and other built-in functions for flexible network address management.

---

One of the most tedious parts of network planning is calculating CIDR blocks for subnets. You have a VPC CIDR, and you need to carve it up into subnets for public access, private workloads, databases, and more. Doing this by hand with a subnet calculator is error-prone, and hardcoding the results makes your Terraform modules inflexible.

Terraform provides several built-in functions for working with CIDR blocks dynamically. In this guide, we will explore `cidrsubnet`, `cidrhost`, `cidrnetmask`, and `cidrsubnets` to build flexible networking configurations that adapt automatically to different VPC sizes and requirements.

## Understanding the cidrsubnet Function

The `cidrsubnet` function takes a CIDR block and splits it into smaller subnets. The syntax is:

```
cidrsubnet(prefix, newbits, netnum)
```

- `prefix`: The base CIDR block (e.g., "10.0.0.0/16")
- `newbits`: How many additional bits to add to the prefix length
- `netnum`: The subnet number (starting from 0)

Let's see how this works in practice.

```hcl
# Basic cidrsubnet usage
locals {
  vpc_cidr = "10.0.0.0/16"

  # cidrsubnet("10.0.0.0/16", 8, 0) = "10.0.0.0/24"
  # cidrsubnet("10.0.0.0/16", 8, 1) = "10.0.1.0/24"
  # cidrsubnet("10.0.0.0/16", 8, 2) = "10.0.2.0/24"

  # Adding 8 bits to /16 gives us /24 subnets (256 addresses each)
  # We can create up to 256 of these subnets (2^8)

  public_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 0),  # 10.0.0.0/24
    cidrsubnet(local.vpc_cidr, 8, 1),  # 10.0.1.0/24
    cidrsubnet(local.vpc_cidr, 8, 2),  # 10.0.2.0/24
  ]

  private_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 10), # 10.0.10.0/24
    cidrsubnet(local.vpc_cidr, 8, 11), # 10.0.11.0/24
    cidrsubnet(local.vpc_cidr, 8, 12), # 10.0.12.0/24
  ]

  database_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 20), # 10.0.20.0/24
    cidrsubnet(local.vpc_cidr, 8, 21), # 10.0.21.0/24
    cidrsubnet(local.vpc_cidr, 8, 22), # 10.0.22.0/24
  ]
}
```

## Dynamic Subnet Generation Based on AZ Count

Instead of hardcoding subnet counts, derive them from the number of availability zones.

```hcl
# dynamic-subnets.tf - Generate subnets dynamically
data "aws_availability_zones" "available" {
  state = "available"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "max_azs" {
  type    = number
  default = 3
}

locals {
  az_count = min(var.max_azs, length(data.aws_availability_zones.available.names))
  azs      = slice(data.aws_availability_zones.available.names, 0, local.az_count)

  # Generate subnets for each AZ
  # Public: offset 0, Private: offset 100, Database: offset 200
  public_cidrs   = [for i in range(local.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_cidrs  = [for i in range(local.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 100)]
  database_cidrs = [for i in range(local.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 200)]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_subnet" "public" {
  count = local.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.public_cidrs[count.index]
  availability_zone = local.azs[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "public-${local.azs[count.index]}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count = local.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "private-${local.azs[count.index]}"
    Tier = "private"
  }
}

resource "aws_subnet" "database" {
  count = local.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.database_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "database-${local.azs[count.index]}"
    Tier = "database"
  }
}
```

## Variable Subnet Sizes

Not all subnets need the same size. Use different `newbits` values to create subnets of different sizes.

```hcl
# variable-sizes.tf - Different sized subnets
locals {
  vpc_cidr = "10.0.0.0/16"

  # Large subnets (/20) for worker nodes - 4096 addresses each
  worker_subnets = [for i in range(3) : cidrsubnet(local.vpc_cidr, 4, i)]
  # 10.0.0.0/20, 10.0.16.0/20, 10.0.32.0/20

  # Medium subnets (/24) for services - 256 addresses each
  # Start at offset 48 to avoid overlap with /20 subnets
  service_subnets = [for i in range(3) : cidrsubnet(local.vpc_cidr, 8, i + 48)]
  # 10.0.48.0/24, 10.0.49.0/24, 10.0.50.0/24

  # Small subnets (/28) for load balancers - 16 addresses each
  lb_subnets = [for i in range(3) : cidrsubnet(local.vpc_cidr, 12, i + 3072)]
  # Uses higher address space to avoid overlaps
}

output "subnet_summary" {
  value = {
    worker_subnets  = local.worker_subnets
    service_subnets = local.service_subnets
    lb_subnets      = local.lb_subnets
  }
}
```

## The cidrhost Function

`cidrhost` calculates specific host addresses within a CIDR block. This is useful for assigning static IPs.

```hcl
# cidrhost-examples.tf - Calculate host addresses
locals {
  subnet_cidr = "10.0.1.0/24"

  # cidrhost("10.0.1.0/24", 5) = "10.0.1.5"
  # cidrhost("10.0.1.0/24", 10) = "10.0.1.10"

  # Reserve specific IPs for infrastructure
  dns_server_ip     = cidrhost(local.subnet_cidr, 2)    # 10.0.1.2 (AWS VPC DNS)
  gateway_ip        = cidrhost(local.subnet_cidr, 1)    # 10.0.1.1
  ntp_server_ip     = cidrhost(local.subnet_cidr, 10)   # 10.0.1.10
  monitoring_ip     = cidrhost(local.subnet_cidr, 11)   # 10.0.1.11
}

# Assign static IP to an ENI
resource "aws_network_interface" "monitoring" {
  subnet_id       = aws_subnet.private[0].id
  private_ips     = [cidrhost(aws_subnet.private[0].cidr_block, 11)]
  security_groups = [aws_security_group.monitoring.id]

  tags = {
    Name = "monitoring-eni"
  }
}
```

## The cidrnetmask Function

`cidrnetmask` converts a CIDR prefix to a subnet mask. This is useful when configuring legacy systems that expect subnet masks instead of CIDR notation.

```hcl
# cidrnetmask-examples.tf
locals {
  # cidrnetmask("10.0.0.0/16") = "255.255.0.0"
  # cidrnetmask("10.0.0.0/24") = "255.255.255.0"
  # cidrnetmask("10.0.0.0/28") = "255.255.255.240"

  vpc_netmask    = cidrnetmask(var.vpc_cidr)
  subnet_netmask = cidrnetmask(local.public_cidrs[0])
}
```

## Multi-Environment CIDR Planning

Use CIDR functions to create non-overlapping address spaces for different environments.

```hcl
# multi-env.tf - Non-overlapping CIDRs for each environment
variable "environment" {
  type = string
}

locals {
  # Each environment gets its own /16 from the 10.x.0.0 range
  env_cidr_map = {
    dev     = "10.0.0.0/16"
    staging = "10.1.0.0/16"
    prod    = "10.2.0.0/16"
    dr      = "10.3.0.0/16"
  }

  vpc_cidr = local.env_cidr_map[var.environment]

  # Subnets within each environment follow the same pattern
  az_count = 3

  public_subnets   = [for i in range(local.az_count) : cidrsubnet(local.vpc_cidr, 8, i)]
  private_subnets  = [for i in range(local.az_count) : cidrsubnet(local.vpc_cidr, 4, i + 4)]
  database_subnets = [for i in range(local.az_count) : cidrsubnet(local.vpc_cidr, 8, i + 200)]
}

# This ensures environments can be peered without CIDR conflicts
output "network_plan" {
  value = {
    environment      = var.environment
    vpc_cidr         = local.vpc_cidr
    public_subnets   = local.public_subnets
    private_subnets  = local.private_subnets
    database_subnets = local.database_subnets
  }
}
```

## Reusable Networking Module

Combine everything into a reusable module that handles CIDR calculation automatically.

```hcl
# modules/networking/variables.tf
variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
}

variable "environment" {
  type = string
}

variable "subnet_tiers" {
  type = map(object({
    newbits = number
    offset  = number
    count   = number
  }))
  default = {
    public   = { newbits = 8, offset = 0, count = 3 }
    private  = { newbits = 4, offset = 4, count = 3 }
    database = { newbits = 8, offset = 200, count = 3 }
  }
}

# modules/networking/main.tf
locals {
  subnets = {
    for tier, config in var.subnet_tiers :
    tier => [
      for i in range(config.count) :
      cidrsubnet(var.vpc_cidr, config.newbits, i + config.offset)
    ]
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "tiers" {
  for_each = {
    for pair in flatten([
      for tier, cidrs in local.subnets : [
        for i, cidr in cidrs : {
          key  = "${tier}-${i}"
          tier = tier
          cidr = cidr
          az   = data.aws_availability_zones.available.names[i % length(data.aws_availability_zones.available.names)]
        }
      ]
    ]) : pair.key => pair
  }

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = "${var.environment}-${each.value.tier}-${each.value.az}"
    Tier = each.value.tier
  }
}
```

## Summary

Dynamic CIDR management with Terraform eliminates the manual subnet calculations that plague network planning. The `cidrsubnet` function is the workhorse for splitting a VPC CIDR into subnets. The `cidrhost` function calculates specific host addresses. And by combining these with Terraform's `for` expressions and `range` function, you can create flexible networking configurations that adapt to different environments, regions, and requirements.

The key benefits are: no hardcoded IP addresses, automatic adaptation to different VPC sizes, and consistent subnet layouts across environments. When you need to change your network layout, you change one variable instead of dozens of hardcoded CIDRs.

For monitoring the health of your network infrastructure, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can track connectivity and alert you when network issues arise.

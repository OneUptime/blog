# How to Calculate Subnets Automatically with cidrsubnets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Networking, CIDR, Subnets, VPC, Infrastructure as Code

Description: Learn how to use Terraform's cidrsubnets function to automatically calculate non-overlapping subnets of different sizes from a single VPC CIDR block.

---

If you have ever used Terraform's `cidrsubnet` function, you know it works well for creating subnets of the same size. But what happens when you need subnets of different sizes? Calculating the offsets manually to avoid overlaps becomes tedious. That is exactly the problem `cidrsubnets` (with an "s") was designed to solve.

The `cidrsubnets` function takes a CIDR block and a list of new bit lengths, and returns a list of non-overlapping subnet CIDRs that are packed together efficiently. In this guide, we will explore how to use `cidrsubnets` for real-world networking scenarios.

## cidrsubnets vs cidrsubnet

Let's start by understanding the difference between the two functions.

```hcl
# cidrsubnet - calculates a single subnet, you manage offsets
# cidrsubnet(prefix, newbits, netnum)
locals {
  # You have to manage netnum manually to avoid overlaps
  subnet_a = cidrsubnet("10.0.0.0/16", 8, 0)   # 10.0.0.0/24
  subnet_b = cidrsubnet("10.0.0.0/16", 4, 1)   # 10.0.16.0/20
  # Wait, do these overlap? You have to do the math yourself.
}

# cidrsubnets - calculates multiple subnets at once, packs them automatically
locals {
  # Just tell it the sizes you want, it figures out the addresses
  subnets = cidrsubnets("10.0.0.0/16", 8, 4, 8, 8)
  # subnets[0] = "10.0.0.0/24"   (256 addresses)
  # subnets[1] = "10.0.16.0/20"  (4096 addresses)
  # subnets[2] = "10.0.1.0/24"   (256 addresses)
  # subnets[3] = "10.0.2.0/24"   (256 addresses)
  # All non-overlapping, packed efficiently
}
```

The key difference is that `cidrsubnets` handles the packing for you. It allocates larger subnets first, then fills in smaller ones around them, ensuring nothing overlaps.

## Basic Usage: Three Subnet Tiers

The most common use case is creating public, private, and database subnets across multiple availability zones.

```hcl
# basic-usage.tf - Three-tier subnet layout
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "az_count" {
  type    = number
  default = 3
}

locals {
  # Calculate all subnets at once
  # We want:
  # - 3 public subnets (/24 each, newbits=8)
  # - 3 private subnets (/20 each, newbits=4) - larger for workloads
  # - 3 database subnets (/24 each, newbits=8) - smaller for databases

  subnet_newbits = concat(
    [for _ in range(var.az_count) : 8],  # public /24s
    [for _ in range(var.az_count) : 4],  # private /20s
    [for _ in range(var.az_count) : 8],  # database /24s
  )

  all_subnets = cidrsubnets(var.vpc_cidr, local.subnet_newbits...)

  public_subnets   = slice(local.all_subnets, 0, var.az_count)
  private_subnets  = slice(local.all_subnets, var.az_count, var.az_count * 2)
  database_subnets = slice(local.all_subnets, var.az_count * 2, var.az_count * 3)
}

output "subnet_layout" {
  value = {
    vpc_cidr         = var.vpc_cidr
    public_subnets   = local.public_subnets
    private_subnets  = local.private_subnets
    database_subnets = local.database_subnets
  }
}

# The output will look something like:
# vpc_cidr = "10.0.0.0/16"
# public_subnets = ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
# private_subnets = ["10.0.16.0/20", "10.0.32.0/20", "10.0.48.0/20"]
# database_subnets = ["10.0.3.0/24", "10.0.4.0/24", "10.0.5.0/24"]
```

## Creating Subnets with AWS Resources

Now let's use `cidrsubnets` to actually create AWS subnets.

```hcl
# subnets.tf - Complete VPC with dynamic subnets
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs      = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  # Define subnet tiers with their sizes
  tiers = {
    public   = { newbits = 8, count = var.az_count }
    private  = { newbits = 4, count = var.az_count }
    database = { newbits = 8, count = var.az_count }
    cache    = { newbits = 10, count = var.az_count }
  }

  # Build the list of newbits for cidrsubnets
  tier_order  = ["public", "private", "database", "cache"]
  all_newbits = flatten([for tier in local.tier_order : [for _ in range(local.tiers[tier].count) : local.tiers[tier].newbits]])

  # Calculate all subnets at once
  all_cidrs = cidrsubnets(var.vpc_cidr, local.all_newbits...)

  # Split the results back into tiers
  tier_cidrs = {
    for tier in local.tier_order :
    tier => slice(
      local.all_cidrs,
      sum([for t in slice(local.tier_order, 0, index(local.tier_order, tier)) : local.tiers[t].count]),
      sum([for t in slice(local.tier_order, 0, index(local.tier_order, tier) + 1) : local.tiers[t].count])
    )
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.tier_cidrs["public"][count.index]
  availability_zone = local.azs[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-${local.azs[count.index]}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.tier_cidrs["private"][count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${var.project_name}-private-${local.azs[count.index]}"
    Tier = "private"
  }
}

resource "aws_subnet" "database" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.tier_cidrs["database"][count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${var.project_name}-database-${local.azs[count.index]}"
    Tier = "database"
  }
}

resource "aws_subnet" "cache" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = local.tier_cidrs["cache"][count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${var.project_name}-cache-${local.azs[count.index]}"
    Tier = "cache"
  }
}
```

## Configurable Subnet Layouts with Variables

Make the subnet layout fully configurable through variables.

```hcl
# configurable.tf - User-defined subnet layout
variable "subnet_config" {
  type = map(object({
    newbits = number
    public  = bool
  }))

  default = {
    public = {
      newbits = 8
      public  = true
    }
    application = {
      newbits = 4
      public  = false
    }
    database = {
      newbits = 8
      public  = false
    }
    management = {
      newbits = 10
      public  = false
    }
  }
}

locals {
  tier_names = keys(var.subnet_config)

  # Build newbits list: each tier gets az_count subnets
  config_newbits = flatten([
    for tier_name in local.tier_names : [
      for _ in range(var.az_count) : var.subnet_config[tier_name].newbits
    ]
  ])

  # Calculate all CIDRs
  config_cidrs = cidrsubnets(var.vpc_cidr, local.config_newbits...)

  # Map CIDRs back to tiers
  config_tier_cidrs = {
    for idx, tier_name in local.tier_names :
    tier_name => slice(
      local.config_cidrs,
      idx * var.az_count,
      (idx + 1) * var.az_count
    )
  }
}

# Create subnets dynamically based on config
resource "aws_subnet" "dynamic" {
  for_each = {
    for pair in flatten([
      for tier_name, cidrs in local.config_tier_cidrs : [
        for i, cidr in cidrs : {
          key    = "${tier_name}-${i}"
          tier   = tier_name
          cidr   = cidr
          az     = local.azs[i]
          public = var.subnet_config[tier_name].public
        }
      ]
    ]) : pair.key => pair
  }

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  map_public_ip_on_launch = each.value.public

  tags = {
    Name = "${var.project_name}-${each.value.tier}-${each.value.az}"
    Tier = each.value.tier
  }
}
```

## Handling Different VPC Sizes

The beauty of `cidrsubnets` is that it works with any VPC size. The same code adapts to /16, /20, or /24 VPCs.

```hcl
# adaptive.tf - Works with any VPC size
variable "vpc_size" {
  type    = string
  default = "medium"

  validation {
    condition     = contains(["small", "medium", "large"], var.vpc_size)
    error_message = "vpc_size must be small, medium, or large."
  }
}

locals {
  vpc_configs = {
    small  = { cidr = "10.0.0.0/24", public_bits = 4, private_bits = 3 }
    medium = { cidr = "10.0.0.0/20", public_bits = 6, private_bits = 4 }
    large  = { cidr = "10.0.0.0/16", public_bits = 8, private_bits = 4 }
  }

  config = local.vpc_configs[var.vpc_size]

  adaptive_subnets = cidrsubnets(
    local.config.cidr,
    # 3 public subnets
    local.config.public_bits, local.config.public_bits, local.config.public_bits,
    # 3 private subnets (larger)
    local.config.private_bits, local.config.private_bits, local.config.private_bits,
  )
}

output "adaptive_layout" {
  value = {
    vpc_size = var.vpc_size
    vpc_cidr = local.config.cidr
    public   = slice(local.adaptive_subnets, 0, 3)
    private  = slice(local.adaptive_subnets, 3, 6)
  }
}
```

## Reserved Address Spaces

Leave room for future growth by reserving some subnet space.

```hcl
# reserved.tf - Reserve space for future use
locals {
  # Calculate subnets but include placeholders for reserved space
  all_allocated = cidrsubnets(
    var.vpc_cidr,
    # Current subnets
    8, 8, 8,    # public (3x /24)
    4, 4, 4,    # private (3x /20)
    8, 8, 8,    # database (3x /24)
    # Reserved for future use - allocate but do not create resources
    4, 4, 4,    # reserved-1 (3x /20)
    8, 8, 8,    # reserved-2 (3x /24)
  )

  # Only use the subnets we need now
  active_public   = slice(local.all_allocated, 0, 3)
  active_private  = slice(local.all_allocated, 3, 6)
  active_database = slice(local.all_allocated, 6, 9)

  # Document what is reserved
  reserved_1 = slice(local.all_allocated, 9, 12)
  reserved_2 = slice(local.all_allocated, 12, 15)
}

output "address_plan" {
  value = {
    active = {
      public   = local.active_public
      private  = local.active_private
      database = local.active_database
    }
    reserved = {
      future_workloads = local.reserved_1
      future_services  = local.reserved_2
    }
  }
}
```

## Summary

The `cidrsubnets` function is a significant improvement over `cidrsubnet` when you need subnets of different sizes. It automatically packs subnets to avoid overlaps, handles the address math for you, and works with any base CIDR size.

The key patterns to remember:

1. List larger subnets first for better address space utilization
2. Use `slice` to split the results back into logical groups
3. The function works identically regardless of your VPC size
4. Reserve address space for future growth by including placeholder allocations

For monitoring the health of your VPC and the subnets you create, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can track network connectivity and alert you when infrastructure issues arise.

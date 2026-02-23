# How to Use the cidrsubnet Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Networking, CIDR, Subnetting, Infrastructure as Code

Description: Learn how to use Terraform's cidrsubnet function to calculate subnet addresses from a parent CIDR block and build dynamic network architectures.

---

Subnetting is one of the most fundamental parts of cloud networking. Every VPC, virtual network, or cloud environment needs subnets, and manually calculating them is tedious and error-prone. Terraform's `cidrsubnet` function automates this by letting you derive subnet CIDR blocks from a parent network prefix, keeping your infrastructure code clean and mathematically correct.

## What Does cidrsubnet Do?

The `cidrsubnet` function calculates a subnet address within a given IP network address prefix. You tell it the parent network, how many additional bits to use for the subnet, and which subnet number you want.

```hcl
# Split 10.0.0.0/16 into /24 subnets and pick the first one
output "subnet" {
  value = cidrsubnet("10.0.0.0/16", 8, 0)
  # Result: "10.0.0.0/24"
}
```

## Syntax

```hcl
cidrsubnet(prefix, newbits, netnum)
```

- `prefix` - The parent network in CIDR notation (e.g., `"10.0.0.0/16"`)
- `newbits` - The number of additional bits to add to the prefix length. This determines the size of the subnets.
- `netnum` - The subnet number (zero-indexed). Which specific subnet you want from the range of possible subnets.

The function returns a string in CIDR notation representing the calculated subnet.

## Understanding the Parameters

The trickiest part of `cidrsubnet` is understanding how `newbits` and `netnum` work together. Here is how to think about it:

Starting with a `/16` network like `10.0.0.0/16`:

- Adding 8 new bits creates `/24` subnets (16 + 8 = 24), giving you 256 possible subnets (2^8)
- Adding 4 new bits creates `/20` subnets (16 + 4 = 20), giving you 16 possible subnets (2^4)
- Adding 1 new bit creates `/17` subnets (16 + 1 = 17), giving you 2 possible subnets (2^1)

The `netnum` selects which of those subnets you want, starting from 0.

```hcl
# Starting with 10.0.0.0/16, create /24 subnets (add 8 bits)
output "subnet_0" {
  value = cidrsubnet("10.0.0.0/16", 8, 0)
  # Result: "10.0.0.0/24"
}

output "subnet_1" {
  value = cidrsubnet("10.0.0.0/16", 8, 1)
  # Result: "10.0.1.0/24"
}

output "subnet_255" {
  value = cidrsubnet("10.0.0.0/16", 8, 255)
  # Result: "10.0.255.0/24"
}
```

## Practical Examples

### Creating a Multi-Tier VPC

The most common use case is splitting a VPC CIDR into subnets for different tiers:

```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Create public subnets (first 3 /24 blocks)
resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  # Results:
  # count 0 -> 10.0.0.0/24
  # count 1 -> 10.0.1.0/24
  # count 2 -> 10.0.2.0/24

  tags = {
    Name = "public-subnet-${count.index + 1}"
    Tier = "public"
  }
}

# Create private subnets (next 3 /24 blocks, starting at netnum 10)
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 10 + count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  # Results:
  # count 0 -> 10.0.10.0/24
  # count 1 -> 10.0.11.0/24
  # count 2 -> 10.0.12.0/24

  tags = {
    Name = "private-subnet-${count.index + 1}"
    Tier = "private"
  }
}
```

### Different Subnet Sizes

You do not have to make all subnets the same size. Use different `newbits` values for different tiers:

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

locals {
  # Large /20 subnets for application workloads (4096 IPs each)
  app_subnet = cidrsubnet(var.vpc_cidr, 4, 0)  # 10.0.0.0/20

  # Medium /24 subnets for databases (256 IPs each)
  db_subnet = cidrsubnet(var.vpc_cidr, 8, 16)  # 10.0.16.0/24

  # Small /28 subnets for load balancers (16 IPs each)
  lb_subnet = cidrsubnet(var.vpc_cidr, 12, 256)  # 10.0.16.0/28
  # Note: be careful about overlaps when mixing sizes!
}
```

When mixing subnet sizes, plan your address space carefully. A `/20` subnet starting at `10.0.0.0` occupies addresses through `10.0.15.255`, so make sure your `/24` subnets start at `10.0.16.0` or later.

### Using for_each with Named Subnets

For more descriptive configurations:

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "subnets" {
  description = "Subnet definitions with their network numbers"
  type = map(object({
    netnum = number
    tier   = string
    az     = string
  }))
  default = {
    "public-a"  = { netnum = 0, tier = "public", az = "us-west-2a" }
    "public-b"  = { netnum = 1, tier = "public", az = "us-west-2b" }
    "private-a" = { netnum = 10, tier = "private", az = "us-west-2a" }
    "private-b" = { netnum = 11, tier = "private", az = "us-west-2b" }
    "data-a"    = { netnum = 20, tier = "data", az = "us-west-2a" }
    "data-b"    = { netnum = 21, tier = "data", az = "us-west-2b" }
  }
}

resource "aws_subnet" "all" {
  for_each          = var.subnets
  vpc_id            = aws_vpc.main.id
  # Each subnet gets a /24 block derived from the VPC CIDR
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, each.value.netnum)
  availability_zone = each.value.az

  tags = {
    Name = each.key
    Tier = each.value.tier
  }
}
```

### Multi-Region Network Planning

When you have multiple regions sharing a network space:

```hcl
variable "global_cidr" {
  description = "Global network CIDR"
  default     = "10.0.0.0/8"
}

locals {
  # Allocate /16 blocks per region (add 8 bits)
  region_cidrs = {
    us_east = cidrsubnet(var.global_cidr, 8, 0)   # 10.0.0.0/16
    us_west = cidrsubnet(var.global_cidr, 8, 1)   # 10.1.0.0/16
    eu_west = cidrsubnet(var.global_cidr, 8, 2)   # 10.2.0.0/16
    ap_east = cidrsubnet(var.global_cidr, 8, 3)   # 10.3.0.0/16
  }
}

# Then subdivide each region's CIDR into subnets
# For the US East region, create /24 subnets
locals {
  us_east_subnets = {
    public  = cidrsubnet(local.region_cidrs["us_east"], 8, 0)  # 10.0.0.0/24
    private = cidrsubnet(local.region_cidrs["us_east"], 8, 1)  # 10.0.1.0/24
    data    = cidrsubnet(local.region_cidrs["us_east"], 8, 2)  # 10.0.2.0/24
  }
}
```

## Common Mistakes

### netnum Out of Range

The `netnum` must be less than 2^newbits:

```hcl
# With 4 newbits, you can have subnets 0-15
# Subnet 16 is out of range and will cause an error
output "invalid" {
  value = cidrsubnet("10.0.0.0/16", 4, 16)
  # Error: prefix extension of 4 does not accommodate a subnet numbered 16
}
```

### Overlapping Subnets

When you use different `newbits` values, the resulting subnets can overlap. Always plan your address space layout on paper (or in a locals block) before building resources.

## Summary

The `cidrsubnet` function is the backbone of dynamic network design in Terraform. It lets you derive any number of subnets from a single parent CIDR block, and by changing one variable (the VPC CIDR), your entire network layout adjusts automatically. Master it, and you will never hardcode a subnet CIDR again. For allocating multiple subnets at once, check out the [cidrsubnets function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-cidrsubnets-function-in-terraform/view), and for calculating host IPs within subnets, see [cidrhost](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-cidrhost-function-in-terraform/view).

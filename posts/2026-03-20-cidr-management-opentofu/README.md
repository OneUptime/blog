# How to Manage CIDR Blocks and IP Addressing with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CIDR, IP Addressing, Networking, Cidrsubnet, Infrastructure as Code

Description: Learn how to manage IP address allocation with OpenTofu using cidrsubnet(), cidrsubnets(), and cidrhost() functions - automating subnet CIDR calculations and avoiding IP conflicts.

## Introduction

OpenTofu's built-in CIDR functions automate subnet address allocation, eliminating manual IP planning errors. `cidrsubnet()` calculates individual subnets, `cidrsubnets()` generates multiple in sequence, and `cidrhost()` generates specific host addresses within a range.

## cidrsubnet() - Single Subnet Calculation

```hcl
# cidrsubnet(prefix, newbits, netnum)

# prefix = base CIDR, newbits = bits to add for new prefix, netnum = subnet number

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

locals {
  # Calculate /24 subnets from a /16 (add 8 bits)
  public_subnet_a  = cidrsubnet(var.vpc_cidr, 8, 1)   # 10.0.1.0/24
  public_subnet_b  = cidrsubnet(var.vpc_cidr, 8, 2)   # 10.0.2.0/24
  private_subnet_a = cidrsubnet(var.vpc_cidr, 8, 10)  # 10.0.10.0/24
  private_subnet_b = cidrsubnet(var.vpc_cidr, 8, 11)  # 10.0.11.0/24

  # Calculate /20 subnets from a /16 (add 4 bits)
  large_subnet_1 = cidrsubnet(var.vpc_cidr, 4, 0)  # 10.0.0.0/20
  large_subnet_2 = cidrsubnet(var.vpc_cidr, 4, 1)  # 10.0.16.0/20
}
```

## cidrsubnets() - Multiple Subnets in Sequence

```hcl
# cidrsubnets(prefix, newbits...) generates sequential subnets
locals {
  # Generate 6 /24 subnets from /16
  all_subnets = cidrsubnets(var.vpc_cidr, 8, 8, 8, 8, 8, 8)
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24", "10.0.4.0/24", "10.0.5.0/24"]

  # Mixed sizes: 3x /24 then 3x /20
  mixed_subnets = cidrsubnets(var.vpc_cidr, 8, 8, 8, 4, 4, 4)
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24", "10.0.16.0/20", "10.0.32.0/20", "10.0.48.0/20"]
}
```

## Subnet Allocation by Tier

```hcl
locals {
  # Subnet tier allocation pattern
  # /16 VPC: reserve /20 blocks per tier, then /24 within each block

  # Public tier: 10.0.0.0/20 → /24 subnets
  public_cidrs = [
    cidrsubnet("10.0.0.0/20", 4, 0),  # 10.0.0.0/24
    cidrsubnet("10.0.0.0/20", 4, 1),  # 10.0.1.0/24
    cidrsubnet("10.0.0.0/20", 4, 2),  # 10.0.2.0/24
  ]

  # Private tier: 10.0.16.0/20 → /24 subnets
  private_cidrs = [
    cidrsubnet("10.0.16.0/20", 4, 0),  # 10.0.16.0/24
    cidrsubnet("10.0.16.0/20", 4, 1),  # 10.0.17.0/24
    cidrsubnet("10.0.16.0/20", 4, 2),  # 10.0.18.0/24
  ]

  # Database tier: 10.0.32.0/20 → /24 subnets
  database_cidrs = [
    cidrsubnet("10.0.32.0/20", 4, 0),  # 10.0.32.0/24
    cidrsubnet("10.0.32.0/20", 4, 1),  # 10.0.33.0/24
    cidrsubnet("10.0.32.0/20", 4, 2),  # 10.0.34.0/24
  ]
}
```

## cidrhost() - Specific Host Addresses

```hcl
# Get specific host addresses within a subnet
locals {
  subnet = "10.0.1.0/24"

  network_address  = cidrhost(local.subnet, 0)    # 10.0.1.0 (network)
  first_host       = cidrhost(local.subnet, 1)    # 10.0.1.1 (router/gateway)
  second_host      = cidrhost(local.subnet, 2)    # 10.0.1.2
  last_host        = cidrhost(local.subnet, -2)   # 10.0.1.254
  broadcast        = cidrhost(local.subnet, -1)   # 10.0.1.255
}

# Use for planning fixed private IPs; AWS NAT gateway public IPs come from Elastic IPs
resource "aws_eip" "nat" {
  domain = "vpc"
  # Elastic IPs are allocated by AWS rather than derived from the subnet CIDR
}
```

## Multi-VPC CIDR Planning

```hcl
# Systematic CIDR allocation across multiple VPCs
variable "supernet" {
  default = "10.0.0.0/8"  # Company-wide supernet
}

locals {
  # Each region gets a /16 from the /8
  regions = {
    us_east_1      = 0   # 10.0.0.0/16
    eu_west_1      = 1   # 10.1.0.0/16
    ap_southeast_1 = 2   # 10.2.0.0/16
  }

  region_cidrs = {
    for name, index in local.regions :
    name => cidrsubnet(var.supernet, 8, index)
  }
  # {"us_east_1" = "10.0.0.0/16", "eu_west_1" = "10.1.0.0/16", ...}

  # Within each region, /20 blocks for environments
  us_east_envs = {
    production = cidrsubnet(local.region_cidrs["us_east_1"], 4, 0)  # 10.0.0.0/20
    staging    = cidrsubnet(local.region_cidrs["us_east_1"], 4, 1)  # 10.0.16.0/20
    dev        = cidrsubnet(local.region_cidrs["us_east_1"], 4, 2)  # 10.0.32.0/20
  }
}
```

## Using with Subnets Resource

```hcl
data "aws_availability_zones" "available" { state = "available" }

resource "aws_subnet" "public" {
  count = 3

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${data.aws_availability_zones.available.names[count.index]}"
  }
}
```

## Conclusion

OpenTofu's CIDR functions eliminate manual IP address calculation errors. Use `cidrsubnet(vpc_cidr, newbits, netnum)` for individual subnets, `cidrsubnets(vpc_cidr, newbits...)` for sequential allocation, and `cidrhost(subnet, hostnum)` for specific host addresses. Plan a hierarchical addressing scheme: company supernet → regional /16 → environment /20 or tier /20 → availability zone /24. Encode this hierarchy in locals to make the allocation systematic and self-documenting.

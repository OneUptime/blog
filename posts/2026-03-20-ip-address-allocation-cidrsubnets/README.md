# IP Address Allocation with cidrsubnets in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Networking, CIDR, Subnetting, AWS, Infrastructure as Code

Description: Learn how to use OpenTofu's built-in cidrsubnets and cidrsubnet functions to automatically allocate and manage IP address ranges for VPC subnets.

## Why Automate CIDR Allocation?

Manually assigning CIDR ranges to subnets is tedious and error-prone, especially as your infrastructure grows. OpenTofu provides built-in functions - `cidrsubnet` and `cidrsubnets` - to automatically calculate non-overlapping subnet ranges from a parent CIDR block.

## Understanding cidrsubnet

`cidrsubnet(prefix, newbits, netnum)` calculates a subnet address within a given IP network prefix.

```hcl
# Given 10.0.0.0/16, add 8 bits → /24 subnets

cidrsubnet("10.0.0.0/16", 8, 0)   # = 10.0.0.0/24
cidrsubnet("10.0.0.0/16", 8, 1)   # = 10.0.1.0/24
cidrsubnet("10.0.0.0/16", 8, 2)   # = 10.0.2.0/24
```

## Understanding cidrsubnets

`cidrsubnets(prefix, newbits...)` takes a list of newbits values and returns sequential subnets:

```hcl
cidrsubnets("10.0.0.0/16", 4, 4, 8, 8)
# Returns:
# 10.0.0.0/20
# 10.0.16.0/20
# 10.0.32.0/24
# 10.0.33.0/24
```

## Practical Example: VPC with Public and Private Subnets

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

locals {
  # Split the VPC CIDR into 6 /24 subnets
  all_subnets = cidrsubnets(var.vpc_cidr,
    8, 8, 8,   # 3 public subnets (/24 each)
    8, 8, 8    # 3 private subnets (/24 each)
  )

  public_subnets  = slice(local.all_subnets, 0, 3)
  private_subnets = slice(local.all_subnets, 3, 6)
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
}

resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.public_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "public-${var.availability_zones[count.index]}"
    Type = "public"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "private-${var.availability_zones[count.index]}"
    Type = "private"
  }
}
```

## Multi-Environment CIDR Allocation

```hcl
variable "environments" {
  default = {
    dev  = "10.0.0.0/16"
    stg  = "10.1.0.0/16"
    prod = "10.2.0.0/16"
  }
}

locals {
  env_subnets = {
    for env, cidr in var.environments :
    env => cidrsubnets(cidr, 8, 8, 8)
  }
}
```

## Validating CIDR Inputs

```hcl
variable "vpc_cidr" {
  type = string

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "The vpc_cidr must be a valid IPv4 CIDR block."
  }

  validation {
    condition     = try(tonumber(split("/", var.vpc_cidr)[1]) == 16, false)
    error_message = "This example expects a /16 VPC CIDR so cidrsubnets(..., 8, ...) creates /24 subnets."
  }
}
```

## Outputs

```hcl
output "public_subnet_cidrs" {
  value = local.public_subnets
}

output "private_subnet_cidrs" {
  value = local.private_subnets
}
```

## Best Practices

1. **Plan your IP space up front** - reserve ranges for future VPCs and on-premises networks
2. **Use consistent newbits** - keep subnet sizes uniform for simplicity
3. **Document your CIDR scheme** - add comments explaining the allocation strategy
4. **Avoid overlapping ranges** with VPN or peered networks
5. **Leave headroom** - don't use 100% of the VPC CIDR to allow future expansion

## Conclusion

OpenTofu's `cidrsubnet` and `cidrsubnets` functions eliminate the need to manually calculate subnet ranges. By expressing your IP allocation as code, you get deterministic, reproducible subnetting that scales with your infrastructure.

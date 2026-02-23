# How to Use the cidrsubnets Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Networking, CIDR, Subnetting, Infrastructure as Code

Description: Learn how to use Terraform's cidrsubnets function to allocate multiple subnet CIDR blocks of varying sizes from a single parent network prefix.

---

When you need to carve out multiple subnets from a single network prefix, calling `cidrsubnet` repeatedly can be tedious and error-prone, especially when the subnets are different sizes. The `cidrsubnets` function (note the plural) solves this by allocating multiple contiguous, non-overlapping subnet prefixes in a single call.

## What Does cidrsubnets Do?

The `cidrsubnets` function takes a parent CIDR prefix and a list of new bit values, then returns a list of subnet prefixes that fit within the parent prefix without overlapping. Each element in the result corresponds to one of the requested subnets.

```hcl
# Allocate three /24 subnets from a /16 parent
output "subnets" {
  value = cidrsubnets("10.0.0.0/16", 8, 8, 8)
  # Result: ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
}
```

## Syntax

```hcl
cidrsubnets(prefix, newbits...)
```

- `prefix` - The parent network in CIDR notation
- `newbits...` - One or more integers, each specifying how many bits to add to the prefix length for that subnet

The function returns a list of strings, each in CIDR notation.

## cidrsubnets vs cidrsubnet

The key difference is that `cidrsubnets` (plural) automatically packs subnets contiguously and handles different sizes, while `cidrsubnet` (singular) picks a specific subnet by number. With `cidrsubnet`, you must manually ensure subnets do not overlap when using different sizes. With `cidrsubnets`, the function handles this for you.

```hcl
# Using cidrsubnet (singular) - you pick specific subnet numbers
locals {
  subnet_a = cidrsubnet("10.0.0.0/16", 8, 0)  # 10.0.0.0/24
  subnet_b = cidrsubnet("10.0.0.0/16", 8, 1)  # 10.0.1.0/24
}

# Using cidrsubnets (plural) - automatic contiguous allocation
locals {
  all_subnets = cidrsubnets("10.0.0.0/16", 8, 8)
  # Result: ["10.0.0.0/24", "10.0.1.0/24"]
}
```

## Mixed Subnet Sizes

The real power of `cidrsubnets` shows when you need different-sized subnets. The function packs them efficiently without overlaps:

```hcl
# Allocate subnets of different sizes
output "mixed_subnets" {
  value = cidrsubnets("10.0.0.0/16", 4, 8, 8, 8)
  # Result:
  # [
  #   "10.0.0.0/20",   - Large subnet (4096 IPs, 4 new bits)
  #   "10.0.16.0/24",  - Small subnet (256 IPs, 8 new bits)
  #   "10.0.17.0/24",  - Small subnet (256 IPs, 8 new bits)
  #   "10.0.18.0/24",  - Small subnet (256 IPs, 8 new bits)
  # ]
}
```

Notice how the function placed the `/24` subnets after the `/20` block ends at `10.0.15.255`. This automatic packing is what makes `cidrsubnets` so valuable.

## Practical Examples

### Building a Complete VPC Network

Here is a typical three-tier VPC setup with different subnet sizes per tier:

```hcl
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

locals {
  # Allocate subnets for different purposes
  # 2 large /20 subnets for application workloads
  # 2 medium /24 subnets for databases
  # 2 small /28 subnets for load balancers
  subnet_cidrs = cidrsubnets(var.vpc_cidr, 4, 4, 8, 8, 12, 12)

  # Give meaningful names to each subnet
  subnets = {
    app_a = local.subnet_cidrs[0]  # /20 - 4096 addresses
    app_b = local.subnet_cidrs[1]  # /20 - 4096 addresses
    db_a  = local.subnet_cidrs[2]  # /24 - 256 addresses
    db_b  = local.subnet_cidrs[3]  # /24 - 256 addresses
    lb_a  = local.subnet_cidrs[4]  # /28 - 16 addresses
    lb_b  = local.subnet_cidrs[5]  # /28 - 16 addresses
  }
}

# Create the VPC
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = { Name = "main-vpc" }
}

# Create application subnets
resource "aws_subnet" "app" {
  for_each = {
    a = { cidr = local.subnets.app_a, az = "us-west-2a" }
    b = { cidr = local.subnets.app_b, az = "us-west-2b" }
  }

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = { Name = "app-${each.key}" }
}

# Create database subnets
resource "aws_subnet" "db" {
  for_each = {
    a = { cidr = local.subnets.db_a, az = "us-west-2a" }
    b = { cidr = local.subnets.db_b, az = "us-west-2b" }
  }

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = { Name = "db-${each.key}" }
}
```

### Dynamic Subnet Count

Use `cidrsubnets` with dynamic lists when the number of subnets depends on a variable:

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 3
}

locals {
  # Create newbits list dynamically
  # Each AZ gets a public and private subnet, both /24
  newbits = flatten([
    # Public subnets (one per AZ)
    [for i in range(var.az_count) : 8],
    # Private subnets (one per AZ)
    [for i in range(var.az_count) : 8],
  ])

  # Generate all subnet CIDRs at once
  all_cidrs = cidrsubnets(var.vpc_cidr, local.newbits...)

  # Split into public and private
  public_cidrs  = slice(local.all_cidrs, 0, var.az_count)
  private_cidrs = slice(local.all_cidrs, var.az_count, var.az_count * 2)
}

output "public_subnets" {
  value = local.public_cidrs
  # ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
}

output "private_subnets" {
  value = local.private_cidrs
  # ["10.0.3.0/24", "10.0.4.0/24", "10.0.5.0/24"]
}
```

### Azure Virtual Network Setup

The same approach works with any cloud provider:

```hcl
variable "vnet_cidr" {
  default = "10.1.0.0/16"
}

locals {
  # Allocate subnets for Azure resources
  azure_subnets = cidrsubnets(var.vnet_cidr, 8, 8, 8, 10, 10)

  subnet_map = {
    web      = local.azure_subnets[0]  # /24 for web tier
    app      = local.azure_subnets[1]  # /24 for app tier
    data     = local.azure_subnets[2]  # /24 for data tier
    gateway  = local.azure_subnets[3]  # /26 for VPN gateway
    bastion  = local.azure_subnets[4]  # /26 for bastion host
  }
}

resource "azurerm_virtual_network" "main" {
  name                = "main-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = [var.vnet_cidr]
}

resource "azurerm_subnet" "subnets" {
  for_each             = local.subnet_map
  name                 = each.key
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [each.value]
}
```

## Ordering Matters

The order of `newbits` arguments affects how subnets are allocated. Larger subnets (fewer new bits) should generally come first because they require alignment on larger boundaries:

```hcl
# Good: large subnets first, then smaller ones
output "well_ordered" {
  value = cidrsubnets("10.0.0.0/16", 4, 4, 8, 8, 8)
}

# This also works but may waste address space due to alignment requirements
output "mixed_order" {
  value = cidrsubnets("10.0.0.0/16", 8, 4, 8, 4, 8)
}
```

## Error Handling

If the requested subnets cannot fit within the parent prefix, Terraform will raise an error:

```hcl
# Trying to fit too many subnets in a /24 block
# This will fail because 3 x /25 cannot fit in a /24
output "too_many" {
  value = cidrsubnets("10.0.0.0/24", 1, 1, 1)
  # Error: not enough remaining address space for a subnet with a prefix of 1 bit(s)
}
```

## Summary

The `cidrsubnets` function is the recommended way to allocate multiple subnets in Terraform. It handles different subnet sizes, prevents overlaps, and packs subnets contiguously. Whenever you need to create more than a couple of subnets, reach for `cidrsubnets` instead of making multiple `cidrsubnet` calls. For more on dynamic subnet calculations, see our post on [calculating subnet addresses dynamically with cidrsubnet](https://oneuptime.com/blog/post/2026-02-23-how-to-calculate-subnet-addresses-dynamically-with-cidrsubnet/view).

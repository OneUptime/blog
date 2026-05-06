# How to Calculate CIDR Blocks with cidrsubnet in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CIDR, Networking, HCL, VPC, Infrastructure as Code

Description: Learn how to use OpenTofu's cidrsubnet and cidrhost functions to dynamically calculate CIDR blocks and IP addresses for VPC subnets.

---

OpenTofu's `cidrsubnet` function lets you calculate subnet CIDR blocks programmatically from a base CIDR, eliminating the need to hard-code individual subnet ranges and making your network configurations scalable.

---

## cidrsubnet Syntax

```hcl
cidrsubnet(prefix, newbits, netnum)
```

- `prefix` - the base CIDR block (e.g., `"10.0.0.0/16"`)
- `newbits` - number of bits to add to the prefix length
- `netnum` - the subnet number (0-based index)

---

## Basic Examples

```hcl
# Divide 10.0.0.0/16 into /24 subnets (adding 8 bits)

cidrsubnet("10.0.0.0/16", 8, 0)   # → "10.0.0.0/24"
cidrsubnet("10.0.0.0/16", 8, 1)   # → "10.0.1.0/24"
cidrsubnet("10.0.0.0/16", 8, 10)  # → "10.0.10.0/24"

# Divide 10.0.0.0/16 into /20 subnets (adding 4 bits)
cidrsubnet("10.0.0.0/16", 4, 0)   # → "10.0.0.0/20"
cidrsubnet("10.0.0.0/16", 4, 1)   # → "10.0.16.0/20"
```

---

## Create Multiple Subnets with count

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "public-subnet-${count.index + 1}"
  }
}
# Creates: 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24
```

---

## Public and Private Subnet Layout

```hcl
locals {
  public_subnets  = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnets = [for i in range(3) : cidrsubnet(var.vpc_cidr, 8, i + 10)]
}
# Public:  10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24
# Private: 10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24
```

---

## cidrhost for Specific IP Addresses

```hcl
# Get the 5th host in the first subnet
cidrhost(cidrsubnet("10.0.0.0/16", 8, 0), 5)  # → "10.0.0.5"

# Get the first usable host address
cidrhost("10.0.1.0/24", 1)  # → "10.0.1.1"
```

---

## Verify in tofu console

```bash
tofu console
> cidrsubnet("10.0.0.0/16", 8, 5)
"10.0.5.0/24"
> cidrhost("10.0.5.0/24", 1)
"10.0.5.1"
```

---

## Summary

Use `cidrsubnet(prefix, newbits, netnum)` to calculate subnet CIDRs dynamically. Set `newbits` to the number of bits you want to add to the prefix (e.g., 8 to go from /16 to /24). Use `count.index` or `for` expressions to generate subnets in bulk. Use `cidrhost` to calculate specific host addresses within a subnet.

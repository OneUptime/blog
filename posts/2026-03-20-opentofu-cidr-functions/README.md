# How to Use CIDR Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Function, Network

Description: Learn how to use cidrhost, cidrnetmask, cidrsubnet, cidrsubnets, and cidrcontains functions in OpenTofu for IP address management.

OpenTofu provides five CIDR (Classless Inter-Domain Routing) functions for working with IP addresses and subnets. These are invaluable for automating network configuration without hardcoding IP addresses.

## cidrhost()

Returns a specific host IP within a CIDR block:

```hcl
> cidrhost("10.0.0.0/24", 1)
"10.0.0.1"

> cidrhost("10.0.0.0/24", 254)
"10.0.0.254"

> cidrhost("10.0.0.0/24", -2)
"10.0.0.254"  # Negative counts from end
```

```hcl
locals {
  vpc_cidr    = "10.0.0.0/16"
  gateway_ip  = cidrhost(local.vpc_cidr, 1)   # "10.0.0.1"
  dns_server  = cidrhost(local.vpc_cidr, 2)   # "10.0.0.2"
}
```

## cidrnetmask()

Returns the subnet mask for a CIDR block:

```hcl
> cidrnetmask("10.0.0.0/24")
"255.255.255.0"

> cidrnetmask("10.0.0.0/16")
"255.255.0.0"

> cidrnetmask("10.0.0.0/8")
"255.0.0.0"
```

## cidrsubnet()

Calculates a subnet address within a CIDR block:

```hcl
> cidrsubnet("10.0.0.0/16", 8, 0)
"10.0.0.0/24"

> cidrsubnet("10.0.0.0/16", 8, 1)
"10.0.1.0/24"

> cidrsubnet("10.0.0.0/16", 8, 2)
"10.0.2.0/24"
```

Parameters: `cidrsubnet(prefix, newbits, netnum)`
- `prefix`: the CIDR block to divide
- `newbits`: how many additional bits to add to the prefix length
- `netnum`: which subnet number to return

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

locals {
  # Create 3 public and 3 private subnets
  public_subnets = [
    cidrsubnet(var.vpc_cidr, 4, 0),   # 10.0.0.0/20
    cidrsubnet(var.vpc_cidr, 4, 1),   # 10.0.16.0/20
    cidrsubnet(var.vpc_cidr, 4, 2),   # 10.0.32.0/20
  ]
  private_subnets = [
    cidrsubnet(var.vpc_cidr, 4, 8),   # 10.0.128.0/20
    cidrsubnet(var.vpc_cidr, 4, 9),   # 10.0.144.0/20
    cidrsubnet(var.vpc_cidr, 4, 10),  # 10.0.160.0/20
  ]
}
```

## cidrsubnets()

Allocates multiple subnets of varying sizes from a CIDR block:

```hcl
> cidrsubnets("10.0.0.0/16", 4, 4, 8, 4)
[
  "10.0.0.0/20",    # /16 + 4 bits = /20
  "10.0.16.0/20",
  "10.0.32.0/24",   # /16 + 8 bits = /24 (smaller subnet)
  "10.0.48.0/20",   # next /20-aligned block after the /24
]
```

```hcl
locals {
  # Automatically allocate subnets of different sizes
  subnets = cidrsubnets("10.0.0.0/16",
    4,  # public-a:  /20 (~4096 IPs)
    4,  # public-b:  /20
    4,  # public-c:  /20
    8,  # private-a: /24 (~256 IPs)
    8,  # private-b: /24
    8,  # private-c: /24
  )
  
  public_a  = local.subnets[0]
  public_b  = local.subnets[1]
  public_c  = local.subnets[2]
  private_a = local.subnets[3]
  private_b = local.subnets[4]
  private_c = local.subnets[5]
}
```

## cidrcontains()

Checks whether one CIDR range contains another IP or CIDR range (OpenTofu 1.7+):

```hcl
> cidrcontains("10.0.0.0/8", "10.1.2.3")
true

> cidrcontains("10.0.0.0/8", "192.168.1.1")
false

> cidrcontains("10.0.0.0/16", "10.0.5.0/24")
true  # subnet is within the larger range
```

```hcl
variable "allowed_cidr" {
  default = "10.0.0.0/8"
}

variable "request_ip" {
  type = string
}

locals {
  is_allowed = cidrcontains(var.allowed_cidr, var.request_ip)
}
```

## Conclusion

CIDR functions enable dynamic, calculation-based network configuration - no more manually figuring out subnet CIDRs. Use `cidrsubnet()` for consistent subnet calculation, `cidrsubnets()` for allocating multiple subnets at once, `cidrhost()` to address specific hosts, `cidrnetmask()` for subnet masks, and `cidrcontains()` for IP range membership checks. These functions make network topologies fully reproducible from a single VPC CIDR variable.

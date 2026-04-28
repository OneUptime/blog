# How to Use the cidrhost Function in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Networking

Description: Learn how to use the cidrhost function in OpenTofu to calculate specific host IP addresses within a CIDR block for static IP assignment.

## Introduction

The `cidrhost` function in OpenTofu calculates a specific host IP address within a given CIDR range by host number. It is useful for statically assigning IP addresses to resources like routers, load balancers, NAT gateways, and DNS servers within a subnet.

## Syntax

```hcl
cidrhost(prefix, hostnum)
```

- **prefix** - a CIDR notation block (e.g., `"10.0.0.0/24"`)
- **hostnum** - the host number within the block (0 = network address, -1 = last address, etc.)
- Returns an IP address string

## Basic Examples

```hcl
output "first_host" {
  value = cidrhost("10.0.0.0/24", 1)    # Returns "10.0.0.1"
}

output "tenth_host" {
  value = cidrhost("10.0.0.0/24", 10)   # Returns "10.0.0.10"
}

output "last_host" {
  value = cidrhost("10.0.0.0/24", -2)   # Returns "10.0.0.254"
}

output "broadcast" {
  value = cidrhost("10.0.0.0/24", -1)   # Returns "10.0.0.255" (broadcast)
}
```

## Practical Use Cases

### Assigning Static IPs to Key Resources

```hcl
variable "subnet_cidr" {
  type    = string
  default = "10.0.1.0/24"
}

locals {
  # Conventional IP assignments within the subnet
  gateway_ip       = cidrhost(var.subnet_cidr, 1)   # Router/gateway
  nat_ip           = cidrhost(var.subnet_cidr, 2)   # NAT device
  dns_primary_ip   = cidrhost(var.subnet_cidr, 3)   # Primary DNS
  dns_secondary_ip = cidrhost(var.subnet_cidr, 4)   # Secondary DNS
  lb_ip            = cidrhost(var.subnet_cidr, 5)   # Load balancer
}

output "network_assignments" {
  value = {
    gateway   = local.gateway_ip
    nat       = local.nat_ip
    dns_1     = local.dns_primary_ip
    dns_2     = local.dns_secondary_ip
    lb        = local.lb_ip
  }
}
```

### Fixed IP for Network Appliances

```hcl
resource "aws_network_interface" "nat" {
  subnet_id   = aws_subnet.public.id
  private_ips = [cidrhost(aws_subnet.public.cidr_block, 10)]

  tags = {
    Name = "nat-interface"
  }
}
```

### Generating Static IP Assignments for Multiple Subnets

```hcl
variable "subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

locals {
  # Reserve .1 in each subnet for the gateway
  gateway_ips = [for cidr in var.subnet_cidrs : cidrhost(cidr, 1)]
}

output "gateway_ips" {
  value = local.gateway_ips
  # ["10.0.1.1", "10.0.2.1", "10.0.3.1"]
}
```

### IP Address Documentation

```hcl
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

locals {
  dns_servers = [
    cidrhost(var.vpc_cidr, 2),  # AWS DNS at .2
    "8.8.8.8",
    "8.8.4.4"
  ]
}
```

## Step-by-Step Usage

```bash
tofu console

> cidrhost("172.16.0.0/12", 1)
"172.16.0.1"
> cidrhost("192.168.1.0/24", 100)
"192.168.1.100"
> cidrhost("10.0.0.0/16", -2)
"10.0.255.254"
```

## Conclusion

The `cidrhost` function enables precise, programmatic IP address assignment within subnets in OpenTofu. Use it to assign conventional IP addresses to gateways, load balancers, DNS servers, and NAT devices, ensuring consistency across all your subnet definitions.

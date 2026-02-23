# How to Use the cidrhost Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Networking, CIDR, Infrastructure as Code

Description: Learn how to use Terraform's cidrhost function to calculate specific host IP addresses within a given CIDR network prefix for your infrastructure.

---

When building cloud infrastructure, you frequently need to assign specific IP addresses to resources within a subnet. Instead of hardcoding IP addresses (which is brittle and error-prone), Terraform provides the `cidrhost` function to calculate host addresses dynamically from a CIDR block. This keeps your networking configuration flexible and maintainable.

## What Does cidrhost Do?

The `cidrhost` function calculates a full host IP address within a given network address prefix. You provide a network in CIDR notation and a host number, and it returns the corresponding IP address.

```hcl
# Given the network 10.0.0.0/16, host number 5 yields 10.0.0.5
output "host_ip" {
  value = cidrhost("10.0.0.0/16", 5)
  # Result: "10.0.0.5"
}
```

## Syntax

```hcl
cidrhost(prefix, hostnum)
```

- `prefix` - A string in CIDR notation (e.g., `"10.0.0.0/8"`, `"172.16.0.0/12"`, `"192.168.1.0/24"`)
- `hostnum` - An integer representing the host number within the network. Host numbering starts at 0.

The function returns a string containing the IP address.

## How Host Numbering Works

In CIDR notation, the prefix length determines how many bits identify the network and how many identify hosts. For a `/24` network like `192.168.1.0/24`, there are 8 host bits, giving you addresses from 0 to 255.

```hcl
# In a /24 network, you have 256 possible addresses (0-255)
output "first_host" {
  value = cidrhost("192.168.1.0/24", 0)
  # Result: "192.168.1.0" (network address)
}

output "second_host" {
  value = cidrhost("192.168.1.0/24", 1)
  # Result: "192.168.1.1" (often the gateway)
}

output "last_host" {
  value = cidrhost("192.168.1.0/24", 255)
  # Result: "192.168.1.255" (broadcast address)
}
```

Keep in mind that host 0 is typically the network address and the last host is the broadcast address. Cloud providers usually reserve the first few addresses in a subnet for gateways and internal services.

## Practical Examples

### Assigning a Static IP to an EC2 Instance

AWS VPCs let you assign private IPs to instances. Rather than hardcoding them, calculate them from the subnet CIDR:

```hcl
variable "subnet_cidr" {
  description = "CIDR block for the private subnet"
  type        = string
  default     = "10.0.1.0/24"
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = var.subnet_cidr

  tags = {
    Name = "private-subnet"
  }
}

resource "aws_instance" "database" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.private.id

  # Assign host number 10 within the subnet
  # For 10.0.1.0/24, this gives us 10.0.1.10
  private_ip = cidrhost(var.subnet_cidr, 10)

  tags = {
    Name = "database-server"
  }
}
```

### Setting Up a Load Balancer with a Known IP

When you need a predictable IP for internal DNS or configuration:

```hcl
locals {
  # Define the subnet CIDR once and derive all IPs from it
  app_subnet_cidr = "10.0.2.0/24"

  # Reserve specific host numbers for specific roles
  lb_ip  = cidrhost(local.app_subnet_cidr, 10)
  app_ip = cidrhost(local.app_subnet_cidr, 20)
  db_ip  = cidrhost(local.app_subnet_cidr, 30)
}

output "assigned_ips" {
  value = {
    load_balancer = local.lb_ip   # 10.0.2.10
    application   = local.app_ip  # 10.0.2.20
    database      = local.db_ip   # 10.0.2.30
  }
}
```

### Generating Multiple Host IPs with count

When deploying multiple instances that each need a unique static IP:

```hcl
variable "instance_count" {
  description = "Number of application servers"
  type        = number
  default     = 3
}

variable "app_subnet_cidr" {
  description = "CIDR for the application subnet"
  type        = string
  default     = "10.0.3.0/24"
}

resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.app.id

  # Start at host 10 and increment for each instance
  # Gives us 10.0.3.10, 10.0.3.11, 10.0.3.12
  private_ip = cidrhost(var.app_subnet_cidr, 10 + count.index)

  tags = {
    Name = "app-server-${count.index + 1}"
  }
}
```

### Working with for_each

You can also use `cidrhost` with `for_each` for named instances:

```hcl
locals {
  servers = {
    web    = 10
    api    = 20
    worker = 30
    cache  = 40
  }
  subnet_cidr = "10.0.5.0/24"
}

resource "aws_instance" "servers" {
  for_each      = local.servers
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.main.id

  # Each server gets its assigned host number
  private_ip = cidrhost(local.subnet_cidr, each.value)

  tags = {
    Name = "${each.key}-server"
    IP   = cidrhost(local.subnet_cidr, each.value)
  }
}
```

## Combining cidrhost with cidrsubnet

A powerful pattern is to first calculate a subnet using `cidrsubnet`, then assign hosts within it using `cidrhost`:

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

locals {
  # Carve out a /24 subnet from the VPC
  app_subnet = cidrsubnet(var.vpc_cidr, 8, 1)  # 10.0.1.0/24

  # Assign specific hosts within that subnet
  gateway_ip = cidrhost(local.app_subnet, 1)    # 10.0.1.1
  server_ip  = cidrhost(local.app_subnet, 100)  # 10.0.1.100
}
```

This approach keeps all your network calculations dynamic and derived from a single VPC CIDR variable. For more on `cidrsubnet`, see our [guide to the cidrsubnet function](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-cidrsubnet-function-in-terraform/view).

## Common Pitfalls

### Exceeding the Host Range

If your host number exceeds the available addresses in the prefix, Terraform will throw an error:

```hcl
# A /24 network only has 256 addresses (0-255)
# This will fail with an error
output "invalid" {
  value = cidrhost("192.168.1.0/24", 256)
}
```

### Forgetting Reserved Addresses

Cloud providers typically reserve the first few IP addresses in a subnet. For AWS VPCs, the first four addresses and the last address in each subnet are reserved. So for a `10.0.1.0/24` subnet:

- `10.0.1.0` - Network address
- `10.0.1.1` - VPC router
- `10.0.1.2` - DNS server
- `10.0.1.3` - Reserved for future use
- `10.0.1.255` - Broadcast address

Start your host numbering at 4 or higher to avoid conflicts:

```hcl
# Safe starting point for AWS subnets
locals {
  first_usable_host = cidrhost("10.0.1.0/24", 4)
  # Result: 10.0.1.4
}
```

## Summary

The `cidrhost` function is essential for anyone building network infrastructure with Terraform. It lets you calculate IP addresses programmatically from CIDR blocks, eliminating hardcoded IPs and making your configurations adaptable to different environments. Combined with `cidrsubnet` for dynamic subnet allocation, `cidrhost` gives you a complete toolkit for managing IP addressing in your infrastructure code.

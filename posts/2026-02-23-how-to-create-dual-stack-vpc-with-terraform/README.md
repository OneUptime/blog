# How to Create Dual-Stack VPC with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, VPC, IPv6, Networking, Infrastructure as Code

Description: Learn how to create a dual-stack VPC supporting both IPv4 and IPv6 with Terraform, including subnets, route tables, and security groups for modern network architectures.

---

As organizations modernize their cloud infrastructure, supporting both IPv4 and IPv6 becomes increasingly important. A dual-stack VPC allows your resources to communicate over both protocols simultaneously, ensuring compatibility with legacy systems while embracing the future of internet protocols. In this guide, we will walk through creating a complete dual-stack VPC using Terraform.

## Why Dual-Stack VPC?

IPv4 address exhaustion is a real concern. While NAT gateways and private addressing help, IPv6 provides a virtually unlimited address space. A dual-stack approach gives you the best of both worlds - backward compatibility with IPv4 and forward readiness with IPv6. AWS assigns a /56 IPv6 CIDR block to your VPC from Amazon's pool, giving you plenty of addresses to work with.

Dual-stack VPCs are particularly useful when you need to serve content to IPv6-only clients, comply with government mandates requiring IPv6 support, or reduce dependency on NAT gateways for outbound IPv6 traffic.

## Prerequisites

Before starting, make sure you have Terraform 1.0 or later installed, AWS CLI configured with appropriate credentials, and a basic understanding of VPC networking concepts. You should also have familiarity with IPv6 addressing and CIDR notation.

## Creating the Dual-Stack VPC

Let us start with the VPC resource that supports both IPv4 and IPv6.

```hcl
# Configure the AWS provider
provider "aws" {
  region = "us-east-1"
}

# Create a VPC with both IPv4 and IPv6 support
resource "aws_vpc" "dual_stack" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true  # Request an Amazon-provided IPv6 CIDR block
  enable_dns_support               = true
  enable_dns_hostnames             = true

  tags = {
    Name        = "dual-stack-vpc"
    Environment = "production"
  }
}
```

The key setting here is `assign_generated_ipv6_cidr_block = true`, which tells AWS to assign a /56 IPv6 CIDR block from Amazon's pool. This gives you 256 /64 subnets to work with.

## Creating Dual-Stack Subnets

Next, we create subnets that support both IPv4 and IPv6 addressing.

```hcl
# Define availability zones to use
data "aws_availability_zones" "available" {
  state = "available"
}

# Create public subnets with dual-stack addressing
resource "aws_subnet" "public" {
  count = 3

  vpc_id                          = aws_vpc.dual_stack.id
  cidr_block                      = cidrsubnet(aws_vpc.dual_stack.cidr_block, 8, count.index)
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.dual_stack.ipv6_cidr_block, 8, count.index)
  availability_zone               = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch         = true
  assign_ipv6_address_on_creation = true  # Auto-assign IPv6 addresses to instances

  tags = {
    Name = "public-dual-stack-${count.index + 1}"
    Tier = "public"
  }
}

# Create private subnets with dual-stack addressing
resource "aws_subnet" "private" {
  count = 3

  vpc_id                          = aws_vpc.dual_stack.id
  cidr_block                      = cidrsubnet(aws_vpc.dual_stack.cidr_block, 8, count.index + 10)
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.dual_stack.ipv6_cidr_block, 8, count.index + 10)
  availability_zone               = data.aws_availability_zones.available.names[count.index]
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "private-dual-stack-${count.index + 1}"
    Tier = "private"
  }
}
```

The `cidrsubnet` function is used to calculate both IPv4 and IPv6 subnet ranges automatically. The `assign_ipv6_address_on_creation` flag ensures that any EC2 instance launched in these subnets automatically receives an IPv6 address.

## Internet Gateway and Egress-Only Internet Gateway

For IPv4, we use a standard Internet Gateway. For IPv6, we also need an Egress-Only Internet Gateway for private subnets.

```hcl
# Internet Gateway for public IPv4 and IPv6 traffic
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.dual_stack.id

  tags = {
    Name = "dual-stack-igw"
  }
}

# Egress-Only Internet Gateway for private IPv6 outbound traffic
# This is the IPv6 equivalent of a NAT gateway - allows outbound but blocks inbound
resource "aws_egress_only_internet_gateway" "main" {
  vpc_id = aws_vpc.dual_stack.id

  tags = {
    Name = "dual-stack-eigw"
  }
}

# NAT Gateway for private IPv4 outbound traffic
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "dual-stack-nat"
  }
}
```

The egress-only internet gateway is a critical component for dual-stack architectures. It allows instances in private subnets to initiate outbound IPv6 connections while preventing inbound IPv6 connections from the internet. Think of it as the IPv6 equivalent of a NAT gateway, but without address translation since IPv6 addresses are globally unique.

## Route Tables for Dual-Stack Traffic

Configure route tables to handle both IPv4 and IPv6 routing.

```hcl
# Public route table with IPv4 and IPv6 routes to the internet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.dual_stack.id

  # IPv4 route to the internet
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  # IPv6 route to the internet
  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-dual-stack-rt"
  }
}

# Private route table with NAT for IPv4 and egress-only for IPv6
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.dual_stack.id

  # IPv4 outbound through NAT Gateway
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  # IPv6 outbound through Egress-Only Internet Gateway
  route {
    ipv6_cidr_block        = "::/0"
    egress_only_gateway_id = aws_egress_only_internet_gateway.main.id
  }

  tags = {
    Name = "private-dual-stack-rt"
  }
}

# Associate public subnets with the public route table
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Associate private subnets with the private route table
resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

## Security Groups for Dual-Stack

Security groups must include rules for both IPv4 and IPv6 traffic.

```hcl
# Security group that handles both IPv4 and IPv6 traffic
resource "aws_security_group" "dual_stack_web" {
  name_prefix = "dual-stack-web-"
  vpc_id      = aws_vpc.dual_stack.id
  description = "Allow web traffic over IPv4 and IPv6"

  # Allow HTTP from IPv4
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from IPv4"
  }

  # Allow HTTP from IPv6
  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    ipv6_cidr_blocks = ["::/0"]
    description      = "HTTP from IPv6"
  }

  # Allow HTTPS from IPv4
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from IPv4"
  }

  # Allow HTTPS from IPv6
  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    ipv6_cidr_blocks = ["::/0"]
    description      = "HTTPS from IPv6"
  }

  # Allow all outbound traffic for both protocols
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
    description      = "Allow all outbound"
  }

  tags = {
    Name = "dual-stack-web-sg"
  }
}
```

## Network ACLs for Dual-Stack

Network ACLs provide an additional layer of security at the subnet level.

```hcl
# Network ACL with dual-stack rules
resource "aws_network_acl" "dual_stack" {
  vpc_id     = aws_vpc.dual_stack.id
  subnet_ids = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)

  # Allow inbound IPv4 traffic
  ingress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  # Allow inbound IPv6 traffic
  ingress {
    protocol        = "-1"
    rule_no         = 101
    action          = "allow"
    ipv6_cidr_block = "::/0"
    from_port       = 0
    to_port         = 0
  }

  # Allow outbound IPv4 traffic
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  # Allow outbound IPv6 traffic
  egress {
    protocol        = "-1"
    rule_no         = 101
    action          = "allow"
    ipv6_cidr_block = "::/0"
    from_port       = 0
    to_port         = 0
  }

  tags = {
    Name = "dual-stack-nacl"
  }
}
```

## Useful Outputs

Define outputs to retrieve the important values from your dual-stack VPC.

```hcl
# Output the VPC information
output "vpc_id" {
  value = aws_vpc.dual_stack.id
}

output "vpc_ipv4_cidr" {
  value = aws_vpc.dual_stack.cidr_block
}

output "vpc_ipv6_cidr" {
  value = aws_vpc.dual_stack.ipv6_cidr_block
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

## Testing Your Dual-Stack VPC

After applying the Terraform configuration, you can verify the dual-stack setup by launching an EC2 instance and checking that it receives both IPv4 and IPv6 addresses. Use `ip addr show` on the instance to confirm both address families are assigned.

## Common Pitfalls

One common mistake is forgetting to add IPv6 rules to security groups. Even if your subnets support IPv6, traffic will be blocked without matching security group rules. Another pitfall is not using the egress-only internet gateway for private subnets, which would leave your private instances either without IPv6 internet access or with unwanted inbound access.

Also remember that not all AWS services fully support IPv6 yet. Check the documentation for each service you plan to use in your dual-stack VPC.

## Conclusion

Creating a dual-stack VPC with Terraform provides a solid foundation for modern cloud networking. By supporting both IPv4 and IPv6, you ensure compatibility with existing systems while preparing for the future. The key components are the VPC with an assigned IPv6 CIDR block, dual-stack subnets, proper routing with both an internet gateway and egress-only internet gateway, and security groups that cover both address families.

For more Terraform networking guides, check out our post on [How to Configure Multi-Region Network Architecture with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-multi-region-network-architecture-with-terraform/view).

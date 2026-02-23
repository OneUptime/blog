# How to Handle IPv6 Networking with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, IPv6, AWS, VPC, Networking, Dual-Stack, Internet Gateway

Description: Learn how to configure IPv6 networking in AWS with Terraform, including dual-stack VPCs, subnets, security groups, and egress-only internet gateways.

---

As IPv4 address space becomes increasingly scarce, IPv6 adoption is growing rapidly. AWS provides full IPv6 support for VPCs, enabling dual-stack configurations where resources have both IPv4 and IPv6 addresses. Terraform makes it straightforward to configure IPv6 networking, from VPC CIDR allocation to security groups and routing. In this guide, we will build a complete dual-stack network infrastructure with Terraform.

## Why IPv6

IPv6 provides a vastly larger address space (128-bit vs 32-bit), eliminating the need for NAT in many scenarios. Resources with IPv6 addresses can communicate directly over the internet without NAT Gateways, potentially reducing costs. AWS provides IPv6 CIDR blocks at no additional charge. Many modern applications and mobile networks are IPv6-native, making dual-stack support increasingly important.

## Prerequisites

You need Terraform 1.0 or later and an AWS account. No special IPv6 allocation is needed since AWS provides IPv6 CIDR blocks from Amazon's pool.

## Creating a Dual-Stack VPC

Start with a VPC that supports both IPv4 and IPv6:

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Dual-stack VPC with IPv4 and IPv6
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  # Request an Amazon-provided IPv6 CIDR block
  assign_generated_ipv6_cidr_block = true

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "dual-stack-vpc" }
}
```

When you set `assign_generated_ipv6_cidr_block = true`, AWS automatically assigns a /56 IPv6 CIDR block from Amazon's pool.

## Creating Dual-Stack Subnets

Create subnets with both IPv4 and IPv6 CIDR blocks:

```hcl
# Public dual-stack subnet
resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  # Assign a /64 IPv6 CIDR from the VPC's /56 block
  ipv6_cidr_block = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)

  # Automatically assign IPv6 addresses to instances
  assign_ipv6_address_on_creation = true

  # Also assign public IPv4 addresses
  map_public_ip_on_launch = true

  tags = { Name = "public-dual-stack-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 2)
  assign_ipv6_address_on_creation = true
  map_public_ip_on_launch         = true

  tags = { Name = "public-dual-stack-b" }
}

# Private dual-stack subnet (IPv6 egress only)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"

  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 10)
  assign_ipv6_address_on_creation = true

  tags = { Name = "private-dual-stack-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "us-east-1b"

  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 11)
  assign_ipv6_address_on_creation = true

  tags = { Name = "private-dual-stack-b" }
}
```

The `cidrsubnet` function carves out /64 subnets from the VPC's /56 block. The second parameter (8) indicates how many additional bits to use for the subnet prefix.

## Configuring Internet Access

For IPv6, you need an Internet Gateway for public subnets and an Egress-Only Internet Gateway for private subnets:

```hcl
# Internet Gateway (handles both IPv4 and IPv6 for public subnets)
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "dual-stack-igw" }
}

# Egress-Only Internet Gateway (IPv6 only, for private subnets)
# Allows outbound IPv6 traffic but prevents inbound from the internet
resource "aws_egress_only_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "eigw" }
}
```

The Egress-Only Internet Gateway is the IPv6 equivalent of a NAT Gateway. It allows outbound traffic but blocks inbound connections from the internet. Unlike NAT Gateways, there is no charge for egress-only internet gateways.

## Configuring Route Tables

Set up route tables for both IPv4 and IPv6:

```hcl
# Public route table with IPv4 and IPv6 internet routes
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # IPv4 internet route
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  # IPv6 internet route
  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.main.id
  }

  tags = { Name = "public-dual-stack-rt" }
}

# Associate public subnets
resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# Private route table with IPv4 NAT and IPv6 egress-only
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  # IPv4 via NAT Gateway
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  # IPv6 via Egress-Only Internet Gateway
  route {
    ipv6_cidr_block        = "::/0"
    egress_only_gateway_id = aws_egress_only_internet_gateway.main.id
  }

  tags = { Name = "private-dual-stack-rt" }
}

# NAT Gateway for IPv4 (still needed for private subnet IPv4)
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id

  tags = { Name = "nat-gw" }
}

# Associate private subnets
resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}
```

## Security Groups with IPv6 Rules

Configure security groups that handle both IPv4 and IPv6 traffic:

```hcl
# Web server security group with dual-stack rules
resource "aws_security_group" "web" {
  name   = "web-dual-stack-sg"
  vpc_id = aws_vpc.main.id

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

  # Allow all outbound IPv4
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound IPv4"
  }

  # Allow all outbound IPv6
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    ipv6_cidr_blocks = ["::/0"]
    description      = "All outbound IPv6"
  }

  tags = { Name = "web-dual-stack-sg" }
}
```

## Network ACLs with IPv6

Configure NACLs for IPv6 traffic:

```hcl
# NACL with IPv6 rules
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = { Name = "public-dual-stack-nacl" }
}

# IPv4 HTTP inbound
resource "aws_network_acl_rule" "ipv4_http_in" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 80
  to_port        = 80
}

# IPv6 HTTP inbound
resource "aws_network_acl_rule" "ipv6_http_in" {
  network_acl_id  = aws_network_acl.public.id
  rule_number     = 101
  egress          = false
  protocol        = "tcp"
  rule_action     = "allow"
  ipv6_cidr_block = "::/0"
  from_port       = 80
  to_port         = 80
}

# IPv4 HTTPS inbound
resource "aws_network_acl_rule" "ipv4_https_in" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 110
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 443
  to_port        = 443
}

# IPv6 HTTPS inbound
resource "aws_network_acl_rule" "ipv6_https_in" {
  network_acl_id  = aws_network_acl.public.id
  rule_number     = 111
  egress          = false
  protocol        = "tcp"
  rule_action     = "allow"
  ipv6_cidr_block = "::/0"
  from_port       = 443
  to_port         = 443
}

# IPv4 ephemeral inbound
resource "aws_network_acl_rule" "ipv4_ephemeral_in" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 120
  egress         = false
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}

# IPv6 ephemeral inbound
resource "aws_network_acl_rule" "ipv6_ephemeral_in" {
  network_acl_id  = aws_network_acl.public.id
  rule_number     = 121
  egress          = false
  protocol        = "tcp"
  rule_action     = "allow"
  ipv6_cidr_block = "::/0"
  from_port       = 1024
  to_port         = 65535
}

# IPv4 all outbound
resource "aws_network_acl_rule" "ipv4_all_out" {
  network_acl_id = aws_network_acl.public.id
  rule_number    = 100
  egress         = true
  protocol       = "-1"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 0
  to_port        = 0
}

# IPv6 all outbound
resource "aws_network_acl_rule" "ipv6_all_out" {
  network_acl_id  = aws_network_acl.public.id
  rule_number     = 101
  egress          = true
  protocol        = "-1"
  rule_action     = "allow"
  ipv6_cidr_block = "::/0"
  from_port       = 0
  to_port         = 0
}
```

## IPv6-Only Subnets

For workloads that only need IPv6:

```hcl
# IPv6-only subnet (no IPv4)
resource "aws_subnet" "ipv6_only" {
  vpc_id            = aws_vpc.main.id
  availability_zone = "us-east-1a"

  # No IPv4 CIDR
  ipv6_cidr_block   = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 50)
  ipv6_native       = true

  assign_ipv6_address_on_creation = true

  enable_dns64                    = true
  enable_resource_name_dns_aaaa_record_on_launch = true

  tags = { Name = "ipv6-only-subnet" }
}
```

## ALB with IPv6

Configure a load balancer to accept IPv6 traffic:

```hcl
# Dual-stack ALB
resource "aws_lb" "dual_stack" {
  name               = "dual-stack-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.web.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  # Enable dual-stack (IPv4 + IPv6)
  ip_address_type = "dualstack"

  tags = { Name = "dual-stack-alb" }
}
```

## Outputs

```hcl
output "vpc_ipv6_cidr" {
  description = "IPv6 CIDR block of the VPC"
  value       = aws_vpc.main.ipv6_cidr_block
}

output "public_subnet_ipv6_cidrs" {
  description = "IPv6 CIDR blocks of public subnets"
  value = [
    aws_subnet.public_a.ipv6_cidr_block,
    aws_subnet.public_b.ipv6_cidr_block,
  ]
}

output "alb_dns_name" {
  description = "DNS name of the dual-stack ALB"
  value       = aws_lb.dual_stack.dns_name
}
```

## Monitoring IPv6 Connectivity

Monitor both IPv4 and IPv6 connectivity to your resources with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-ipv6-networking-with-terraform/view) to ensure your dual-stack infrastructure is reachable over both protocols.

## Best Practices

Use `cidrsubnet` to consistently carve out IPv6 subnets. Always configure security groups and NACLs for both IPv4 and IPv6. Use egress-only internet gateways for private subnet IPv6 access instead of NAT. Enable `assign_ipv6_address_on_creation` on subnets that need IPv6. Consider IPv6-only subnets for workloads that do not need IPv4 to reduce NAT costs.

## Conclusion

IPv6 networking with Terraform prepares your infrastructure for the future while potentially reducing costs by eliminating NAT for IPv6 traffic. Dual-stack configurations ensure backward compatibility while supporting modern IPv6 clients. Terraform's declarative approach makes it manageable to maintain consistent IPv6 configurations across security groups, NACLs, route tables, and other networking components.

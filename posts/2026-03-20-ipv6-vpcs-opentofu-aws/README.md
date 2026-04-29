# How to Create IPv6 VPCs with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, VPC, IPv6, Networking, Infrastructure as Code, Egress-Only Gateway

Description: Learn how to create AWS VPCs with IPv6 CIDR blocks, configure IPv6-enabled subnets, and set up egress-only internet gateways using OpenTofu.

## Introduction

AWS provides Amazon-assigned IPv6 /56 CIDR blocks for VPCs at no extra charge. IPv6 addresses are globally unique and routable, making them useful for dual-stack architectures. This guide covers creating an IPv6-enabled VPC with egress-only internet access for private resources.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with VPC permissions
- Understanding of IPv6 addressing

## Step 1: Create IPv6-Enabled VPC

```hcl
# AWS automatically assigns an Amazon-provided IPv6 /56 CIDR

# when assign_generated_ipv6_cidr_block is set to true
resource "aws_vpc" "ipv6" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true
  enable_dns_support               = true
  enable_dns_hostnames             = true

  tags = {
    Name = "ipv6-vpc"
  }
}
```

## Step 2: Create IPv6-Enabled Subnets

```hcl
# Fetch available AZs for subnet placement
data "aws_availability_zones" "available" {
  state = "available"
}

# Assign a /64 IPv6 CIDR to each subnet from the VPC's /56 block
resource "aws_subnet" "public_ipv6" {
  count  = 2
  vpc_id = aws_vpc.ipv6.id

  # IPv4 CIDR for the subnet
  cidr_block = cidrsubnet(aws_vpc.ipv6.cidr_block, 8, count.index)

  # Carve a /64 from the VPC's /56 IPv6 CIDR
  ipv6_cidr_block = cidrsubnet(aws_vpc.ipv6.ipv6_cidr_block, 8, count.index)

  availability_zone               = data.aws_availability_zones.available.names[count.index]
  assign_ipv6_address_on_creation = true  # Auto-assign IPv6 to instances

  tags = {
    Name = "ipv6-public-subnet-${count.index + 1}"
  }
}

resource "aws_subnet" "private_ipv6" {
  count  = 2
  vpc_id = aws_vpc.ipv6.id

  cidr_block      = cidrsubnet(aws_vpc.ipv6.cidr_block, 8, count.index + 10)
  ipv6_cidr_block = cidrsubnet(aws_vpc.ipv6.ipv6_cidr_block, 8, count.index + 10)

  availability_zone               = data.aws_availability_zones.available.names[count.index]
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "ipv6-private-subnet-${count.index + 1}"
  }
}
```

## Step 3: Internet Gateway for Public IPv6

```hcl
# Standard internet gateway supports both IPv4 and IPv6
resource "aws_internet_gateway" "ipv6" {
  vpc_id = aws_vpc.ipv6.id
  tags   = { Name = "ipv6-igw" }
}
```

## Step 4: Egress-Only Internet Gateway for Private IPv6

```hcl
# Egress-only internet gateway allows outbound IPv6 traffic
# from private subnets while blocking inbound connections
resource "aws_egress_only_internet_gateway" "private" {
  vpc_id = aws_vpc.ipv6.id
  tags   = { Name = "egress-only-igw" }
}
```

## Step 5: Configure Route Tables

```hcl
# Public route table with both IPv4 and IPv6 internet routes
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.ipv6.id

  # IPv4 internet route
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.ipv6.id
  }

  # IPv6 internet route
  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.ipv6.id
  }

  tags = { Name = "ipv6-public-rt" }
}

# Private route table using egress-only gateway for IPv6
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.ipv6.id

  route {
    ipv6_cidr_block        = "::/0"
    egress_only_gateway_id = aws_egress_only_internet_gateway.private.id
  }

  tags = { Name = "ipv6-private-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public_ipv6[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private_ipv6[count.index].id
  route_table_id = aws_route_table.private.id
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have created a dual-stack IPv6 VPC with public subnets using a standard internet gateway and private subnets using an egress-only internet gateway. IPv6-enabled instances in private subnets can initiate outbound connections without being reachable from the internet, maintaining security while enabling modern protocol support.

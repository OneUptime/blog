# How to Set Up Dual-Stack VPCs with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, VPC, IPv4, IPv6, Dual-Stack, Networking, Infrastructure as Code

Description: Learn how to configure dual-stack AWS VPCs supporting both IPv4 and IPv6 traffic simultaneously using OpenTofu, enabling modern application compatibility and future-proof networking.

## Introduction

Dual-stack VPCs run IPv4 and IPv6 simultaneously, enabling gradual migration to IPv6 while maintaining backward compatibility. Applications can communicate over either protocol based on client and server capabilities. This guide covers a complete dual-stack setup.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with VPC permissions and a configured AWS Region

## Step 1: Create the Dual-Stack VPC

```hcl
# Enable both IPv4 and the Amazon-provided IPv6 /56 block

resource "aws_vpc" "dual_stack" {
  cidr_block                       = "10.10.0.0/16"
  assign_generated_ipv6_cidr_block = true
  enable_dns_support               = true
  enable_dns_hostnames             = true

  tags = {
    Name    = "dual-stack-vpc"
    Network = "DualStack"
  }
}
```

## Step 2: Dual-Stack Public Subnets

```hcl
# Use standard Availability Zones for the dual-stack subnets
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# Public subnets with both IPv4 and IPv6 CIDR blocks
resource "aws_subnet" "public" {
  count  = length(data.aws_availability_zones.available.names)
  vpc_id = aws_vpc.dual_stack.id

  cidr_block              = cidrsubnet("10.10.0.0/16", 8, count.index)
  ipv6_cidr_block         = cidrsubnet(aws_vpc.dual_stack.ipv6_cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]

  # Auto-assign both IPv4 public IP and IPv6 on launch
  map_public_ip_on_launch         = true
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "dual-stack-public-${count.index + 1}"
    Tier = "Public"
  }
}
```

## Step 3: Dual-Stack Private Subnets

```hcl
resource "aws_subnet" "private" {
  count  = length(data.aws_availability_zones.available.names)
  vpc_id = aws_vpc.dual_stack.id

  cidr_block      = cidrsubnet("10.10.0.0/16", 8, count.index + 100)
  ipv6_cidr_block = cidrsubnet(aws_vpc.dual_stack.ipv6_cidr_block, 8, count.index + 100)

  availability_zone               = data.aws_availability_zones.available.names[count.index]
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "dual-stack-private-${count.index + 1}"
    Tier = "Private"
  }
}
```

## Step 4: Internet Gateway and Egress-Only IGW

```hcl
resource "aws_internet_gateway" "dual_stack" {
  vpc_id = aws_vpc.dual_stack.id
  tags   = { Name = "dual-stack-igw" }
}

# For private subnets: IPv6 outbound only
resource "aws_egress_only_internet_gateway" "dual_stack" {
  vpc_id = aws_vpc.dual_stack.id
  tags   = { Name = "dual-stack-eigw" }
}

# For private subnets: IPv4 outbound via NAT
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "dual_stack" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "dual-stack-nat" }

  # Ensure the Internet Gateway is attached before creating the public NAT gateway
  depends_on = [aws_internet_gateway.dual_stack]
}
```

## Step 5: Route Tables for Both Protocols

```hcl
# Public route table handles both IPv4 and IPv6 internet traffic
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.dual_stack.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.dual_stack.id
  }

  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.dual_stack.id
  }

  tags = { Name = "dual-stack-public-rt" }
}

# Private route table uses NAT for IPv4, egress-only IGW for IPv6
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.dual_stack.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.dual_stack.id
  }

  route {
    ipv6_cidr_block        = "::/0"
    egress_only_gateway_id = aws_egress_only_internet_gateway.dual_stack.id
  }

  tags = { Name = "dual-stack-private-rt" }
}

resource "aws_route_table_association" "public" {
  count = length(data.aws_availability_zones.available.names)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = length(data.aws_availability_zones.available.names)

  subnet_id      = aws_subnet.private[count.index].id
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

You now have a fully operational dual-stack VPC where resources in public subnets receive both IPv4 and IPv6 addresses and can communicate over either protocol. Private resources can initiate outbound connections via NAT (IPv4) or the egress-only internet gateway (IPv6), future-proofing your infrastructure as IPv6 adoption grows.

# How to Create a Shared Services VPC with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, VPC, Shared Services, Networking, Infrastructure as Code, Transit Gateway

Description: Learn how to design and deploy a centralized shared services VPC on AWS using OpenTofu to host common infrastructure like DNS, monitoring, and CI/CD tools accessible from all workload VPCs.

## Introduction

A shared services VPC centralizes common infrastructure components-such as internal DNS resolvers, monitoring agents, artifact registries, and CI/CD tooling-into a single VPC that multiple workload VPCs connect to. This reduces duplication and simplifies management.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials and an AWS Region configured with VPC and networking permissions
- Existing Transit Gateway ID

## Step 1: Create the Shared Services VPC

```hcl
# Create the shared services VPC with DNS support enabled

resource "aws_vpc" "shared" {
  cidr_block           = "10.100.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "shared-services-vpc"
    Type = "SharedServices"
  }
}
```

## Step 2: Create Public and Private Subnets

```hcl
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# Private subnets for internal services across two AZs
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.shared.id
  cidr_block        = cidrsubnet("10.100.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "shared-private-${count.index + 1}"
    Tier = "Private"
  }
}

# Public subnet for NAT Gateway
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.shared.id
  cidr_block              = cidrsubnet("10.100.0.0/16", 8, count.index + 10)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false

  tags = {
    Name = "shared-public-${count.index + 1}"
    Tier = "Public"
  }
}
```

## Step 3: Internet Gateway and NAT Gateway

```hcl
resource "aws_internet_gateway" "shared" {
  vpc_id = aws_vpc.shared.id
  tags   = { Name = "shared-igw" }
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "shared" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "shared-nat-gw" }

  depends_on = [aws_internet_gateway.shared]
}
```

## Step 4: Route Tables

```hcl
# Public route table for NAT Gateway subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.shared.id

  tags = { Name = "shared-public-rt" }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.shared.id
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route table routes outbound traffic through the NAT Gateway
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.shared.id

  tags = { Name = "shared-private-rt" }
}

resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.shared.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

## Step 5: Attach to Transit Gateway

```hcl
variable "transit_gateway_id" {
  description = "ID of the existing Transit Gateway"
  type        = string
}

# Attach the shared services VPC to the Transit Gateway
# so it can exchange traffic with workload VPCs that also have TGW routes
resource "aws_ec2_transit_gateway_vpc_attachment" "shared" {
  subnet_ids         = aws_subnet.private[*].id
  transit_gateway_id = var.transit_gateway_id
  vpc_id             = aws_vpc.shared.id

  tags = { Name = "shared-services-tgw-attachment" }
}

# Route traffic from the shared services VPC to workload VPC CIDRs
resource "aws_route" "to_workloads" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "10.0.0.0/8"
  transit_gateway_id     = var.transit_gateway_id

  depends_on = [aws_ec2_transit_gateway_vpc_attachment.shared]
}
```

## Step 6: Security Groups for Shared Services

```hcl
# Security group allowing inbound from all internal VPCs
resource "aws_security_group" "shared_services" {
  name        = "shared-services-sg"
  description = "Allow inbound from internal network"
  vpc_id      = aws_vpc.shared.id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Allow all from internal"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You now have a shared services VPC connected to your Transit Gateway, ready to host centralized infrastructure. After the workload VPC route tables and Transit Gateway route tables include the corresponding routes, workload VPCs can reach shared services without direct peering between each other, simplifying your network topology and reducing operational overhead.

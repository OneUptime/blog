# How to Create a VPC with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, VPC, Networking, Infrastructure as Code

Description: Learn how to create a complete AWS VPC with OpenTofu, including public and private subnets, route tables, and an internet gateway.

## Introduction

A Virtual Private Cloud (VPC) is the networking foundation for all AWS resources. This guide walks through creating a production-ready VPC with public subnets, private subnets, route tables, and an internet gateway using OpenTofu.

## VPC and Internet Gateway

```hcl
# Fetch available AZs in the region

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.name}-vpc"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.name}-igw"
  }
}
```

## Public Subnets

```hcl
# Create one public subnet per availability zone
resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  # Instances in public subnets get a public IP automatically
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.name}-public-${count.index + 1}"
    Type = "public"
  }
}

# Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.name}-public-rt"
  }
}

# Associate each public subnet with the public route table
resource "aws_route_table_association" "public" {
  count = var.az_count

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

## Private Subnets

```hcl
resource "aws_subnet" "private" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + var.az_count)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.name}-private-${count.index + 1}"
    Type = "private"
  }
}

# Each private subnet gets its own route table (one per AZ for NAT gateway HA)
resource "aws_route_table" "private" {
  count  = var.az_count
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.name}-private-rt-${count.index + 1}"
  }
}

resource "aws_route_table_association" "private" {
  count = var.az_count

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

## Variables and Outputs

```hcl
# variables.tf
variable "name"        { type = string }
variable "environment" { type = string }

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "az_count" {
  type    = number
  default = 2
}

# outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "internet_gateway_id" {
  value = aws_internet_gateway.main.id
}
```

## CIDR Allocation Explained

With a `10.0.0.0/16` VPC and `az_count = 3`, the `cidrsubnet` function allocates:

| Subnet | CIDR | Type |
|---|---|---|
| public-1 | 10.0.0.0/24 | Public |
| public-2 | 10.0.1.0/24 | Public |
| public-3 | 10.0.2.0/24 | Public |
| private-1 | 10.0.3.0/24 | Private |
| private-2 | 10.0.4.0/24 | Private |
| private-3 | 10.0.5.0/24 | Private |

## Conclusion

This VPC configuration provides a solid multi-AZ networking foundation. Next steps include adding a NAT Gateway to give private subnet instances outbound internet access, VPC Flow Logs for network visibility, and VPC endpoints for private access to AWS services.

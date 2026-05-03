# How to Create VPCs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, AWS, VPC, Terraform, IaC, DevOps, Networking

Description: Learn how to create a complete AWS VPC with public and private subnets, internet gateway, NAT gateway, and route tables using OpenTofu.

## Introduction

A production VPC in AWS includes multiple components: the VPC itself, public and private subnets across multiple AZs, an internet gateway for public traffic, NAT gateways for private subnet outbound traffic, and route tables. OpenTofu makes this declarative and reproducible.

## VPC and Core Resources

```hcl
# Look up available AZs

data "aws_availability_zones" "available" {
  state = "available"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${var.environment}-vpc" }
}
```

## Public Subnets

```hcl
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.environment}-public-${count.index + 1}"
    Type = "public"
  }
}
```

## Private Subnets

```hcl
resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.environment}-private-${count.index + 1}"
    Type = "private"
  }
}
```

## Internet Gateway

```hcl
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.environment}-igw" }
}
```

## NAT Gateway (One per AZ for HA)

```hcl
# Elastic IPs for NAT gateways
resource "aws_eip" "nat" {
  count  = length(var.public_subnet_cidrs)
  domain = "vpc"

  tags = { Name = "${var.environment}-nat-eip-${count.index + 1}" }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways in each public subnet
resource "aws_nat_gateway" "main" {
  count         = length(var.public_subnet_cidrs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = { Name = "${var.environment}-nat-${count.index + 1}" }

  depends_on = [aws_internet_gateway.main]
}
```

## Route Tables

```hcl
# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.environment}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route tables (one per AZ for resilience)
resource "aws_route_table" "private" {
  count  = length(var.private_subnet_cidrs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = { Name = "${var.environment}-private-rt-${count.index + 1}" }
}

resource "aws_route_table_association" "private" {
  count          = length(var.private_subnet_cidrs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

## Variables

```hcl
variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}
```

## Outputs

```hcl
output "vpc_id"              { value = aws_vpc.main.id }
output "vpc_cidr"            { value = aws_vpc.main.cidr_block }
output "public_subnet_ids"   { value = aws_subnet.public[*].id }
output "private_subnet_ids"  { value = aws_subnet.private[*].id }
output "nat_gateway_ids"     { value = aws_nat_gateway.main[*].id }
output "internet_gateway_id" { value = aws_internet_gateway.main.id }
```

## Conclusion

A complete production VPC in OpenTofu requires the VPC, public/private subnets, an internet gateway, NAT gateways in each AZ for high availability, and route tables. Use `count` to create subnets across multiple availability zones with consistent CIDR blocks. The `data.aws_availability_zones` data source makes your configuration region-agnostic. Consider using the community `terraform-aws-modules/vpc/aws` module for complex VPC configurations, or the pattern above for full control.

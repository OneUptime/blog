# How to Design a VPC Module for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, VPC, AWS, Module, Networking

Description: Learn how to design a reusable, production-ready VPC module for OpenTofu that supports multi-AZ deployments, public and private subnets, NAT gateways, and flexible configuration.

## Introduction

A well-designed VPC module is the foundation of all cloud infrastructure. It should support multi-AZ deployments, separate public and private subnets, NAT gateways, and expose clean outputs for consumption by other modules.

## Module Structure

```text
modules/vpc/
├── main.tf
├── variables.tf
├── outputs.tf
└── versions.tf
```

## variables.tf

```hcl
variable "name"        { type = string }
variable "cidr_block"  { type = string }
variable "environment" { type = string }

variable "availability_zones" {
  type    = list(string)
  default = []  # Empty = auto-discover standard AZs
}

variable "public_subnet_cidrs" {
  type = list(string)
}

variable "private_subnet_cidrs" {
  type = list(string)
}

variable "enable_nat_gateway" {
  type    = bool
  default = true
}

variable "single_nat_gateway" {
  type    = bool
  default = false
}

variable "enable_dns_hostnames" {
  type    = bool
  default = true
}

variable "enable_dns_support" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

## main.tf

```hcl
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  azs = length(var.availability_zones) > 0 ? (
    var.availability_zones
  ) : data.aws_availability_zones.available.names

  # NAT gateway count: one per selected AZ/public subnet or a single shared one
  nat_count = var.enable_nat_gateway ? (
    var.single_nat_gateway ? 1 : min(length(local.azs), length(var.public_subnet_cidrs))
  ) : 0

  tags = merge({ Environment = var.environment, ManagedBy = "OpenTofu" }, var.tags)
}

resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  lifecycle {
    precondition {
      condition     = length(var.public_subnet_cidrs) > 0 && length(var.private_subnet_cidrs) > 0
      error_message = "Provide at least one public and one private subnet CIDR."
    }

    precondition {
      condition     = length(var.public_subnet_cidrs) == length(var.private_subnet_cidrs)
      error_message = "public_subnet_cidrs and private_subnet_cidrs must contain the same number of CIDRs."
    }
  }

  tags = merge(local.tags, { Name = var.name })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.tags, { Name = "${var.name}-igw" })
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = local.azs[count.index % length(local.azs)]
  map_public_ip_on_launch = true

  tags = merge(local.tags, {
    Name = "${var.name}-public-${local.azs[count.index % length(local.azs)]}"
    Tier = "public"
  })
}

resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index % length(local.azs)]

  tags = merge(local.tags, {
    Name = "${var.name}-private-${local.azs[count.index % length(local.azs)]}"
    Tier = "private"
  })
}

resource "aws_eip" "nat" {
  count  = local.nat_count
  domain = "vpc"
  tags   = merge(local.tags, { Name = "${var.name}-nat-eip-${count.index + 1}" })
}

resource "aws_nat_gateway" "main" {
  count         = local.nat_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[var.single_nat_gateway ? 0 : count.index].id
  tags          = merge(local.tags, { Name = "${var.name}-nat-${count.index + 1}" })
  depends_on    = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = merge(local.tags, { Name = "${var.name}-public-rt" })
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = local.nat_count > 0 ? length(var.private_subnet_cidrs) : 1
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = local.nat_count > 0 ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.main[0].id : aws_nat_gateway.main[count.index % local.nat_count].id
    }
  }

  tags = merge(local.tags, { Name = "${var.name}-private-rt-${count.index + 1}" })
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = local.nat_count > 0 ? aws_route_table.private[count.index].id : aws_route_table.private[0].id
}
```

## outputs.tf

```hcl
output "vpc_id"              { value = aws_vpc.main.id }
output "vpc_cidr_block"      { value = aws_vpc.main.cidr_block }
output "public_subnet_ids"   { value = aws_subnet.public[*].id }
output "private_subnet_ids"  { value = aws_subnet.private[*].id }
output "nat_gateway_ids"     { value = aws_nat_gateway.main[*].id }
output "internet_gateway_id" { value = aws_internet_gateway.main.id }
```

## Conclusion

This VPC module handles the most common patterns: multi-AZ subnets, optional NAT gateways (per-AZ or shared), and clean outputs. Callers can control the AZ list, CIDR ranges, and NAT configuration through variables, making the module suitable for both simple dev environments and HA production deployments.

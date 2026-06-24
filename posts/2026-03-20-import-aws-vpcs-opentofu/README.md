# How to Import AWS VPCs into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, VPC, Import, Networking

Description: Learn how to import existing AWS VPCs and their associated resources (subnets, route tables, internet gateways) into OpenTofu state with a complete import strategy.

## Introduction

Importing a VPC is rarely just about the VPC - you also need to import associated resources such as subnets, route tables, internet gateways, NAT gateways, and security groups. This guide covers the core import sequence for a VPC and the pattern you can extend to the rest of the network resources.

## Step 1: Inventory the VPC Resources

```bash
VPC_ID="vpc-0123456789abcdef0"

# Get VPC details

aws ec2 describe-vpcs --vpc-ids $VPC_ID

# List subnets
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]' \
  --output table

# List route tables, routes, and associations
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'RouteTables[*].{RouteTableId:RouteTableId,Routes:Routes,Associations:Associations}' \
  --output json

# Get Internet Gateway
aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
  --query 'InternetGateways[].[InternetGatewayId]' \
  --output table
```

## Step 2: Write HCL for the Resources You Plan to Import

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "prod-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "prod-igw" }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  map_public_ip_on_launch = true
  tags = { Name = "prod-public-us-east-1a" }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"
  tags = { Name = "prod-private-us-east-1a" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "prod-public-rt" }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}
```

## Step 3: Define Import Blocks for the Resources

```hcl
# import.tf - Declarative import blocks (OpenTofu 1.6+)
import {
  to = aws_vpc.main
  id = "vpc-0123456789abcdef0"
}

import {
  to = aws_internet_gateway.main
  id = "igw-0123456789abcdef0"
}

import {
  to = aws_subnet.public_a
  id = "subnet-0123456789abcdef0"
}

import {
  to = aws_subnet.private_a
  id = "subnet-abcdef0123456789"
}

import {
  to = aws_route_table.public
  id = "rtb-0123456789abcdef0"
}

# Route table associations use a composite ID
import {
  to = aws_route_table_association.public_a
  id = "subnet-0123456789abcdef0/rtb-0123456789abcdef0"
}
```

## Step 4: Plan, Apply, and Verify the Import

```bash
tofu plan
# Look for planned imports with 0 to add, 0 to change, and 0 to destroy

tofu apply
# OpenTofu imports the resources during apply

tofu plan
# After import: No changes. Infrastructure is up-to-date.
```

## Handling the Default VPC

```hcl
# If importing the default VPC
import {
  to = aws_default_vpc.default
  id = "vpc-default-id"
}

resource "aws_default_vpc" "default" {
  # Managing the default VPC
  tags = { Name = "Default VPC" }
}
```

## Conclusion

VPC import usually requires importing more than just the VPC itself. Use declarative `import` blocks to version-control the import process. The key challenge is ensuring your HCL exactly matches the existing VPC configuration - pay close attention to DHCP options, DNS settings, and network ACLs which are easy to overlook.

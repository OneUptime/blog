# How to Configure AWS Subnet IPv6 CIDR with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Terraform, IPv6, Subnets, VPC, Networking

Description: A guide to assigning IPv6 /64 CIDR blocks to AWS subnets using Terraform, enabling dual-stack EC2 instances and EKS nodes.

When you request an Amazon-provided IPv6 CIDR block for an AWS VPC, it receives a /56 CIDR block. You can then carve this into up to 256 /64 subnets - one per subnet. This guide shows how to automate that allocation with Terraform's `cidrsubnet` function.

## Understanding IPv6 Subnet Math in AWS

With an Amazon-provided IPv6 CIDR block, AWS assigns a /56 to your VPC. You then assign /64 blocks to subnets. The `cidrsubnet` Terraform function handles this:

```hcl
# cidrsubnet(prefix, newbits, netnum)

# For /56 -> /64: newbits = 64 - 56 = 8
# netnum is the subnet index (0-255)
cidrsubnet("2600:1f18:1234:5600::/56", 8, 0)  # -> 2600:1f18:1234:5600::/64
cidrsubnet("2600:1f18:1234:5600::/56", 8, 1)  # -> 2600:1f18:1234:5601::/64
```

## Step 1: Create the VPC

```hcl
# vpc.tf
resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true

  tags = { Name = "main-vpc" }
}
```

## Step 2: Create Multiple Subnets with IPv6 CIDRs

```hcl
# subnets.tf - Three subnets each getting a /64 from the VPC's /56
locals {
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_subnet" "public" {
  count = 3

  vpc_id            = aws_vpc.main.id
  availability_zone = local.availability_zones[count.index]

  # IPv4: sequential /24 subnets
  cidr_block = "10.0.${count.index + 1}.0/24"

  # IPv6: sequential /64 subnets from the VPC's /56
  # count.index 0,1,2 maps to the 0th, 1st, 2nd /64
  ipv6_cidr_block = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, count.index)

  # Auto-assign IPv6 addresses to instances launched in this subnet
  assign_ipv6_address_on_creation = true

  # Also assign public IPv4 for dual-stack
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet-${local.availability_zones[count.index]}"
  }
}

resource "aws_subnet" "private" {
  count = 3

  vpc_id            = aws_vpc.main.id
  availability_zone = local.availability_zones[count.index]

  cidr_block = "10.0.${count.index + 10}.0/24"

  # Private subnets use /64 indices 10, 11, 12 (avoid conflict with public)
  ipv6_cidr_block = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, count.index + 10)

  assign_ipv6_address_on_creation = true

  tags = {
    Name = "private-subnet-${local.availability_zones[count.index]}"
  }
}
```

## Step 3: Output IPv6 CIDRs

```hcl
# outputs.tf - Output the VPC ID and IPv6 CIDRs for reference
output "vpc_id" {
  value = aws_vpc.main.id
  description = "VPC ID"
}

output "public_subnet_ipv6_cidrs" {
  value = aws_subnet.public[*].ipv6_cidr_block
  description = "IPv6 CIDRs assigned to public subnets"
}

output "private_subnet_ipv6_cidrs" {
  value = aws_subnet.private[*].ipv6_cidr_block
  description = "IPv6 CIDRs assigned to private subnets"
}
```

## Step 4: Enable IPv6 on an Existing Subnet

If you already manage a subnet with Terraform and it does not yet have IPv6, add the `ipv6_cidr_block` attribute:

```hcl
# Add IPv6 to an existing subnet definition
resource "aws_subnet" "existing" {
  vpc_id          = aws_vpc.main.id
  cidr_block      = "10.0.50.0/24"

  # Add this to an existing subnet definition
  ipv6_cidr_block                 = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 50)
  assign_ipv6_address_on_creation = true
}
```

## Step 5: Apply and Verify

```bash
terraform apply

# Verify subnets have IPv6 CIDRs assigned
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$(terraform output -raw vpc_id)" \
  --query 'Subnets[*].{ID:SubnetId,IPv6Cidrs:Ipv6CidrBlockAssociationSet[*].Ipv6CidrBlock}'
```

Using `cidrsubnet` with a consistent indexing scheme makes IPv6 subnet allocation predictable, repeatable, and easy to expand as your infrastructure grows.

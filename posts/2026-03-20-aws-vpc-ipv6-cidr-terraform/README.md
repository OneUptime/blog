# How to Configure AWS VPC IPv6 CIDR with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Terraform, IPv6, VPC, Networking, Infrastructure as Code

Description: A step-by-step guide to associating an Amazon-provided IPv6 CIDR block with an AWS VPC using Terraform.

AWS automatically assigns a /56 IPv6 CIDR block from Amazon's pool when you enable IPv6 on a VPC. This guide shows how to enable IPv6 on a VPC and its subnets using Terraform, creating a foundation for dual-stack AWS networking.

## Step 1: Configure the AWS Provider

```hcl
# provider.tf - AWS provider configuration

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
```

## Step 2: Create a VPC with IPv6 CIDR

The `assign_generated_ipv6_cidr_block` attribute instructs AWS to automatically associate an Amazon-provided /56 IPv6 CIDR with the VPC.

```hcl
# vpc.tf - VPC with IPv6 CIDR block
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  # Request an Amazon-provided IPv6 CIDR block (/56)
  assign_generated_ipv6_cidr_block = true

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "main-ipv6-vpc"
  }
}

# Output values for verification or reuse
output "vpc_ipv6_cidr" {
  value = aws_vpc.main.ipv6_cidr_block
}

output "vpc_id" {
  value = aws_vpc.main.id
}
```

## Step 3: Create a Public Subnet with IPv6

Each subnet gets a /64 slice from the VPC's /56 block. Use `cidrsubnet` to calculate subnets:

```hcl
# subnet.tf - Public subnet with IPv6 /64 CIDR
resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"

  # Assign a /64 from the VPC's /56 IPv6 block (first /64)
  ipv6_cidr_block = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 0)

  availability_zone = "us-east-1a"

  # Automatically assign IPv6 addresses to instances launched in this subnet
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "public-subnet-a"
  }
}
```

## Step 4: Create an Internet Gateway

An Internet Gateway supports both IPv4 and IPv6 - no separate gateway is needed for IPv6 internet access from public subnets.

```hcl
# igw.tf - Internet Gateway (handles both IPv4 and IPv6)
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
  }
}
```

## Step 5: Configure Route Tables for IPv6

```hcl
# routes.tf - Route table with IPv6 default route
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # Default IPv4 route
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  # Default IPv6 route (all IPv6 traffic via the same IGW)
  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-rt"
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}
```

## Step 6: Apply the Configuration

```bash
# Initialize Terraform and apply
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Step 7: Verify the IPv6 CIDR

```bash
# Check the VPC's assigned IPv6 CIDR
aws ec2 describe-vpcs --vpc-ids $(terraform output -raw vpc_id) \
  --query 'Vpcs[0].Ipv6CidrBlockAssociationSet'
```

AWS VPCs with Amazon-provided IPv6 CIDRs give you globally routable IPv6 addresses with no additional cost, making this a simple and cost-effective first step toward dual-stack AWS networking.

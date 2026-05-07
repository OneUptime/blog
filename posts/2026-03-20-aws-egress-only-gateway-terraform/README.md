# How to Configure AWS Egress-Only Internet Gateway with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Terraform, IPv6, Egress-Only Internet Gateway, VPC, Networking

Description: A guide to creating and configuring an AWS Egress-Only Internet Gateway with Terraform to enable IPv6 outbound-only internet access for private subnets.

An Egress-Only Internet Gateway (EIGW) provides outbound-only internet access for IPv6 traffic, similar to the role a NAT Gateway plays for IPv4. It allows instances in private subnets to initiate outbound IPv6 connections to the internet while preventing inbound connections from being established from the internet. This is a key component for securing IPv6-enabled private subnets.

## How It Differs from a Regular Internet Gateway

| Feature | Internet Gateway | Egress-Only IGW |
|---|---|---|
| Outbound IPv6 | Yes | Yes |
| Inbound IPv6 from internet | Yes | No |
| IPv4 support | Yes | No |
| Use case | Public subnets | Private subnets (IPv6) |

## Step 1: Create the VPC with IPv6

```hcl
# vpc.tf - VPC with IPv6 CIDR

resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  assign_generated_ipv6_cidr_block = true

  tags = {
    Name = "main-vpc"
  }
}
```

## Step 2: Create the Egress-Only Internet Gateway

```hcl
# eigw.tf - Egress-Only Internet Gateway for IPv6 private subnets
resource "aws_egress_only_internet_gateway" "eigw" {
  # Associate the EIGW with the VPC
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-eigw"
  }
}
```

## Step 3: Create a Private Subnet with IPv6

```hcl
# subnet.tf - Private subnet with IPv6
resource "aws_subnet" "private_a" {
  vpc_id = aws_vpc.main.id

  cidr_block      = "10.0.10.0/24"
  # Assign the second /64 from the VPC's /56 IPv6 block
  ipv6_cidr_block = cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)

  availability_zone = "us-east-1a"

  # Auto-assign IPv6 addresses on launch so instances in this subnet
  # can use outbound IPv6 without per-instance address assignment
  assign_ipv6_address_on_creation = true

  tags = {
    Name = "private-subnet-a"
  }
}
```

## Step 4: Create a Route Table with the EIGW

```hcl
# routes.tf - Route table with EIGW for private subnets
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  # IPv4 traffic: route via NAT Gateway (if needed)
  # (NAT Gateway resource not shown here)

  # IPv6 default route goes through the Egress-Only IGW
  route {
    ipv6_cidr_block        = "::/0"
    egress_only_gateway_id = aws_egress_only_internet_gateway.eigw.id
  }

  tags = {
    Name = "private-rt"
  }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}
```

## Step 5: Apply the Configuration

```bash
terraform init
terraform plan
terraform apply
```

## Step 6: Validate Outbound-Only Connectivity

Launch an EC2 instance in the private subnet and test:

```bash
# On the private instance: test outbound IPv6 (should succeed)
ping6 -c 3 ipv6.google.com

# From the internet: try to initiate a connection to the instance's IPv6 (should fail)
# No inbound connection should be established
```

## Step 7: Verify in AWS Console or CLI

```bash
# List Egress-Only Internet Gateways
aws ec2 describe-egress-only-internet-gateways
```

The Egress-Only Internet Gateway is a critical component for maintaining security in IPv6 AWS architectures - it gives private instances full IPv6 egress while ensuring they cannot be reached directly from the internet.

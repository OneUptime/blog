# How to Create NAT Gateway with Multiple Elastic IPs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, NAT Gateway, Elastic IP, AWS, Networking, VPC, High Availability

Description: Learn how to create NAT Gateways with multiple Elastic IPs using Terraform for high availability and increased outbound bandwidth across availability zones.

---

NAT Gateways enable instances in private subnets to access the internet for software updates, API calls, and other outbound traffic while preventing unsolicited inbound connections. In production environments, you typically need multiple NAT Gateways across availability zones for high availability, each with its own Elastic IP address. Terraform makes it straightforward to create this multi-AZ NAT Gateway setup with proper routing.

## Why Multiple NAT Gateways and Elastic IPs

A single NAT Gateway in one availability zone creates a single point of failure. If that AZ experiences issues, all private subnets lose internet access. By deploying a NAT Gateway in each AZ with its own Elastic IP, you ensure that an AZ failure only affects resources in that specific AZ. Additionally, having dedicated Elastic IPs per NAT Gateway gives you predictable source IP addresses for allowlisting with third-party services.

## Prerequisites

You need Terraform 1.0 or later, an AWS account with VPC and EC2 permissions, and available Elastic IP addresses in your account (check your EIP quota).

## Setting Up the VPC

Start with a VPC and subnets across multiple availability zones:

```hcl
# Configure the AWS provider
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

# Define available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Create the VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "main-vpc"
  }
}

# Internet Gateway for public subnets
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
  }
}
```

## Creating Public and Private Subnets

Create public subnets (for NAT Gateways) and private subnets (for workloads) in each AZ:

```hcl
# Public subnets (one per AZ)
resource "aws_subnet" "public" {
  count = 3

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "public"
  }
}

# Private subnets (one per AZ)
resource "aws_subnet" "private" {
  count = 3

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-subnet-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "private"
  }
}

# Public route table with internet gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-route-table"
  }
}

# Associate public subnets with the public route table
resource "aws_route_table_association" "public" {
  count = 3

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

## Allocating Multiple Elastic IPs

Allocate an Elastic IP for each NAT Gateway:

```hcl
# Allocate Elastic IPs for NAT Gateways (one per AZ)
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name = "nat-eip-${data.aws_availability_zones.available.names[count.index]}"
  }

  # Ensure the IGW exists before allocating EIPs
  depends_on = [aws_internet_gateway.main]
}
```

## Creating NAT Gateways

Create a NAT Gateway in each public subnet with its own Elastic IP:

```hcl
# Create NAT Gateways (one per AZ, in public subnets)
resource "aws_nat_gateway" "main" {
  count = 3

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "nat-gw-${data.aws_availability_zones.available.names[count.index]}"
  }

  # NAT Gateway needs the IGW to exist
  depends_on = [aws_internet_gateway.main]
}
```

## Configuring Private Route Tables

Each private subnet gets its own route table pointing to the NAT Gateway in the same AZ:

```hcl
# Private route tables (one per AZ)
resource "aws_route_table" "private" {
  count = 3

  vpc_id = aws_vpc.main.id

  # Route internet traffic through the NAT Gateway in the same AZ
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "private-rt-${data.aws_availability_zones.available.names[count.index]}"
  }
}

# Associate private subnets with their respective route tables
resource "aws_route_table_association" "private" {
  count = 3

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

## Using For-Each for Better State Management

An alternative approach using `for_each` provides better state management when adding or removing AZs:

```hcl
variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

locals {
  az_map = { for idx, az in var.availability_zones : az => idx }
}

# Elastic IPs using for_each
resource "aws_eip" "nat_fe" {
  for_each = local.az_map
  domain   = "vpc"

  tags = {
    Name = "nat-eip-${each.key}"
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways using for_each
resource "aws_nat_gateway" "main_fe" {
  for_each = local.az_map

  allocation_id = aws_eip.nat_fe[each.key].id
  subnet_id     = aws_subnet.public[each.value].id

  tags = {
    Name = "nat-gw-${each.key}"
  }

  depends_on = [aws_internet_gateway.main]
}
```

## Configuring Additional Elastic IPs for a Single NAT Gateway

In some cases you might need additional source IPs for a single NAT Gateway. While AWS NAT Gateways support only one primary Elastic IP, you can work around this with multiple NAT Gateways sharing the load. Alternatively, for EKS or similar setups that need predictable source IPs, you can use all the NAT Gateway EIPs:

```hcl
# Output all NAT Gateway public IPs for allowlisting
output "nat_gateway_public_ips" {
  description = "Public IPs of all NAT Gateways for IP allowlisting"
  value       = aws_eip.nat[*].public_ip
}

# Create a formatted list for firewall rules
output "nat_ips_cidr" {
  description = "NAT Gateway IPs in CIDR notation"
  value       = [for eip in aws_eip.nat : "${eip.public_ip}/32"]
}
```

## Cost-Optimized Single NAT Gateway

For development environments where high availability is less critical, you can use a single NAT Gateway:

```hcl
# Single EIP for dev/staging
resource "aws_eip" "nat_single" {
  domain = "vpc"

  tags = {
    Name = "nat-eip-single"
  }
}

# Single NAT Gateway for cost savings
resource "aws_nat_gateway" "single" {
  allocation_id = aws_eip.nat_single.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "nat-gw-single"
  }
}

# All private subnets share one route table
resource "aws_route_table" "private_single" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.single.id
  }

  tags = {
    Name = "private-rt-single-nat"
  }
}
```

## Monitoring NAT Gateways

Monitor your NAT Gateways for bandwidth usage and connection counts. Use [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-nat-gateway-with-multiple-elastic-ips-in-terraform/view) alongside CloudWatch metrics to track bytes processed, active connections, and connection errors across all your NAT Gateways.

## Best Practices

Deploy one NAT Gateway per AZ in production for fault tolerance. Use `depends_on` to ensure the internet gateway exists before creating NAT Gateways. Monitor NAT Gateway CloudWatch metrics for bytes processed and error counts. Keep Elastic IPs stable to maintain consistent source IPs for third-party allowlists. Consider cost implications since each NAT Gateway incurs hourly charges plus data processing fees.

## Conclusion

Creating NAT Gateways with multiple Elastic IPs in Terraform provides a highly available, predictable outbound networking setup for your private subnets. By deploying across multiple availability zones with per-AZ routing, you eliminate single points of failure while maintaining known source IPs. Terraform's count and for_each features make it easy to scale this pattern across any number of availability zones.

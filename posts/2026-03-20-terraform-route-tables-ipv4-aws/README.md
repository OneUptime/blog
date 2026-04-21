# How to Configure Route Tables for IPv4 Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, Route Tables, IPv4, VPC, Infrastructure as Code

Description: Configure AWS VPC route tables for IPv4 using Terraform, covering public routes via internet gateway, private routes via NAT gateway, and VPC peering routes.

## Introduction

AWS route tables define where IPv4 traffic is directed. Terraform manages route tables, individual routes, and subnet associations declaratively, with drift detection for the resources you define.

## Public Route Table

```hcl
# route_tables.tf

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "public-rt"
    Tier = "public"
  }
}

# Default route to Internet Gateway

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

# Associate all public subnets
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

## Private Route Table (per AZ with NAT)

```hcl
resource "aws_route_table" "private" {
  count  = length(local.azs)
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "private-rt-${local.azs[count.index]}"
    Tier = "private"
  }
}

resource "aws_route" "private_nat" {
  count                  = length(local.azs)
  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[count.index].id
}

resource "aws_route_table_association" "private" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

## VPC Peering Route

```hcl
# Add route to peered VPC
resource "aws_route" "to_peer_vpc" {
  count                     = length(aws_route_table.private)
  route_table_id            = aws_route_table.private[count.index].id
  destination_cidr_block    = "10.65.0.0/16"  # Peer VPC CIDR
  vpc_peering_connection_id = aws_vpc_peering_connection.main.id
}
```

## Database Subnet Route Table (No Internet)

```hcl
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  # No internet route - database subnets use only the implicit local VPC route
  tags = {
    Name = "database-rt"
    Tier = "database"
  }
}

resource "aws_route_table_association" "database" {
  count          = length(aws_subnet.database)
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}
```

## Transit Gateway Route

```hcl
resource "aws_route" "to_on_prem_tgw" {
  route_table_id         = aws_route_table.private[0].id
  destination_cidr_block = "10.0.0.0/8"  # On-premises summary route
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}
```

## Outputs

```hcl
output "public_route_table_id" {
  value = aws_route_table.public.id
}

output "private_route_table_ids" {
  value = aws_route_table.private[*].id
}
```

## Conclusion

In this pattern, AWS route tables in Terraform are managed as separate resources from routes and associations, allowing fine-grained control. Create one public route table for all public subnets (shared internet gateway route), separate private route tables per AZ (each pointing to its own NAT gateway for fault isolation), and database route tables with no internet route.

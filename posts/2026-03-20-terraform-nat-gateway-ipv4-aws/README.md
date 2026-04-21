# How to Create a NAT Gateway for IPv4 Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, NAT Gateway, IPv4, Private Subnet, Infrastructure as Code

Description: Create AWS NAT Gateways for IPv4 using Terraform to allow private subnet resources to reach the internet without exposing them to inbound connections.

## Introduction

AWS NAT Gateways enable private subnet resources (EC2, ECS, Lambda in VPC) to initiate outbound IPv4 connections to the internet while remaining unreachable from the outside. Each public zonal NAT Gateway requires an Elastic IP and resides in a public subnet.

## NAT Gateway with Elastic IP

```hcl
# nat_gateway.tf

# Allocate Elastic IP for NAT Gateway

resource "aws_eip" "nat_a" {
  domain = "vpc"

  tags = {
    Name = "nat-eip-a"
  }
}

# NAT Gateway in public subnet (AZ-a)
resource "aws_nat_gateway" "nat_a" {
  allocation_id = aws_eip.nat_a.id
  subnet_id     = aws_subnet.public_a.id

  tags = {
    Name = "nat-gw-a"
  }

  depends_on = [aws_internet_gateway.main]
}
```

## Route Table for Private Subnet

```hcl
# Private route table - routes internet traffic through NAT
resource "aws_route_table" "private_a" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_a.id
  }

  tags = {
    Name = "private-rt-a"
  }
}

# Associate private subnet with the route table
resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private_a.id
}
```

## HA NAT Gateway (One per AZ)

```hcl
# For high availability with zonal NAT Gateways, one NAT Gateway per AZ

resource "aws_eip" "nat" {
  count  = length(local.azs)
  domain = "vpc"
  tags   = { Name = "nat-eip-${local.azs[count.index]}" }
}

resource "aws_nat_gateway" "main" {
  count         = length(local.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "nat-gw-${local.azs[count.index]}" }
  depends_on    = [aws_internet_gateway.main]
}

resource "aws_route_table" "private" {
  count  = length(local.azs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = { Name = "private-rt-${local.azs[count.index]}" }
}

resource "aws_route_table_association" "private" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

## Outputs

```hcl
output "nat_gateway_ids" {
  value = aws_nat_gateway.main[*].id
}

output "nat_public_ips" {
  value = aws_eip.nat[*].public_ip
}
```

## Cost Optimization

```hcl
# For dev/test - single NAT Gateway to save cost
variable "single_nat_gateway" {
  default = true
}

resource "aws_nat_gateway" "single" {
  count         = var.single_nat_gateway ? 1 : length(local.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  depends_on    = [aws_internet_gateway.main]
}
```

## Conclusion

Public zonal AWS NAT Gateways in Terraform require an Elastic IP allocation, placement in a public subnet, and a private route table with a default route via the NAT gateway. Deploy one NAT Gateway per AZ for production HA with zonal NAT Gateways. Use `single_nat_gateway = true` for dev/test environments to reduce hourly NAT Gateway charges (for example, about $33/month at $0.045/hour, before data processing, data transfer, and public IPv4 address charges).

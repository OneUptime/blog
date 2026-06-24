# How to Set Up VPC Peering for IPv4 Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, AWS, VPC Peering, IPv4, Infrastructure as Code, Networking

Description: Configure AWS VPC peering connections for IPv4 using Terraform, including peering requests, accepters, route propagation, and DNS resolution settings.

## Introduction

VPC peering connects two VPCs so their IPv4 address spaces can communicate privately. Terraform manages the full lifecycle: creating the peering connection, accepting it, and updating route tables on both sides.

## Same-Account VPC Peering

```hcl
# vpc_peering.tf

# Create peering connection (requester)

resource "aws_vpc_peering_connection" "main" {
  vpc_id      = aws_vpc.main.id        # Requester VPC
  peer_vpc_id = aws_vpc.secondary.id  # Accepter VPC
  auto_accept = true                   # Auto-accept for same-account, same-region

  tags = {
    Name = "vpc-peering-main-secondary"
  }
}
```

## Cross-Account VPC Peering

```hcl
# Provider for account B
provider "aws" {
  alias   = "account_b"
  region  = "us-east-1"
  profile = "account_b_profile"
}

# Requester (Account A)
resource "aws_vpc_peering_connection" "cross_account" {
  provider    = aws
  vpc_id      = aws_vpc.main.id
  peer_vpc_id = var.peer_vpc_id         # Account B's VPC ID
  peer_owner_id = var.peer_account_id  # Account B's AWS account ID
  peer_region = "us-east-1"

  tags = { Name = "cross-account-peering" }
}

# Accepter (Account B)
resource "aws_vpc_peering_connection_accepter" "cross_account" {
  provider                  = aws.account_b
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_account.id
  auto_accept               = true
}
```

## DNS Resolution Options

The peering connection must be active, and both VPCs must have DNS support and DNS hostnames enabled before enabling remote DNS resolution.

```hcl
resource "aws_vpc_peering_connection_options" "requester" {
  vpc_peering_connection_id = aws_vpc_peering_connection.main.id

  requester {
    allow_remote_vpc_dns_resolution = true
  }
}

resource "aws_vpc_peering_connection_options" "accepter" {
  vpc_peering_connection_id = aws_vpc_peering_connection.main.id

  accepter {
    allow_remote_vpc_dns_resolution = true
  }
}
```

## Route Table Updates

```hcl
# Add route in Requester VPC private route tables → Accepter VPC
resource "aws_route" "requester_to_secondary" {
  count                     = length(aws_route_table.private)
  route_table_id            = aws_route_table.private[count.index].id
  destination_cidr_block    = aws_vpc.secondary.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.main.id
}

# Add route in Accepter VPC → Requester VPC
resource "aws_route" "secondary_to_main" {
  route_table_id            = aws_route_table.secondary_private.id
  destination_cidr_block    = aws_vpc.main.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.main.id
}
```

## Security Group Rule Allowing Peered Traffic

```hcl
resource "aws_vpc_security_group_ingress_rule" "from_peered_vpc" {
  security_group_id = aws_security_group.database.id
  cidr_ipv4         = aws_vpc.secondary.cidr_block
  from_port         = 5432
  to_port           = 5432
  ip_protocol       = "tcp"
  description       = "PostgreSQL from peered VPC"
}
```

## Conclusion

VPC peering in Terraform typically involves three components: the peering connection resource, route table entries on both sides pointing to the peering connection, and security group rules or network ACLs allowing the traffic. Use `auto_accept = true` for same-account, same-region peering; for cross-account use a separate `aws_vpc_peering_connection_accepter` in the second account's provider.

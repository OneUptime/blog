# How to Create Cross-Account VPC Peering with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, VPC Peering, AWS, Networking, Multi-Account, Cross-Account

Description: Learn how to establish cross-account VPC peering connections using Terraform, including route table configuration and security considerations.

---

VPC peering allows two Virtual Private Clouds to communicate with each other using private IP addresses as if they were on the same network. Cross-account VPC peering extends this by connecting VPCs that belong to different AWS accounts. This is a common pattern in enterprise environments where teams operate in separate accounts but need to share resources. Terraform simplifies managing this setup by handling the peering request, acceptance, and routing configuration across both accounts.

## How Cross-Account VPC Peering Works

When you create a VPC peering connection across accounts, one account initiates the peering request (the requester) and the other account accepts it (the accepter). After acceptance, you need to update route tables in both VPCs to direct traffic through the peering connection. Security groups and network ACLs in both VPCs must also allow the desired traffic.

Important constraints to remember: VPC peering does not support transitive routing, the VPC CIDR blocks must not overlap, and both VPCs can be in different regions (inter-region peering).

## Prerequisites

You need Terraform 1.0 or later, two AWS accounts with appropriate IAM permissions, and VPCs in both accounts with non-overlapping CIDR blocks.

## Provider Configuration

Set up providers for both AWS accounts:

```hcl
# Configure Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Provider for the requester account (Account A)
provider "aws" {
  alias  = "requester"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/TerraformRole"
  }
}

# Provider for the accepter account (Account B)
provider "aws" {
  alias  = "accepter"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::222222222222:role/TerraformRole"
  }
}
```

## Creating the VPCs

Define VPCs in both accounts:

```hcl
# VPC in the requester account
resource "aws_vpc" "requester" {
  provider   = aws.requester
  cidr_block = "10.0.0.0/16"

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "requester-vpc"
  }
}

# Subnet in the requester VPC
resource "aws_subnet" "requester" {
  provider          = aws.requester
  vpc_id            = aws_vpc.requester.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "requester-subnet"
  }
}

# VPC in the accepter account
resource "aws_vpc" "accepter" {
  provider   = aws.accepter
  cidr_block = "10.1.0.0/16"

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "accepter-vpc"
  }
}

# Subnet in the accepter VPC
resource "aws_subnet" "accepter" {
  provider          = aws.accepter
  vpc_id            = aws_vpc.accepter.id
  cidr_block        = "10.1.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "accepter-subnet"
  }
}
```

## Creating the Peering Connection

The requester account initiates the peering request:

```hcl
# Get the accepter account ID
data "aws_caller_identity" "accepter" {
  provider = aws.accepter
}

# Create the VPC peering connection from the requester
resource "aws_vpc_peering_connection" "cross_account" {
  provider = aws.requester

  vpc_id        = aws_vpc.requester.id
  peer_vpc_id   = aws_vpc.accepter.id
  peer_owner_id = data.aws_caller_identity.accepter.account_id
  peer_region   = "us-east-1"
  auto_accept   = false

  tags = {
    Name = "cross-account-peering"
    Side = "Requester"
  }
}
```

Note that `auto_accept` must be `false` for cross-account peering. The accepting account must explicitly accept the request.

## Accepting the Peering Connection

The accepter account accepts the peering request:

```hcl
# Accept the peering connection in the accepter account
resource "aws_vpc_peering_connection_accepter" "accepter" {
  provider = aws.accepter

  vpc_peering_connection_id = aws_vpc_peering_connection.cross_account.id
  auto_accept               = true

  tags = {
    Name = "cross-account-peering"
    Side = "Accepter"
  }
}
```

## Configuring Peering Options

Enable DNS resolution across the peering connection:

```hcl
# Configure peering options on the requester side
resource "aws_vpc_peering_connection_options" "requester" {
  provider = aws.requester

  vpc_peering_connection_id = aws_vpc_peering_connection.cross_account.id

  requester {
    allow_remote_vpc_dns_resolution = true
  }

  depends_on = [aws_vpc_peering_connection_accepter.accepter]
}

# Configure peering options on the accepter side
resource "aws_vpc_peering_connection_options" "accepter" {
  provider = aws.accepter

  vpc_peering_connection_id = aws_vpc_peering_connection.cross_account.id

  accepter {
    allow_remote_vpc_dns_resolution = true
  }

  depends_on = [aws_vpc_peering_connection_accepter.accepter]
}
```

## Updating Route Tables

Both VPCs need routes to direct traffic to the peering connection:

```hcl
# Route table for the requester VPC
resource "aws_route_table" "requester" {
  provider = aws.requester
  vpc_id   = aws_vpc.requester.id

  tags = {
    Name = "requester-rt"
  }
}

# Route from requester to accepter VPC via peering
resource "aws_route" "requester_to_accepter" {
  provider = aws.requester

  route_table_id            = aws_route_table.requester.id
  destination_cidr_block    = aws_vpc.accepter.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_account.id
}

# Associate the route table with the requester subnet
resource "aws_route_table_association" "requester" {
  provider = aws.requester

  subnet_id      = aws_subnet.requester.id
  route_table_id = aws_route_table.requester.id
}

# Route table for the accepter VPC
resource "aws_route_table" "accepter" {
  provider = aws.accepter
  vpc_id   = aws_vpc.accepter.id

  tags = {
    Name = "accepter-rt"
  }
}

# Route from accepter to requester VPC via peering
resource "aws_route" "accepter_to_requester" {
  provider = aws.accepter

  route_table_id            = aws_route_table.accepter.id
  destination_cidr_block    = aws_vpc.requester.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_account.id
}

# Associate the route table with the accepter subnet
resource "aws_route_table_association" "accepter" {
  provider = aws.accepter

  subnet_id      = aws_subnet.accepter.id
  route_table_id = aws_route_table.accepter.id
}
```

## Configuring Security Groups

Allow traffic between the peered VPCs:

```hcl
# Security group in the requester VPC
resource "aws_security_group" "requester" {
  provider = aws.requester
  name     = "peering-sg"
  vpc_id   = aws_vpc.requester.id

  # Allow inbound from the accepter VPC
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.accepter.cidr_block]
    description = "Allow all traffic from accepter VPC"
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "requester-peering-sg"
  }
}

# Security group in the accepter VPC
resource "aws_security_group" "accepter" {
  provider = aws.accepter
  name     = "peering-sg"
  vpc_id   = aws_vpc.accepter.id

  # Allow inbound from the requester VPC
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.requester.cidr_block]
    description = "Allow all traffic from requester VPC"
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "accepter-peering-sg"
  }
}
```

## Outputs

Add useful outputs for verification:

```hcl
output "peering_connection_id" {
  description = "The VPC peering connection ID"
  value       = aws_vpc_peering_connection.cross_account.id
}

output "peering_status" {
  description = "The status of the VPC peering connection"
  value       = aws_vpc_peering_connection.cross_account.accept_status
}

output "requester_vpc_cidr" {
  value = aws_vpc.requester.cidr_block
}

output "accepter_vpc_cidr" {
  value = aws_vpc.accepter.cidr_block
}
```

## Monitoring Cross-Account Peering

Once your peering is established, monitor the connectivity between the VPCs. Use [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cross-account-vpc-peering-with-terraform/view) to track network reachability and latency between resources in peered VPCs.

## Best Practices

Plan your CIDR ranges carefully to avoid overlaps. Use the most restrictive security group rules possible rather than allowing all traffic. Enable DNS resolution across the peering connection to simplify service discovery. Document the peering relationships for operational clarity. Consider using AWS Transit Gateway if you need to peer more than a few VPCs, as peering connections do not support transitive routing.

## Conclusion

Cross-account VPC peering with Terraform provides a clean, reproducible way to connect VPCs across AWS accounts. By managing the peering request, acceptance, routes, and security groups as code, you gain full visibility and version control over your network topology. This approach scales well for organizations using multi-account strategies and ensures that network connections are consistent and auditable.

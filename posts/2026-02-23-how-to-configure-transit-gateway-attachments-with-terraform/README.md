# How to Configure Transit Gateway Attachments with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Transit Gateway, AWS, Networking, VPC, Multi-Account, Hub-and-Spoke

Description: Learn how to configure AWS Transit Gateway attachments with Terraform to create a scalable hub-and-spoke network topology connecting multiple VPCs.

---

AWS Transit Gateway acts as a central hub that connects multiple VPCs, VPN connections, and on-premises networks through a single gateway. Instead of creating individual peering connections between every pair of VPCs, Transit Gateway simplifies your network architecture by providing a hub-and-spoke model. Terraform makes it easy to define and manage Transit Gateway configurations, attachments, and route tables as infrastructure as code.

## Why Use Transit Gateway

As your AWS infrastructure grows, managing individual VPC peering connections becomes complex. With N VPCs, you would need N*(N-1)/2 peering connections for full connectivity. Transit Gateway reduces this to N connections. It also supports transitive routing, which VPC peering does not. This means VPC A can communicate with VPC C through the Transit Gateway even without a direct connection between them.

Transit Gateway also supports cross-account and cross-region connectivity, making it ideal for enterprise multi-account architectures.

## Prerequisites

You need Terraform 1.0 or later, an AWS account with permissions to create Transit Gateway resources, and at least two VPCs to connect.

## Creating the Transit Gateway

Start by creating the Transit Gateway itself:

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

# Create the Transit Gateway
resource "aws_ec2_transit_gateway" "main" {
  description = "Main Transit Gateway"

  # Enable DNS support for the TGW
  dns_support = "enable"

  # Enable auto-acceptance for attachments from the same account
  auto_accept_shared_attachments = "enable"

  # Use the default route table for associations and propagations
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"

  # CIDR blocks for the Transit Gateway (optional, for Connect attachments)
  # transit_gateway_cidr_blocks = ["10.99.0.0/24"]

  tags = {
    Name = "main-transit-gateway"
  }
}
```

## Creating VPCs to Connect

Define the VPCs that will be attached to the Transit Gateway:

```hcl
# VPC A - Application VPC
resource "aws_vpc" "app" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "app-vpc"
  }
}

# Subnets for VPC A (TGW attachments need subnets in each AZ)
resource "aws_subnet" "app_a" {
  vpc_id            = aws_vpc.app.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "app-subnet-a" }
}

resource "aws_subnet" "app_b" {
  vpc_id            = aws_vpc.app.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  tags = { Name = "app-subnet-b" }
}

# VPC B - Database VPC
resource "aws_vpc" "database" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "database-vpc"
  }
}

# Subnets for VPC B
resource "aws_subnet" "db_a" {
  vpc_id            = aws_vpc.database.id
  cidr_block        = "10.1.1.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "db-subnet-a" }
}

resource "aws_subnet" "db_b" {
  vpc_id            = aws_vpc.database.id
  cidr_block        = "10.1.2.0/24"
  availability_zone = "us-east-1b"

  tags = { Name = "db-subnet-b" }
}

# VPC C - Shared Services VPC
resource "aws_vpc" "shared" {
  cidr_block           = "10.2.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "shared-services-vpc"
  }
}

resource "aws_subnet" "shared_a" {
  vpc_id            = aws_vpc.shared.id
  cidr_block        = "10.2.1.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "shared-subnet-a" }
}

resource "aws_subnet" "shared_b" {
  vpc_id            = aws_vpc.shared.id
  cidr_block        = "10.2.2.0/24"
  availability_zone = "us-east-1b"

  tags = { Name = "shared-subnet-b" }
}
```

## Creating Transit Gateway Attachments

Attach each VPC to the Transit Gateway:

```hcl
# Attach VPC A to the Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "app" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.app.id

  subnet_ids = [
    aws_subnet.app_a.id,
    aws_subnet.app_b.id,
  ]

  # Enable DNS support for this attachment
  dns_support = "enable"

  tags = {
    Name = "app-vpc-attachment"
  }
}

# Attach VPC B to the Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "database" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.database.id

  subnet_ids = [
    aws_subnet.db_a.id,
    aws_subnet.db_b.id,
  ]

  dns_support = "enable"

  tags = {
    Name = "database-vpc-attachment"
  }
}

# Attach VPC C to the Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "shared" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.shared.id

  subnet_ids = [
    aws_subnet.shared_a.id,
    aws_subnet.shared_b.id,
  ]

  dns_support = "enable"

  tags = {
    Name = "shared-services-vpc-attachment"
  }
}
```

## Configuring Custom Route Tables

For more control over traffic flow, create custom Transit Gateway route tables:

```hcl
# Custom route table for production traffic
resource "aws_ec2_transit_gateway_route_table" "production" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "production-route-table"
  }
}

# Associate the app VPC attachment with the production route table
resource "aws_ec2_transit_gateway_route_table_association" "app" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.app.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}

# Propagate routes from the database VPC to the production route table
resource "aws_ec2_transit_gateway_route_table_propagation" "database_to_prod" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.database.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}

# Propagate routes from the shared services VPC to the production route table
resource "aws_ec2_transit_gateway_route_table_propagation" "shared_to_prod" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.shared.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}

# Static route for specific traffic steering
resource "aws_ec2_transit_gateway_route" "to_shared" {
  destination_cidr_block         = "0.0.0.0/0"
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.shared.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}
```

## Updating VPC Route Tables

Each VPC needs routes pointing to the Transit Gateway for inter-VPC traffic:

```hcl
# Route table for app VPC
resource "aws_route_table" "app" {
  vpc_id = aws_vpc.app.id

  # Route to database VPC via TGW
  route {
    cidr_block         = "10.1.0.0/16"
    transit_gateway_id = aws_ec2_transit_gateway.main.id
  }

  # Route to shared services VPC via TGW
  route {
    cidr_block         = "10.2.0.0/16"
    transit_gateway_id = aws_ec2_transit_gateway.main.id
  }

  tags = {
    Name = "app-vpc-rt"
  }
}

# Route table for database VPC
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.database.id

  # Route to app VPC via TGW
  route {
    cidr_block         = "10.0.0.0/16"
    transit_gateway_id = aws_ec2_transit_gateway.main.id
  }

  # Route to shared services VPC via TGW
  route {
    cidr_block         = "10.2.0.0/16"
    transit_gateway_id = aws_ec2_transit_gateway.main.id
  }

  tags = {
    Name = "database-vpc-rt"
  }
}
```

## Cross-Account Transit Gateway Sharing

To share a Transit Gateway across accounts, use AWS Resource Access Manager (RAM):

```hcl
# Share the Transit Gateway with another account
resource "aws_ram_resource_share" "tgw_share" {
  name                      = "transit-gateway-share"
  allow_external_principals = true

  tags = {
    Name = "tgw-resource-share"
  }
}

# Associate the Transit Gateway with the RAM share
resource "aws_ram_resource_association" "tgw" {
  resource_arn       = aws_ec2_transit_gateway.main.arn
  resource_share_arn = aws_ram_resource_share.tgw_share.arn
}

# Invite the other account
resource "aws_ram_principal_association" "other_account" {
  principal          = "222222222222"
  resource_share_arn = aws_ram_resource_share.tgw_share.arn
}
```

## Monitoring Transit Gateway

Monitor your Transit Gateway to ensure connectivity and track bandwidth usage. Use [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-transit-gateway-attachments-with-terraform/view) along with CloudWatch metrics to track bytes in/out, packet counts, and attachment status.

## Best Practices

Use separate Transit Gateway route tables for different environments like production and development. Enable DNS support on both the Transit Gateway and attachments. Use dedicated subnets for Transit Gateway attachments rather than sharing them with workloads. Plan your CIDR ranges to avoid overlaps across all connected VPCs.

## Conclusion

Transit Gateway with Terraform provides a scalable, manageable solution for connecting multiple VPCs. The hub-and-spoke model simplifies network architecture, and managing it as code ensures consistency and auditability. Whether you are connecting VPCs within a single account or across multiple accounts and regions, Transit Gateway attachments managed through Terraform give you full control over your network topology.

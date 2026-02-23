# How to Implement Network Segmentation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Networking, Security, VPC, Network Segmentation

Description: Build secure network segmentation on AWS with Terraform using VPCs, subnets, NACLs, transit gateways, and VPC endpoints for defense in depth.

---

Network segmentation is the practice of dividing your network into smaller, isolated segments so that a compromise in one segment does not automatically give an attacker access to everything. In AWS, this means designing your VPC architecture with clear boundaries between workloads, environments, and trust levels. Terraform lets you codify these boundaries so they are consistent and repeatable.

This guide covers practical patterns for implementing network segmentation on AWS with Terraform, from basic VPC design to advanced multi-account architectures with transit gateways.

## Design Your Subnet Tiers

The foundation of network segmentation is your subnet architecture. At minimum, you need three tiers: public, private, and isolated.

```hcl
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project}-vpc"
  }
}

# Public subnets - for load balancers and NAT gateways only
resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-${var.availability_zones[count.index]}"
    Tier = "public"
  }
}

# Private subnets - for application workloads
# Can reach the internet through NAT gateway
resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project}-private-${var.availability_zones[count.index]}"
    Tier = "private"
  }
}

# Isolated subnets - for databases and sensitive data
# No internet access at all
resource "aws_subnet" "isolated" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project}-isolated-${var.availability_zones[count.index]}"
    Tier = "isolated"
  }
}
```

## Configure Route Tables

Each tier gets its own route table with appropriate routing:

```hcl
# Public route table - routes to internet gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.project}-public-rt" }
}

# Private route table - routes to NAT gateway
resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = { Name = "${var.project}-private-rt-${var.availability_zones[count.index]}" }
}

# Isolated route table - NO routes to the internet
resource "aws_route_table" "isolated" {
  vpc_id = aws_vpc.main.id

  # No default route - completely isolated from the internet

  tags = { Name = "${var.project}-isolated-rt" }
}

# Associate subnets with route tables
resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_route_table_association" "isolated" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.isolated[count.index].id
  route_table_id = aws_route_table.isolated.id
}
```

## Add Network ACLs

Network ACLs provide stateless filtering at the subnet level, adding another layer on top of security groups:

```hcl
# NACL for isolated subnets - very restrictive
resource "aws_network_acl" "isolated" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.isolated[*].id

  # Allow inbound from private subnets only (app tier)
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = cidrsubnet(var.vpc_cidr, 4, 0)  # Private subnet range
    from_port  = 5432  # PostgreSQL
    to_port    = 5432
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = cidrsubnet(var.vpc_cidr, 4, 0)
    from_port  = 3306  # MySQL
    to_port    = 3306
  }

  # Allow return traffic (ephemeral ports)
  ingress {
    protocol   = "tcp"
    rule_no    = 200
    action     = "allow"
    cidr_block = var.vpc_cidr
    from_port  = 1024
    to_port    = 65535
  }

  # Allow outbound responses to private subnets
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = var.vpc_cidr
    from_port  = 1024
    to_port    = 65535
  }

  # Deny everything else (implicit, but being explicit is clearer)
  ingress {
    protocol   = "-1"
    rule_no    = 32766
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    protocol   = "-1"
    rule_no    = 32766
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = { Name = "${var.project}-isolated-nacl" }
}
```

## Use VPC Endpoints for AWS Services

Isolated subnets cannot reach the internet, but they still need to talk to AWS services. VPC endpoints keep this traffic on the AWS network:

```hcl
# Gateway endpoint for S3 (free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = concat(
    aws_route_table.private[*].id,
    [aws_route_table.isolated.id]
  )

  tags = { Name = "${var.project}-s3-endpoint" }
}

# Gateway endpoint for DynamoDB (free)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.dynamodb"

  route_table_ids = concat(
    aws_route_table.private[*].id,
    [aws_route_table.isolated.id]
  )

  tags = { Name = "${var.project}-dynamodb-endpoint" }
}

# Interface endpoint for Secrets Manager
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  tags = { Name = "${var.project}-secretsmanager-endpoint" }
}

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.project}-vpc-endpoints-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = { Name = "${var.project}-vpc-endpoints-sg" }
}
```

## Multi-VPC Architecture with Transit Gateway

For larger organizations, use separate VPCs for different workloads and connect them through a transit gateway:

```hcl
# Transit gateway for connecting VPCs
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Central transit gateway"
  default_route_table_association = "disable"
  default_route_table_propagation = "disable"

  tags = { Name = "${var.project}-tgw" }
}

# Attach each VPC
resource "aws_ec2_transit_gateway_vpc_attachment" "production" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.production.id
  subnet_ids         = aws_subnet.production_private[*].id

  tags = { Name = "production-attachment" }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "staging" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.staging.id
  subnet_ids         = aws_subnet.staging_private[*].id

  tags = { Name = "staging-attachment" }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "shared_services" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.shared_services.id
  subnet_ids         = aws_subnet.shared_private[*].id

  tags = { Name = "shared-services-attachment" }
}

# Route tables for segmentation
# Production can reach shared services but NOT staging
resource "aws_ec2_transit_gateway_route_table" "production" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  tags               = { Name = "production-rt" }
}

resource "aws_ec2_transit_gateway_route_table_association" "production" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.production.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}

# Propagate shared services routes to production
resource "aws_ec2_transit_gateway_route_table_propagation" "prod_to_shared" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.shared_services.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}

# Do NOT propagate staging routes to production
# This enforces environment isolation
```

## VPC Flow Logs for Monitoring

Monitor network traffic across all segments:

```hcl
resource "aws_flow_log" "main" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_logs.arn
  max_aggregation_interval = 60

  tags = { Name = "${var.project}-flow-logs" }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/vpc/flow-logs/${var.project}"
  retention_in_days = 90
}
```

## Summary

Network segmentation with Terraform gives you defense in depth through multiple layers: VPCs for environment isolation, subnet tiers for workload separation, NACLs for stateless filtering, security groups for stateful filtering, and VPC endpoints for keeping AWS traffic private. Transit gateways let you scale this pattern across many VPCs while maintaining strict routing controls. By defining all of this in Terraform, you get consistent segmentation across every environment and a clear audit trail of your network architecture.

For related networking topics, see [how to implement security groups best practices with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-security-groups-best-practices-with-terraform/view) and [how to implement zero trust networking with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-zero-trust-networking-with-terraform/view).

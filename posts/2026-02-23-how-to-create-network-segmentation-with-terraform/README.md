# How to Create Network Segmentation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Network Segmentation, VPC, Security Groups, NACLs, Infrastructure as Code

Description: Learn how to create network segmentation with Terraform using subnets, security groups, NACLs, and Transit Gateway for defense-in-depth network security on AWS.

---

Network segmentation divides your network into isolated segments, limiting the blast radius of security incidents and controlling traffic flow between different parts of your infrastructure. In AWS, segmentation is achieved through a combination of VPCs, subnets, security groups, network ACLs, and Transit Gateway route tables. This guide covers implementing comprehensive network segmentation with Terraform.

## Why Network Segmentation?

Without segmentation, a compromised resource can potentially access every other resource in your network. Segmentation limits lateral movement, enforces the principle of least privilege at the network level, helps meet compliance requirements like PCI-DSS and HIPAA, and makes it easier to monitor and audit traffic flows between segments.

## Prerequisites

You need Terraform 1.0 or later and an AWS account. This guide assumes familiarity with VPC networking concepts.

## Multi-Tier Subnet Architecture

The most basic form of segmentation divides your VPC into tiers - public, application, and data.

```hcl
provider "aws" {
  region = "us-east-1"
}

# VPC for the segmented network
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "segmented-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Public tier - web servers, load balancers
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${count.index + 1}"
    Tier = "public"
  }
}

# Application tier - application servers, containers
resource "aws_subnet" "application" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "application-${count.index + 1}"
    Tier = "application"
  }
}

# Data tier - databases, caches
resource "aws_subnet" "data" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 20)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "data-${count.index + 1}"
    Tier = "data"
  }
}

# Management tier - bastion hosts, monitoring
resource "aws_subnet" "management" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 30)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "management-${count.index + 1}"
    Tier = "management"
  }
}
```

## Network ACLs for Tier Isolation

NACLs provide stateless, subnet-level traffic filtering as an additional layer beyond security groups.

```hcl
# Public tier NACL - allows HTTP/HTTPS inbound, ephemeral ports outbound
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # Allow HTTP inbound from internet
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Allow HTTPS inbound from internet
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow ephemeral port responses from application tier
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "10.0.10.0/21"  # Application tier CIDR range
    from_port  = 1024
    to_port    = 65535
  }

  # Allow outbound to application tier
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.10.0/21"
    from_port  = 8080
    to_port    = 8080
  }

  # Allow ephemeral port responses to internet
  egress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  tags = {
    Name = "public-nacl"
    Tier = "public"
  }
}

# Data tier NACL - only allows traffic from application tier
resource "aws_network_acl" "data" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.data[*].id

  # Allow database traffic from application tier only
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.10.0/21"  # Application tier only
    from_port  = 3306
    to_port    = 3306
  }

  # Allow Redis traffic from application tier
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "10.0.10.0/21"
    from_port  = 6379
    to_port    = 6379
  }

  # Allow PostgreSQL from application tier
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "10.0.10.0/21"
    from_port  = 5432
    to_port    = 5432
  }

  # Deny all traffic from public tier (explicit deny)
  ingress {
    protocol   = "-1"
    rule_no    = 200
    action     = "deny"
    cidr_block = "10.0.0.0/21"  # Public tier CIDR
    from_port  = 0
    to_port    = 0
  }

  # Allow ephemeral port responses to application tier
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.10.0/21"
    from_port  = 1024
    to_port    = 65535
  }

  tags = {
    Name = "data-nacl"
    Tier = "data"
  }
}
```

## Security Groups for Fine-Grained Control

Security groups provide stateful, instance-level traffic filtering.

```hcl
# Load balancer security group - public facing
resource "aws_security_group" "alb" {
  name_prefix = "alb-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Application Load Balancer"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Forward to application servers"
  }

  tags = {
    Name = "alb-sg"
    Tier = "public"
  }
}

# Application security group - only accepts from ALB
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for application servers"

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Traffic from ALB only"
  }

  egress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
    description     = "MySQL to database tier"
  }

  egress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.cache.id]
    description     = "Redis to cache tier"
  }

  # Allow outbound HTTPS for API calls
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS outbound for AWS APIs"
  }

  tags = {
    Name = "app-sg"
    Tier = "application"
  }
}

# Database security group - only accepts from application tier
resource "aws_security_group" "database" {
  name_prefix = "database-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for databases"

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "MySQL from application tier only"
  }

  # No internet egress - databases should not reach the internet
  tags = {
    Name = "database-sg"
    Tier = "data"
  }
}

# Cache security group
resource "aws_security_group" "cache" {
  name_prefix = "cache-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for cache layer"

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Redis from application tier only"
  }

  tags = {
    Name = "cache-sg"
    Tier = "data"
  }
}
```

## VPC-Level Segmentation with Transit Gateway

For larger organizations, use separate VPCs for each workload and connect them via Transit Gateway with controlled routing.

```hcl
# Transit Gateway as the central hub
resource "aws_ec2_transit_gateway" "hub" {
  description = "Central network hub"

  default_route_table_association = "disable"
  default_route_table_propagation = "disable"

  tags = {
    Name = "network-hub"
  }
}

# Route tables for different segments
resource "aws_ec2_transit_gateway_route_table" "production" {
  transit_gateway_id = aws_ec2_transit_gateway.hub.id

  tags = {
    Name    = "production-rt"
    Segment = "production"
  }
}

resource "aws_ec2_transit_gateway_route_table" "development" {
  transit_gateway_id = aws_ec2_transit_gateway.hub.id

  tags = {
    Name    = "development-rt"
    Segment = "development"
  }
}

resource "aws_ec2_transit_gateway_route_table" "shared_services" {
  transit_gateway_id = aws_ec2_transit_gateway.hub.id

  tags = {
    Name    = "shared-services-rt"
    Segment = "shared-services"
  }
}

# Production VPC attachment
resource "aws_ec2_transit_gateway_vpc_attachment" "production" {
  subnet_ids         = aws_subnet.application[*].id
  transit_gateway_id = aws_ec2_transit_gateway.hub.id
  vpc_id             = aws_vpc.main.id

  tags = {
    Name = "production-attachment"
  }
}

# Associate production attachment with production route table
resource "aws_ec2_transit_gateway_route_table_association" "production" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.production.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}

# Production can reach shared services but not development
resource "aws_ec2_transit_gateway_route" "prod_to_shared" {
  destination_cidr_block         = "10.100.0.0/16"  # Shared services CIDR
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.shared_services.id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}

# Block production from reaching development (blackhole route)
resource "aws_ec2_transit_gateway_route" "prod_block_dev" {
  destination_cidr_block         = "10.200.0.0/16"  # Development CIDR
  blackhole                      = true
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.production.id
}
```

## VPC Flow Logs for Segment Monitoring

Monitor traffic between segments to verify your segmentation is working correctly.

```hcl
# Flow logs to monitor inter-segment traffic
resource "aws_flow_log" "segmentation_monitoring" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_logs.arn
  max_aggregation_interval = 60

  tags = {
    Name = "segmentation-flow-logs"
  }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/vpc/segmentation-flow-logs"
  retention_in_days = 14
}

resource "aws_iam_role" "flow_logs" {
  name = "flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "vpc-flow-logs.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "flow_logs" {
  name = "flow-logs-policy"
  role = aws_iam_role.flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}
```

## Conclusion

Network segmentation with Terraform creates a defense-in-depth architecture that limits the blast radius of security incidents. By combining subnet tiers, NACLs, security groups, and Transit Gateway route tables, you achieve multiple layers of network isolation. The infrastructure-as-code approach ensures your segmentation rules are consistent, auditable, and reproducible across environments.

For related networking topics, see our guide on [How to Handle CIDR Block Conflicts in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cidr-block-conflicts-in-terraform/view).

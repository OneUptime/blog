# How to Implement VPC Security Best Practices with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, VPC, AWS, Networking

Description: A detailed guide to implementing VPC security best practices in AWS using Terraform, covering subnet design, routing, flow logs, and traffic inspection.

---

A VPC is the network foundation of your AWS infrastructure. Every other security control you put in place depends on the network being properly configured. A misconfigured VPC can expose databases to the internet, allow lateral movement between services that should be isolated, or create blind spots where you cannot see what traffic is flowing. Terraform lets you define your VPC architecture as code, making it auditable, version-controlled, and reproducible.

This guide covers the most important VPC security practices you should implement with Terraform.

## Multi-Tier Subnet Architecture

Design your VPC with at least three tiers of subnets, each with different exposure levels:

```hcl
locals {
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Use the dedicated tenancy for highest isolation (if compliance requires)
  # instance_tenancy = "dedicated"

  tags = {
    Name        = "production-vpc"
    Environment = "production"
  }
}

# Public subnets: Load balancers, NAT gateways, bastion hosts
resource "aws_subnet" "public" {
  count             = length(local.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = local.availability_zones[count.index]

  # Never auto-assign public IPs
  map_public_ip_on_launch = false

  tags = {
    Name = "public-${local.availability_zones[count.index]}"
    Tier = "public"
  }
}

# Private subnets: Application servers, containers, Lambda
resource "aws_subnet" "private" {
  count             = length(local.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 10)
  availability_zone = local.availability_zones[count.index]

  tags = {
    Name = "private-${local.availability_zones[count.index]}"
    Tier = "private"
  }
}

# Data subnets: Databases, caches, search clusters
resource "aws_subnet" "data" {
  count             = length(local.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 20)
  availability_zone = local.availability_zones[count.index]

  tags = {
    Name = "data-${local.availability_zones[count.index]}"
    Tier = "data"
  }
}
```

## Internet and NAT Gateway Configuration

```hcl
# Internet gateway for public subnets
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "production-igw"
  }
}

# One NAT gateway per AZ for high availability
resource "aws_eip" "nat" {
  count  = length(local.availability_zones)
  domain = "vpc"

  tags = {
    Name = "nat-eip-${local.availability_zones[count.index]}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = length(local.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "nat-${local.availability_zones[count.index]}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = length(local.availability_zones)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "private-rt-${local.availability_zones[count.index]}"
  }
}

# Data tier has NO internet route at all
resource "aws_route_table" "data" {
  count  = length(local.availability_zones)
  vpc_id = aws_vpc.main.id

  # No default route - completely isolated from internet
  # VPC endpoints provide access to AWS services

  tags = {
    Name = "data-rt-${local.availability_zones[count.index]}"
  }
}

# Route table associations
resource "aws_route_table_association" "public" {
  count          = length(local.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(local.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_route_table_association" "data" {
  count          = length(local.availability_zones)
  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data[count.index].id
}
```

## Deny-All Default Security Group

The default security group should deny all traffic:

```hcl
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id

  # No ingress rules
  # No egress rules

  tags = {
    Name = "default-deny-all"
    Note = "DO NOT USE - all traffic denied"
  }
}
```

## VPC Flow Logs

Enable flow logs for all traffic, both accepted and rejected:

```hcl
resource "aws_flow_log" "all_traffic" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_log.arn
  max_aggregation_interval = 60  # 1-minute granularity

  tags = {
    Name = "vpc-flow-logs"
  }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/flow-logs/production"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn

  tags = {
    Name = "vpc-flow-logs"
  }
}

# Also send to S3 for long-term retention and analysis
resource "aws_flow_log" "s3_archive" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = aws_s3_bucket.flow_logs.arn

  destination_options {
    file_format        = "parquet"
    per_hour_partition = true
  }

  tags = {
    Name = "vpc-flow-logs-s3"
  }
}

# IAM role for flow logs
resource "aws_iam_role" "flow_log" {
  name = "vpc-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "flow_log" {
  name = "vpc-flow-log-policy"
  role = aws_iam_role.flow_log.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## VPC Endpoints

Keep traffic to AWS services off the public internet:

```hcl
# Gateway endpoints (free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = concat(
    aws_route_table.private[*].id,
    aws_route_table.data[*].id
  )

  tags = {
    Name = "s3-endpoint"
  }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.dynamodb"

  route_table_ids = concat(
    aws_route_table.private[*].id,
    aws_route_table.data[*].id
  )

  tags = {
    Name = "dynamodb-endpoint"
  }
}

# Interface endpoints for other services
locals {
  interface_endpoints = [
    "secretsmanager",
    "ssm",
    "ssmmessages",
    "ec2messages",
    "kms",
    "logs",
    "monitoring",
    "ecr.api",
    "ecr.dkr",
    "sts"
  ]
}

resource "aws_vpc_endpoint" "interface" {
  for_each = toset(local.interface_endpoints)

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.${each.value}"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "${each.value}-endpoint"
  }
}

resource "aws_security_group" "vpc_endpoints" {
  name        = "vpc-endpoints-sg"
  description = "Security group for VPC interface endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  tags = {
    Name = "vpc-endpoints-sg"
  }
}
```

## Network ACLs

Add NACLs as a second layer of defense:

```hcl
# NACL for data subnets - strictest controls
resource "aws_network_acl" "data" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.data[*].id

  # Allow inbound from private subnets on database ports
  dynamic "ingress" {
    for_each = aws_subnet.private
    content {
      protocol   = "tcp"
      rule_no    = 100 + ingress.key
      action     = "allow"
      cidr_block = ingress.value.cidr_block
      from_port  = 5432
      to_port    = 5432
    }
  }

  # Allow inbound on Redis port from private subnets
  dynamic "ingress" {
    for_each = aws_subnet.private
    content {
      protocol   = "tcp"
      rule_no    = 200 + ingress.key
      action     = "allow"
      cidr_block = ingress.value.cidr_block
      from_port  = 6379
      to_port    = 6379
    }
  }

  # Allow ephemeral ports for return traffic
  ingress {
    protocol   = "tcp"
    rule_no    = 900
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow outbound return traffic to private subnets
  dynamic "egress" {
    for_each = aws_subnet.private
    content {
      protocol   = "tcp"
      rule_no    = 100 + egress.key
      action     = "allow"
      cidr_block = egress.value.cidr_block
      from_port  = 1024
      to_port    = 65535
    }
  }

  # Allow HTTPS outbound for VPC endpoints
  egress {
    protocol   = "tcp"
    rule_no    = 400
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 443
    to_port    = 443
  }

  tags = {
    Name = "data-nacl"
  }
}
```

## Traffic Mirroring for Inspection

For deep packet inspection or IDS/IPS:

```hcl
# Traffic mirror target (IDS appliance)
resource "aws_ec2_traffic_mirror_target" "ids" {
  network_load_balancer_arn = aws_lb.ids.arn
  description               = "IDS traffic mirror target"

  tags = {
    Name = "ids-mirror-target"
  }
}

# Traffic mirror filter
resource "aws_ec2_traffic_mirror_filter" "main" {
  description = "Mirror all TCP traffic"

  tags = {
    Name = "main-mirror-filter"
  }
}

resource "aws_ec2_traffic_mirror_filter_rule" "ingress" {
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  description              = "Mirror all inbound TCP"
  rule_number              = 100
  rule_action              = "accept"
  traffic_direction        = "ingress"
  protocol                 = 6  # TCP

  destination_cidr_block = "0.0.0.0/0"
  source_cidr_block      = "0.0.0.0/0"
}
```

## GuardDuty for VPC Threat Detection

```hcl
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }

  tags = {
    Name = "guardduty-detector"
  }
}
```

## Wrapping Up

VPC security is about creating layers of isolation and visibility. Start with a multi-tier subnet design, lock down the default security group, enable flow logs for complete network visibility, use VPC endpoints to keep AWS traffic private, add NACLs for defense in depth, and consider traffic mirroring for deep inspection. Every layer independently reduces your attack surface and makes lateral movement harder for an attacker.

For monitoring your network and application health, [OneUptime](https://oneuptime.com) provides distributed uptime monitoring, alerting, and incident management to help you detect connectivity issues before they impact users.

# How to Implement Network Security with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Networking, VPC, AWS

Description: A comprehensive guide to implementing network security controls in AWS using Terraform, covering VPCs, security groups, NACLs, and more.

---

Network security is the first line of defense for your cloud infrastructure. No matter how well you configure your application security, a misconfigured network can expose everything behind it. Terraform gives you the ability to define your entire network topology as code, which means you can review, version, and enforce network security policies just like application code.

This guide covers implementing network security in AWS using Terraform, from VPC design to security groups, NACLs, and traffic inspection.

## Design Your VPC with Security in Mind

A well-designed VPC separates resources into tiers based on their exposure level:

```hcl
# VPC with DNS support
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "production-vpc"
    Environment = "production"
  }
}

# Public subnets - only for load balancers and bastion hosts
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = var.availability_zones[count.index]

  # Do NOT auto-assign public IPs
  map_public_ip_on_launch = false

  tags = {
    Name = "public-${var.availability_zones[count.index]}"
    Tier = "public"
  }
}

# Private subnets - for application servers
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "private-${var.availability_zones[count.index]}"
    Tier = "private"
  }
}

# Data subnets - for databases and caches (most restricted)
resource "aws_subnet" "data" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 20)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "data-${var.availability_zones[count.index]}"
    Tier = "data"
  }
}
```

## Lock Down the Default Security Group

AWS creates a default security group for every VPC that allows all traffic between members. Override it to deny everything:

```hcl
# Override the default security group to deny all traffic
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id

  # No ingress rules
  # No egress rules

  tags = {
    Name = "default-deny-all"
    Note = "Do not use this security group"
  }
}
```

## Build Security Groups with Least Privilege

Each tier gets its own security groups with minimal access:

```hcl
# ALB security group - accepts HTTP/HTTPS from the internet
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from internet (redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "To application servers only"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = {
    Name = "alb-sg"
  }
}

# Application security group - only accepts from ALB
resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "From ALB only"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description     = "To database"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.database.id]
  }

  egress {
    description = "HTTPS for external API calls and package updates"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "app-sg"
  }
}

# Database security group - only accepts from app servers
resource "aws_security_group" "database" {
  name        = "database-sg"
  description = "Security group for databases"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app servers only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  # No egress rules needed for most databases
  # Add specific rules if the database needs outbound access

  tags = {
    Name = "database-sg"
  }
}
```

## Network ACLs for Defense in Depth

NACLs provide a second layer of filtering at the subnet level:

```hcl
# NACL for data subnets - extra protection for databases
resource "aws_network_acl" "data" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.data[*].id

  # Allow inbound PostgreSQL from private subnets only
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.10.0/24"  # Private subnet 1
    from_port  = 5432
    to_port    = 5432
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "10.0.11.0/24"  # Private subnet 2
    from_port  = 5432
    to_port    = 5432
  }

  # Allow return traffic (ephemeral ports)
  ingress {
    protocol   = "tcp"
    rule_no    = 200
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow outbound return traffic to private subnets
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.10.0/24"
    from_port  = 1024
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "10.0.11.0/24"
    from_port  = 1024
    to_port    = 65535
  }

  # Deny everything else (implicit)

  tags = {
    Name = "data-nacl"
  }
}
```

## Enable VPC Flow Logs

Flow logs are essential for security monitoring and forensics:

```hcl
resource "aws_flow_log" "vpc" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_log.arn
  max_aggregation_interval = 60

  tags = {
    Name = "vpc-flow-logs"
  }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/flow-logs/production"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}

# Alert on rejected traffic patterns
resource "aws_cloudwatch_log_metric_filter" "rejected_connections" {
  name           = "rejected-connections"
  pattern        = "[version, account, eni, source, destination, srcport, destport, protocol, packets, bytes, windowstart, windowend, action=\"REJECT\", flowlogstatus]"
  log_group_name = aws_cloudwatch_log_group.flow_logs.name

  metric_transformation {
    name      = "RejectedConnectionCount"
    namespace = "VPCFlowLogs"
    value     = "1"
  }
}
```

## Use VPC Endpoints for AWS Services

Keep traffic to AWS services within the AWS network instead of going over the internet:

```hcl
# Gateway endpoint for S3 (free)
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

# Gateway endpoint for DynamoDB (free)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.dynamodb"

  route_table_ids = aws_route_table.private[*].id

  tags = {
    Name = "dynamodb-endpoint"
  }
}

# Interface endpoint for Secrets Manager
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "secretsmanager-endpoint"
  }
}

# Security group for interface endpoints
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

## Restrict NAT Gateway Access

Control what private subnet resources can access via the NAT gateway:

```hcl
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "main-nat-gw"
  }
}

# Route table for private subnets
resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "private-rt-${var.availability_zones[count.index]}"
  }
}
```

## Wrapping Up

Network security in Terraform is about building layers of defense. Start with a well-segmented VPC, lock down the default security group, create specific security groups for each tier with minimal access, add NACLs for defense in depth, enable flow logs for visibility, and use VPC endpoints to keep traffic off the public internet. Each layer independently reduces your attack surface.

For monitoring network connectivity and application health, [OneUptime](https://oneuptime.com) provides uptime monitoring, distributed checks, and incident management to alert you when something goes wrong.

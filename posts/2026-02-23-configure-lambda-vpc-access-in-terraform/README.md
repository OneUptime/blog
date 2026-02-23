# How to Configure Lambda VPC Access in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, VPC, Networking, Serverless, Security

Description: How to configure AWS Lambda functions to access resources inside a VPC using Terraform, including subnet placement, security groups, NAT gateways, and VPC endpoints.

---

By default, Lambda functions run outside your VPC. They can reach the internet and AWS services directly, but they cannot access resources inside your VPC like RDS databases, ElastiCache clusters, or EC2 instances. When your Lambda function needs to connect to these resources, you need to configure VPC access.

VPC-connected Lambda functions get an Elastic Network Interface (ENI) in each subnet you specify, allowing them to communicate with resources in those subnets. However, this introduces networking complexity - the function loses direct internet access and needs NAT gateways or VPC endpoints to reach AWS services.

This guide walks through configuring Lambda VPC access in Terraform, handling the networking requirements, and avoiding the performance pitfalls.

## Basic VPC Configuration

```hcl
# Lambda function with VPC access
resource "aws_lambda_function" "api" {
  function_name = "myapp-api"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  # VPC configuration
  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST = var.rds_endpoint
    }
  }

  tags = {
    Name = "myapp-api"
  }
}
```

That `vpc_config` block is all it takes to put Lambda in a VPC. But there are several supporting resources you need to get right.

## Security Group for Lambda

Create a security group that allows Lambda to reach the resources it needs:

```hcl
# Security group for Lambda functions
resource "aws_security_group" "lambda" {
  name_prefix = "lambda-"
  vpc_id      = var.vpc_id
  description = "Security group for VPC-connected Lambda functions"

  # Lambda needs outbound access to reach RDS, ElastiCache, etc.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  # No inbound rules needed - Lambda is not a server
  # It initiates connections, it does not receive them

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "lambda-sg"
  }
}
```

Then update your RDS security group to allow traffic from the Lambda security group:

```hcl
# Allow Lambda to reach RDS
resource "aws_security_group_rule" "rds_from_lambda" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda.id
  security_group_id        = var.rds_security_group_id
  description              = "PostgreSQL from Lambda"
}

# Allow Lambda to reach ElastiCache
resource "aws_security_group_rule" "redis_from_lambda" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda.id
  security_group_id        = var.redis_security_group_id
  description              = "Redis from Lambda"
}
```

## IAM Permissions for VPC

Lambda needs additional IAM permissions to create and manage ENIs:

```hcl
resource "aws_iam_role" "lambda_exec" {
  name = "myapp-lambda-vpc-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# This managed policy includes both CloudWatch Logs and VPC ENI permissions
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
```

The `AWSLambdaVPCAccessExecutionRole` policy includes:
- `ec2:CreateNetworkInterface`
- `ec2:DescribeNetworkInterfaces`
- `ec2:DeleteNetworkInterface`
- `ec2:AssignPrivateIpAddresses`
- `ec2:UnassignPrivateIpAddresses`
- Plus the standard CloudWatch Logs permissions

## Internet Access with NAT Gateway

A VPC-connected Lambda function in a private subnet has no internet access by default. If your function needs to call external APIs or AWS services without VPC endpoints, you need a NAT gateway:

```hcl
# Elastic IP for the NAT gateway
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "nat-gateway-eip" }
}

# NAT gateway in a public subnet
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = var.public_subnet_id

  tags = { Name = "main-nat-gateway" }
}

# Route table for Lambda's private subnets
resource "aws_route_table" "private" {
  vpc_id = var.vpc_id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = { Name = "private-route-table" }
}

# Associate private subnets with the route table
resource "aws_route_table_association" "private" {
  count = length(var.private_subnet_ids)

  subnet_id      = var.private_subnet_ids[count.index]
  route_table_id = aws_route_table.private.id
}
```

NAT gateways cost money. If your Lambda only needs to reach AWS services (not the public internet), VPC endpoints are cheaper and faster.

## VPC Endpoints (Instead of NAT Gateway)

VPC endpoints let Lambda reach AWS services without going through a NAT gateway:

```hcl
# Gateway endpoint for S3 (free)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = var.vpc_id
  service_name = "com.amazonaws.${var.aws_region}.s3"

  route_table_ids = [aws_route_table.private.id]

  tags = { Name = "s3-endpoint" }
}

# Gateway endpoint for DynamoDB (free)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = var.vpc_id
  service_name = "com.amazonaws.${var.aws_region}.dynamodb"

  route_table_ids = [aws_route_table.private.id]

  tags = { Name = "dynamodb-endpoint" }
}

# Interface endpoint for Secrets Manager
resource "aws_vpc_endpoint" "secrets_manager" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  tags = { Name = "secretsmanager-endpoint" }
}

# Interface endpoint for SQS
resource "aws_vpc_endpoint" "sqs" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.sqs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  tags = { Name = "sqs-endpoint" }
}

# Security group for interface endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "vpce-"
  vpc_id      = var.vpc_id
  description = "Allow HTTPS from Lambda"

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
    description     = "HTTPS from Lambda functions"
  }

  tags = { Name = "vpc-endpoints-sg" }
}
```

Gateway endpoints (S3, DynamoDB) are free. Interface endpoints cost about $0.01/hour per AZ plus data transfer charges. Still cheaper than a NAT gateway for most workloads.

## Choosing Subnets

Place Lambda in private subnets across multiple AZs for availability:

```hcl
resource "aws_lambda_function" "api" {
  # ...

  vpc_config {
    # Use subnets in multiple AZs
    subnet_ids = [
      aws_subnet.private_a.id,
      aws_subnet.private_b.id,
      aws_subnet.private_c.id,
    ]
    security_group_ids = [aws_security_group.lambda.id]
  }
}
```

Lambda creates ENIs in the subnets you specify and can use any of them when executing. More subnets across more AZs means more IP addresses available and better resilience.

## IP Address Capacity

Each concurrent Lambda execution uses an IP address. If you have 100 concurrent invocations, you need at least 100 available IPs across your subnets. Plan your CIDR ranges accordingly:

```hcl
# Dedicated subnets for Lambda with plenty of IP space
resource "aws_subnet" "lambda" {
  count = 3

  vpc_id            = var.vpc_id
  cidr_block        = cidrsubnet("10.0.100.0/20", 2, count.index)
  # /22 per subnet = 1022 usable IPs each
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "lambda-subnet-${count.index}"
    Tier = "lambda"
  }
}
```

## Outputs

```hcl
output "lambda_security_group_id" {
  description = "Security group ID for Lambda functions"
  value       = aws_security_group.lambda.id
}

output "lambda_subnet_ids" {
  description = "Subnet IDs for Lambda VPC access"
  value       = aws_subnet.lambda[*].id
}
```

## Summary

Lambda VPC access in Terraform is configured with the `vpc_config` block specifying subnets and security groups. The function needs `AWSLambdaVPCAccessExecutionRole` for ENI management. Once in a VPC, Lambda loses internet access, so you need either NAT gateways (for internet + AWS services) or VPC endpoints (for AWS services only). Use dedicated subnets with enough IP space for your concurrency levels, and reference Lambda's security group in the security groups of the resources it needs to access. The modern Lambda networking implementation creates ENIs quickly, so the cold start penalty for VPC-connected functions is minimal.

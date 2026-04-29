# How to Set Up Lambda with VPC Access Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, VPC, Networking, Serverless, Infrastructure as Code

Description: Learn how to configure Lambda functions with VPC access using OpenTofu to enable connectivity to RDS, ElastiCache, and other private resources in your VPC.

## Introduction

By default, Lambda functions run in a Lambda-managed VPC with internet access but cannot reach private resources in your VPC. Attaching a function to your VPC through private subnets allows connectivity to databases, cache clusters, and other private services.

## Prerequisites

- OpenTofu v1.6+
- An existing VPC with private subnets
- AWS credentials with Lambda, EC2, and IAM permissions

## Step 1: Create the Lambda Execution Role with VPC Policy

```hcl
resource "aws_iam_role" "lambda_vpc" {
  name = "lambda-vpc-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# This policy grants permission to create and manage ENIs in the VPC

resource "aws_iam_role_policy_attachment" "lambda_vpc_policy" {
  role       = aws_iam_role.lambda_vpc.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_vpc.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## Step 2: Create the Lambda Security Group

```hcl
# Security group controlling Lambda's network access
resource "aws_security_group" "lambda" {
  name        = "lambda-vpc-sg"
  description = "Security group for Lambda VPC functions"
  vpc_id      = var.vpc_id

  tags = { Name = "lambda-vpc-sg" }
}

# Allow outbound to RDS on port 5432
resource "aws_vpc_security_group_egress_rule" "lambda_egress_rds" {
  security_group_id            = aws_security_group.lambda.id
  referenced_security_group_id = aws_security_group.rds.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL access"
}

# Allow outbound to Redis on port 6379
resource "aws_vpc_security_group_egress_rule" "lambda_egress_redis" {
  security_group_id            = aws_security_group.lambda.id
  referenced_security_group_id = aws_security_group.redis.id
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  description                  = "Redis access"
}

# Allow HTTPS outbound via NAT gateway for external APIs
resource "aws_vpc_security_group_egress_rule" "lambda_https_outbound" {
  security_group_id = aws_security_group.lambda.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS outbound"
}
```

## Step 3: Configure the Lambda Function with VPC Settings

```hcl
resource "aws_lambda_function" "db_processor" {
  function_name    = "db-processor"
  role             = aws_iam_role.lambda_vpc.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.zip.output_path
  source_code_hash = data.archive_file.zip.output_base64sha256
  memory_size      = 512
  timeout          = 60

  # VPC configuration - place Lambda in private subnets
  vpc_config {
    subnet_ids         = var.private_subnet_ids    # Private subnets across multiple AZs
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST     = var.rds_endpoint
      DB_PORT     = "5432"
      DB_NAME     = var.database_name
      REDIS_HOST  = var.redis_endpoint
    }
  }

  tags = { Name = "db-processor" }
}
```

## Step 4: Grant RDS and Redis Security Groups Access from Lambda

```hcl
# Allow Lambda to connect to RDS
resource "aws_vpc_security_group_ingress_rule" "rds_from_lambda" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.lambda.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Allow Lambda to connect to RDS"
}

# Allow Lambda to connect to ElastiCache Redis
resource "aws_vpc_security_group_ingress_rule" "redis_from_lambda" {
  security_group_id            = aws_security_group.redis.id
  referenced_security_group_id = aws_security_group.lambda.id
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  description                  = "Allow Lambda to connect to Redis"
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

VPC-enabled Lambda functions can access private resources like RDS, ElastiCache, and internal APIs. Place Lambda in private subnets with a NAT Gateway for outbound internet access. Be aware that the first time Lambda uses a new subnet and security group combination, it creates a Hyperplane ENI and the function can remain in the Pending state for several minutes. Cold start latency varies by runtime and initialization work, and provisioned concurrency can reduce it.

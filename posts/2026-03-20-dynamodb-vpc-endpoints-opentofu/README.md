# How to Configure DynamoDB VPC Endpoints with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, VPC Endpoints, Security, Private Connectivity, Infrastructure as Code

Description: Learn how to create DynamoDB Gateway VPC Endpoints with OpenTofu to route DynamoDB traffic through the AWS network without traversing the public internet.

## Introduction

DynamoDB Gateway VPC Endpoints allow EC2 instances, Lambda functions in VPCs, and ECS tasks to communicate with DynamoDB without requiring internet gateways, NAT gateways, or VPN connections. Traffic stays within the AWS network without requiring internet or NAT gateways, improving access control and helping avoid NAT gateway charges.

## Prerequisites

- OpenTofu v1.6+
- An existing VPC with route tables
- AWS credentials with VPC and DynamoDB permissions

## Step 1: Create DynamoDB Gateway VPC Endpoint

```hcl
# DynamoDB supports both Gateway and Interface endpoints; this example uses a Gateway endpoint

data "aws_caller_identity" "current" {}

# Gateway endpoints have no additional charge
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"

  # Associate with all private route tables
  route_table_ids = var.private_route_table_ids

  # Endpoint policy to restrict access to specific tables
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "dynamodb:DescribeEndpoints"
        ]
        Resource = "*"
      },
      {
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-*"
        ]
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-dynamodb-endpoint"
    Environment = var.environment
  }
}
```

## Step 2: Enforce VPC Endpoint Usage via IAM Policy

```hcl
# Managed IAM policy to attach to the roles or users that access DynamoDB
resource "aws_iam_policy" "dynamodb_vpce_only" {
  name        = "${var.project_name}-dynamodb-vpce-only"
  description = "Require VPC endpoint for DynamoDB access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["dynamodb:*"]
        Resource = "*"
      },
      {
        Sid    = "DenyAccessWithoutVPCE"
        Effect = "Deny"
        Action = ["dynamodb:*"]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:sourceVpce" = aws_vpc_endpoint.dynamodb.id
          }
        }
      }
    ]
  })
}
```

## Step 3: DynamoDB Table with VPC Endpoint Condition in Table Policy

```hcl
resource "aws_dynamodb_table" "private" {
  name         = "${var.project_name}-private-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-private-table"
  }
}

# Resource-based policy on the DynamoDB table (resource policy)
resource "aws_dynamodb_resource_policy" "private" {
  resource_arn = aws_dynamodb_table.private.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyNonVPCEAccess"
      Effect = "Deny"
      Principal = { AWS = "*" }
      Action    = ["dynamodb:*"]
      Resource  = aws_dynamodb_table.private.arn
      Condition = {
        StringNotEquals = {
          "aws:sourceVpce" = aws_vpc_endpoint.dynamodb.id
        }
      }
    }]
  })
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test connectivity from a subnet whose route table is associated with the endpoint
aws dynamodb describe-table \
  --table-name "<project-name>-private-table" \
  --region "${AWS_REGION}"
```

## Conclusion

DynamoDB Gateway Endpoints are free and are a good default for VPCs that access DynamoDB-they avoid requiring internet or NAT gateways for DynamoDB access and can eliminate NAT gateway charges for that traffic. Use endpoint policies to restrict which DynamoDB tables are accessible via the endpoint, and add VPC endpoint conditions to IAM or DynamoDB resource-based policies for defense-in-depth.

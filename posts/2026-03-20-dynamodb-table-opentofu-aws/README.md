# How to Create a DynamoDB Table with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Infrastructure as Code, IaC, DynamoDB, Database

Description: Learn how to create and configure an AWS DynamoDB table with global secondary indexes, TTL, and point-in-time recovery using OpenTofu.

## Introduction

Amazon DynamoDB is a fully managed NoSQL database that delivers single-digit millisecond performance at any scale. This guide covers creating DynamoDB tables with indexes and best-practice configurations using OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials configured

## Step 1: Configure the Provider

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Step 2: Create a Basic DynamoDB Table

```hcl
resource "aws_dynamodb_table" "users" {
  name         = "users"
  billing_mode = "PAY_PER_REQUEST"  # On-demand; use PROVISIONED for predictable workloads
  hash_key     = "userId"           # Partition key
  range_key    = "createdAt"        # Sort key (optional)

  # Define attributes used as keys
  attribute {
    name = "userId"
    type = "S"  # String
  }

  attribute {
    name = "createdAt"
    type = "N"  # Number (epoch timestamp)
  }

  attribute {
    name = "email"
    type = "S"
  }

  # Global Secondary Index for querying by email
  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"  # Project all attributes
  }

  # Time To Live - expired items are typically deleted within a few days
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  # Point-in-time recovery for disaster recovery
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn  # Use null for AWS managed key
  }

  tags = {
    Environment = "production"
    Service     = "users"
  }
}
```

## Step 3: Enable DynamoDB Streams

```hcl
resource "aws_dynamodb_table" "orders" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }

  # Enable streams for change data capture
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"  # Capture both before and after states

  tags = {
    Environment = "production"
  }
}
```

## Step 4: Provisioned Capacity with Auto-Scaling

```hcl
resource "aws_dynamodb_table" "high_throughput" {
  name           = "high-throughput-table"
  billing_mode   = "PROVISIONED"
  hash_key       = "id"
  read_capacity  = 10
  write_capacity = 10

  attribute {
    name = "id"
    type = "S"
  }

  lifecycle {
    ignore_changes = [read_capacity]
  }
}

# Auto-scaling for read capacity

resource "aws_appautoscaling_target" "dynamodb_read" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.high_throughput.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "dynamodb_read" {
  name               = "dynamodb-read-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_read.resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_read.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = 70.0  # Scale when utilization exceeds 70%
  }
}
```

## Step 5: Outputs

```hcl
output "table_name" {
  value = aws_dynamodb_table.users.name
}

output "table_arn" {
  value = aws_dynamodb_table.users.arn
}

output "stream_arn" {
  value = aws_dynamodb_table.orders.stream_arn
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully created DynamoDB tables using OpenTofu with global secondary indexes, TTL, PITR, and stream configurations. Use on-demand billing for unpredictable workloads and provisioned capacity with auto-scaling for consistent high-throughput applications.

# How to Create DynamoDB Tables with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, NoSQL, Database, Infrastructure as Code

Description: Learn how to create and configure DynamoDB tables with OpenTofu, including primary keys, GSIs, LSIs, billing modes, and table-level encryption.

## Introduction

DynamoDB is a fully managed NoSQL database delivering single-digit millisecond performance at any scale. Table design is critical-choosing the right partition key and secondary indexes determines query flexibility and performance. DynamoDB supports both on-demand and provisioned billing modes to balance cost and predictability.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with DynamoDB permissions

## Step 1: Create a Basic DynamoDB Table

```hcl
resource "aws_dynamodb_table" "main" {
  name         = "${var.project_name}-orders"
  billing_mode = "PAY_PER_REQUEST"  # On-demand mode

  # Primary key
  hash_key  = "orderId"     # Partition key
  range_key = "createdAt"   # Sort key

  attribute {
    name = "orderId"
    type = "S"  # S=String, N=Number, B=Binary
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "customerId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # Global Secondary Index for querying by customer
  global_secondary_index {
    name = "CustomerIdIndex"
    key_schema {
      attribute_name = "customerId"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "createdAt"
      key_type       = "RANGE"
    }
    projection_type = "ALL"  # Include all attributes
  }

  # Local Secondary Index for querying by status within the same partition
  local_secondary_index {
    name            = "OrderStatusIndex"
    range_key       = "status"
    projection_type = "INCLUDE"
    non_key_attributes = ["totalAmount", "items"]
  }

  # Server-side encryption; omit kms_key_arn to use the default KMS-managed DynamoDB key
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn  # Optional: use customer-managed key
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-orders"
    Environment = var.environment
  }
}
```

## Step 2: Create a Table with Provisioned Throughput

```hcl
# Use provisioned capacity for predictable workloads

resource "aws_dynamodb_table" "sessions" {
  name         = "${var.project_name}-sessions"
  billing_mode = "PROVISIONED"

  hash_key = "sessionId"

  attribute {
    name = "sessionId"
    type = "S"
  }

  read_capacity  = 10
  write_capacity = 5

  lifecycle {
    ignore_changes = [read_capacity]
  }

  # TTL to auto-expire sessions
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-sessions"
  }
}
```

## Step 3: Application Auto Scaling for Provisioned Tables

```hcl
# Auto scale read capacity
resource "aws_appautoscaling_target" "dynamodb_read" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.sessions.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "dynamodb_read" {
  name               = "${var.project_name}-dynamodb-read-scaling"
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

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Describe the table
aws dynamodb describe-table --table-name my-project-orders
```

## Conclusion

DynamoDB table design requires careful planning of access patterns before creation-local secondary indexes cannot be changed after table creation, while global secondary indexes can be added or deleted later. Use `PAY_PER_REQUEST` for unpredictable or spiky workloads, and provisioned capacity with auto scaling for steady, predictable loads. Always enable point-in-time recovery for production tables, and choose the appropriate KMS key option for your encryption requirements.

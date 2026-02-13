# How to Create DynamoDB Tables with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, DynamoDB, NoSQL, Database

Description: Complete guide to creating Amazon DynamoDB tables with Terraform, covering key schemas, indexes, capacity modes, encryption, and backup configuration.

---

DynamoDB is AWS's fully managed NoSQL database. It handles scaling, replication, and patching automatically. You don't think about servers at all - just tables, items, and queries. But you still need to make important decisions about key design, capacity modes, indexes, and encryption. And those decisions should live in code, not in someone's head.

This guide covers creating DynamoDB tables with Terraform, from simple key-value stores to tables with global secondary indexes and point-in-time recovery.

## Basic Table

Let's start with a simple table. Every DynamoDB table needs at minimum a partition key (hash key). You can optionally add a sort key (range key) for more flexible querying.

This creates a table with a partition key and sort key using on-demand billing:

```hcl
# DynamoDB table with partition key and sort key
resource "aws_dynamodb_table" "orders" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"  # On-demand capacity

  # Primary key definition
  hash_key  = "customer_id"
  range_key = "order_id"

  # Attribute definitions (only for keys and indexes)
  attribute {
    name = "customer_id"
    type = "S"  # String
  }

  attribute {
    name = "order_id"
    type = "S"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

A quick note on attribute types: `S` is String, `N` is Number, and `B` is Binary. You only define attributes that are used in keys or indexes - DynamoDB is schemaless for non-key attributes.

## On-Demand vs Provisioned Capacity

DynamoDB offers two billing modes:

- **PAY_PER_REQUEST (on-demand)** - you pay per read/write. Great for unpredictable workloads.
- **PROVISIONED** - you specify read/write capacity units. Cheaper for steady, predictable traffic.

Here's a table with provisioned capacity and auto-scaling:

```hcl
# Table with provisioned capacity
resource "aws_dynamodb_table" "sessions" {
  name         = "user-sessions"
  billing_mode = "PROVISIONED"
  hash_key     = "session_id"

  # Base provisioned capacity
  read_capacity  = 20
  write_capacity = 10

  attribute {
    name = "session_id"
    type = "S"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Auto-scaling for read capacity
resource "aws_appautoscaling_target" "read_target" {
  max_capacity       = 100
  min_capacity       = 20
  resource_id        = "table/${aws_dynamodb_table.sessions.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "read_policy" {
  name               = "dynamodb-read-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.read_target.resource_id
  scalable_dimension = aws_appautoscaling_target.read_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.read_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = 70.0  # Scale when utilization hits 70%
  }
}

# Auto-scaling for write capacity
resource "aws_appautoscaling_target" "write_target" {
  max_capacity       = 50
  min_capacity       = 10
  resource_id        = "table/${aws_dynamodb_table.sessions.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "write_policy" {
  name               = "dynamodb-write-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.write_target.resource_id
  scalable_dimension = aws_appautoscaling_target.write_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.write_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = 70.0
  }
}
```

If you're unsure which mode to use, start with on-demand. You can always switch to provisioned later when you understand your traffic patterns.

## Global Secondary Indexes (GSI)

GSIs let you query data using attributes other than the primary key. They're like creating an additional table that DynamoDB keeps in sync automatically.

This table has a GSI for querying orders by status and creation date:

```hcl
# Table with Global Secondary Index
resource "aws_dynamodb_table" "orders_with_gsi" {
  name         = "orders-v2"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "order_id"

  attribute {
    name = "order_id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "customer_email"
    type = "S"
  }

  # GSI: Query orders by status, sorted by date
  global_secondary_index {
    name            = "status-date-index"
    hash_key        = "status"
    range_key       = "created_at"
    projection_type = "ALL"  # Include all attributes
  }

  # GSI: Look up orders by customer email
  global_secondary_index {
    name            = "email-index"
    hash_key        = "customer_email"
    projection_type = "INCLUDE"
    non_key_attributes = ["order_id", "status", "total"]
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

Projection types matter for cost and performance:
- `ALL` projects every attribute (most flexible, most expensive)
- `KEYS_ONLY` projects just the key attributes (cheapest)
- `INCLUDE` projects specific attributes you list

## Local Secondary Indexes (LSI)

LSIs share the same partition key as the table but use a different sort key. They must be defined at table creation time - you can't add them later.

This table uses an LSI to sort orders by total amount within each customer:

```hcl
# Table with Local Secondary Index
resource "aws_dynamodb_table" "orders_with_lsi" {
  name         = "orders-v3"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "customer_id"
  range_key    = "order_id"

  attribute {
    name = "customer_id"
    type = "S"
  }

  attribute {
    name = "order_id"
    type = "S"
  }

  attribute {
    name = "total_amount"
    type = "N"
  }

  # LSI: Same partition key, different sort key
  local_secondary_index {
    name            = "customer-amount-index"
    range_key       = "total_amount"
    projection_type = "ALL"
  }

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Encryption and Backup

Production tables should always have encryption and point-in-time recovery enabled:

```hcl
# Production table with encryption and PITR
resource "aws_dynamodb_table" "production" {
  name         = "production-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Server-side encryption with customer-managed KMS key
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }

  # Point-in-time recovery (continuous backups)
  point_in_time_recovery {
    enabled = true
  }

  # Time to Live - automatically delete expired items
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Prevent accidental deletion
  deletion_protection_enabled = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

For managing the KMS key referenced here, see our post on [creating KMS keys with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-kms-keys-with-terraform/view).

## DynamoDB Streams

Streams capture changes to your table and can trigger Lambda functions for real-time processing:

```hcl
# Table with DynamoDB Streams enabled
resource "aws_dynamodb_table" "with_streams" {
  name         = "events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_id"

  attribute {
    name = "event_id"
    type = "S"
  }

  # Enable streams with new and old images
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = {
    ManagedBy = "terraform"
  }
}

# Lambda trigger from DynamoDB Stream
resource "aws_lambda_event_source_mapping" "dynamodb_trigger" {
  event_source_arn  = aws_dynamodb_table.with_streams.stream_arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"
  batch_size        = 100

  # Process in parallel for higher throughput
  parallelization_factor = 2
}
```

## Global Tables

For multi-region applications, DynamoDB Global Tables replicate data automatically:

```hcl
# Global table with replicas in multiple regions
resource "aws_dynamodb_table" "global" {
  name         = "global-config"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "config_key"

  attribute {
    name = "config_key"
    type = "S"
  }

  # Add replicas in other regions
  replica {
    region_name = "eu-west-1"
  }

  replica {
    region_name = "ap-southeast-1"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"  # Required for global tables

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Common Gotchas

**Changing the primary key.** You can't change the hash key or range key of an existing table. Terraform will try to destroy and recreate the table, which means data loss. Use lifecycle rules to prevent this.

**GSI limits.** Each table supports up to 20 GSIs. Plan your access patterns carefully upfront.

**Hot partitions.** If all your traffic hits the same partition key, you'll get throttling regardless of your capacity settings. Design your keys for even distribution.

## Wrapping Up

DynamoDB with Terraform is a clean combination. The table configuration is declarative and straightforward, and auto-scaling keeps costs in check. Start with on-demand billing and a simple key schema, add GSIs when you need new access patterns, and always enable point-in-time recovery and encryption for production tables.

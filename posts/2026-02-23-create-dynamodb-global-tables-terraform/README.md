# How to Create DynamoDB Global Tables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, DynamoDB, Global Tables, Multi-Region

Description: Learn how to create DynamoDB global tables with Terraform for multi-region, active-active database replication with automatic conflict resolution.

---

When your application needs to serve users across multiple regions with low latency reads and writes, DynamoDB global tables are one of the simplest solutions on AWS. They give you fully managed, multi-region, active-active replication. Write to a table in us-east-1, and the data shows up in eu-west-1 within a second or two. No custom replication logic, no eventual consistency headaches to manage yourself.

Global tables use last-writer-wins conflict resolution. If two regions write to the same item at nearly the same time, the write with the later timestamp wins. For most applications this is fine, but if you have workloads where the same item gets updated from multiple regions simultaneously, you need to think about your data model.

This guide covers creating global tables in Terraform, including the DynamoDB table configuration, multi-region provider setup, and important considerations for production use.

## Understanding Global Tables Versions

DynamoDB has two versions of global tables. Version 2017.11.29 is the old version that required a separate `aws_dynamodb_global_table` resource. Version 2019.11.21 (the current version) is much simpler - you just add `replica` blocks to your regular table resource. This guide uses the current version.

## Provider Setup for Multiple Regions

Since global tables span regions, you need AWS providers for each region.

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary region
provider "aws" {
  region = "us-east-1"
}

# Replica region - Europe
provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

# Replica region - Asia Pacific
provider "aws" {
  alias  = "ap_southeast_1"
  region = "ap-southeast-1"
}
```

## Creating a Global Table

With the 2019.11.21 version, you define the table once and add `replica` blocks for each additional region. DynamoDB handles the replication setup.

```hcl
# Global table with replicas in three regions
resource "aws_dynamodb_table" "users" {
  name         = "users"
  billing_mode = "PAY_PER_REQUEST"  # On-demand is recommended for global tables
  hash_key     = "user_id"
  range_key    = "email"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "country"
    type = "S"
  }

  # GSI for querying by country
  global_secondary_index {
    name            = "country-index"
    hash_key        = "country"
    projection_type = "ALL"
  }

  # Enable streams - required for global tables
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  # Replica in eu-west-1
  replica {
    region_name = "eu-west-1"
  }

  # Replica in ap-southeast-1
  replica {
    region_name = "ap-southeast-1"
  }

  # Server-side encryption with AWS managed key
  server_side_encryption {
    enabled = true
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Environment = "production"
    Service     = "user-management"
  }
}
```

A few things to note here:

- **DynamoDB Streams must be enabled** with `NEW_AND_OLD_IMAGES` view type. Global tables use streams for replication.
- **On-demand billing mode is strongly recommended.** Provisioned mode works but adds complexity because you need to manage capacity in each region independently.
- **GSIs are replicated automatically.** You define them once and they appear in all regions.
- **The table name must be the same across all regions.** You cannot have different table names in different replicas.

## Global Table with KMS Encryption

Each replica can use a different KMS key for encryption. This is important for compliance scenarios where data at rest must be encrypted with a region-specific key.

```hcl
# KMS key in the primary region
resource "aws_kms_key" "dynamodb_us" {
  description         = "DynamoDB encryption key - us-east-1"
  enable_key_rotation = true
}

# KMS key in the EU replica region
resource "aws_kms_key" "dynamodb_eu" {
  provider            = aws.eu_west_1
  description         = "DynamoDB encryption key - eu-west-1"
  enable_key_rotation = true
}

# KMS key in the APAC replica region
resource "aws_kms_key" "dynamodb_ap" {
  provider            = aws.ap_southeast_1
  description         = "DynamoDB encryption key - ap-southeast-1"
  enable_key_rotation = true
}

# Global table with per-region KMS encryption
resource "aws_dynamodb_table" "sensitive_data" {
  name         = "sensitive-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "record_id"

  attribute {
    name = "record_id"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  # Primary table uses the us-east-1 key
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb_us.arn
  }

  # EU replica with its own KMS key
  replica {
    region_name = "eu-west-1"
    kms_key_arn = aws_kms_key.dynamodb_eu.arn

    point_in_time_recovery {
      enabled = true
    }
  }

  # APAC replica with its own KMS key
  replica {
    region_name = "ap-southeast-1"
    kms_key_arn = aws_kms_key.dynamodb_ap.arn

    point_in_time_recovery {
      enabled = true
    }
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Environment = "production"
    Compliance  = "required"
  }
}
```

## Global Table with Provisioned Capacity

If you use provisioned mode, you need to set capacity for the base table and manage auto scaling for each replica independently.

```hcl
resource "aws_dynamodb_table" "orders" {
  name         = "orders"
  billing_mode = "PROVISIONED"
  hash_key     = "order_id"

  read_capacity  = 20
  write_capacity = 10

  attribute {
    name = "order_id"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  replica {
    region_name = "eu-west-1"
  }

  server_side_encryption {
    enabled = true
  }

  # Ignore capacity changes since auto scaling manages them
  lifecycle {
    ignore_changes = [
      read_capacity,
      write_capacity,
    ]
  }
}

# Auto scaling for the primary table (us-east-1)
resource "aws_appautoscaling_target" "orders_read" {
  max_capacity       = 200
  min_capacity       = 20
  resource_id        = "table/orders"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"

  depends_on = [aws_dynamodb_table.orders]
}

resource "aws_appautoscaling_policy" "orders_read" {
  name               = "orders-read-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.orders_read.resource_id
  scalable_dimension = aws_appautoscaling_target.orders_read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.orders_read.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = 70
  }
}

# Auto scaling for the replica table (eu-west-1)
# Note: replica auto scaling uses the same resource_id format
resource "aws_appautoscaling_target" "orders_read_eu" {
  provider           = aws.eu_west_1
  max_capacity       = 200
  min_capacity       = 20
  resource_id        = "table/orders"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"

  depends_on = [aws_dynamodb_table.orders]
}

resource "aws_appautoscaling_policy" "orders_read_eu" {
  provider           = aws.eu_west_1
  name               = "orders-read-scaling-eu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.orders_read_eu.resource_id
  scalable_dimension = aws_appautoscaling_target.orders_read_eu.scalable_dimension
  service_namespace  = aws_appautoscaling_target.orders_read_eu.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = 70
  }
}
```

As you can see, provisioned mode with global tables gets verbose quickly. On-demand mode eliminates all of this auto scaling configuration.

## Application-Level Routing

Creating the global table is only half the story. Your application needs to know which regional endpoint to use. A common pattern is to use Route53 latency-based routing to direct users to the closest region.

```hcl
# Route53 records for each region's API endpoint
resource "aws_route53_record" "api_us" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.api_us.dns_name
    zone_id                = aws_lb.api_us.zone_id
    evaluate_target_health = true
  }

  set_identifier = "us-east-1"
  latency_routing_policy {
    region = "us-east-1"
  }
}

resource "aws_route53_record" "api_eu" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.api_eu.dns_name
    zone_id                = aws_lb.api_eu.zone_id
    evaluate_target_health = true
  }

  set_identifier = "eu-west-1"
  latency_routing_policy {
    region = "eu-west-1"
  }
}
```

## Monitoring Global Tables

Each replica has its own CloudWatch metrics. You should monitor replication latency to catch issues early.

```hcl
# Alarm for high replication latency
resource "aws_cloudwatch_metric_alarm" "replication_latency" {
  alarm_name          = "dynamodb-users-replication-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/DynamoDB"
  period              = 300  # 5 minutes
  statistic           = "Average"
  threshold           = 5000  # 5 seconds
  alarm_description   = "DynamoDB global table replication latency is above 5 seconds"

  dimensions = {
    TableName       = aws_dynamodb_table.users.name
    ReceivingRegion = "eu-west-1"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Important Considerations

**Replication is asynchronous.** Changes typically replicate within one to two seconds, but there is no guarantee. If strong consistency across regions is critical, global tables might not be the right fit.

**You cannot add or remove replicas and update the table in the same apply.** If you need to add a replica and modify an attribute, do it in two separate applies.

**All writes are replicated, including deletes.** If you delete an item in one region, it gets deleted in all regions. There is no way to have region-specific data in a global table.

**TTL deletes are replicated.** When an item expires via TTL in one region, the deletion is replicated to other regions. The item might be readable briefly in replica regions before the delete arrives.

**Costs add up.** You pay for replicated write capacity in each replica region. A 10 WCU write to the primary table costs an additional 10 replicated WCUs in each replica region. Factor this into your cost estimates.

**Terraform state considerations.** The table resource lives in one Terraform state, but the replicas are in other regions. If you manage infrastructure per-region with separate state files, you need to decide where the global table definition lives.

## Wrapping Up

DynamoDB global tables give you multi-region replication without any of the custom engineering work. Define the table once in Terraform, add replica blocks for each region, and AWS handles the rest. Combined with latency-based routing in Route53, your users get low-latency access from wherever they are.

For most applications, on-demand billing mode is the right choice for global tables because it eliminates the need to manage capacity independently in each region. If you do use provisioned mode, see our guide on [configuring DynamoDB auto scaling](https://oneuptime.com/blog/post/2026-02-23-configure-dynamodb-auto-scaling-terraform/view) to keep capacity in sync with traffic.

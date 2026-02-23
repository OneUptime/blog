# How to Configure DynamoDB Auto Scaling in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, DynamoDB, Auto Scaling, Database

Description: Learn how to configure DynamoDB auto scaling with Terraform to automatically adjust read and write capacity based on traffic patterns, reducing costs without sacrificing performance.

---

DynamoDB provisioned mode gives you predictable performance and costs, but you have to pick the right capacity. Set it too low and your requests get throttled. Set it too high and you are wasting money. Auto scaling solves this by adjusting your provisioned capacity based on actual usage patterns.

The way it works under the hood is straightforward: Application Auto Scaling watches your DynamoDB table's consumed capacity through CloudWatch metrics. When utilization crosses the target threshold, it scales the provisioned capacity up or down. You set the minimum, maximum, and target utilization percentage, and AWS handles the rest.

This guide covers setting up auto scaling for tables and global secondary indexes in Terraform.

## Basic Table with Auto Scaling

First, create a table in provisioned mode. Auto scaling only applies to provisioned capacity - if your table uses on-demand mode, capacity adjusts automatically without any auto scaling configuration.

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

provider "aws" {
  region = "us-east-1"
}

# DynamoDB table with provisioned capacity
resource "aws_dynamodb_table" "orders" {
  name         = "orders"
  billing_mode = "PROVISIONED"
  hash_key     = "order_id"
  range_key    = "created_at"

  # Start with modest capacity - auto scaling will adjust
  read_capacity  = 5
  write_capacity = 5

  attribute {
    name = "order_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "customer_id"
    type = "S"
  }

  # Global secondary index for querying by customer
  global_secondary_index {
    name            = "customer-index"
    hash_key        = "customer_id"
    range_key       = "created_at"
    projection_type = "ALL"
    read_capacity   = 5
    write_capacity  = 5
  }

  # Important: ignore capacity changes made by auto scaling
  lifecycle {
    ignore_changes = [
      read_capacity,
      write_capacity,
    ]
  }

  tags = {
    Environment = "production"
  }
}
```

The `lifecycle` block with `ignore_changes` is critical. Without it, every time you run `terraform apply`, Terraform would try to reset the capacity back to whatever is in your configuration, overriding what auto scaling set.

## Setting Up Auto Scaling for Read Capacity

Auto scaling in Terraform uses three resources: the scalable target (what to scale), the scaling policy (how to scale), and optionally a scheduled action (when to scale).

```hcl
# Register the table's read capacity as a scalable target
resource "aws_appautoscaling_target" "table_read" {
  max_capacity       = 100   # Maximum RCUs
  min_capacity       = 5     # Minimum RCUs
  resource_id        = "table/${aws_dynamodb_table.orders.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

# Target tracking policy for read capacity
resource "aws_appautoscaling_policy" "table_read" {
  name               = "DynamoDBReadCapacityUtilization:${aws_appautoscaling_target.table_read.resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.table_read.resource_id
  scalable_dimension = aws_appautoscaling_target.table_read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.table_read.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }

    target_value       = 70.0   # Scale when utilization hits 70%
    scale_in_cooldown  = 60     # Wait 60 seconds before scaling down
    scale_out_cooldown = 60     # Wait 60 seconds before scaling up again
  }
}
```

## Setting Up Auto Scaling for Write Capacity

```hcl
# Register write capacity as a scalable target
resource "aws_appautoscaling_target" "table_write" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.orders.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

# Target tracking policy for write capacity
resource "aws_appautoscaling_policy" "table_write" {
  name               = "DynamoDBWriteCapacityUtilization:${aws_appautoscaling_target.table_write.resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.table_write.resource_id
  scalable_dimension = aws_appautoscaling_target.table_write.scalable_dimension
  service_namespace  = aws_appautoscaling_target.table_write.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}
```

## Auto Scaling for Global Secondary Indexes

GSIs have their own provisioned capacity separate from the base table. You need to set up auto scaling for each GSI individually.

```hcl
# Read capacity for the customer-index GSI
resource "aws_appautoscaling_target" "gsi_read" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.orders.name}/index/customer-index"
  scalable_dimension = "dynamodb:index:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_read" {
  name               = "DynamoDBReadCapacityUtilization:${aws_appautoscaling_target.gsi_read.resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gsi_read.resource_id
  scalable_dimension = aws_appautoscaling_target.gsi_read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.gsi_read.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

# Write capacity for the customer-index GSI
resource "aws_appautoscaling_target" "gsi_write" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.orders.name}/index/customer-index"
  scalable_dimension = "dynamodb:index:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_write" {
  name               = "DynamoDBWriteCapacityUtilization:${aws_appautoscaling_target.gsi_write.resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gsi_write.resource_id
  scalable_dimension = aws_appautoscaling_target.gsi_write.scalable_dimension
  service_namespace  = aws_appautoscaling_target.gsi_write.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}
```

Do not forget to add `ignore_changes` for the GSI capacity in the table resource as well:

```hcl
resource "aws_dynamodb_table" "orders" {
  # ... other config ...

  lifecycle {
    ignore_changes = [
      read_capacity,
      write_capacity,
      # Also ignore GSI capacity changes
      global_secondary_index,
    ]
  }
}
```

Note: using `ignore_changes` on the entire `global_secondary_index` block means Terraform will also ignore changes to GSI projections, key schemas, and other settings. If that is a concern, you might need to manage the GSI capacity separately or accept the tradeoff.

## Scheduled Scaling

If your traffic follows a predictable pattern - say heavy during business hours and light at night - you can schedule capacity changes ahead of time. This is faster than reactive auto scaling because the capacity is already provisioned before the traffic arrives.

```hcl
# Scale up before business hours (8 AM UTC on weekdays)
resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  name               = "scale-up-morning"
  service_namespace  = aws_appautoscaling_target.table_read.service_namespace
  resource_id        = aws_appautoscaling_target.table_read.resource_id
  scalable_dimension = aws_appautoscaling_target.table_read.scalable_dimension
  schedule           = "cron(0 8 ? * MON-FRI *)"

  scalable_target_action {
    min_capacity = 50   # Ensure at least 50 RCUs during business hours
    max_capacity = 200  # Allow scaling up to 200 RCUs
  }
}

# Scale down after business hours (8 PM UTC on weekdays)
resource "aws_appautoscaling_scheduled_action" "scale_down_evening" {
  name               = "scale-down-evening"
  service_namespace  = aws_appautoscaling_target.table_read.service_namespace
  resource_id        = aws_appautoscaling_target.table_read.resource_id
  scalable_dimension = aws_appautoscaling_target.table_read.scalable_dimension
  schedule           = "cron(0 20 ? * MON-FRI *)"

  scalable_target_action {
    min_capacity = 5
    max_capacity = 100
  }
}

# Weekend schedule - lower capacity all day
resource "aws_appautoscaling_scheduled_action" "weekend" {
  name               = "weekend-low"
  service_namespace  = aws_appautoscaling_target.table_read.service_namespace
  resource_id        = aws_appautoscaling_target.table_read.resource_id
  scalable_dimension = aws_appautoscaling_target.table_read.scalable_dimension
  schedule           = "cron(0 0 ? * SAT *)"

  scalable_target_action {
    min_capacity = 2
    max_capacity = 50
  }
}
```

## Reusable Module for DynamoDB Auto Scaling

When you have many tables, defining four auto scaling resources per table (read target, read policy, write target, write policy) gets tedious. Here is a module that wraps it all up.

```hcl
# modules/dynamodb-autoscaling/variables.tf
variable "table_name" {
  type = string
}

variable "read_min_capacity" {
  type    = number
  default = 5
}

variable "read_max_capacity" {
  type    = number
  default = 100
}

variable "write_min_capacity" {
  type    = number
  default = 5
}

variable "write_max_capacity" {
  type    = number
  default = 100
}

variable "target_utilization" {
  type    = number
  default = 70
  description = "Target utilization percentage for both read and write"
}

variable "gsi_names" {
  type    = list(string)
  default = []
  description = "List of GSI names to configure auto scaling for"
}

# modules/dynamodb-autoscaling/main.tf
# Table read scaling
resource "aws_appautoscaling_target" "read" {
  max_capacity       = var.read_max_capacity
  min_capacity       = var.read_min_capacity
  resource_id        = "table/${var.table_name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "read" {
  name               = "read-${var.table_name}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.read.resource_id
  scalable_dimension = aws_appautoscaling_target.read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.read.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value       = var.target_utilization
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

# Table write scaling
resource "aws_appautoscaling_target" "write" {
  max_capacity       = var.write_max_capacity
  min_capacity       = var.write_min_capacity
  resource_id        = "table/${var.table_name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "write" {
  name               = "write-${var.table_name}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.write.resource_id
  scalable_dimension = aws_appautoscaling_target.write.scalable_dimension
  service_namespace  = aws_appautoscaling_target.write.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value       = var.target_utilization
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

# GSI scaling (for each GSI)
resource "aws_appautoscaling_target" "gsi_read" {
  for_each           = toset(var.gsi_names)
  max_capacity       = var.read_max_capacity
  min_capacity       = var.read_min_capacity
  resource_id        = "table/${var.table_name}/index/${each.value}"
  scalable_dimension = "dynamodb:index:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_read" {
  for_each           = toset(var.gsi_names)
  name               = "read-${var.table_name}-${each.value}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gsi_read[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.gsi_read[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.gsi_read[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value       = var.target_utilization
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_target" "gsi_write" {
  for_each           = toset(var.gsi_names)
  max_capacity       = var.write_max_capacity
  min_capacity       = var.write_min_capacity
  resource_id        = "table/${var.table_name}/index/${each.value}"
  scalable_dimension = "dynamodb:index:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_write" {
  for_each           = toset(var.gsi_names)
  name               = "write-${var.table_name}-${each.value}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gsi_write[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.gsi_write[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.gsi_write[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value       = var.target_utilization
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}
```

Use the module like this:

```hcl
module "orders_autoscaling" {
  source = "./modules/dynamodb-autoscaling"

  table_name         = aws_dynamodb_table.orders.name
  read_min_capacity  = 5
  read_max_capacity  = 200
  write_min_capacity = 5
  write_max_capacity = 100
  target_utilization = 70
  gsi_names          = ["customer-index"]
}
```

## Choosing the Right Target Utilization

The target utilization percentage is the most important parameter. Here are some guidelines:

- **70%** is the default and works well for most workloads. It gives you a 30% buffer above your average utilization.
- **50%** is better for latency-sensitive workloads where you need headroom for burst traffic.
- **80-90%** can work for cost-sensitive workloads with very predictable traffic, but you risk throttling during spikes.

Keep in mind that DynamoDB auto scaling reacts to sustained utilization, not instantaneous spikes. There is always a delay - usually a few minutes - between a traffic increase and the capacity scaling up. If your traffic is very spiky, either set a lower target or use scheduled scaling to pre-provision capacity.

## Provisioned vs On-Demand: When Auto Scaling Makes Sense

On-demand mode handles capacity management entirely for you, but it costs roughly 6.5x more per unit of capacity than provisioned mode. Auto scaling on provisioned mode is the middle ground - you get automatic capacity management at provisioned pricing.

Use provisioned with auto scaling when your traffic is at least somewhat predictable and you want to optimize costs. Use on-demand when traffic is truly unpredictable, during development, or when the operational overhead of tuning auto scaling is not worth it.

## Wrapping Up

DynamoDB auto scaling is one of those things that is easy to set up but makes a big difference in production. It keeps your tables responsive during traffic spikes and scales down during quiet periods to save money. The Terraform configuration is a bit verbose because you need separate target and policy resources for each dimension (reads and writes) on each resource (tables and GSIs), but the reusable module pattern keeps it manageable.

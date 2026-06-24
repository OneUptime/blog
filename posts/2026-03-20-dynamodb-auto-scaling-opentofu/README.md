# How to Configure DynamoDB Auto Scaling with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, Auto Scaling, Terraform, Infrastructure as Code, NoSQL

Description: Learn how to configure DynamoDB table auto scaling for read and write capacity using OpenTofu, including target tracking policies and CloudWatch alarms.

---

DynamoDB auto scaling automatically adjusts read and write capacity in response to actual traffic patterns, helping reduce throttling while minimizing costs. This guide shows how to configure DynamoDB auto scaling using OpenTofu with Application Auto Scaling.

---

## Prerequisites

```hcl
# providers.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

---

## Create DynamoDB Table with Provisioned Capacity

```hcl
# main.tf
resource "aws_dynamodb_table" "main" {
  name           = "users"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  lifecycle {
    ignore_changes = [read_capacity, write_capacity]
  }

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}
```

---

## Configure Auto Scaling for Read Capacity

```hcl
# Auto scaling target for read capacity
resource "aws_appautoscaling_target" "dynamodb_table_read" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.main.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

# Auto scaling policy for read capacity
resource "aws_appautoscaling_policy" "dynamodb_table_read_policy" {
  name               = "DynamoDBReadCapacityUtilization:${aws_appautoscaling_target.dynamodb_table_read.resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_table_read.resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_table_read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_table_read.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}
```

---

## Configure Auto Scaling for Write Capacity

```hcl
# Auto scaling target for write capacity
resource "aws_appautoscaling_target" "dynamodb_table_write" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.main.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

# Auto scaling policy for write capacity
resource "aws_appautoscaling_policy" "dynamodb_table_write_policy" {
  name               = "DynamoDBWriteCapacityUtilization:${aws_appautoscaling_target.dynamodb_table_write.resource_id}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_table_write.resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_table_write.scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_table_write.service_namespace

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

---

## Auto Scaling for Global Secondary Indexes

```hcl
resource "aws_dynamodb_table" "with_gsi" {
  name           = "orders"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }
  attribute {
    name = "customerId"
    type = "S"
  }

  global_secondary_index {
    name = "CustomerIndex"
    key_schema {
      attribute_name = "customerId"
      key_type       = "HASH"
    }
    projection_type = "ALL"
    read_capacity   = 5
    write_capacity  = 5
  }
}

# Auto scaling for GSI read capacity
resource "aws_appautoscaling_target" "gsi_read" {
  max_capacity       = 50
  min_capacity       = 5
  resource_id        = "table/orders/index/CustomerIndex"
  scalable_dimension = "dynamodb:index:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_read_policy" {
  name               = "GSIReadPolicy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gsi_read.resource_id
  scalable_dimension = aws_appautoscaling_target.gsi_read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.gsi_read.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = 70.0
  }
}
```

---

## Reusable Module with Variables

```hcl
# variables.tf
variable "table_name" {}
variable "min_read_capacity"  { default = 5 }
variable "max_read_capacity"  { default = 100 }
variable "min_write_capacity" { default = 5 }
variable "max_write_capacity" { default = 100 }
variable "target_utilization" { default = 70.0 }

# module/dynamodb-autoscaling/main.tf
resource "aws_appautoscaling_target" "read" {
  max_capacity       = var.max_read_capacity
  min_capacity       = var.min_read_capacity
  resource_id        = "table/${var.table_name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "read" {
  name               = "ReadAutoScaling-${var.table_name}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.read.resource_id
  scalable_dimension = aws_appautoscaling_target.read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.read.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = var.target_utilization
  }
}

resource "aws_appautoscaling_target" "write" {
  max_capacity       = var.max_write_capacity
  min_capacity       = var.min_write_capacity
  resource_id        = "table/${var.table_name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "write" {
  name               = "WriteAutoScaling-${var.table_name}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.write.resource_id
  scalable_dimension = aws_appautoscaling_target.write.scalable_dimension
  service_namespace  = aws_appautoscaling_target.write.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = var.target_utilization
  }
}
```

---

## Apply and Verify

```bash
tofu init
tofu plan
tofu apply

# Verify table throughput settings
aws dynamodb describe-table --table-name users | \
  jq '.Table.ProvisionedThroughput'

# Check Application Auto Scaling
aws application-autoscaling describe-scaling-policies \
  --service-namespace dynamodb
```

---

## Best Practices

1. **Start with target utilization at 70%** - leaves headroom before throttling
2. **Use PAY_PER_REQUEST** for unpredictable workloads instead of auto scaling
3. **Monitor throttled requests** with CloudWatch to tune min/max capacity
4. **Set scale-out cooldown lower** than scale-in to respond faster to spikes
5. **Auto scale GSIs independently** - they can have different traffic patterns

---

## Conclusion

DynamoDB auto scaling with OpenTofu helps your table adapt to traffic changes without constant over-provisioning. Configure target tracking policies for both read and write capacity, set appropriate min/max bounds, and monitor CloudWatch metrics to optimize your settings.

---

*Monitor your DynamoDB performance and availability with [OneUptime](https://oneuptime.com).*

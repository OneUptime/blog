# How to Configure DynamoDB Auto Scaling with OpenTofu - Autoscaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, Auto Scaling, Provisioned Capacity, Cost Optimization, Infrastructure as Code

Description: Learn how to configure DynamoDB provisioned capacity auto scaling with OpenTofu to automatically adjust read and write capacity units based on traffic patterns.

## Introduction

DynamoDB Auto Scaling uses AWS Application Auto Scaling to adjust provisioned throughput capacity automatically. When traffic spikes, capacity increases to maintain performance; during quiet periods, capacity scales down to reduce cost. This combines the predictable pricing of provisioned capacity with the flexibility to handle variable loads.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with DynamoDB and Application Auto Scaling permissions
- A DynamoDB table with `PROVISIONED` billing mode

## Step 1: Create DynamoDB Table with Provisioned Capacity

```hcl
resource "aws_dynamodb_table" "scalable" {
  name         = "${var.project_name}-scalable-table"
  billing_mode = "PROVISIONED"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # Start with baseline capacity
  read_capacity  = 5
  write_capacity = 5

  # Prevent OpenTofu from resetting capacities after auto scaling adjusts them
  lifecycle {
    ignore_changes = [
      read_capacity,
      write_capacity,
      global_secondary_index,
    ]
  }

  global_secondary_index {
    name = "StatusIndex"

    key_schema {
      attribute_name = "id"
      key_type       = "HASH"
    }

    projection_type = "KEYS_ONLY"
    read_capacity   = 5
    write_capacity  = 5
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-scalable-table"
  }
}
```

## Step 2: Configure Read Capacity Auto Scaling

```hcl
# Register table read capacity as a scalable target

resource "aws_appautoscaling_target" "table_read" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.scalable.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

# Auto scaling policy for reads
resource "aws_appautoscaling_policy" "table_read" {
  name               = "${var.project_name}-table-read-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.table_read.resource_id
  scalable_dimension = aws_appautoscaling_target.table_read.scalable_dimension
  service_namespace  = aws_appautoscaling_target.table_read.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value       = 70.0   # Scale when utilization exceeds 70%
    scale_in_cooldown  = 60     # Wait 60s before scaling in
    scale_out_cooldown = 60     # Wait 60s before scaling out again
  }
}
```

## Step 3: Configure Write Capacity Auto Scaling

```hcl
resource "aws_appautoscaling_target" "table_write" {
  max_capacity       = 50
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.scalable.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "table_write" {
  name               = "${var.project_name}-table-write-scaling"
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

## Step 4: Scale GSI Capacity Too

```hcl
# GSI read and write capacity must be scaled separately
resource "aws_appautoscaling_target" "gsi_read" {
  max_capacity       = 100
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.scalable.name}/index/StatusIndex"
  scalable_dimension = "dynamodb:index:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_read" {
  name               = "${var.project_name}-gsi-read-scaling"
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

resource "aws_appautoscaling_target" "gsi_write" {
  max_capacity       = 50
  min_capacity       = 5
  resource_id        = "table/${aws_dynamodb_table.scalable.name}/index/StatusIndex"
  scalable_dimension = "dynamodb:index:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_write" {
  name               = "${var.project_name}-gsi-write-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gsi_write.resource_id
  scalable_dimension = aws_appautoscaling_target.gsi_write.scalable_dimension
  service_namespace  = aws_appautoscaling_target.gsi_write.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = 70.0
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# View recent scaling activities
aws application-autoscaling describe-scaling-activities \
  --service-namespace dynamodb \
  --resource-id "table/my-project-scalable-table"
```

## Conclusion

DynamoDB Auto Scaling with a 70% utilization target provides a balance between cost and performance headroom. For tables with highly bursty traffic, consider using `PAY_PER_REQUEST` mode instead since auto scaling has a response lag of a few minutes. Always configure auto scaling on GSIs separately for both read and write capacity because GSI capacity is independent of table capacity and throttles independently.

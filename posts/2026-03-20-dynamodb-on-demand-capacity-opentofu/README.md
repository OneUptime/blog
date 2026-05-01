# How to Configure DynamoDB On-Demand Capacity with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, On-Demand Capacity, Serverless, Cost Optimization, Infrastructure as Code

Description: Learn how to configure DynamoDB On-Demand capacity mode with OpenTofu for workloads with unpredictable traffic patterns, paying only for the read and write requests you use.

## Introduction

DynamoDB On-Demand capacity mode automatically scales without capacity planning. You pay per request ($0.625 per million write request units, $0.125 per million read request units for DynamoDB Standard tables in us-east-1) rather than provisioning fixed capacity. On-Demand is ideal for new tables with unknown traffic, spiky workloads, development/test environments, and applications where over-provisioning costs are a concern. The trade-off is that Provisioned mode can be more cost-effective for steady, predictable traffic.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with DynamoDB permissions

## Step 1: On-Demand Table

```hcl
resource "aws_dynamodb_table" "events" {
  name         = "${var.project_name}-events"
  billing_mode = "PAY_PER_REQUEST"  # On-Demand capacity
  hash_key     = "eventId"
  range_key    = "timestamp"

  attribute {
    name = "eventId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  attribute {
    name = "eventType"
    type = "S"
  }

  global_secondary_index {
    name = "EventsByType"
    key_schema {
      attribute_name = "eventType"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "timestamp"
      key_type       = "RANGE"
    }
    projection_type = "ALL"
    # No read/write_capacity needed in PAY_PER_REQUEST mode
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-events"
    BillingMode = "on-demand"
  }
}
```

## Step 2: Switch Between On-Demand and Provisioned

```hcl
variable "billing_mode" {
  description = "DynamoDB billing mode: PAY_PER_REQUEST or PROVISIONED"
  type        = string
  default     = "PAY_PER_REQUEST"
}

resource "aws_dynamodb_table" "flexible" {
  name         = "${var.project_name}-flexible-table"
  billing_mode = var.billing_mode
  hash_key     = "id"

  # Only set capacity when PROVISIONED
  read_capacity  = var.billing_mode == "PROVISIONED" ? 10 : null
  write_capacity = var.billing_mode == "PROVISIONED" ? 5 : null

  attribute {
    name = "id"
    type = "S"
  }
}
```

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check billing mode

aws dynamodb describe-table \
  --table-name <table-name> \
  --query "Table.BillingModeSummary"

# Switch to provisioned when traffic becomes predictable
tofu apply -var="billing_mode=PROVISIONED"
```

## Conclusion

Switch from On-Demand to Provisioned once your traffic patterns become predictable-Provisioned mode with Auto Scaling can be more cost-effective than On-Demand for steady-state traffic, but compare both pricing models for your workload. When switching from On-Demand to Provisioned, DynamoDB says the table delivers throughput consistent with the previous peak reached while it was in On-Demand mode, but you should still choose initial capacity for the table and any GSIs based on CloudWatch consumption metrics and set it high enough to handle traffic during the transition. On-Demand tables can throttle requests if traffic increases more than 2x the previous peak within 30 minutes; for planned spikes, either pre-warm the table or space traffic growth over at least 30 minutes, and build retry logic with exponential backoff into your application.

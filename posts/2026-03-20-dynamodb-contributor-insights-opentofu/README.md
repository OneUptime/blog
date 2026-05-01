# How to Enable DynamoDB Contributor Insights with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, Contributor Insights, Monitoring, Performance, Infrastructure as Code

Description: Learn how to enable DynamoDB Contributor Insights with OpenTofu to identify the most frequently accessed partition keys and detect hot partition issues in your tables.

## Introduction

DynamoDB Contributor Insights analyzes table and index traffic patterns to identify the most frequently accessed partition keys, enabling detection of hot partitions that degrade performance. It reports which items drive the most combined read and write traffic, helping optimize data models and distribution strategies.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with permissions for DynamoDB Contributor Insights, CloudWatch dashboards and alarms, and `iam:CreateServiceLinkedRole` the first time you enable Contributor Insights

## Step 1: Enable Contributor Insights on DynamoDB Table

```hcl
resource "aws_dynamodb_table" "monitored" {
  name         = "${var.project_name}-monitored-table"
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

  attribute {
    name = "gsi1pk"
    type = "S"
  }

  global_secondary_index {
    name = "GSI1"

    key_schema {
      attribute_name = "gsi1pk"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "sk"
      key_type       = "RANGE"
    }

    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-monitored-table"
  }
}

# Enable Contributor Insights on the table

resource "aws_dynamodb_contributor_insights" "table" {
  table_name = aws_dynamodb_table.monitored.name
  mode       = "ACCESSED_AND_THROTTLED_KEYS"
}

# Enable Contributor Insights on the GSI as well
resource "aws_dynamodb_contributor_insights" "gsi" {
  table_name = aws_dynamodb_table.monitored.name
  index_name = "GSI1"
  mode       = "ACCESSED_AND_THROTTLED_KEYS"
}
```

## Step 2: CloudWatch Dashboard and Alarm for Related DynamoDB Metrics

Contributor Insights graphs are viewed on the DynamoDB table's **Monitor** tab or in CloudWatch Contributor Insights. The dashboard below complements them with table-level throughput and throttling metrics.

```hcl
data "aws_region" "current" {}

resource "aws_cloudwatch_dashboard" "dynamodb_insights" {
  dashboard_name = "${var.project_name}-dynamodb-insights"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title  = "Consumed Read Capacity Units"
          period = 300
          region = data.aws_region.current.name
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits",
             "TableName", aws_dynamodb_table.monitored.name]
          ]
          view = "timeSeries"
          stat = "Sum"
        }
      },
      {
        type = "metric"
        properties = {
          title  = "Throttled Requests"
          period = 60
          region = data.aws_region.current.name
          metrics = [
            ["AWS/DynamoDB", "ReadThrottleEvents",
             "TableName", aws_dynamodb_table.monitored.name],
            ["AWS/DynamoDB", "WriteThrottleEvents",
             "TableName", aws_dynamodb_table.monitored.name]
          ]
          view = "timeSeries"
          stat = "Sum"
        }
      }
    ]
  })
}

# Complementary alarm: throttling can indicate hot partitions or insufficient capacity
resource "aws_cloudwatch_metric_alarm" "throttle_alarm" {
  alarm_name          = "${var.project_name}-dynamodb-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReadThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10

  dimensions = {
    TableName = aws_dynamodb_table.monitored.name
  }

  alarm_description = "DynamoDB read throttles detected - possible hot partition or insufficient capacity"
  alarm_actions     = [var.sns_topic_arn]
}
```

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check Contributor Insights status
aws dynamodb describe-contributor-insights \
  --table-name my-project-monitored-table
```

## Conclusion

Contributor Insights is essential for diagnosing hot partition issues that cause throttling and performance degradation. When Insights identifies a frequently accessed partition key, review your data model-common fixes include adding a random suffix to distribute writes, using write sharding, or caching hot items with DAX or ElastiCache. Enable Insights on both tables and GSIs since they have independent partition behavior.

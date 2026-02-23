# How to Create DynamoDB with Stream Processing in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, DynamoDB, Streams, Lambda, Event-Driven, Infrastructure as Code

Description: Learn how to enable and configure DynamoDB Streams with Terraform to build event-driven architectures that react to data changes in real time.

---

DynamoDB Streams capture a time-ordered sequence of item-level modifications in a DynamoDB table and store that information for up to 24 hours. Combined with AWS Lambda or Kinesis, streams enable you to build powerful event-driven architectures. In this guide, we will cover how to set up DynamoDB tables with stream processing using Terraform, including Lambda triggers and Kinesis Data Streams integration.

## What Are DynamoDB Streams?

When you enable a stream on a DynamoDB table, every create, update, and delete operation on items in the table is recorded in the stream. Each stream record contains the name of the table, the event timestamp, and other metadata. Depending on your configuration, the record can also contain the item data before and after the modification.

There are four view types for stream records: KEYS_ONLY captures only the key attributes of the modified item, NEW_IMAGE captures the entire item as it appears after the modification, OLD_IMAGE captures the entire item as it appeared before the modification, and NEW_AND_OLD_IMAGES captures both the old and new versions of the item.

## Setting Up the Provider

Start with the standard AWS provider configuration:

```hcl
# Configure Terraform and the AWS provider
terraform {
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
```

## Enabling DynamoDB Streams

To enable streams on a DynamoDB table, set the `stream_enabled` attribute to `true` and specify the `stream_view_type`:

```hcl
# Create a DynamoDB table with streams enabled
resource "aws_dynamodb_table" "orders_table" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "order_id"

  attribute {
    name = "order_id"
    type = "S"
  }

  # Enable DynamoDB Streams with full item images
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"  # Capture both old and new item data

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Output the stream ARN for use by other resources
output "stream_arn" {
  description = "The ARN of the DynamoDB Stream"
  value       = aws_dynamodb_table.orders_table.stream_arn
}
```

## Creating a Lambda Function to Process Stream Events

The most common pattern is to trigger a Lambda function whenever items change in the DynamoDB table. Here is how to set that up end to end.

First, create the Lambda function code. You would typically store this in a file, but here we define it inline for clarity:

```hcl
# IAM role for the Lambda function
resource "aws_iam_role" "stream_processor_role" {
  name = "dynamodb-stream-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Policy to allow Lambda to read from DynamoDB Streams
resource "aws_iam_role_policy" "stream_processor_policy" {
  name = "dynamodb-stream-processor-policy"
  role = aws_iam_role.stream_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:DescribeStream",
          "dynamodb:ListStreams"
        ]
        Resource = aws_dynamodb_table.orders_table.stream_arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Package the Lambda function code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/process_stream.py"
  output_path = "${path.module}/lambda/process_stream.zip"
}

# Create the Lambda function
resource "aws_lambda_function" "stream_processor" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "dynamodb-stream-processor"
  role             = aws_iam_role.stream_processor_role.arn
  handler          = "process_stream.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.12"
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Connecting the Stream to Lambda

Now connect the DynamoDB stream to the Lambda function using an event source mapping:

```hcl
# Create the event source mapping between DynamoDB Stream and Lambda
resource "aws_lambda_event_source_mapping" "stream_trigger" {
  event_source_arn  = aws_dynamodb_table.orders_table.stream_arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"  # Start reading from the latest records

  # Process records in batches for efficiency
  batch_size                         = 100
  maximum_batching_window_in_seconds = 5

  # Configure retry behavior
  maximum_retry_attempts = 3
  maximum_record_age_in_seconds = 3600  # Skip records older than 1 hour

  # Send failed records to a dead-letter queue
  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.stream_dlq.arn
    }
  }

  # Apply filters to only process specific events
  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["INSERT", "MODIFY"]  # Only process inserts and updates
      })
    }
  }
}

# Dead-letter queue for failed stream records
resource "aws_sqs_queue" "stream_dlq" {
  name                      = "dynamodb-stream-dlq"
  message_retention_seconds = 1209600  # Retain messages for 14 days

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Using Kinesis Data Streams Instead

For high-throughput scenarios, you might prefer to use Kinesis Data Streams instead of native DynamoDB Streams. This gives you more control over the number of consumers and processing throughput:

```hcl
# Create a Kinesis Data Stream
resource "aws_kinesis_stream" "table_changes" {
  name             = "dynamodb-table-changes"
  shard_count      = 2  # Number of shards for parallel processing
  retention_period = 48  # Hours to retain data (default is 24)

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Create DynamoDB table with Kinesis Stream integration
resource "aws_dynamodb_kinesis_streaming_destination" "table_to_kinesis" {
  stream_arn = aws_kinesis_stream.table_changes.arn
  table_name = aws_dynamodb_table.orders_table.name
}
```

## Filtering Stream Events

Event filtering is a powerful feature that lets you process only the events you care about. This reduces Lambda invocations and lowers costs:

```hcl
# Event source mapping with advanced filtering
resource "aws_lambda_event_source_mapping" "filtered_trigger" {
  event_source_arn  = aws_dynamodb_table.orders_table.stream_arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"

  # Filter to only process orders with status change to 'shipped'
  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["MODIFY"]
        dynamodb = {
          NewImage = {
            status = {
              S = ["shipped"]
            }
          }
        }
      })
    }
  }
}
```

## Processing Multiple Tables with a Single Function

You can connect multiple DynamoDB streams to the same Lambda function. The function can differentiate between tables using the event source ARN:

```hcl
# Second table with streams enabled
resource "aws_dynamodb_table" "inventory_table" {
  name             = "inventory"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "product_id"
  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"

  attribute {
    name = "product_id"
    type = "S"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Connect the second table's stream to the same Lambda function
resource "aws_lambda_event_source_mapping" "inventory_trigger" {
  event_source_arn  = aws_dynamodb_table.inventory_table.stream_arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"
  batch_size        = 50
}
```

## Error Handling and Monitoring

Proper error handling is critical for stream processing. Configure CloudWatch alarms to monitor your stream processing pipeline:

```hcl
# CloudWatch alarm for Lambda errors
resource "aws_cloudwatch_metric_alarm" "stream_errors" {
  alarm_name          = "dynamodb-stream-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when stream processor Lambda has too many errors"

  dimensions = {
    FunctionName = aws_lambda_function.stream_processor.function_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# SNS topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "stream-processing-alerts"
}
```

For comprehensive monitoring of your DynamoDB stream processing pipelines, consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) to set up dashboards that track stream lag, processing errors, and Lambda performance.

## Best Practices

When working with DynamoDB Streams in Terraform, choose the stream view type carefully. Using NEW_AND_OLD_IMAGES gives you maximum flexibility but increases the size of each stream record. Use KEYS_ONLY if you only need to know which items changed. Always configure a dead-letter queue for failed records so you do not lose events. Use event filtering to reduce unnecessary Lambda invocations. Set appropriate batch sizes and batching windows based on your latency requirements. Monitor the iterator age metric to detect when your stream processor is falling behind.

## Conclusion

DynamoDB Streams combined with Terraform give you a powerful foundation for event-driven architectures. Whether you are building real-time analytics, synchronizing data across services, or triggering workflows based on data changes, Terraform makes it straightforward to define and manage the entire pipeline as code. Start with simple stream processing and build up to more complex patterns as your needs grow.

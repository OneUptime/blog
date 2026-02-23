# How to Create Lambda with DynamoDB Streams Trigger in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, DynamoDB, Streams, Event-Driven, Serverless

Description: Learn how to trigger Lambda functions from DynamoDB Streams using Terraform, including stream configuration, event filtering, batch processing, and error handling patterns.

---

DynamoDB Streams captures a time-ordered sequence of item-level changes in a DynamoDB table. Every insert, update, and delete is recorded in the stream, and Lambda can process these changes in near real-time. This enables powerful patterns like updating search indexes, sending notifications when data changes, replicating data to other stores, and maintaining materialized views.

Setting this up in Terraform involves enabling streams on the table, creating the Lambda function, and connecting them with an event source mapping. This guide covers all of that plus the filtering, batching, and error handling options that make the integration production-ready.

## Enable Streams on the DynamoDB Table

First, the DynamoDB table needs to have streams enabled:

```hcl
# DynamoDB table with streams enabled
resource "aws_dynamodb_table" "orders" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "order_id"
  range_key    = "created_at"

  attribute {
    name = "order_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # Enable DynamoDB Streams
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  # Options:
  # KEYS_ONLY - only the key attributes
  # NEW_IMAGE - the entire item after the change
  # OLD_IMAGE - the entire item before the change
  # NEW_AND_OLD_IMAGES - both before and after

  tags = {
    Name = "orders-table"
  }
}
```

The `stream_view_type` determines what data is included in each stream record. `NEW_AND_OLD_IMAGES` is the most useful because it lets you see exactly what changed, but it also means larger payloads.

## Lambda Function

```hcl
# Lambda function that processes DynamoDB stream events
resource "aws_lambda_function" "stream_processor" {
  function_name = "orders-stream-processor"
  handler       = "index.handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 300
  memory_size   = 256

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      SEARCH_INDEX_ENDPOINT = var.opensearch_endpoint
      SNS_TOPIC_ARN         = var.notification_topic_arn
    }
  }

  tags = {
    Name = "orders-stream-processor"
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}
```

## Event Source Mapping

The event source mapping connects the DynamoDB stream to the Lambda function:

```hcl
# Event source mapping - DynamoDB Streams to Lambda
resource "aws_lambda_event_source_mapping" "dynamodb_trigger" {
  event_source_arn  = aws_dynamodb_table.orders.stream_arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"
  # Options: TRIM_HORIZON (from beginning), LATEST (new records only)

  # Batch configuration
  batch_size                         = 100   # Up to 10,000
  maximum_batching_window_in_seconds = 5     # Wait up to 5 seconds to fill batch

  # Parallelization - process multiple batches from the same shard
  parallelization_factor = 2  # 1-10, default is 1

  # Error handling
  maximum_retry_attempts                = 3     # Retry failed batches up to 3 times
  maximum_record_age_in_seconds         = 3600  # Skip records older than 1 hour
  bisect_batch_on_function_error        = true  # Split batch in half on error

  # Send failed records to SQS or SNS
  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.stream_dlq.arn
    }
  }

  # Partial batch failure reporting
  function_response_types = ["ReportBatchItemFailures"]

  enabled = true
}
```

## Event Filtering

You can filter which stream records trigger Lambda, reducing invocations and cost:

```hcl
# Only process specific types of changes
resource "aws_lambda_event_source_mapping" "filtered_trigger" {
  event_source_arn  = aws_dynamodb_table.orders.stream_arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"

  batch_size = 100

  # Filter criteria - only process INSERT and MODIFY events
  # where the order status is "completed"
  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["INSERT", "MODIFY"]
        dynamodb = {
          NewImage = {
            status = {
              S = ["completed"]
            }
          }
        }
      })
    }
  }

  function_response_types = ["ReportBatchItemFailures"]
  enabled                 = true
}
```

You can also combine multiple filters:

```hcl
filter_criteria {
  # Filter 1: New completed orders
  filter {
    pattern = jsonencode({
      eventName = ["INSERT"]
      dynamodb = {
        NewImage = {
          status = { S = ["completed"] }
        }
      }
    })
  }

  # Filter 2: Status changes to "shipped"
  filter {
    pattern = jsonencode({
      eventName = ["MODIFY"]
      dynamodb = {
        NewImage = {
          status = { S = ["shipped"] }
        }
      }
    })
  }
}
```

## IAM Permissions

Lambda needs permission to read from the DynamoDB stream:

```hcl
# IAM role
resource "aws_iam_role" "lambda_exec" {
  name = "orders-stream-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB Streams read permissions
resource "aws_iam_role_policy" "dynamodb_stream" {
  name = "dynamodb-stream-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeStream",
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:ListStreams"
        ]
        Resource = aws_dynamodb_table.orders.stream_arn
      },
      {
        Effect   = "Allow"
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.stream_dlq.arn
      }
    ]
  })
}
```

## Dead Letter Queue for Failed Records

```hcl
# DLQ for records that could not be processed
resource "aws_sqs_queue" "stream_dlq" {
  name                      = "dynamodb-stream-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = {
    Name = "dynamodb-stream-dlq"
  }
}
```

## The Lambda Handler

DynamoDB stream events have a specific structure with the DynamoDB item in a nested format:

```python
# index.py - Lambda handler for DynamoDB Streams
import json
from decimal import Decimal

def handler(event, context):
    """Process DynamoDB stream records."""
    batch_item_failures = []

    for record in event['Records']:
        try:
            event_name = record['eventName']  # INSERT, MODIFY, REMOVE
            event_id = record['eventID']

            # Get the DynamoDB record data
            dynamodb_record = record['dynamodb']

            if event_name == 'INSERT':
                new_image = deserialize(dynamodb_record['NewImage'])
                print(f"New item: {json.dumps(new_image, default=str)}")
                handle_insert(new_image)

            elif event_name == 'MODIFY':
                old_image = deserialize(dynamodb_record.get('OldImage', {}))
                new_image = deserialize(dynamodb_record['NewImage'])
                print(f"Modified: {json.dumps(new_image, default=str)}")
                handle_modify(old_image, new_image)

            elif event_name == 'REMOVE':
                old_image = deserialize(dynamodb_record['OldImage'])
                print(f"Deleted: {json.dumps(old_image, default=str)}")
                handle_remove(old_image)

        except Exception as e:
            print(f"Error processing record {record['eventID']}: {str(e)}")
            batch_item_failures.append({
                "itemIdentifier": record['eventID']
            })

    return {"batchItemFailures": batch_item_failures}

def deserialize(dynamodb_item):
    """Convert DynamoDB JSON format to regular Python dict."""
    result = {}
    for key, value in dynamodb_item.items():
        if 'S' in value:
            result[key] = value['S']
        elif 'N' in value:
            result[key] = Decimal(value['N'])
        elif 'BOOL' in value:
            result[key] = value['BOOL']
        elif 'NULL' in value:
            result[key] = None
        elif 'M' in value:
            result[key] = deserialize(value['M'])
        elif 'L' in value:
            result[key] = [deserialize_value(v) for v in value['L']]
    return result

def handle_insert(item):
    """Handle new item insertion."""
    pass

def handle_modify(old_item, new_item):
    """Handle item modification."""
    pass

def handle_remove(item):
    """Handle item deletion."""
    pass
```

## Monitoring

```hcl
# Alarm for stream processing errors
resource "aws_cloudwatch_metric_alarm" "stream_errors" {
  alarm_name          = "dynamodb-stream-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  dimensions = {
    FunctionName = aws_lambda_function.stream_processor.function_name
  }

  alarm_actions = [var.sns_topic_arn]
}

# Alarm for iterator age (how far behind processing is)
resource "aws_cloudwatch_metric_alarm" "iterator_age" {
  alarm_name          = "dynamodb-stream-iterator-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "IteratorAge"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = 300000  # 5 minutes in milliseconds

  dimensions = {
    FunctionName = aws_lambda_function.stream_processor.function_name
  }

  alarm_actions = [var.sns_topic_arn]
  alarm_description = "Stream processing is more than 5 minutes behind"
}
```

## Outputs

```hcl
output "table_stream_arn" {
  value = aws_dynamodb_table.orders.stream_arn
}

output "processor_function_name" {
  value = aws_lambda_function.stream_processor.function_name
}

output "dlq_url" {
  value = aws_sqs_queue.stream_dlq.url
}
```

## Summary

DynamoDB Streams with Lambda in Terraform enables real-time reaction to data changes. Enable streams on the table with `stream_view_type`, create an event source mapping with `starting_position`, and configure batch processing and error handling. Use `filter_criteria` to reduce unnecessary invocations, `bisect_batch_on_function_error` to isolate problematic records, and `ReportBatchItemFailures` for granular failure handling. Monitor the `IteratorAge` metric to ensure processing keeps up with the stream.

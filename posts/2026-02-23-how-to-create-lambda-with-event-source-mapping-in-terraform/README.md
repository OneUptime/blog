# How to Create Lambda with Event Source Mapping in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Event Source Mapping, SQS, Kinesis, DynamoDB, Kafka, Serverless, Infrastructure as Code

Description: Learn how to configure Lambda event source mappings with Terraform to process events from SQS, Kinesis, DynamoDB Streams, and Kafka with proper error handling.

---

Lambda event source mappings create the connection between event sources and your Lambda functions. Instead of your function being invoked directly, the event source mapping reads records from a source like SQS, Kinesis, DynamoDB Streams, or Kafka, and invokes your function with batches of records. This is the backbone of event-driven serverless architectures on AWS. This guide shows you how to configure event source mappings for different sources using Terraform.

## How Event Source Mappings Work

An event source mapping is a Lambda resource that reads from a source, batches records together, and synchronously invokes your function. Unlike asynchronous invocations, event source mappings handle retries, batch processing, and error management automatically. If your function fails to process a batch, the behavior depends on the source type: SQS returns messages to the queue, while Kinesis and DynamoDB retry the entire batch until it succeeds or expires.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials configured
- Event sources (SQS queue, Kinesis stream, or DynamoDB table) set up
- Understanding of Lambda and event-driven patterns

## SQS Event Source Mapping

SQS is the most common event source for Lambda. The mapping polls the queue and invokes your function with batches of messages.

```hcl
provider "aws" {
  region = "us-east-1"
}

# IAM role for Lambda
resource "aws_iam_role" "lambda" {
  name = "lambda-event-source-role"

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

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# SQS permissions for the Lambda role
resource "aws_iam_role_policy" "sqs_permissions" {
  name = "lambda-sqs-permissions"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.orders.arn
      }
    ]
  })
}

# SQS queue
resource "aws_sqs_queue" "orders" {
  name                       = "order-processing-queue"
  visibility_timeout_seconds = 360  # 6x the Lambda timeout
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 20  # Long polling

  # Dead letter queue for messages that fail repeatedly
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3
  })

  sqs_managed_sse_enabled = true

  tags = {
    Name = "order-processing-queue"
  }
}

resource "aws_sqs_queue" "orders_dlq" {
  name                      = "order-processing-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/lambda.zip"
}

# Lambda function for processing orders
resource "aws_lambda_function" "order_processor" {
  function_name = "order-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "orders.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 60
  memory_size = 256

  environment {
    variables = {
      NODE_ENV = "production"
    }
  }

  tags = {
    Name = "order-processor"
  }
}

# SQS event source mapping
resource "aws_lambda_event_source_mapping" "sqs_orders" {
  event_source_arn = aws_sqs_queue.orders.arn
  function_name    = aws_lambda_function.order_processor.arn

  # Batch configuration
  batch_size                         = 10   # Process up to 10 messages per invocation
  maximum_batching_window_in_seconds = 5    # Wait up to 5 seconds to build a batch

  # Enable partial batch failure reporting
  # Function must return { batchItemFailures: [...] }
  function_response_types = ["ReportBatchItemFailures"]

  # Scaling configuration
  scaling_config {
    maximum_concurrency = 10  # Limit concurrent Lambda instances
  }

  # Filter criteria - only process specific message types
  filter_criteria {
    filter {
      pattern = jsonencode({
        body = {
          type = ["order_created", "order_updated"]
        }
      })
    }
  }

  enabled = true
}
```

## Kinesis Event Source Mapping

Kinesis streams provide ordered, replayable event processing.

```hcl
# Kinesis permissions
resource "aws_iam_role_policy" "kinesis_permissions" {
  name = "lambda-kinesis-permissions"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:DescribeStream",
          "kinesis:DescribeStreamSummary",
          "kinesis:GetRecords",
          "kinesis:GetShardIterator",
          "kinesis:ListShards",
          "kinesis:ListStreams",
          "kinesis:SubscribeToShard"
        ]
        Resource = aws_kinesis_stream.events.arn
      }
    ]
  })
}

# Kinesis stream
resource "aws_kinesis_stream" "events" {
  name = "application-events"

  stream_mode_details {
    stream_mode = "ON_DEMAND"  # Auto-scaling shards
  }

  retention_period = 168  # 7 days

  encryption_type = "KMS"
  kms_key_id      = "alias/aws/kinesis"

  tags = {
    Name = "application-events"
  }
}

# Lambda for Kinesis processing
resource "aws_lambda_function" "kinesis_processor" {
  function_name = "kinesis-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "kinesis.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 300
  memory_size = 512

  tags = {
    Name = "kinesis-processor"
  }
}

# Kinesis event source mapping
resource "aws_lambda_event_source_mapping" "kinesis_events" {
  event_source_arn = aws_kinesis_stream.events.arn
  function_name    = aws_lambda_function.kinesis_processor.arn

  # Start reading from the latest records
  starting_position = "LATEST"

  # Batch configuration
  batch_size                         = 100   # Up to 100 records per batch
  maximum_batching_window_in_seconds = 10    # Wait up to 10 seconds

  # Parallelization - process multiple batches per shard
  parallelization_factor = 2  # 2 concurrent batches per shard

  # Error handling
  maximum_retry_attempts                  = 3
  maximum_record_age_in_seconds           = 86400  # 1 day
  bisect_batch_on_function_error          = true    # Split batch on failure
  function_response_types                 = ["ReportBatchItemFailures"]

  # On-failure destination for records that exhaust retries
  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.kinesis_dlq.arn
    }
  }

  # Tumbling window for aggregation
  tumbling_window_in_seconds = 60  # 1-minute aggregation window

  enabled = true
}

# DLQ for Kinesis failures
resource "aws_sqs_queue" "kinesis_dlq" {
  name                      = "kinesis-processing-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}
```

## DynamoDB Streams Event Source Mapping

Process changes to DynamoDB tables in real-time.

```hcl
# DynamoDB permissions
resource "aws_iam_role_policy" "dynamodb_permissions" {
  name = "lambda-dynamodb-permissions"
  role = aws_iam_role.lambda.id

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
        Resource = "${aws_dynamodb_table.orders.arn}/stream/*"
      }
    ]
  })
}

# DynamoDB table with streams enabled
resource "aws_dynamodb_table" "orders" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }

  # Enable DynamoDB Streams
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"  # Get both old and new item

  tags = {
    Name = "orders-table"
  }
}

# Lambda for DynamoDB stream processing
resource "aws_lambda_function" "stream_processor" {
  function_name = "dynamodb-stream-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "streams.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 60
  memory_size = 256

  tags = {
    Name = "dynamodb-stream-processor"
  }
}

# DynamoDB Streams event source mapping
resource "aws_lambda_event_source_mapping" "dynamodb_stream" {
  event_source_arn = aws_dynamodb_table.orders.stream_arn
  function_name    = aws_lambda_function.stream_processor.arn

  starting_position = "LATEST"

  batch_size                         = 100
  maximum_batching_window_in_seconds = 5

  # Error handling
  maximum_retry_attempts        = 5
  maximum_record_age_in_seconds = 3600  # 1 hour
  bisect_batch_on_function_error = true
  function_response_types       = ["ReportBatchItemFailures"]

  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.stream_dlq.arn
    }
  }

  # Filter for specific event types
  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["INSERT", "MODIFY"]
      })
    }
  }

  enabled = true
}

resource "aws_sqs_queue" "stream_dlq" {
  name                      = "dynamodb-stream-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}
```

## Amazon MSK (Kafka) Event Source Mapping

Process messages from a Kafka cluster.

```hcl
# MSK permissions
resource "aws_iam_role_policy" "msk_permissions" {
  name = "lambda-msk-permissions"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kafka:DescribeCluster",
          "kafka:DescribeClusterV2",
          "kafka:GetBootstrapBrokers",
          "kafka-cluster:Connect",
          "kafka-cluster:DescribeGroup",
          "kafka-cluster:AlterGroup",
          "kafka-cluster:DescribeTopic",
          "kafka-cluster:ReadData",
          "kafka-cluster:DescribeClusterDynamicConfiguration"
        ]
        Resource = var.msk_cluster_arn
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      }
    ]
  })
}

variable "msk_cluster_arn" {
  type = string
}

# Lambda for Kafka processing
resource "aws_lambda_function" "kafka_processor" {
  function_name = "kafka-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "kafka.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  timeout     = 300
  memory_size = 512

  tags = {
    Name = "kafka-processor"
  }
}

# MSK event source mapping
resource "aws_lambda_event_source_mapping" "msk" {
  event_source_arn = var.msk_cluster_arn
  function_name    = aws_lambda_function.kafka_processor.arn
  topics           = ["order-events"]

  starting_position = "LATEST"

  batch_size = 100

  # Amazon MSK specific configuration
  amazon_managed_kafka_event_source_config {
    consumer_group_id = "lambda-order-processor"
  }

  enabled = true
}
```

## Monitoring Event Source Mappings

```hcl
# SNS topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "event-source-alerts"
}

# Monitor SQS queue for message buildup
resource "aws_cloudwatch_metric_alarm" "queue_depth" {
  alarm_name          = "sqs-queue-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 1000
  alarm_description   = "SQS queue is building up - Lambda may not be keeping up"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.orders.name
  }
}

# Monitor Lambda errors for event source functions
resource "aws_cloudwatch_metric_alarm" "processor_errors" {
  alarm_name          = "lambda-event-processor-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Event processor Lambda is generating errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.order_processor.function_name
  }
}

# Monitor iterator age for Kinesis (processing delay)
resource "aws_cloudwatch_metric_alarm" "kinesis_iterator_age" {
  alarm_name          = "kinesis-iterator-age-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "IteratorAge"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = 60000  # 60 seconds behind
  alarm_description   = "Kinesis processor is falling behind"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.kinesis_processor.function_name
  }
}
```

## Outputs

```hcl
output "sqs_mapping_uuid" {
  description = "UUID of the SQS event source mapping"
  value       = aws_lambda_event_source_mapping.sqs_orders.uuid
}

output "kinesis_mapping_uuid" {
  description = "UUID of the Kinesis event source mapping"
  value       = aws_lambda_event_source_mapping.kinesis_events.uuid
}

output "order_queue_url" {
  value = aws_sqs_queue.orders.url
}
```

## Best Practices

When configuring event source mappings, set SQS queue visibility timeout to at least 6 times your Lambda function timeout. Enable partial batch failure reporting by returning `batchItemFailures` from your function and setting `function_response_types = ["ReportBatchItemFailures"]`. Use `bisect_batch_on_function_error` for Kinesis and DynamoDB to isolate poison messages. Configure filter criteria to avoid processing irrelevant records. Set `maximum_record_age_in_seconds` to prevent processing stale records. Use DLQ destinations for records that exhaust all retries. Monitor iterator age for stream-based sources to detect processing delays.

## Monitoring with OneUptime

Event source mappings are the backbone of your event-driven architecture. Use [OneUptime](https://oneuptime.com) to monitor the end-to-end health of your event processing pipelines, from message production through Lambda processing to downstream effects.

## Conclusion

Lambda event source mappings provide a powerful, managed way to process events from SQS, Kinesis, DynamoDB Streams, and Kafka. Terraform gives you declarative control over the mapping configuration, including batch settings, error handling, filtering, and monitoring. By combining event source mappings with proper error handling, partial batch failure reporting, and monitoring, you can build robust event-driven architectures that handle failures gracefully.

For more Lambda event handling topics, see our guides on [Lambda with destinations](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-destinations-in-terraform/view) and [Lambda with dead letter queues](https://oneuptime.com/blog/post/2026-02-23-how-to-create-lambda-with-dead-letter-queue-in-terraform/view).

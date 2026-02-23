# How to Create Serverless Data Processing Pipeline with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Serverless, Data Pipeline, Lambda, Kinesis

Description: Learn how to build a serverless data processing pipeline with Terraform using Kinesis, Lambda, S3, and other AWS services for scalable event-driven data processing.

---

Serverless data processing pipelines handle data ingestion, transformation, and storage without managing any infrastructure. These pipelines scale automatically with data volume and you only pay for the data processed. AWS provides a rich set of services for building serverless data pipelines, and Terraform ties them all together in a reproducible, maintainable configuration.

This guide walks through building a complete serverless data processing pipeline with Terraform, from data ingestion through transformation to storage and analytics.

## Pipeline Architecture

The data processing pipeline consists of these stages:

1. **Ingestion**: Kinesis Data Stream receives incoming events
2. **Processing**: Lambda functions transform and enrich the data
3. **Storage**: Processed data lands in S3 and DynamoDB
4. **Analytics**: Athena queries the data in S3
5. **Error Handling**: Dead letter queues capture failed records

## Data Ingestion with Kinesis

```hcl
# Kinesis Data Stream for event ingestion
resource "aws_kinesis_stream" "events" {
  name             = "event-ingestion-stream"
  shard_count      = 4
  retention_period = 48  # Keep data for 48 hours

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  # Enable server-side encryption
  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.kinesis.arn

  tags = {
    Environment = var.environment
    Pipeline    = "data-processing"
  }
}

# KMS key for Kinesis encryption
resource "aws_kms_key" "kinesis" {
  description             = "KMS key for Kinesis stream encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

# API Gateway for HTTP event ingestion
resource "aws_apigatewayv2_api" "ingestion" {
  name          = "event-ingestion-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "ingestion" {
  api_id      = aws_apigatewayv2_api.ingestion.id
  name        = "$default"
  auto_deploy = true
}
```

## Processing with Lambda

```hcl
# Lambda function for data transformation
resource "aws_lambda_function" "transform" {
  filename         = data.archive_file.transform.output_path
  function_name    = "data-transform"
  role             = aws_iam_role.lambda_pipeline.arn
  handler          = "transform.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.transform.output_base64sha256
  timeout          = 300
  memory_size      = 1024

  environment {
    variables = {
      OUTPUT_BUCKET    = aws_s3_bucket.processed_data.id
      DYNAMODB_TABLE   = aws_dynamodb_table.processed_records.name
      ERROR_QUEUE_URL  = aws_sqs_queue.dlq.url
    }
  }

  # Dead letter queue for failed invocations
  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }
}

# Event source mapping - connects Kinesis to Lambda
resource "aws_lambda_event_source_mapping" "kinesis_to_lambda" {
  event_source_arn  = aws_kinesis_stream.events.arn
  function_name     = aws_lambda_function.transform.arn
  starting_position = "LATEST"

  # Batching configuration
  batch_size                         = 100
  maximum_batching_window_in_seconds = 30

  # Parallel processing
  parallelization_factor = 5

  # Error handling
  maximum_retry_attempts             = 3
  maximum_record_age_in_seconds      = 3600  # Skip records older than 1 hour
  bisect_batch_on_function_error     = true   # Split batch on error

  # Send failed records to SQS
  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.dlq.arn
    }
  }

  # Filter events to process only specific types
  filter_criteria {
    filter {
      pattern = jsonencode({
        data = {
          eventType = ["order", "payment", "shipment"]
        }
      })
    }
  }
}

# Lambda function for data enrichment
resource "aws_lambda_function" "enrich" {
  filename         = data.archive_file.enrich.output_path
  function_name    = "data-enrich"
  role             = aws_iam_role.lambda_pipeline.arn
  handler          = "enrich.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.enrich.output_base64sha256
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      LOOKUP_TABLE = aws_dynamodb_table.lookup_data.name
    }
  }
}
```

## Storage Layer

```hcl
# S3 bucket for processed data
resource "aws_s3_bucket" "processed_data" {
  bucket = "processed-data-${var.environment}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "processed_data" {
  bucket = aws_s3_bucket.processed_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "processed_data" {
  bucket = aws_s3_bucket.processed_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
  }
}

# Lifecycle policy for data tiering
resource "aws_s3_bucket_lifecycle_configuration" "processed_data" {
  bucket = aws_s3_bucket.processed_data.id

  rule {
    id     = "data-tiering"
    status = "Enabled"

    # Move to Infrequent Access after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete after 365 days
    expiration {
      days = 365
    }
  }
}

# DynamoDB table for processed record metadata
resource "aws_dynamodb_table" "processed_records" {
  name         = "processed-records"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "record_id"

  attribute {
    name = "record_id"
    type = "S"
  }

  attribute {
    name = "processed_at"
    type = "S"
  }

  global_secondary_index {
    name            = "ProcessedAtIndex"
    hash_key        = "processed_at"
    projection_type = "KEYS_ONLY"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
}
```

## Kinesis Firehose for S3 Delivery

```hcl
# Kinesis Firehose for automatic S3 delivery
resource "aws_kinesis_firehose_delivery_stream" "to_s3" {
  name        = "events-to-s3"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.events.arn
    role_arn           = aws_iam_role.firehose.arn
  }

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.raw_data.arn

    # Buffer configuration
    buffering_size     = 64   # MB
    buffering_interval = 300  # seconds

    # Partition by date for efficient querying
    prefix              = "events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    error_output_prefix = "errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"

    # Convert to Parquet for efficient analytics
    data_format_conversion_configuration {
      input_format_configuration {
        deserializer {
          open_x_json_ser_de {}
        }
      }

      output_format_configuration {
        serializer {
          parquet_ser_de {
            compression = "SNAPPY"
          }
        }
      }

      schema_configuration {
        database_name = aws_glue_catalog_database.events.name
        table_name    = aws_glue_catalog_table.events.name
        role_arn      = aws_iam_role.firehose.arn
      }
    }

    # Enable CloudWatch error logging
    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = "S3Delivery"
    }
  }
}
```

## Error Handling

```hcl
# Dead letter queue for failed records
resource "aws_sqs_queue" "dlq" {
  name                       = "pipeline-dlq"
  message_retention_seconds  = 1209600  # 14 days
  visibility_timeout_seconds = 300

  # Encrypt messages
  kms_master_key_id = aws_kms_key.sqs.id

  tags = {
    Purpose = "Dead letter queue for pipeline errors"
  }
}

# Lambda to process DLQ messages
resource "aws_lambda_function" "dlq_processor" {
  filename         = data.archive_file.dlq_processor.output_path
  function_name    = "dlq-processor"
  role             = aws_iam_role.lambda_pipeline.arn
  handler          = "dlq_processor.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.dlq_processor.output_base64sha256
  timeout          = 60

  environment {
    variables = {
      ALERT_SNS_TOPIC = aws_sns_topic.pipeline_alerts.arn
    }
  }
}

# Connect DLQ to processor Lambda
resource "aws_lambda_event_source_mapping" "dlq_to_lambda" {
  event_source_arn = aws_sqs_queue.dlq.arn
  function_name    = aws_lambda_function.dlq_processor.arn
  batch_size       = 10
}

# SNS topic for pipeline alerts
resource "aws_sns_topic" "pipeline_alerts" {
  name = "pipeline-alerts"
}

# CloudWatch alarm for DLQ depth
resource "aws_cloudwatch_metric_alarm" "dlq_depth" {
  alarm_name          = "pipeline-dlq-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "DLQ has accumulated too many failed messages"

  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }

  alarm_actions = [aws_sns_topic.pipeline_alerts.arn]
}
```

## Outputs

```hcl
output "kinesis_stream_name" {
  description = "Kinesis stream name for event ingestion"
  value       = aws_kinesis_stream.events.name
}

output "processed_data_bucket" {
  description = "S3 bucket for processed data"
  value       = aws_s3_bucket.processed_data.id
}

output "ingestion_api_url" {
  description = "API endpoint for event ingestion"
  value       = aws_apigatewayv2_stage.ingestion.invoke_url
}

output "dlq_url" {
  description = "Dead letter queue URL"
  value       = aws_sqs_queue.dlq.url
}
```

## Monitoring with OneUptime

Data pipelines need continuous monitoring to ensure data freshness and completeness. OneUptime can monitor your pipeline endpoints, track processing lag, and alert when data delivery falls behind. Set up dashboard views showing ingestion rates, processing latency, and error counts. Visit [OneUptime](https://oneuptime.com) to monitor your data pipeline.

## Conclusion

A serverless data processing pipeline built with Terraform provides scalable, cost-effective data processing without infrastructure management. Kinesis handles high-throughput ingestion, Lambda provides flexible transformation logic, S3 offers durable storage with lifecycle management, and Firehose delivers formatted data for analytics. The error handling layer with DLQ and alerts ensures no data is silently lost. By defining the entire pipeline in Terraform, you get reproducible infrastructure that can be deployed across environments consistently.

For more serverless patterns, see [How to Create Serverless API Backend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-api-backend-with-terraform/view) and [How to Create Step Functions Workflows with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-step-functions-workflows-with-terraform/view).

# How to Build a Real-Time Analytics Pipeline with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Real-Time Analytics, Kinesis, AWS, Infrastructure Patterns, Data Engineering

Description: Build a real-time analytics pipeline with Terraform using Kinesis Data Streams, Lambda, DynamoDB, and OpenSearch for processing and visualizing streaming data.

---

Batch processing was fine when business decisions could wait until the morning report. Today, companies need to react to events as they happen: detect fraud in real time, personalize user experiences instantly, and monitor system health continuously. That requires a real-time analytics pipeline.

In this guide, we will build a real-time analytics pipeline on AWS using Terraform. Data flows in from producers, gets processed within seconds, and lands in both a fast query store and a long-term analytics platform.

## Pipeline Architecture

The pipeline has four stages:

1. **Ingestion**: Kinesis Data Streams collects events from producers
2. **Processing**: Lambda functions transform and enrich events
3. **Serving**: DynamoDB for real-time dashboards, OpenSearch for ad-hoc queries
4. **Archiving**: S3 for long-term storage and batch reprocessing

## Kinesis Data Streams

Kinesis Data Streams is the entry point for all events. It can handle millions of records per second:

```hcl
resource "aws_kinesis_stream" "events" {
  name             = "${var.project_name}-events"
  retention_period = 168 # 7 days retention for replay

  stream_mode_details {
    stream_mode = "ON_DEMAND" # Auto-scales based on throughput
  }

  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.kinesis.id

  tags = {
    Purpose = "real-time-analytics"
  }
}

# Dead letter stream for failed processing
resource "aws_kinesis_stream" "dead_letter" {
  name             = "${var.project_name}-events-dlq"
  retention_period = 168

  stream_mode_details {
    stream_mode = "ON_DEMAND"
  }

  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.kinesis.id
}
```

## Lambda Stream Processor

Lambda processes events from Kinesis in near real-time:

```hcl
# Lambda function for processing stream events
resource "aws_lambda_function" "stream_processor" {
  filename         = var.processor_package
  function_name    = "${var.project_name}-stream-processor"
  role             = aws_iam_role.stream_processor.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  memory_size      = 512
  timeout          = 60
  source_code_hash = filebase64sha256(var.processor_package)

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.analytics.name
      DLQ_STREAM     = aws_kinesis_stream.dead_letter.name
      ENVIRONMENT    = var.environment
    }
  }

  # VPC config if processor needs to reach OpenSearch
  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# Event source mapping - connects Lambda to Kinesis
resource "aws_lambda_event_source_mapping" "stream" {
  event_source_arn  = aws_kinesis_stream.events.arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"

  batch_size                         = 100
  maximum_batching_window_in_seconds = 5
  parallelization_factor             = 10
  maximum_retry_attempts             = 3
  maximum_record_age_in_seconds      = 3600
  bisect_batch_on_function_error     = true

  destination_config {
    on_failure {
      destination_arn = aws_kinesis_stream.dead_letter.arn
    }
  }

  # Tumbling window for aggregation
  tumbling_window_in_seconds = 60
}

# IAM role for the processor
resource "aws_iam_role" "stream_processor" {
  name = "${var.project_name}-stream-processor"

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

resource "aws_iam_role_policy" "stream_processor" {
  name = "stream-processor-policy"
  role = aws_iam_role.stream_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:GetRecords",
          "kinesis:GetShardIterator",
          "kinesis:DescribeStream",
          "kinesis:ListShards",
          "kinesis:SubscribeToShard"
        ]
        Resource = aws_kinesis_stream.events.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ]
        Resource = aws_kinesis_stream.dead_letter.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = aws_dynamodb_table.analytics.arn
      }
    ]
  })
}
```

## DynamoDB for Real-Time Queries

DynamoDB serves as the fast query layer for real-time dashboards:

```hcl
resource "aws_dynamodb_table" "analytics" {
  name         = "${var.project_name}-analytics"
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

  attribute {
    name = "gsi1sk"
    type = "S"
  }

  # GSI for querying by different access patterns
  global_secondary_index {
    name            = "gsi1"
    hash_key        = "gsi1pk"
    range_key       = "gsi1sk"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup of old aggregations
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  # Enable streams for downstream consumers
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = {
    Purpose = "real-time-analytics"
  }
}
```

## Kinesis Data Firehose for Archiving

All events also flow to S3 for long-term storage and batch analytics:

```hcl
resource "aws_kinesis_firehose_delivery_stream" "archive" {
  name        = "${var.project_name}-event-archive"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.events.arn
    role_arn           = aws_iam_role.firehose.arn
  }

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.event_archive.arn

    prefix              = "events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/"
    error_output_prefix = "errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"

    buffering_size     = 128
    buffering_interval = 300

    compression_format = "GZIP"

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
        database_name = aws_glue_catalog_database.analytics.name
        table_name    = aws_glue_catalog_table.events.name
        role_arn      = aws_iam_role.firehose.arn
      }
    }
  }
}

resource "aws_s3_bucket" "event_archive" {
  bucket = "${var.project_name}-event-archive-${var.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "event_archive" {
  bucket = aws_s3_bucket.event_archive.id

  rule {
    id     = "tiered-storage"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}
```

## OpenSearch for Ad-Hoc Queries

For exploratory analysis and search, stream events to OpenSearch:

```hcl
resource "aws_kinesis_firehose_delivery_stream" "opensearch" {
  name        = "${var.project_name}-events-to-opensearch"
  destination = "opensearch"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.events.arn
    role_arn           = aws_iam_role.firehose.arn
  }

  opensearch_configuration {
    domain_arn            = aws_opensearch_domain.analytics.arn
    role_arn              = aws_iam_role.firehose.arn
    index_name            = "events"
    index_rotation_period = "OneDay"

    buffering_interval = 60
    buffering_size     = 5

    s3_backup_mode = "FailedDocumentsOnly"

    s3_configuration {
      role_arn           = aws_iam_role.firehose.arn
      bucket_arn         = aws_s3_bucket.event_archive.arn
      prefix             = "opensearch-failures/"
      buffering_interval = 300
      buffering_size     = 10
      compression_format = "GZIP"
    }
  }
}
```

## API Gateway for Event Ingestion

If events come from web or mobile clients, add an API Gateway endpoint:

```hcl
resource "aws_apigatewayv2_api" "events" {
  name          = "${var.project_name}-events-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "kinesis" {
  api_id             = aws_apigatewayv2_api.events.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.event_ingester.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "events" {
  api_id    = aws_apigatewayv2_api.events.id
  route_key = "POST /events"
  target    = "integrations/${aws_apigatewayv2_integration.kinesis.id}"
}
```

For monitoring the health of your pipeline, check out [building a monitoring and alerting stack with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view).

## Wrapping Up

A real-time analytics pipeline processes events as they happen and makes the results immediately queryable. The architecture we built uses Kinesis for ingestion, Lambda for processing, DynamoDB for real-time serving, and S3 plus OpenSearch for deeper analysis. Everything is defined in Terraform, making it reproducible and easy to evolve as your analytics needs grow. Start with the core ingestion and processing path, then add the serving and archiving layers as your use cases develop.

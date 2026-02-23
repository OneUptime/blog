# How to Build a CQRS Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CQRS, Event Sourcing, AWS, Architecture, Infrastructure as Code

Description: Learn how to build a CQRS (Command Query Responsibility Segregation) architecture on AWS using Terraform with separate read and write data stores.

---

CQRS, or Command Query Responsibility Segregation, is an architectural pattern that separates read and write operations into different models. Instead of one database handling both reads and writes, you use a write-optimized store for commands and a read-optimized store for queries. This approach lets you scale reads and writes independently and optimize each side for its specific workload.

In this guide, we will build a full CQRS architecture on AWS using Terraform. The write side will use DynamoDB with event sourcing, and the read side will use Elasticsearch for fast, flexible queries.

## Architecture Overview

Our CQRS system has these components:

- **Command side**: API Gateway, Lambda, DynamoDB (write store), Kinesis (event stream)
- **Query side**: Elasticsearch (read store), Lambda (projections), API Gateway
- **Sync layer**: Kinesis Data Streams and Lambda to project events into the read store

## The Command Side - Write Store

The write side captures commands and stores events. DynamoDB is a great fit because it handles high write throughput and you can stream changes via DynamoDB Streams.

```hcl
# write-store.tf - Command side infrastructure
# Event store in DynamoDB
resource "aws_dynamodb_table" "event_store" {
  name         = "${var.project_name}-event-store"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "aggregateId"
  range_key    = "version"

  attribute {
    name = "aggregateId"
    type = "S"
  }

  attribute {
    name = "version"
    type = "N"
  }

  attribute {
    name = "eventType"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  # Query by event type across all aggregates
  global_secondary_index {
    name            = "event-type-index"
    hash_key        = "eventType"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # Enable DynamoDB Streams for change data capture
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Side    = "Command"
    Purpose = "EventStore"
  }
}

# Snapshot store for aggregate state caching
resource "aws_dynamodb_table" "snapshot_store" {
  name         = "${var.project_name}-snapshot-store"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "aggregateId"

  attribute {
    name = "aggregateId"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Side    = "Command"
    Purpose = "SnapshotStore"
  }
}
```

## Command Handler Lambda

The command handler validates incoming commands, loads the current aggregate state, applies the command, and stores the resulting events.

```hcl
# command-handler.tf - Lambda for processing commands
resource "aws_lambda_function" "command_handler" {
  filename      = "command_handler.zip"
  function_name = "${var.project_name}-command-handler"
  role          = aws_iam_role.command_handler.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 512

  environment {
    variables = {
      EVENT_STORE_TABLE    = aws_dynamodb_table.event_store.name
      SNAPSHOT_STORE_TABLE = aws_dynamodb_table.snapshot_store.name
      ENVIRONMENT          = var.environment
    }
  }
}

# IAM role for the command handler
resource "aws_iam_role" "command_handler" {
  name = "${var.project_name}-command-handler-role"

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

# Allow command handler to write to the event store
resource "aws_iam_role_policy" "command_handler" {
  name = "command-handler-policy"
  role = aws_iam_role.command_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.event_store.arn,
          "${aws_dynamodb_table.event_store.arn}/index/*",
          aws_dynamodb_table.snapshot_store.arn
        ]
      }
    ]
  })
}

# Command API Gateway
resource "aws_apigatewayv2_api" "command_api" {
  name          = "${var.project_name}-command-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["POST", "PUT", "DELETE"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_route" "commands" {
  api_id    = aws_apigatewayv2_api.command_api.id
  route_key = "POST /commands/{commandType}"
  target    = "integrations/${aws_apigatewayv2_integration.command_handler.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
```

## The Sync Layer - Event Projection

This is the bridge between the write side and the read side. When events are written to DynamoDB, the stream triggers a Lambda that projects the data into the read store.

```hcl
# sync.tf - Event projection pipeline
# Kinesis stream for durable event delivery
resource "aws_kinesis_stream" "events" {
  name             = "${var.project_name}-event-stream"
  shard_count      = var.kinesis_shard_count
  retention_period = 168 # 7 days

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  encryption_type = "KMS"
  kms_key_id      = "alias/aws/kinesis"

  tags = {
    Purpose = "CQRS-EventSync"
  }
}

# Lambda that reads from DynamoDB Streams and writes to Kinesis
resource "aws_lambda_function" "stream_forwarder" {
  filename      = "stream_forwarder.zip"
  function_name = "${var.project_name}-stream-forwarder"
  role          = aws_iam_role.stream_forwarder.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 60

  environment {
    variables = {
      KINESIS_STREAM = aws_kinesis_stream.events.name
    }
  }
}

# Connect DynamoDB Streams to the forwarder Lambda
resource "aws_lambda_event_source_mapping" "dynamodb_to_kinesis" {
  event_source_arn  = aws_dynamodb_table.event_store.stream_arn
  function_name     = aws_lambda_function.stream_forwarder.arn
  starting_position = "LATEST"
  batch_size        = 100

  # Process in order
  parallelization_factor = 1

  # Retry configuration
  maximum_retry_attempts        = 3
  bisect_batch_on_function_error = true

  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.projection_dlq.arn
    }
  }
}

# Projection Lambda - reads from Kinesis and updates the read store
resource "aws_lambda_function" "projector" {
  filename      = "projector.zip"
  function_name = "${var.project_name}-event-projector"
  role          = aws_iam_role.projector.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 120
  memory_size   = 512

  environment {
    variables = {
      ELASTICSEARCH_ENDPOINT = aws_opensearch_domain.read_store.endpoint
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.projector.id]
  }
}

# Connect Kinesis to the projector Lambda
resource "aws_lambda_event_source_mapping" "kinesis_to_projector" {
  event_source_arn  = aws_kinesis_stream.events.arn
  function_name     = aws_lambda_function.projector.arn
  starting_position = "LATEST"
  batch_size        = 100

  maximum_retry_attempts = 3
}
```

## The Query Side - Read Store

OpenSearch (Elasticsearch) is the read store. It is optimized for fast, flexible queries with full-text search and aggregations.

```hcl
# read-store.tf - Query side infrastructure
resource "aws_opensearch_domain" "read_store" {
  domain_name    = "${var.project_name}-read-store"
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type          = "r6g.large.search"
    instance_count         = 2
    zone_awareness_enabled = true

    zone_awareness_config {
      availability_zone_count = 2
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 100
    volume_type = "gp3"
    throughput  = 250
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  vpc_options {
    subnet_ids         = slice(var.private_subnet_ids, 0, 2)
    security_group_ids = [aws_security_group.opensearch.id]
  }

  tags = {
    Side    = "Query"
    Purpose = "ReadStore"
  }
}

# Query API Gateway - separate from command API
resource "aws_apigatewayv2_api" "query_api" {
  name          = "${var.project_name}-query-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }
}

# Query handler Lambda
resource "aws_lambda_function" "query_handler" {
  filename      = "query_handler.zip"
  function_name = "${var.project_name}-query-handler"
  role          = aws_iam_role.query_handler.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 10
  memory_size   = 256

  environment {
    variables = {
      ELASTICSEARCH_ENDPOINT = aws_opensearch_domain.read_store.endpoint
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.query_handler.id]
  }
}
```

## Dead Letter Queue for Failed Projections

When projections fail, you need to capture the failed events so you can replay them later.

```hcl
# dlq.tf - Failed projection handling
resource "aws_sqs_queue" "projection_dlq" {
  name                      = "${var.project_name}-projection-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Purpose = "CQRS-FailedProjections"
  }
}

# Alarm when projections fail
resource "aws_cloudwatch_metric_alarm" "projection_failures" {
  alarm_name          = "${var.project_name}-projection-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Events are failing to project to the read store"

  dimensions = {
    QueueName = aws_sqs_queue.projection_dlq.name
  }

  alarm_actions = [var.alert_sns_topic_arn]
}
```

## Key Design Decisions

There are a few things to keep in mind when building CQRS infrastructure:

**Eventual consistency**: The read store will always be slightly behind the write store. This delay is usually milliseconds, but your application needs to handle it. Consider returning the command result directly for operations where the user needs immediate feedback.

**Projection replay**: If your read model schema changes, you need to rebuild it from events. The Kinesis retention period (7 days in our config) limits how far back you can replay. For longer replay windows, archive events to S3.

**Separate scaling**: The write side and read side scale independently. If reads outpace writes (which is common), you can scale the OpenSearch cluster without touching the DynamoDB setup.

**Security boundaries**: Keep command and query APIs separate with different IAM roles and security groups. The command handler should never read from the read store, and the query handler should never write to the event store.

For monitoring the health of your CQRS system, especially the sync lag between write and read stores, consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) to track metrics and alert on projection delays.

This architecture gives you a solid foundation that you can extend with additional read models, new event types, and more projections as your system grows.

# How to Create EventBridge Pipes with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EventBridge, Serverless, Event-Driven, Integration

Description: Learn how to create Amazon EventBridge Pipes with Terraform to build point-to-point integrations between event sources and targets with filtering and enrichment.

---

Amazon EventBridge Pipes provides a simple way to create point-to-point integrations between event producers and consumers. Unlike EventBridge Rules which use a bus-based pattern, Pipes connect a source directly to a target with optional filtering, enrichment, and transformation steps in between. Managing EventBridge Pipes with Terraform gives you declarative control over these integrations and makes them easy to replicate across environments.

This guide covers how to create EventBridge Pipes with Terraform, including source configuration, filtering, enrichment with Lambda, and various target integrations.

## Understanding EventBridge Pipes Architecture

An EventBridge Pipe consists of four components:

1. **Source**: Where events come from (SQS, Kinesis, DynamoDB Streams, Kafka, etc.)
2. **Filtering** (optional): Reduces which events flow through the pipe
3. **Enrichment** (optional): Transforms or adds data using Lambda, Step Functions, API Gateway, or API Destination
4. **Target**: Where processed events are delivered (Lambda, Step Functions, SQS, SNS, ECS, and more)

## Setting Up IAM Permissions

EventBridge Pipes needs an IAM role with permissions to read from the source and write to the target:

```hcl
# IAM role for EventBridge Pipes
resource "aws_iam_role" "pipe_role" {
  name = "eventbridge-pipe-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "pipes.amazonaws.com"
        }
      }
    ]
  })
}

# Policy for reading from SQS source
resource "aws_iam_role_policy" "pipe_source_policy" {
  name = "pipe-source-policy"
  role = aws_iam_role.pipe_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.source_queue.arn
      }
    ]
  })
}

# Policy for invoking Lambda enrichment
resource "aws_iam_role_policy" "pipe_enrichment_policy" {
  name = "pipe-enrichment-policy"
  role = aws_iam_role.pipe_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "lambda:InvokeFunction"
        Resource = aws_lambda_function.enrichment.arn
      }
    ]
  })
}

# Policy for writing to the Step Functions target
resource "aws_iam_role_policy" "pipe_target_policy" {
  name = "pipe-target-policy"
  role = aws_iam_role.pipe_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "states:StartExecution"
        Resource = aws_sfn_state_machine.processor.arn
      }
    ]
  })
}
```

## Creating a Basic SQS-to-Lambda Pipe

The simplest pipe connects an SQS queue to a Lambda function:

```hcl
# Source SQS queue
resource "aws_sqs_queue" "order_queue" {
  name                       = "order-events"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
}

# Target Lambda function
resource "aws_lambda_function" "order_processor" {
  filename         = data.archive_file.processor.output_path
  function_name    = "order-processor"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.processor.output_base64sha256
  timeout          = 60
}

# EventBridge Pipe connecting SQS to Lambda
resource "aws_pipes_pipe" "sqs_to_lambda" {
  name     = "order-processing-pipe"
  role_arn = aws_iam_role.pipe_role.arn

  source = aws_sqs_queue.order_queue.arn
  target = aws_lambda_function.order_processor.arn

  # Source configuration for SQS
  source_parameters {
    sqs_queue_parameters {
      batch_size                         = 10
      maximum_batching_window_in_seconds = 30
    }
  }

  # Target configuration for Lambda
  target_parameters {
    lambda_function_parameters {
      invocation_type = "REQUEST_RESPONSE"
    }
  }
}
```

## Adding Event Filtering

Filter events so only relevant ones flow through the pipe:

```hcl
# Pipe with filtering to process only high-value orders
resource "aws_pipes_pipe" "filtered_pipe" {
  name     = "high-value-order-pipe"
  role_arn = aws_iam_role.pipe_role.arn

  source = aws_sqs_queue.order_queue.arn
  target = aws_lambda_function.order_processor.arn

  source_parameters {
    # Filter to only process orders above $100
    filter_criteria {
      filter {
        pattern = jsonencode({
          body = {
            orderAmount = [{
              numeric = [">", 100]
            }]
            orderType = ["premium", "enterprise"]
          }
        })
      }
    }

    sqs_queue_parameters {
      batch_size = 5
    }
  }

  target_parameters {
    lambda_function_parameters {
      invocation_type = "REQUEST_RESPONSE"
    }
  }
}
```

## Adding Enrichment with Lambda

Enrich events with additional data before sending to the target:

```hcl
# Enrichment Lambda function
resource "aws_lambda_function" "enrichment" {
  filename         = data.archive_file.enrichment.output_path
  function_name    = "order-enrichment"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.enrichment.output_base64sha256
  timeout          = 30

  environment {
    variables = {
      CUSTOMER_DB_TABLE = aws_dynamodb_table.customers.name
    }
  }
}

# Pipe with enrichment step
resource "aws_pipes_pipe" "enriched_pipe" {
  name     = "enriched-order-pipe"
  role_arn = aws_iam_role.pipe_role.arn

  source     = aws_sqs_queue.order_queue.arn
  enrichment = aws_lambda_function.enrichment.arn
  target     = aws_sfn_state_machine.order_workflow.arn

  source_parameters {
    sqs_queue_parameters {
      batch_size = 1
    }
  }

  # Enrichment configuration
  enrichment_parameters {
    input_template = jsonencode({
      orderId    = "<$.body.orderId>"
      customerId = "<$.body.customerId>"
      amount     = "<$.body.orderAmount>"
    })
  }

  target_parameters {
    step_function_state_machine_parameters {
      invocation_type = "FIRE_AND_FORGET"
    }
  }
}
```

## DynamoDB Stream to EventBridge Pipe

Connect DynamoDB Streams to a target for change data capture:

```hcl
# DynamoDB table with streams enabled
resource "aws_dynamodb_table" "orders" {
  name             = "orders"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "orderId"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "orderId"
    type = "S"
  }
}

# Pipe from DynamoDB Stream to SNS
resource "aws_pipes_pipe" "dynamodb_to_sns" {
  name     = "order-changes-pipe"
  role_arn = aws_iam_role.pipe_role.arn

  source = aws_dynamodb_table.orders.stream_arn
  target = aws_sns_topic.order_notifications.arn

  source_parameters {
    dynamodb_stream_parameters {
      starting_position          = "LATEST"
      batch_size                 = 10
      maximum_batching_window_in_seconds = 5
      maximum_retry_attempts     = 3
      # Dead letter queue for failed events
      dead_letter_config {
        arn = aws_sqs_queue.dlq.arn
      }
    }

    # Only capture INSERT and MODIFY events
    filter_criteria {
      filter {
        pattern = jsonencode({
          eventName = ["INSERT", "MODIFY"]
        })
      }
    }
  }

  target_parameters {
    input_template = jsonencode({
      message   = "Order updated"
      orderId   = "<$.dynamodb.NewImage.orderId.S>"
      status    = "<$.dynamodb.NewImage.status.S>"
      eventType = "<$.eventName>"
    })
  }
}
```

## Kinesis Stream to Step Functions Pipe

Process streaming data through a Step Functions workflow:

```hcl
# Kinesis data stream source
resource "aws_kinesis_stream" "events" {
  name             = "event-stream"
  shard_count      = 2
  retention_period = 24
}

# Pipe from Kinesis to Step Functions
resource "aws_pipes_pipe" "kinesis_to_sfn" {
  name     = "stream-processor-pipe"
  role_arn = aws_iam_role.pipe_role.arn

  source = aws_kinesis_stream.events.arn
  target = aws_sfn_state_machine.stream_processor.arn

  source_parameters {
    kinesis_stream_parameters {
      starting_position             = "LATEST"
      batch_size                    = 100
      maximum_batching_window_in_seconds = 10
      maximum_retry_attempts        = 2
      parallelization_factor        = 5
    }
  }

  target_parameters {
    step_function_state_machine_parameters {
      invocation_type = "FIRE_AND_FORGET"
    }
  }
}
```

## Outputs

```hcl
output "pipe_arn" {
  description = "ARN of the EventBridge Pipe"
  value       = aws_pipes_pipe.sqs_to_lambda.arn
}

output "pipe_name" {
  description = "Name of the EventBridge Pipe"
  value       = aws_pipes_pipe.sqs_to_lambda.name
}

output "source_queue_url" {
  description = "URL of the source SQS queue"
  value       = aws_sqs_queue.order_queue.url
}
```

## Monitoring with OneUptime

EventBridge Pipes create integration points between services that need careful monitoring. OneUptime can track pipe throughput, filtering hit rates, enrichment latency, and delivery failures. Set up alerts for when pipes stall or error rates spike. Visit [OneUptime](https://oneuptime.com) to monitor your event-driven architectures.

## Conclusion

EventBridge Pipes with Terraform provides a clean, declarative way to build point-to-point event integrations. The combination of source, filter, enrichment, and target stages gives you a powerful pipeline pattern without writing glue code. Whether you are connecting SQS queues to Lambda functions, streaming DynamoDB changes to SNS topics, or processing Kinesis records through Step Functions, Pipes simplifies the integration while Terraform ensures reproducibility. The filtering and enrichment capabilities reduce unnecessary processing and add context to events before they reach their destination.

For more event-driven patterns, see [How to Create Step Functions Workflows with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-step-functions-workflows-with-terraform/view) and [How to Create Serverless Data Processing Pipeline with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-data-processing-pipeline-with-terraform/view).

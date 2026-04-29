# How to Create Kinesis Streams with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Kinesis, Streaming, Data Ingestion, Infrastructure as Code, Real-Time

Description: Learn how to create and configure AWS Kinesis Data Streams using OpenTofu for real-time data ingestion with proper shard capacity, encryption, and consumer configuration.

---

Amazon Kinesis Data Streams is AWS's managed real-time data streaming service. It's ideal for ingesting high-throughput event streams, log data, and IoT telemetry. OpenTofu makes Kinesis stream configuration reproducible and consistent across environments.

## Creating a Kinesis Stream

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Standard shard-based stream
resource "aws_kinesis_stream" "events" {
  name             = "${var.environment}-events-stream"
  shard_count      = var.shard_count  # Each shard supports 1MB/s write, 2MB/s read
  retention_period = 24               # Hours - default is 24, max is 8760 (365 days)

  # Enable server-side encryption
  encryption_type = "KMS"
  kms_key_id      = "alias/aws/kinesis"  # Use the managed key or a custom KMS key

  # Enable enhanced fan-out for consumers that need dedicated throughput
  stream_mode_details {
    stream_mode = "PROVISIONED"  # PROVISIONED or ON_DEMAND
  }

  tags = merge(var.common_tags, {
    Name = "${var.environment}-events-stream"
  })
}
```

## Using On-Demand Mode

For variable workloads, on-demand mode automatically scales capacity.

```hcl
# on_demand_stream.tf
resource "aws_kinesis_stream" "on_demand" {
  name = "${var.environment}-auto-scaling-stream"

  # On-demand mode - no shard management required
  stream_mode_details {
    stream_mode = "ON_DEMAND"
  }

  # Longer retention for analytics use cases
  retention_period = 168  # 7 days

  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.kinesis.arn
}

resource "aws_kms_key" "kinesis" {
  description             = "KMS key for Kinesis stream encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}
```

## Setting Up IAM for Producers and Consumers

```hcl
# iam.tf
# Producer policy - allows writing to the stream
resource "aws_iam_policy" "kinesis_producer" {
  name        = "${var.environment}-KinesisProducerPolicy"
  description = "Allows writing records to Kinesis streams"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords",
          "kinesis:DescribeStream",
          "kinesis:DescribeStreamSummary",
        ]
        Resource = aws_kinesis_stream.events.arn
      }
    ]
  })
}

# Consumer policy - allows reading from the stream
resource "aws_iam_policy" "kinesis_consumer" {
  name        = "${var.environment}-KinesisConsumerPolicy"
  description = "Allows reading records from Kinesis streams"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:GetRecords",
          "kinesis:GetShardIterator",
          "kinesis:DescribeStream",
          "kinesis:DescribeStreamSummary",
          "kinesis:ListShards",
        ]
        Resource = aws_kinesis_stream.events.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kinesis:ListStreams",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kinesis:SubscribeToShard",
        ]
        Resource = aws_kinesis_stream_consumer.analytics.arn
      }
    ]
  })
}
```

## Registering an Enhanced Fan-Out Consumer

Enhanced fan-out gives each consumer 2MB/s dedicated throughput per shard.

```hcl
# consumer.tf
# Register a named consumer for enhanced fan-out
resource "aws_kinesis_stream_consumer" "analytics" {
  name       = "analytics-consumer"
  stream_arn = aws_kinesis_stream.events.arn
}

# Lambda function triggered by the stream
resource "aws_lambda_event_source_mapping" "kinesis_trigger" {
  event_source_arn              = aws_kinesis_stream_consumer.analytics.arn
  function_name                 = aws_lambda_function.stream_processor.arn
  starting_position             = "LATEST"
  batch_size                    = 100
  parallelization_factor        = 2  # Process 2 batches per shard concurrently
  bisect_batch_on_function_error = true  # Split failed batches in half during retries

  filter_criteria {
    filter {
      pattern = jsonencode({
        data = { eventType = ["order.created", "order.updated"] }
      })
    }
  }
}
```

## CloudWatch Alarms for Stream Health

```hcl
# monitoring.tf
# Alert when an enhanced fan-out consumer falls behind
resource "aws_cloudwatch_metric_alarm" "iterator_age" {
  alarm_name          = "${var.environment}-kinesis-iterator-age-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "SubscribeToShardEvent.MillisBehindLatest"
  namespace           = "AWS/Kinesis"
  period              = 60
  statistic           = "Maximum"
  threshold           = 60000  # 1 minute behind

  dimensions = {
    StreamName   = aws_kinesis_stream.events.name
    ConsumerName = aws_kinesis_stream_consumer.analytics.name
  }

  alarm_actions = [var.alert_sns_topic_arn]
}
```

## Best Practices

- Use on-demand mode for variable or unpredictable traffic patterns - it eliminates the need to pre-provision shards.
- Enable enhanced fan-out for consumers that need low latency - shared throughput consumers share 2MB/s per shard across all consumers.
- Monitor consumer lag with the metric that matches your read model - use `GetRecords.IteratorAgeMilliseconds` for shared-throughput consumers and `SubscribeToShardEvent.MillisBehindLatest` for enhanced fan-out consumers.
- Set retention to at least 24 hours (default) and consider 7 days for analytics workloads to allow for reprocessing.
- Use KMS encryption for streams containing PII or sensitive business data.

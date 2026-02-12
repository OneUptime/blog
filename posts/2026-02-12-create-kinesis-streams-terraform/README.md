# How to Create Kinesis Streams with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Terraform, Streaming

Description: Step-by-step guide to creating Amazon Kinesis Data Streams with Terraform, covering provisioned and on-demand modes, consumers, Firehose delivery, and monitoring.

---

Amazon Kinesis Data Streams is AWS's real-time data streaming service. It captures and processes data continuously at any scale - think of it as a managed pipeline for log aggregation, event processing, real-time analytics, and IoT data ingestion. Unlike SQS (which is for message queuing with guaranteed delivery), Kinesis is designed for high-throughput streaming where multiple consumers can read the same data independently.

This guide covers creating Kinesis streams in Terraform, choosing between provisioned and on-demand capacity, setting up consumers, and delivering data to destinations with Kinesis Data Firehose.

## Provisioned vs On-Demand Mode

Kinesis streams come in two flavors:

- **Provisioned mode**: You specify the number of shards. Each shard provides 1 MB/s write and 2 MB/s read. You pay per shard-hour.
- **On-demand mode**: AWS automatically scales shards based on throughput. You pay per GB of data written and read.

For predictable workloads, provisioned mode is usually cheaper. For variable or unpredictable workloads, on-demand saves you from capacity planning headaches.

## Provisioned Stream

This creates a Kinesis stream with 4 shards in provisioned mode:

```hcl
resource "aws_kinesis_stream" "provisioned" {
  name             = "event-stream"
  shard_count      = 4
  retention_period = 48  # Hours (default 24, max 8760)

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  shard_level_metrics = [
    "IncomingBytes",
    "IncomingRecords",
    "OutgoingBytes",
    "OutgoingRecords",
    "WriteProvisionedThroughputExceeded",
    "ReadProvisionedThroughputExceeded",
    "IteratorAgeMilliseconds",
  ]

  encryption_type = "KMS"
  kms_key_id      = "alias/aws/kinesis"  # Or use a custom KMS key

  tags = {
    Environment = "production"
    Service     = "event-processing"
    ManagedBy   = "terraform"
  }
}
```

The `shard_level_metrics` enable enhanced monitoring for each shard. This is important for identifying hot shards (shards receiving disproportionate traffic).

## On-Demand Stream

This creates an on-demand Kinesis stream that scales automatically:

```hcl
resource "aws_kinesis_stream" "on_demand" {
  name             = "log-stream"
  retention_period = 24

  stream_mode_details {
    stream_mode = "ON_DEMAND"
  }

  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.kinesis.arn

  tags = {
    Environment = "production"
    Service     = "log-aggregation"
  }
}

resource "aws_kms_key" "kinesis" {
  description         = "KMS key for Kinesis encryption"
  enable_key_rotation = true
}
```

With on-demand mode, you don't specify a shard count. Kinesis starts with 4 shards and scales up to 200 shards per stream (or more with a service limit increase).

## Producer IAM Policy

Applications that write to the stream need specific IAM permissions.

This IAM policy grants a producer application write access to the stream:

```hcl
resource "aws_iam_policy" "kinesis_producer" {
  name = "kinesis-producer"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords",
          "kinesis:DescribeStream",
          "kinesis:DescribeStreamSummary"
        ]
        Resource = aws_kinesis_stream.provisioned.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.kinesis.arn
      }
    ]
  })
}
```

## Consumer IAM Policy

Consumers need read permissions and optionally enhanced fan-out registration.

This policy grants a consumer application read access:

```hcl
resource "aws_iam_policy" "kinesis_consumer" {
  name = "kinesis-consumer"

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
          "kinesis:SubscribeToShard"
        ]
        Resource = aws_kinesis_stream.provisioned.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kinesis:ListStreams"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.kinesis.arn
      }
    ]
  })
}
```

## Enhanced Fan-Out Consumer

Standard consumers share the 2 MB/s read throughput per shard. Enhanced fan-out gives each consumer its own dedicated 2 MB/s per shard, using HTTP/2 push instead of polling.

This creates an enhanced fan-out consumer:

```hcl
resource "aws_kinesis_stream_consumer" "analytics" {
  name       = "analytics-consumer"
  stream_arn = aws_kinesis_stream.provisioned.arn
}

resource "aws_kinesis_stream_consumer" "monitoring" {
  name       = "monitoring-consumer"
  stream_arn = aws_kinesis_stream.provisioned.arn
}
```

## Kinesis Data Firehose Delivery

Firehose takes data from your Kinesis stream and delivers it to destinations like S3, Redshift, OpenSearch, or third-party services. It handles batching, compression, and error handling.

This creates a Firehose delivery stream that reads from Kinesis and writes to S3:

```hcl
resource "aws_kinesis_firehose_delivery_stream" "to_s3" {
  name        = "event-stream-to-s3"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.provisioned.arn
    role_arn           = aws_iam_role.firehose.arn
  }

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.data_lake.arn
    prefix     = "events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"

    buffering_size     = 64   # MB - buffer before writing to S3
    buffering_interval = 300  # Seconds - max time to buffer

    compression_format = "GZIP"

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = "S3Delivery"
    }
  }

  tags = {
    Environment = "production"
  }
}

resource "aws_iam_role" "firehose" {
  name = "kinesis-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "firehose.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "firehose" {
  role = aws_iam_role.firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:DescribeStream",
          "kinesis:GetShardIterator",
          "kinesis:GetRecords",
          "kinesis:ListShards"
        ]
        Resource = aws_kinesis_stream.provisioned.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.data_lake.arn,
          "${aws_s3_bucket.data_lake.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.firehose.arn}:*"
      }
    ]
  })
}

resource "aws_s3_bucket" "data_lake" {
  bucket = "event-data-lake"
}

resource "aws_cloudwatch_log_group" "firehose" {
  name              = "/firehose/event-stream-to-s3"
  retention_in_days = 14
}
```

## Writing to the Stream

Here's a Python example for producing records:

```python
import boto3
import json

kinesis = boto3.client("kinesis")

# Put a single record
kinesis.put_record(
    StreamName="event-stream",
    Data=json.dumps({"event": "page_view", "user_id": "123", "page": "/home"}),
    PartitionKey="user-123"  # Records with the same key go to the same shard
)

# Put multiple records in a batch (more efficient)
records = [
    {
        "Data": json.dumps({"event": "click", "user_id": str(i)}),
        "PartitionKey": f"user-{i}"
    }
    for i in range(100)
]

kinesis.put_records(
    StreamName="event-stream",
    Records=records
)
```

## CloudWatch Monitoring

These alarms catch the most common Kinesis issues:

```hcl
# Alert when write throttling occurs
resource "aws_cloudwatch_metric_alarm" "write_throttled" {
  alarm_name          = "kinesis-write-throttled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "WriteProvisionedThroughputExceeded"
  namespace           = "AWS/Kinesis"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Kinesis stream write throughput exceeded"

  dimensions = {
    StreamName = aws_kinesis_stream.provisioned.name
  }

  alarm_actions = [var.sns_topic_arn]
}

# Alert when consumer is falling behind
resource "aws_cloudwatch_metric_alarm" "iterator_age" {
  alarm_name          = "kinesis-consumer-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "GetRecords.IteratorAgeMilliseconds"
  namespace           = "AWS/Kinesis"
  period              = 300
  statistic           = "Maximum"
  threshold           = 3600000  # 1 hour in milliseconds
  alarm_description   = "Kinesis consumer is more than 1 hour behind"

  dimensions = {
    StreamName = aws_kinesis_stream.provisioned.name
  }

  alarm_actions = [var.sns_topic_arn]
}
```

For more on CloudWatch monitoring, see our guide on [CloudWatch alarms with Terraform](https://oneuptime.com/blog/post/create-cloudwatch-alarms-terraform/view).

## Outputs

```hcl
output "stream_arn" {
  value = aws_kinesis_stream.provisioned.arn
}

output "stream_name" {
  value = aws_kinesis_stream.provisioned.name
}

output "firehose_arn" {
  value = aws_kinesis_firehose_delivery_stream.to_s3.arn
}
```

## Wrapping Up

Kinesis Data Streams provides reliable, real-time data streaming with a predictable cost model. Choose provisioned mode when your throughput is stable and on-demand mode for variable workloads. Always enable encryption, set up enhanced monitoring for shard-level metrics, and use Firehose when you need to land data in S3 or other storage. The iterator age metric is your most important alarm - if consumers fall behind, data will expire from the stream and be lost.

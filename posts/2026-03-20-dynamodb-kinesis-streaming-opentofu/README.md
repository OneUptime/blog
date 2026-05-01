# How to Configure DynamoDB Kinesis Data Streaming with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, Kinesis, Data Streaming, Analytics, Infrastructure as Code

Description: Learn how to stream DynamoDB table changes to Amazon Kinesis Data Streams with OpenTofu for real-time analytics, longer retention than DynamoDB Streams, and fan-out to multiple consumers.

## Introduction

DynamoDB Kinesis Data Streaming captures item-level changes and delivers them to a Kinesis Data Stream, offering advantages over native DynamoDB Streams: data retention up to 365 days (vs 24 hours), fan-out to multiple consumers, and integration with services such as Amazon Managed Service for Apache Flink. Use it for audit trails, real-time analytics pipelines, and long-retention CDC.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with DynamoDB and Kinesis permissions

## Step 1: Create Kinesis Data Stream

```hcl
resource "aws_kinesis_stream" "dynamodb_changes" {
  name             = "${var.project_name}-dynamodb-changes"
  shard_count      = 2  # Each shard handles up to 1 MB/s write, 2 MB/s read
  retention_period = 168  # 7 days (up to 8760 hours = 365 days)

  # Choose provisioned or on-demand capacity mode
  stream_mode_details {
    stream_mode = "PROVISIONED"  # or ON_DEMAND for automatically managed capacity
  }

  encryption_type = "KMS"
  kms_key_id      = var.kms_key_arn

  tags = {
    Name = "${var.project_name}-dynamodb-changes"
  }
}
```

## Step 2: Create DynamoDB Table and Enable Kinesis Streaming

```hcl
resource "aws_dynamodb_table" "streamed" {
  name         = "${var.project_name}-streamed-table"
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

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-streamed-table"
  }
}

# Connect DynamoDB table to Kinesis stream

resource "aws_dynamodb_kinesis_streaming_destination" "main" {
  stream_arn = aws_kinesis_stream.dynamodb_changes.arn
  table_name = aws_dynamodb_table.streamed.name
}
```

## Step 3: Lambda Consumer for the Kinesis Stream

```hcl
resource "aws_iam_role" "kinesis_consumer" {
  name = "${var.project_name}-kinesis-consumer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "kinesis_consumer" {
  name = "kinesis-consumer-policy"
  role = aws_iam_role.kinesis_consumer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["kinesis:GetRecords", "kinesis:GetShardIterator",
                    "kinesis:DescribeStream", "kinesis:DescribeStreamSummary",
                    "kinesis:ListShards", "kinesis:SubscribeToShard"]
        Resource = aws_kinesis_stream.dynamodb_changes.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream",
                    "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = var.kms_key_arn
      }
    ]
  })
}

resource "aws_lambda_event_source_mapping" "kinesis_dynamodb" {
  event_source_arn  = aws_kinesis_stream.dynamodb_changes.arn
  function_name     = var.consumer_lambda_arn
  starting_position = "LATEST"

  batch_size                         = 100
  parallelization_factor             = 2  # Up to 10 concurrent batches per shard
  bisect_batch_on_function_error     = true
  maximum_record_age_in_seconds      = 86400  # 1 day
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify streaming destination
aws dynamodb describe-kinesis-streaming-destination \
  --table-name my-project-streamed-table
```

## Conclusion

DynamoDB Kinesis streaming is preferable to native DynamoDB Streams when you need longer data retention, multiple consumers reading the same stream independently, or integration with Amazon Managed Service for Apache Flink for real-time SQL and stream processing. The trade-off is additional cost for the Kinesis stream-evaluate whether the 24-hour retention of native DynamoDB Streams is sufficient for your use case before choosing Kinesis streaming.

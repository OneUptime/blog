# How to Create Lambda Event Source Mappings for Kinesis with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Lambda, Kinesis, Streaming, Event Source Mapping, Infrastructure as Code

Description: Learn how to configure Lambda event source mappings for Kinesis Data Streams using OpenTofu to process streaming data with configurable batch sizes, parallelization, and error handling.

## Introduction

Kinesis Data Streams provides real-time data ingestion. Lambda event source mappings automatically poll Kinesis shards and invoke your function with batches of records. This enables scalable, real-time stream processing without managing Kinesis consumers manually.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Lambda, Kinesis, and IAM permissions

## Step 1: Create a Kinesis Data Stream

```hcl
resource "aws_kinesis_stream" "events" {
  name             = "application-events"
  retention_period = 24  # Hours to retain records

  stream_mode_details {
    stream_mode = "ON_DEMAND"  # Auto-scales shards, or use PROVISIONED
  }

  encryption_type = "KMS"
  kms_key_id      = "alias/aws/kinesis"

  tags = { Name = "application-events-stream" }
}
```

## Step 2: Create Lambda with Kinesis Permissions

```hcl
resource "aws_iam_role" "lambda" {
  name = "kinesis-stream-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_kinesis_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaKinesisExecutionRole"
}

data "archive_file" "stream_processor" {
  type        = "zip"
  source_file = "${path.module}/index.py"
  output_path = "${path.module}/stream_processor.zip"
}

resource "aws_lambda_function" "stream_processor" {
  function_name    = "kinesis-stream-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.stream_processor.output_path
  source_code_hash = data.archive_file.stream_processor.output_base64sha256
  timeout          = 60
  memory_size      = 512
}
```

## Step 3: Create the Event Source Mapping

```hcl
# SQS queue for discarded invocation records

resource "aws_sqs_queue" "kinesis_failures" {
  name = "kinesis-processing-failures"
}

resource "aws_iam_role_policy" "kinesis_failure_destination" {
  name = "kinesis-failure-destination"
  role = aws_iam_role.lambda.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action   = ["sqs:SendMessage"]
      Resource = aws_sqs_queue.kinesis_failures.arn
    }]
  })
}

resource "aws_lambda_event_source_mapping" "kinesis" {
  event_source_arn  = aws_kinesis_stream.events.arn
  function_name     = aws_lambda_function.stream_processor.arn

  # Start processing from the latest records in the stream
  starting_position = "LATEST"
  # Use TRIM_HORIZON to start from oldest available records
  # Use AT_TIMESTAMP with starting_position_timestamp for a specific point in time

  # Process up to 1000 records per batch
  batch_size = 1000

  # Process up to 5 batches from each shard concurrently
  # Maximum parallelization factor is 10
  parallelization_factor = 5

  # Maximum time to wait to build a full batch (0-300 seconds)
  maximum_batching_window_in_seconds = 10

  # Retry configuration for failed batches
  maximum_retry_attempts = 3
  bisect_batch_on_function_error = true  # Split batch in half on error

  # Maximum age of records to process
  maximum_record_age_in_seconds = 3600  # Discard records older than 1 hour

  # Send discarded invocation records to SQS after retries or age limits are exhausted
  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.kinesis_failures.arn
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_kinesis_execution,
    aws_iam_role_policy.kinesis_failure_destination
  ]
}
```

## Step 4: Lambda Handler for Kinesis Records

```python
# index.py - Kinesis stream processor
import base64
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """Process Kinesis records."""
    logger.info(f"Processing {len(event['Records'])} records")

    for record in event['Records']:
        # Kinesis records are base64-encoded
        payload = base64.b64decode(record['kinesis']['data'])
        data = json.loads(payload)

        # Access stream metadata
        stream_name = record['eventSourceARN'].split('/')[-1]
        shard_id = record['eventID'].split(':')[0]
        sequence_number = record['kinesis']['sequenceNumber']

        logger.info(f"Stream: {stream_name}, Shard: {shard_id}, Seq: {sequence_number}")
        process_event(data)

def process_event(data):
    """Process a single event from the stream."""
    print(f"Event type: {data.get('eventType')}")
    # Application-specific processing logic here
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Lambda Kinesis event source mappings with parallelization factors enable high-throughput stream processing while maintaining partition-key-level ordering. Use `bisect_batch_on_function_error` to isolate bad records and `maximum_record_age_in_seconds` to discard stale data. Monitor the `IteratorAge` metric in CloudWatch to detect processing lag. A growing iterator age indicates the consumer is falling behind the stream.

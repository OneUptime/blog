# How to Handle Terraform for Real-Time Data Pipeline Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Pipeline, Streaming, Kinesis, Kafka, Infrastructure as Code

Description: Learn how to build real-time data pipeline infrastructure with Terraform, including Kinesis streams, MSK clusters, Lambda processors, and monitoring for streaming data workloads.

---

Real-time data pipelines process streams of events as they happen, enabling use cases like fraud detection, real-time analytics, and event-driven architectures. The infrastructure behind these pipelines - streaming platforms, processing functions, and storage systems - is complex but well-suited for Terraform management.

In this guide, we will cover how to build real-time data pipeline infrastructure with Terraform.

## Kinesis-Based Streaming Pipeline

```hcl
# data-pipeline/kinesis.tf
# Kinesis-based real-time data pipeline

resource "aws_kinesis_stream" "events" {
  name             = "events-${var.environment}"
  shard_count      = var.environment == "production" ? 10 : 2
  retention_period = 168  # 7 days

  stream_mode_details {
    stream_mode = var.environment == "production" ? "ON_DEMAND" : "PROVISIONED"
  }

  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.streaming.id

  tags = {
    Environment = var.environment
    Pipeline    = "events"
  }
}

# Lambda consumer for real-time processing
resource "aws_lambda_function" "stream_processor" {
  function_name = "stream-processor-${var.environment}"
  runtime       = "python3.11"
  handler       = "processor.handler"
  role          = aws_iam_role.processor.arn
  timeout       = 60
  memory_size   = 512

  filename         = "processor.zip"
  source_code_hash = filebase64sha256("processor.zip")

  environment {
    variables = {
      OUTPUT_BUCKET = aws_s3_bucket.processed.id
      DLQ_URL       = aws_sqs_queue.processing_dlq.url
      ENVIRONMENT   = var.environment
    }
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.processing_dlq.arn
  }
}

# Event source mapping for Kinesis to Lambda
resource "aws_lambda_event_source_mapping" "kinesis" {
  event_source_arn  = aws_kinesis_stream.events.arn
  function_name     = aws_lambda_function.stream_processor.arn
  starting_position = "LATEST"

  batch_size                         = 100
  maximum_batching_window_in_seconds = 5
  parallelization_factor             = 10
  maximum_retry_attempts             = 3
  maximum_record_age_in_seconds      = 604800  # 7 days

  bisect_batch_on_function_error = true

  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.processing_dlq.arn
    }
  }
}
```

## MSK (Managed Kafka) Cluster

```hcl
# data-pipeline/msk.tf
# Amazon MSK cluster for high-throughput streaming

resource "aws_msk_cluster" "main" {
  cluster_name           = "data-pipeline-${var.environment}"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = var.environment == "production" ? 6 : 3

  broker_node_group_info {
    instance_type   = var.environment == "production" ? "kafka.m5.2xlarge" : "kafka.t3.small"
    client_subnets  = var.private_subnet_ids
    security_groups = [aws_security_group.msk.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.environment == "production" ? 1000 : 100

        provisioned_throughput {
          enabled           = var.environment == "production"
          volume_throughput = var.environment == "production" ? 250 : 0
        }
      }
    }
  }

  encryption_info {
    encryption_at_rest_kms_key_arn = aws_kms_key.msk.arn

    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  tags = {
    Environment = var.environment
    Pipeline    = "data-streaming"
  }
}

resource "aws_msk_configuration" "main" {
  kafka_versions = ["3.5.1"]
  name           = "pipeline-config-${var.environment}"

  server_properties = <<PROPERTIES
auto.create.topics.enable=false
default.replication.factor=3
min.insync.replicas=2
num.partitions=12
log.retention.hours=168
PROPERTIES
}
```

## Kinesis Data Firehose for Data Lake Ingestion

```hcl
# data-pipeline/firehose.tf
# Firehose delivery stream for data lake

resource "aws_kinesis_firehose_delivery_stream" "data_lake" {
  name        = "data-lake-delivery-${var.environment}"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.events.arn
    role_arn           = aws_iam_role.firehose.arn
  }

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.data_lake.arn

    prefix              = "events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/"
    error_output_prefix = "errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"

    buffering_size     = 128
    buffering_interval = 60

    compression_format = "GZIP"

    # Transform data before delivery
    processing_configuration {
      enabled = true
      processors {
        type = "Lambda"
        parameters {
          parameter_name  = "LambdaArn"
          parameter_value = "${aws_lambda_function.transform.arn}:$LATEST"
        }
      }
    }

    # Convert to Parquet for efficient querying
    data_format_conversion_configuration {
      input_format_configuration {
        deserializer {
          hive_json_ser_de {}
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
  }
}
```

## Pipeline Monitoring

```hcl
# data-pipeline/monitoring.tf
# Comprehensive monitoring for data pipeline

# Kinesis iterator age (processing lag)
resource "aws_cloudwatch_metric_alarm" "iterator_age" {
  alarm_name          = "kinesis-iterator-age-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "GetRecords.IteratorAgeMilliseconds"
  namespace           = "AWS/Kinesis"
  period              = 300
  statistic           = "Maximum"
  threshold           = 300000  # 5 minutes
  alarm_description   = "Stream processing is falling behind"

  alarm_actions = [aws_sns_topic.pipeline_alerts.arn]

  dimensions = {
    StreamName = aws_kinesis_stream.events.name
  }
}

# Lambda processing errors
resource "aws_cloudwatch_metric_alarm" "processing_errors" {
  alarm_name          = "pipeline-processing-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 10

  alarm_actions = [aws_sns_topic.pipeline_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.stream_processor.function_name
  }
}

# DLQ depth monitoring
resource "aws_cloudwatch_metric_alarm" "dlq_depth" {
  alarm_name          = "pipeline-dlq-depth-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0

  alarm_actions = [aws_sns_topic.pipeline_alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.processing_dlq.name
  }
}
```

## Best Practices

Monitor iterator age (processing lag) as your primary health metric. Growing lag means consumers cannot keep up with producers.

Use dead-letter queues for every processing step. Failed records should never be silently dropped in a data pipeline.

Enable bisect-on-error for batch processors. When a batch fails, bisecting helps isolate the problematic record without losing the entire batch.

Choose the right streaming platform for your scale. Kinesis is simpler for AWS-native workloads. MSK (Kafka) provides more flexibility and higher throughput.

Partition data in your data lake by time. Hive-style partitioning (year/month/day/hour) dramatically improves query performance.

## Conclusion

Real-time data pipeline infrastructure with Terraform provides the foundation for streaming analytics, event processing, and data lake ingestion. By managing Kinesis streams, Lambda processors, Firehose delivery, and monitoring as code, you create a pipeline that is reproducible, scalable, and observable. The key is comprehensive monitoring with alerts on processing lag, error rates, and DLQ depth to ensure data flows reliably through every stage of the pipeline.

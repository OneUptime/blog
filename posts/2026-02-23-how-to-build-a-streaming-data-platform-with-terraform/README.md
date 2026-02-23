# How to Build a Streaming Data Platform with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Streaming Data, Kafka, Kinesis, Real-Time, AWS, Data Engineering

Description: Learn how to build a streaming data platform on AWS using Terraform with Amazon MSK (Kafka), Kinesis, Flink, and real-time data processing pipelines.

---

Batch processing is not always enough. When you need to react to events in real time, whether for fraud detection, live dashboards, or real-time personalization, you need a streaming data platform. This platform handles continuous flows of data, processing millions of events per second with low latency.

In this guide, we will build a streaming data platform on AWS using Terraform. We will use Amazon MSK (Managed Streaming for Apache Kafka) as the central streaming backbone, Kinesis Data Firehose for delivery, and Apache Flink for stream processing.

## Platform Architecture

Our streaming platform includes:

- **Amazon MSK**: Kafka cluster for event streaming
- **Schema Registry**: For managing event schemas
- **Apache Flink**: For real-time stream processing
- **Kinesis Data Firehose**: For delivery to S3 and other destinations
- **Monitoring**: Kafka-specific metrics and alerting

## Amazon MSK Cluster

MSK provides a managed Kafka cluster. This is the heart of the streaming platform.

```hcl
# msk.tf - Managed Kafka cluster
resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.project_name}-kafka"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.m5.large"
    client_subnets  = var.private_subnet_ids
    security_groups = [aws_security_group.kafka.id]

    storage_info {
      ebs_storage_info {
        volume_size = 500

        provisioned_throughput {
          enabled           = true
          volume_throughput  = 250
        }
      }
    }

    connectivity_info {
      public_access {
        type = "DISABLED"
      }
    }
  }

  # Enable encryption in transit and at rest
  encryption_info {
    encryption_at_rest_kms_key_arn = aws_kms_key.kafka.arn

    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  # Authentication
  client_authentication {
    sasl {
      iam   = true
      scram = true
    }

    tls {
      certificate_authority_arns = [aws_acmpca_certificate_authority.kafka.arn]
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  # Enhanced monitoring
  enhanced_monitoring = "PER_TOPIC_PER_BROKER"

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.kafka.name
      }

      s3_logs {
        enabled = true
        bucket  = aws_s3_bucket.kafka_logs.id
        prefix  = "logs/msk/"
      }
    }
  }

  tags = {
    Platform = var.project_name
  }
}

# Kafka broker configuration
resource "aws_msk_configuration" "main" {
  name              = "${var.project_name}-kafka-config"
  kafka_versions    = ["3.5.1"]

  server_properties = <<-PROPERTIES
    auto.create.topics.enable=false
    default.replication.factor=3
    min.insync.replicas=2
    num.partitions=6
    log.retention.hours=168
    log.retention.bytes=1073741824
    message.max.bytes=10485760
    compression.type=lz4
  PROPERTIES
}
```

## Schema Registry

Schema Registry ensures that producers and consumers agree on the data format. AWS Glue Schema Registry integrates with MSK.

```hcl
# schema-registry.tf - Glue Schema Registry
resource "aws_glue_registry" "streaming" {
  registry_name = "${var.project_name}-streaming"
  description   = "Schema registry for streaming events"
}

# Define schemas for your event types
resource "aws_glue_schema" "order_event" {
  schema_name       = "order-event"
  registry_arn      = aws_glue_registry.streaming.arn
  data_format       = "AVRO"
  compatibility     = "BACKWARD"

  schema_definition = jsonencode({
    type      = "record"
    name      = "OrderEvent"
    namespace = "com.${var.project_name}.events"
    fields = [
      { name = "orderId", type = "string" },
      { name = "customerId", type = "string" },
      { name = "eventType", type = { type = "enum", name = "EventType", symbols = ["CREATED", "UPDATED", "CANCELLED", "COMPLETED"] } },
      { name = "amount", type = "double" },
      { name = "timestamp", type = "long" },
      { name = "metadata", type = { type = "map", values = "string" } }
    ]
  })
}

resource "aws_glue_schema" "user_event" {
  schema_name       = "user-event"
  registry_arn      = aws_glue_registry.streaming.arn
  data_format       = "AVRO"
  compatibility     = "BACKWARD"

  schema_definition = jsonencode({
    type      = "record"
    name      = "UserEvent"
    namespace = "com.${var.project_name}.events"
    fields = [
      { name = "userId", type = "string" },
      { name = "eventType", type = "string" },
      { name = "timestamp", type = "long" },
      { name = "properties", type = { type = "map", values = "string" } }
    ]
  })
}
```

## Apache Flink for Stream Processing

Amazon Managed Service for Apache Flink processes the streaming data in real time.

```hcl
# flink.tf - Managed Apache Flink
resource "aws_s3_bucket" "flink_apps" {
  bucket = "${var.project_name}-flink-applications"
}

resource "aws_s3_object" "flink_app" {
  bucket = aws_s3_bucket.flink_apps.id
  key    = "apps/stream-processor-${var.app_version}.jar"
  source = var.flink_jar_path
}

resource "aws_kinesisanalyticsv2_application" "stream_processor" {
  name                   = "${var.project_name}-stream-processor"
  runtime_environment    = "FLINK-1_18"
  service_execution_role = aws_iam_role.flink.arn

  application_configuration {
    application_code_configuration {
      code_content {
        s3_content_location {
          bucket_arn = aws_s3_bucket.flink_apps.arn
          file_key   = aws_s3_object.flink_app.key
        }
      }
      code_content_type = "ZIPFILE"
    }

    flink_application_configuration {
      checkpoint_configuration {
        configuration_type = "CUSTOM"
        checkpointing_enabled = true
        checkpoint_interval   = 60000  # 1 minute
        min_pause_between_checkpoints = 30000
      }

      monitoring_configuration {
        configuration_type = "CUSTOM"
        metrics_level      = "TASK"
        log_level          = "INFO"
      }

      parallelism_configuration {
        configuration_type   = "CUSTOM"
        parallelism          = 4
        parallelism_per_kpu  = 1
        auto_scaling_enabled = true
      }
    }

    environment_properties {
      property_group {
        property_group_id = "KafkaSource"
        property_map = {
          "bootstrap.servers" = aws_msk_cluster.main.bootstrap_brokers_tls
          "group.id"          = "flink-stream-processor"
          "topic"             = "orders"
        }
      }

      property_group {
        property_group_id = "KafkaSink"
        property_map = {
          "bootstrap.servers" = aws_msk_cluster.main.bootstrap_brokers_tls
          "topic"             = "processed-orders"
        }
      }
    }

    vpc_configuration {
      subnet_ids         = var.private_subnet_ids
      security_group_ids = [aws_security_group.flink.id]
    }
  }

  cloudwatch_logging_options {
    log_stream_arn = aws_cloudwatch_log_stream.flink.arn
  }

  tags = {
    Platform = var.project_name
    Purpose  = "StreamProcessing"
  }
}
```

## Kinesis Data Firehose for Delivery

Firehose delivers processed data to S3 for long-term storage and analytics.

```hcl
# firehose.tf - Data delivery to S3
resource "aws_kinesis_firehose_delivery_stream" "to_s3" {
  name        = "${var.project_name}-to-s3"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.data_lake.arn
    prefix     = "streaming/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"

    error_output_prefix = "errors/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/!{firehose:error-output-type}/"

    buffering_size     = 128 # MB
    buffering_interval = 300 # seconds

    # Convert to Parquet for efficient querying
    data_format_conversion_configuration {
      enabled = true

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
        database_name = aws_glue_catalog_database.streaming.name
        table_name    = "streaming_events"
        role_arn      = aws_iam_role.firehose.arn
      }
    }

    # Enable compression
    compression_format = "UNCOMPRESSED" # Parquet handles its own compression

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = "S3Delivery"
    }
  }

  tags = {
    Platform = var.project_name
    Purpose  = "DataDelivery"
  }
}
```

## Monitoring and Alerting

Kafka has specific metrics you need to watch for healthy operation.

```hcl
# monitoring.tf - Streaming platform monitoring
resource "aws_cloudwatch_metric_alarm" "consumer_lag" {
  alarm_name          = "${var.project_name}-consumer-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MaxOffsetLag"
  namespace           = "AWS/Kafka"
  period              = 300
  statistic           = "Maximum"
  threshold           = 10000

  dimensions = {
    "Cluster Name"   = aws_msk_cluster.main.cluster_name
    "Consumer Group" = "flink-stream-processor"
  }

  alarm_actions = [var.alert_sns_topic_arn]
  alarm_description = "Kafka consumer lag is high - processing may be falling behind"
}

resource "aws_cloudwatch_metric_alarm" "disk_usage" {
  alarm_name          = "${var.project_name}-kafka-disk-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "KafkaDataLogsDiskUsed"
  namespace           = "AWS/Kafka"
  period              = 300
  statistic           = "Maximum"
  threshold           = 80 # percent

  dimensions = {
    "Cluster Name" = aws_msk_cluster.main.cluster_name
  }

  alarm_actions = [var.alert_sns_topic_arn]
  alarm_description = "Kafka broker disk usage above 80%"
}
```

## Summary

A streaming data platform built with Terraform gives you a reliable, scalable system for real-time data processing. MSK provides the Kafka backbone, Schema Registry ensures data compatibility, Flink handles complex stream processing, and Firehose delivers data to storage for long-term analytics.

The critical monitoring points are consumer lag (which tells you if processing is keeping up), broker disk usage, and Flink checkpoint duration. Set up alerts for these from the start.

For comprehensive monitoring of your streaming platform, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) can help you track throughput, latency, and error rates across all components of your streaming pipeline.

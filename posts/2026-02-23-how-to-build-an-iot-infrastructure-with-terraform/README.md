# How to Build an IoT Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, IoT, AWS IoT Core, Sensors, Edge Computing

Description: Learn how to build a scalable IoT infrastructure with Terraform including device provisioning, message routing, data processing pipelines, and device monitoring.

---

IoT projects have a reputation for being hard to manage at scale. You start with a handful of sensors and a simple MQTT broker, and before you know it, you have thousands of devices sending millions of messages per day. The infrastructure needs to handle device provisioning, secure communication, message routing, data processing, and device monitoring. Terraform makes it possible to define all of this in code and scale it reliably.

## Why Terraform for IoT?

IoT infrastructure involves dozens of interconnected services. IoT Core for device communication, Lambda for message processing, Kinesis for streaming, DynamoDB for device state, S3 for data lakes. Connecting these manually through the console is tedious and impossible to reproduce. With Terraform, you define the entire pipeline once and deploy it consistently across environments.

## Architecture Overview

Our IoT infrastructure includes:

- AWS IoT Core for device management and MQTT
- IoT rules for message routing
- Kinesis Data Streams for high-throughput ingestion
- Lambda for real-time processing
- DynamoDB for device shadows and state
- S3 for long-term data storage
- CloudWatch for device monitoring

## IoT Core Setup

Configure the IoT Core endpoint, thing types, and policies.

```hcl
# IoT thing type for temperature sensors
resource "aws_iot_thing_type" "temperature_sensor" {
  name = "TemperatureSensor"

  properties {
    description           = "Industrial temperature sensor"
    searchable_attributes = ["location", "firmware_version", "model"]
  }
}

# IoT thing type for humidity sensors
resource "aws_iot_thing_type" "humidity_sensor" {
  name = "HumiditySensor"

  properties {
    description           = "Environmental humidity sensor"
    searchable_attributes = ["location", "firmware_version"]
  }
}

# IoT policy for device communication
resource "aws_iot_policy" "device_policy" {
  name = "device-communication-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["iot:Connect"]
        Resource = "arn:aws:iot:${var.region}:${data.aws_caller_identity.current.account_id}:client/$${iot:Connection.Thing.ThingName}"
      },
      {
        Effect   = "Allow"
        Action   = ["iot:Publish"]
        Resource = [
          "arn:aws:iot:${var.region}:${data.aws_caller_identity.current.account_id}:topic/devices/$${iot:Connection.Thing.ThingName}/telemetry",
          "arn:aws:iot:${var.region}:${data.aws_caller_identity.current.account_id}:topic/devices/$${iot:Connection.Thing.ThingName}/status",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["iot:Subscribe"]
        Resource = "arn:aws:iot:${var.region}:${data.aws_caller_identity.current.account_id}:topicfilter/devices/$${iot:Connection.Thing.ThingName}/commands/*"
      },
      {
        Effect   = "Allow"
        Action   = ["iot:Receive"]
        Resource = "arn:aws:iot:${var.region}:${data.aws_caller_identity.current.account_id}:topic/devices/$${iot:Connection.Thing.ThingName}/commands/*"
      },
      {
        Effect   = "Allow"
        Action   = [
          "iot:GetThingShadow",
          "iot:UpdateThingShadow",
        ]
        Resource = "arn:aws:iot:${var.region}:${data.aws_caller_identity.current.account_id}:thing/$${iot:Connection.Thing.ThingName}"
      }
    ]
  })
}
```

## Device Provisioning

Set up fleet provisioning so devices can register themselves securely.

```hcl
# Provisioning template for automated device registration
resource "aws_iot_provisioning_template" "device" {
  name                  = "device-provisioning"
  description           = "Template for provisioning new IoT devices"
  provisioning_role_arn = aws_iam_role.iot_provisioning.arn
  enabled               = true

  template_body = jsonencode({
    Parameters = {
      ThingName = { Type = "String" }
      SerialNumber = { Type = "String" }
      Location = { Type = "String" }
      DeviceType = { Type = "String" }
    }
    Resources = {
      thing = {
        Type = "AWS::IoT::Thing"
        Properties = {
          ThingName = { Ref = "ThingName" }
          ThingTypeName = { Ref = "DeviceType" }
          AttributePayload = {
            version = "v1"
            serialNumber = { Ref = "SerialNumber" }
            location = { Ref = "Location" }
          }
          ThingGroups = ["AllDevices"]
        }
      }
      certificate = {
        Type = "AWS::IoT::Certificate"
        Properties = {
          CertificateId = { Ref = "AWS::IoT::Certificate::Id" }
          Status = "Active"
        }
      }
      policy = {
        Type = "AWS::IoT::Policy"
        Properties = {
          PolicyName = aws_iot_policy.device_policy.name
        }
      }
    }
  })
}

# Thing group for organizing devices
resource "aws_iot_thing_group" "all_devices" {
  name = "AllDevices"

  properties {
    description = "All registered IoT devices"
  }
}

resource "aws_iot_thing_group" "production_floor" {
  name = "ProductionFloor"

  parent_group_name = aws_iot_thing_group.all_devices.name

  properties {
    description = "Devices on the production floor"
  }
}
```

## Message Routing with IoT Rules

IoT rules route messages to different AWS services based on content.

```hcl
# Rule to send telemetry data to Kinesis for high-throughput processing
resource "aws_iot_topic_rule" "telemetry_to_kinesis" {
  name        = "telemetry_to_kinesis"
  enabled     = true
  sql         = "SELECT *, topic(2) as deviceId, timestamp() as ingestTime FROM 'devices/+/telemetry'"
  sql_version = "2016-03-23"

  kinesis {
    stream_name = aws_kinesis_stream.telemetry.name
    role_arn    = aws_iam_role.iot_rules.arn
    partition_key = "$${topic(2)}"
  }

  # Dead letter action for failed deliveries
  error_action {
    s3 {
      bucket_name = aws_s3_bucket.iot_errors.id
      key         = "errors/telemetry/$${timestamp()}"
      role_arn    = aws_iam_role.iot_rules.arn
    }
  }
}

# Rule to process alerts in real-time with Lambda
resource "aws_iot_topic_rule" "alerts" {
  name        = "device_alerts"
  enabled     = true
  sql         = "SELECT * FROM 'devices/+/telemetry' WHERE temperature > 80 OR humidity > 95"
  sql_version = "2016-03-23"

  lambda {
    function_arn = aws_lambda_function.alert_processor.arn
  }

  sns {
    target_arn = aws_sns_topic.device_alerts.arn
    role_arn   = aws_iam_role.iot_rules.arn
    message_format = "JSON"
  }
}

# Rule to store device status in DynamoDB
resource "aws_iot_topic_rule" "status_to_dynamodb" {
  name        = "device_status"
  enabled     = true
  sql         = "SELECT *, topic(2) as deviceId FROM 'devices/+/status'"
  sql_version = "2016-03-23"

  dynamodbv2 {
    role_arn  = aws_iam_role.iot_rules.arn
    put_item {
      table_name = aws_dynamodb_table.device_status.name
    }
  }
}

# Rule to archive all data to S3
resource "aws_iot_topic_rule" "archive" {
  name        = "archive_all_data"
  enabled     = true
  sql         = "SELECT * FROM 'devices/#'"
  sql_version = "2016-03-23"

  s3 {
    bucket_name = aws_s3_bucket.iot_data_lake.id
    key         = "raw/$${topic()}/$${timestamp()}.json"
    role_arn    = aws_iam_role.iot_rules.arn
  }
}
```

## Data Processing Pipeline

Use Kinesis for high-throughput telemetry processing.

```hcl
# Kinesis stream for telemetry data
resource "aws_kinesis_stream" "telemetry" {
  name             = "iot-telemetry"
  shard_count      = 4
  retention_period = 24  # hours

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  encryption_type = "KMS"
  kms_key_id      = "alias/aws/kinesis"

  tags = {
    Environment = var.environment
  }
}

# Lambda consumer for Kinesis
resource "aws_lambda_function" "telemetry_processor" {
  filename         = "telemetry_processor.zip"
  function_name    = "iot-telemetry-processor"
  role             = aws_iam_role.telemetry_lambda.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      DEVICE_STATUS_TABLE = aws_dynamodb_table.device_status.name
      METRICS_TABLE       = aws_dynamodb_table.device_metrics.name
      ALERT_TOPIC_ARN     = aws_sns_topic.device_alerts.arn
    }
  }
}

# Kinesis event source mapping
resource "aws_lambda_event_source_mapping" "telemetry" {
  event_source_arn  = aws_kinesis_stream.telemetry.arn
  function_name     = aws_lambda_function.telemetry_processor.arn
  starting_position = "LATEST"
  batch_size        = 100

  maximum_batching_window_in_seconds = 5
  parallelization_factor             = 2
}
```

## Device State Storage

DynamoDB stores current device status and historical metrics.

```hcl
# Device status table - current state
resource "aws_dynamodb_table" "device_status" {
  name         = "device-status"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "deviceId"

  attribute {
    name = "deviceId"
    type = "S"
  }

  attribute {
    name = "location"
    type = "S"
  }

  global_secondary_index {
    name            = "location-index"
    hash_key        = "location"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "lastSeenTtl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

# S3 data lake for long-term storage
resource "aws_s3_bucket" "iot_data_lake" {
  bucket = "company-iot-data-lake-${var.environment}"
}

resource "aws_s3_bucket_lifecycle_configuration" "iot_data" {
  bucket = aws_s3_bucket.iot_data_lake.id

  rule {
    id     = "archive-old-data"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 730  # 2 years
    }
  }
}
```

## Monitoring and Alerting

Monitor device connectivity, message throughput, and rule failures.

```hcl
# SNS topic for device alerts
resource "aws_sns_topic" "device_alerts" {
  name = "iot-device-alerts"
}

# Alarm for rule action failures
resource "aws_cloudwatch_metric_alarm" "rule_failures" {
  alarm_name          = "iot-rule-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RuleActionFailure"
  namespace           = "AWS/IoT"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_actions       = [aws_sns_topic.device_alerts.arn]
}

# Alarm for disconnected devices
resource "aws_cloudwatch_metric_alarm" "disconnected_devices" {
  alarm_name          = "high-device-disconnections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Connect.AuthError"
  namespace           = "AWS/IoT"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_actions       = [aws_sns_topic.device_alerts.arn]
}
```

## Wrapping Up

IoT infrastructure involves a unique combination of device management, secure communication, real-time data processing, and long-term storage. Terraform makes it possible to define all these interconnected services in code, version them, and deploy them consistently.

The key design decisions are: use IoT Core policies to limit devices to their own topics, route messages with IoT rules to the right processing pipeline, use Kinesis for high-throughput telemetry, and archive everything to S3 for historical analysis.

For monitoring your IoT fleet health, tracking device connectivity, and alerting on anomalies, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-iot-infrastructure-with-terraform/view) for comprehensive IoT infrastructure observability.

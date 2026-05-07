# How to Create AWS IoT Core Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IoT Core, IoT Rules, Data Pipeline, Infrastructure as Code

Description: Learn how to create AWS IoT Core rules to route device messages to DynamoDB, Lambda, S3, and SNS using OpenTofu.

## Introduction

AWS IoT Core rules engine evaluates SQL-like queries on incoming MQTT messages and routes them to AWS services. OpenTofu manages rules and their action configurations as code.

## Routing to DynamoDB

```hcl
resource "aws_iot_topic_rule" "store_telemetry" {
  name        = "${replace(var.app_name, "-", "_")}_store_telemetry"
  description = "Store device telemetry in DynamoDB"
  enabled     = true
  sql         = "SELECT *, topic(2) as device_id, timestamp() as received_at FROM 'sensors/+/telemetry'"
  sql_version = "2016-03-23"

  dynamodbv2 {
    role_arn = aws_iam_role.iot_rules.arn

    put_item {
      table_name = aws_dynamodb_table.telemetry.name
    }
  }

  error_action {
    sqs {
      role_arn      = aws_iam_role.iot_rules.arn
      queue_url     = aws_sqs_queue.iot_errors.url
      use_base64    = false
    }
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Routing to Lambda

```hcl
resource "aws_iot_topic_rule" "process_alerts" {
  name        = "${replace(var.app_name, "-", "_")}_process_alerts"
  description = "Invoke Lambda for high-temperature alerts"
  enabled     = true
  sql         = "SELECT * FROM 'sensors/+/telemetry' WHERE temperature > 80"
  sql_version = "2016-03-23"

  lambda {
    function_arn = aws_lambda_function.alert_processor.arn
  }
}

# Grant IoT permission to invoke Lambda

resource "aws_lambda_permission" "iot_invoke" {
  statement_id  = "AllowIoTInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alert_processor.function_name
  principal     = "iot.amazonaws.com"
  source_arn    = aws_iot_topic_rule.process_alerts.arn
}
```

## Routing to S3

```hcl
resource "aws_iot_topic_rule" "archive_to_s3" {
  name        = "${replace(var.app_name, "-", "_")}_archive"
  description = "Archive device data messages to S3"
  enabled     = true
  sql         = "SELECT * FROM 'devices/+/data'"
  sql_version = "2016-03-23"

  s3 {
    bucket_name = aws_s3_bucket.iot_archive.bucket
    key         = "year=$${parse_time('yyyy', timestamp(), 'UTC')}/month=$${parse_time('MM', timestamp(), 'UTC')}/day=$${parse_time('dd', timestamp(), 'UTC')}/$${topic(2)}-$${timestamp()}.json"
    role_arn    = aws_iam_role.iot_rules.arn
  }
}
```

## Routing to SNS

```hcl
resource "aws_iot_topic_rule" "notify_on_error" {
  name        = "${replace(var.app_name, "-", "_")}_notify_error"
  enabled     = true
  sql         = "SELECT * FROM 'devices/+/error'"
  sql_version = "2016-03-23"

  sns {
    message_format = "JSON"
    role_arn       = aws_iam_role.iot_rules.arn
    target_arn     = aws_sns_topic.device_alerts.arn
  }
}
```

## IAM Role for IoT Rules

```hcl
resource "aws_iam_role" "iot_rules" {
  name = "${var.app_name}-iot-rules-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "iot.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "iot_rules" {
  role = aws_iam_role.iot_rules.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = aws_dynamodb_table.telemetry.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.iot_archive.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.device_alerts.arn
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.iot_errors.arn
      }
    ]
  })
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

AWS IoT Core rules engine provides SQL-based message routing to AWS services. OpenTofu manages rules, actions (DynamoDB, Lambda, S3, SNS), error actions, and IAM roles - creating a complete IoT data pipeline as code.

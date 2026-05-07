# How to Create AWS SES Configuration Sets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SES, Email, Configuration Sets, Infrastructure as Code

Description: Learn how to create AWS SES configuration sets with event destinations for tracking email sends, bounces, complaints, and deliveries using OpenTofu.

## Introduction

SES Configuration Sets let you apply rules to a group of emails you send, including event tracking (bounces, complaints, opens, clicks) and IP pool assignment. Managing them with OpenTofu ensures consistent email observability configuration.

## Creating a Configuration Set

```hcl
# Base configuration set

resource "aws_ses_configuration_set" "transactional" {
  name = "transactional-emails"

  # Publish configuration set reputation metrics such as bounce and complaint rates
  reputation_metrics_enabled = true

  # Keep sending enabled for emails that use this configuration set
  sending_enabled = true

  delivery_options {
    tls_policy = "Require"  # enforce TLS for all outgoing messages
  }
}
```

## Adding an SNS Event Destination

Route email events (bounces, complaints, deliveries) to an SNS topic for processing.

```hcl
resource "aws_ses_event_destination" "sns" {
  name                   = "sns-event-destination"
  configuration_set_name = aws_ses_configuration_set.transactional.name
  enabled                = true

  # Which events to capture
  matching_types = [
    "send",
    "bounce",
    "complaint",
    "delivery",
    "reject"
  ]

  sns_destination {
    topic_arn = aws_sns_topic.ses_events.arn
  }
}

resource "aws_sns_topic" "ses_events" {
  name = "ses-email-events"
}
```

## Adding a CloudWatch Event Destination

Publish email metrics directly to CloudWatch for dashboards and alarms.

```hcl
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "cloudwatch-event-destination"
  configuration_set_name = aws_ses_configuration_set.transactional.name
  enabled                = true

  matching_types = ["bounce", "complaint"]

  cloudwatch_destination {
    default_value  = "0"
    dimension_name = "MessageTag"
    value_source   = "messageTag"  # use message tag values as dimension values
  }
}
```

## Adding an Amazon Data Firehose Destination

Stream all email events to S3 via an existing Amazon Data Firehose delivery stream for long-term analytics.

```hcl
resource "aws_ses_event_destination" "firehose" {
  name                   = "firehose-event-destination"
  configuration_set_name = aws_ses_configuration_set.transactional.name
  enabled                = true

  matching_types = ["send", "bounce", "complaint", "delivery", "open", "click"]

  kinesis_destination {
    stream_arn = aws_kinesis_firehose_delivery_stream.ses_events.arn
    role_arn   = aws_iam_role.ses_firehose.arn
  }
}
```

## IAM Role for Firehose

```hcl
resource "aws_iam_role" "ses_firehose" {
  name = "ses-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ses.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ses_firehose" {
  role = aws_iam_role.ses_firehose.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["firehose:PutRecord", "firehose:PutRecordBatch"]
      Resource = aws_kinesis_firehose_delivery_stream.ses_events.arn
    }]
  })
}
```

## Outputs

```hcl
output "configuration_set_name" {
  description = "Name to use in SendEmail API calls"
  value       = aws_ses_configuration_set.transactional.name
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

SES configuration sets enable rich email observability by routing events to SNS, CloudWatch, or Amazon Data Firehose. OpenTofu lets you manage these configuration sets and their destinations as code, making it easy to replicate your email tracking setup across environments.

# How to Create CloudWatch Synthetics Canaries in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, Synthetics, Monitoring, Infrastructure as Code

Description: Learn how to create CloudWatch Synthetics canaries using Terraform to continuously test your APIs and websites from multiple locations.

---

CloudWatch Synthetics canaries are automated scripts that run on a schedule to monitor your endpoints and APIs. They simulate user interactions, test API endpoints, and verify that your applications are working correctly, even when no real users are accessing them. This guide shows you how to create and manage Synthetics canaries with Terraform.

## Understanding Synthetics Canaries

A canary is a Lambda function that runs on a schedule and performs synthetic monitoring. Canaries can check website availability, test API responses, monitor multi-step workflows, and capture screenshots. They run from AWS-managed infrastructure and report results to CloudWatch.

## Setting Up the Foundation

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# S3 bucket for canary artifacts (screenshots and logs)
resource "aws_s3_bucket" "canary_artifacts" {
  bucket = "synthetics-canary-artifacts-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "canary_cleanup" {
  bucket = aws_s3_bucket.canary_artifacts.id

  rule {
    id     = "cleanup-old-artifacts"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

data "aws_caller_identity" "current" {}
```

## Creating the IAM Role

```hcl
# IAM role for the canary execution
resource "aws_iam_role" "canary" {
  name = "synthetics-canary-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Attach the canary execution policy
resource "aws_iam_role_policy" "canary" {
  name = "synthetics-canary-policy"
  role = aws_iam_role.canary.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.canary_artifacts.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.canary_artifacts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "CloudWatchSynthetics"
          }
        }
      }
    ]
  })
}
```

## Simple Heartbeat Canary

The simplest canary checks if a URL is reachable:

```hcl
# Create a heartbeat canary that checks a URL
resource "aws_synthetics_canary" "heartbeat" {
  name                 = "website-heartbeat"
  artifact_s3_location = "s3://${aws_s3_bucket.canary_artifacts.id}/heartbeat/"
  execution_role_arn   = aws_iam_role.canary.arn
  runtime_version      = "syn-nodejs-puppeteer-7.0"
  handler              = "heartbeat.handler"
  start_canary         = true

  schedule {
    expression = "rate(5 minutes)"
  }

  # Inline canary script
  zip_file = data.archive_file.heartbeat_canary.output_path

  run_config {
    timeout_in_seconds = 60
    memory_in_mb       = 960
  }
}

# Create the canary script
resource "local_file" "heartbeat_script" {
  filename = "${path.module}/canary-scripts/heartbeat/nodejs/node_modules/heartbeat.js"
  content  = <<-EOT
    const { URL } = require('url');
    const synthetics = require('Synthetics');
    const log = require('SyntheticsLogger');

    const heartbeatHandler = async function () {
      const urls = [
        '${var.website_url}',
      ];

      for (const url of urls) {
        log.info('Checking URL: ' + url);

        const page = await synthetics.getPage();

        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        if (response.status() !== 200) {
          throw new Error('Expected status 200, got ' + response.status());
        }

        log.info('URL ' + url + ' returned status ' + response.status());
        await synthetics.takeScreenshot('loaded', 'result');
      }
    };

    exports.handler = async () => {
      return await heartbeatHandler();
    };
  EOT
}

data "archive_file" "heartbeat_canary" {
  type        = "zip"
  source_dir  = "${path.module}/canary-scripts/heartbeat"
  output_path = "${path.module}/canary-scripts/heartbeat.zip"

  depends_on = [local_file.heartbeat_script]
}

variable "website_url" {
  type        = string
  description = "URL to monitor"
  default     = "https://example.com"
}
```

## API Canary

Test API endpoints and validate responses:

```hcl
# API testing canary
resource "aws_synthetics_canary" "api_test" {
  name                 = "api-health-check"
  artifact_s3_location = "s3://${aws_s3_bucket.canary_artifacts.id}/api-test/"
  execution_role_arn   = aws_iam_role.canary.arn
  runtime_version      = "syn-nodejs-puppeteer-7.0"
  handler              = "apitest.handler"
  start_canary         = true

  schedule {
    expression = "rate(5 minutes)"
  }

  zip_file = data.archive_file.api_canary.output_path

  run_config {
    timeout_in_seconds    = 120
    memory_in_mb          = 960
    environment_variables = {
      API_ENDPOINT = var.api_endpoint
    }
  }
}

variable "api_endpoint" {
  type    = string
  default = "https://api.example.com"
}
```

## Setting Up Alarms for Canary Results

```hcl
# Alarm when canary fails
resource "aws_cloudwatch_metric_alarm" "canary_failure" {
  alarm_name          = "canary-failure-heartbeat"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "Website heartbeat canary is failing"
  alarm_actions       = [aws_sns_topic.canary_alerts.arn]
  ok_actions          = [aws_sns_topic.canary_alerts.arn]

  dimensions = {
    CanaryName = aws_synthetics_canary.heartbeat.name
  }
}

# Alarm for canary duration (slow responses)
resource "aws_cloudwatch_metric_alarm" "canary_duration" {
  alarm_name          = "canary-slow-heartbeat"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 10000  # 10 seconds
  alarm_description   = "Website is responding slowly"
  alarm_actions       = [aws_sns_topic.canary_alerts.arn]

  dimensions = {
    CanaryName = aws_synthetics_canary.heartbeat.name
  }
}

resource "aws_sns_topic" "canary_alerts" {
  name = "canary-alert-notifications"
}
```

## Multiple Endpoint Monitoring

```hcl
# Monitor multiple endpoints using for_each
variable "endpoints" {
  type = map(object({
    url      = string
    interval = string
  }))
  default = {
    "homepage" = { url = "https://example.com", interval = "rate(5 minutes)" }
    "api"      = { url = "https://api.example.com/health", interval = "rate(1 minute)" }
    "login"    = { url = "https://example.com/login", interval = "rate(5 minutes)" }
    "dashboard" = { url = "https://example.com/dashboard", interval = "rate(10 minutes)" }
  }
}
```

## Best Practices

Run canaries from the same region as your users to get realistic latency measurements. Set canary timeouts longer than your expected response time but short enough to catch real issues. Store canary artifacts in S3 with a lifecycle policy to control storage costs. Create alarms on both success rate and duration metrics. Use VPC-attached canaries when testing internal endpoints. Schedule critical endpoint checks at least every 5 minutes.

For comprehensive monitoring alongside synthetic checks, see our guide on [creating uptime monitors](https://oneuptime.com/blog/post/2026-02-23-how-to-create-uptime-monitors-with-terraform/view).

## Conclusion

CloudWatch Synthetics canaries managed through Terraform provide proactive monitoring that does not depend on real user traffic. By simulating user interactions, testing API endpoints, and monitoring multi-step workflows, you catch issues before they affect users. Combined with CloudWatch alarms and SNS notifications, synthetic monitoring gives you confidence that your applications are working correctly around the clock.

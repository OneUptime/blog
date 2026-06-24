# How to Create CloudWatch Synthetics Canaries with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, CloudWatch Synthetics, Canaries, Synthetic Monitoring, Availability, Infrastructure as Code

Description: Learn how to create CloudWatch Synthetics Canaries with OpenTofu to continuously test API endpoints and website availability from multiple AWS regions, detecting outages before users do.

## Introduction

CloudWatch Synthetics Canaries run synthetic tests against API endpoints and websites on a configurable schedule, recording screenshots, response times, and status codes. They detect availability issues even when no real user traffic is hitting an endpoint, and can run from multiple regions to test global availability.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with CloudWatch Synthetics, S3, and IAM permissions
- An S3 bucket for canary artifacts (screenshots, logs)

## Step 1: Create S3 Bucket for Canary Artifacts

```hcl
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "canary_artifacts" {
  bucket = "${var.project_name}-canary-artifacts-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.project_name}-canary-artifacts"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "canary_artifacts" {
  bucket = aws_s3_bucket.canary_artifacts.id

  rule {
    id     = "expire-artifacts"
    status = "Enabled"

    expiration {
      days = 30  # Retain canary artifacts for 30 days
    }
  }
}
```

## Step 2: Create IAM Role for Canary

```hcl
resource "aws_iam_role" "canary" {
  name = "${var.project_name}-canary-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "canary" {
  name = "canary-policy"
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
        Resource = ["${aws_s3_bucket.canary_artifacts.arn}/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation"
        ]
        Resource = [aws_s3_bucket.canary_artifacts.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListAllMyBuckets"
        ]
        Resource = "*"
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
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:CreateLogGroup"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["xray:PutTraceSegments"]
        Resource = "*"
      }
    ]
  })
}
```

## Step 3: Create API Canary

```hcl
resource "aws_synthetics_canary" "api_health" {
  name                 = "${var.project_name}-api-health"
  artifact_s3_location = "s3://${aws_s3_bucket.canary_artifacts.id}/api-health/"
  execution_role_arn   = aws_iam_role.canary.arn
  handler              = "apiCanary.handler"
  zip_file             = "api_canary.zip"  # ZIP containing nodejs/node_modules/apiCanary.js
  runtime_version      = "syn-nodejs-puppeteer-15.0"

  schedule {
    expression          = "rate(5 minutes)"  # Run every 5 minutes
    duration_in_seconds = 0  # Run indefinitely
  }

  run_config {
    timeout_in_seconds = 60
    memory_in_mb       = 960
    active_tracing     = true  # Enable X-Ray tracing
  }

  success_retention_period = 2   # Retain 2 days of successful runs
  failure_retention_period = 14  # Retain 14 days of failed runs

  start_canary = true  # Start the canary after creation

  tags = {
    Name = "${var.project_name}-api-health"
  }
}
```

## Step 4: Canary Script

```javascript
// nodejs/node_modules/apiCanary.js
const synthetics = require('@aws/synthetics-puppeteer');
const log = require('@aws/synthetics-logger');

const apiCanaryBlueprint = async function () {
  const requestOptions = {
    hostname: 'api.example.com',
    method: 'GET',
    path: '/health',
    port: 443,
    protocol: 'https:'
  };

  await synthetics.executeHttpStep('Verify /health endpoint', requestOptions, async (response) => {
    return new Promise((resolve, reject) => {
      let responseBody = '';

      response.on('data', (chunk) => {
        responseBody += chunk;
      });

      response.on('end', () => {
        try {
          if (response.statusCode !== 200) {
            reject(new Error(`Health check failed: ${response.statusCode}`));
            return;
          }

          const body = JSON.parse(responseBody);
          if (body.status !== 'healthy') {
            reject(new Error(`Service unhealthy: ${body.status}`));
            return;
          }

          log.info('Health check passed');
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      response.on('error', (error) => {
        reject(error);
      });
    });
  });
};

exports.handler = async () => {
  return await apiCanaryBlueprint();
};
```

## Step 5: Create Alarm on Canary Failures

```hcl
resource "aws_cloudwatch_metric_alarm" "canary_failed" {
  alarm_name          = "${var.project_name}-canary-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "SuccessPercent"
  namespace           = "CloudWatchSynthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 80  # Alert if success rate drops below 80%

  dimensions = {
    CanaryName = aws_synthetics_canary.api_health.name
  }

  alarm_description = "API health check canary is failing"
  alarm_actions     = [var.sns_topic_arn]
}
```

## Step 6: Deploy

```bash
zip -r api_canary.zip nodejs/

tofu init
tofu plan
tofu apply

# View canary runs

aws synthetics describe-canaries-last-run \
  --names my-project-api-health
```

## Conclusion

Synthetics Canaries provide proactive availability monitoring that catches outages before users report them. Schedule canaries to match your SLO measurement intervals-every 5 minutes for P1 APIs, every 15-30 minutes for less critical endpoints. Store canary artifacts for at least 14 days for failure runs to enable post-incident investigation, and create CloudWatch alarms on the `SuccessPercent` metric to integrate canary failures into your existing alerting workflow.

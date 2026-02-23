# How to Use the Time Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Time Provider, Infrastructure as Code, Scheduling, Resource Management

Description: Learn how to use the Terraform time provider for managing time-based operations including offsets, rotations, sleep delays, and scheduled resource lifecycle management.

---

The time provider in Terraform manages time-based resources and operations. It provides resources for creating time offsets, rotating values on schedules, adding delays between resource creation, and working with timestamps. These capabilities are essential for certificate rotation, scheduled maintenance windows, staged deployments, and any infrastructure that has time-dependent behavior.

In this guide, we will explore every resource in the time provider. We will cover time_offset for date calculations, time_rotating for scheduled changes, time_sleep for deployment delays, and time_static for capturing timestamps.

## Installing the Time Provider

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## time_static - Capturing a Point in Time

The time_static resource captures the current time when first created and preserves it in state:

```hcl
# time-static.tf - Capture creation timestamps
resource "time_static" "created" {}

output "creation_time" {
  value = time_static.created.rfc3339
  # Example: "2026-02-23T15:30:00Z"
}

# Use with keepers to track when specific changes occurred
resource "time_static" "last_deployment" {
  triggers = {
    app_version = var.app_version
  }
}

variable "app_version" {
  type    = string
  default = "2.0.0"
}

# Tag resources with creation and deployment timestamps
locals {
  time_tags = {
    CreatedAt  = time_static.created.rfc3339
    DeployedAt = time_static.last_deployment.rfc3339
  }
}
```

## time_offset - Calculating Future and Past Dates

The time_offset resource calculates a time relative to the base time:

```hcl
# time-offset.tf - Calculate relative timestamps
resource "time_offset" "one_year_from_now" {
  offset_years = 1
}

resource "time_offset" "thirty_days_from_now" {
  offset_days = 30
}

resource "time_offset" "six_months_ago" {
  offset_months = -6
}

output "dates" {
  value = {
    now           = time_offset.one_year_from_now.base_rfc3339
    one_year      = time_offset.one_year_from_now.rfc3339
    thirty_days   = time_offset.thirty_days_from_now.rfc3339
    six_months_ago = time_offset.six_months_ago.rfc3339
  }
}

# Practical use: Set certificate expiration dates
resource "time_offset" "cert_expiry" {
  offset_days = 365  # Certificate valid for one year
}
```

## time_rotating - Triggering Periodic Changes

The time_rotating resource creates a timestamp that updates on a schedule:

```hcl
# time-rotating.tf - Schedule periodic rotations
resource "time_rotating" "monthly" {
  rotation_days = 30
}

resource "time_rotating" "weekly" {
  rotation_days = 7
}

resource "time_rotating" "quarterly" {
  rotation_days = 90
}

# Use rotation to trigger password changes
resource "random_password" "database" {
  length  = 32
  special = true

  keepers = {
    rotation = time_rotating.monthly.id
  }
}

# Use rotation for certificate renewal
resource "time_rotating" "cert_rotation" {
  rotation_days = 60  # Rotate certificates every 60 days
}
```

## time_sleep - Adding Delays Between Resources

The time_sleep resource introduces a wait period during resource creation:

```hcl
# time-sleep.tf - Wait between resource operations
resource "aws_iam_role" "app" {
  name = "app-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Wait for IAM role propagation before using it
resource "time_sleep" "iam_propagation" {
  depends_on = [aws_iam_role.app]

  create_duration = "30s"

  # Optionally wait on destroy too
  destroy_duration = "10s"
}

# Lambda function that depends on the IAM role being propagated
resource "aws_lambda_function" "app" {
  depends_on = [time_sleep.iam_propagation]

  function_name = "app-${var.environment}"
  role          = aws_iam_role.app.arn
  runtime       = "python3.11"
  handler       = "handler.handler"
  filename      = "${path.module}/lambda.zip"
}
```

## Combining Time Resources

```hcl
# combined.tf - Using multiple time resources together
# Track when the infrastructure was created
resource "time_static" "infrastructure_created" {}

# Calculate maintenance window (30 days from creation)
resource "time_offset" "maintenance_window" {
  base_rfc3339 = time_static.infrastructure_created.rfc3339
  offset_days  = 30
}

# Rotate secrets monthly
resource "time_rotating" "secret_rotation" {
  rotation_days = 30
}

output "infrastructure_timeline" {
  value = {
    created            = time_static.infrastructure_created.rfc3339
    maintenance_window = time_offset.maintenance_window.rfc3339
    next_rotation      = time_rotating.secret_rotation.rotation_rfc3339
  }
}
```

## Best Practices

When using the time provider, keep these guidelines in mind. Use time_static to capture immutable timestamps for auditing and compliance. Use time_rotating with keepers on other resources to implement rotation policies. Use time_sleep sparingly because it slows down your Terraform runs; only use it when there is a genuine propagation delay that cannot be solved with proper resource dependencies. Always be aware that time_offset calculations are based on the time of first creation, not the current time at each apply.

## Conclusion

The time provider fills an important gap in Terraform's utility toolkit. By providing time-based resources, it enables patterns like certificate rotation, scheduled maintenance windows, staged deployments with delays, and timestamp tracking that would otherwise require external scripting. For specific use cases, dive deeper into [time-based offsets](https://oneuptime.com/blog/post/2026-02-23-how-to-create-time-based-offsets-with-terraform/view), [rotating time resources](https://oneuptime.com/blog/post/2026-02-23-how-to-create-rotating-time-resources-with-terraform/view), and [sleep resources](https://oneuptime.com/blog/post/2026-02-23-how-to-create-time-based-sleep-resources-with-terraform/view).

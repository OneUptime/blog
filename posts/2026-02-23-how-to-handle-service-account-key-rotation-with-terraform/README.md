# How to Handle Service Account Key Rotation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, AWS, Security, Service Accounts, Key Rotation, Infrastructure as Code

Description: Learn how to implement automated service account key rotation using Terraform to maintain security and reduce the risk of compromised credentials.

---

Service account keys are a common authentication mechanism for applications and automated processes. However, long-lived keys pose a significant security risk if they are compromised. Regularly rotating these keys reduces your exposure window. This guide shows you how to implement automated key rotation patterns using Terraform across AWS and GCP.

## Why Key Rotation Matters

Static credentials that never change become increasingly dangerous over time. They might be accidentally committed to version control, logged in plaintext, or stored on developer machines. Key rotation ensures that even if a key is leaked, it has a limited useful lifetime.

## Setting Up the Providers

```hcl
# Configure providers for multi-cloud key rotation
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "google" {
  project = var.gcp_project_id
}

variable "gcp_project_id" {
  type = string
}
```

## Time-Based Key Rotation with the Time Provider

The Terraform time provider enables rotation schedules:

```hcl
# Create a rotating time resource that triggers every 90 days
resource "time_rotating" "key_rotation" {
  rotation_days = 90
}

# This resource tracks when to rotate
# When the rotation period expires, dependent resources will be recreated
output "next_rotation" {
  value = time_rotating.key_rotation.rotation_rfc3339
}
```

## Rotating AWS IAM Access Keys

```hcl
# Create an IAM user for a service
resource "aws_iam_user" "service" {
  name = "application-service"
  path = "/services/"
}

# Create an access key that rotates based on the time schedule
resource "aws_iam_access_key" "service" {
  user = aws_iam_user.service.name

  # This key will be recreated when the rotation period expires
  lifecycle {
    create_before_destroy = true
  }

  # Force recreation when rotation period expires
  depends_on = [time_rotating.key_rotation]
}

# Store the new key in AWS Secrets Manager
resource "aws_secretsmanager_secret" "service_key" {
  name                    = "service-access-key"
  recovery_window_in_days = 0

  # Allow immediate deletion for rotation
}

resource "aws_secretsmanager_secret_version" "service_key" {
  secret_id = aws_secretsmanager_secret.service_key.id

  secret_string = jsonencode({
    access_key_id     = aws_iam_access_key.service.id
    secret_access_key = aws_iam_access_key.service.secret
    rotation_date     = time_rotating.key_rotation.rotation_rfc3339
  })
}
```

## Implementing Dual-Key Rotation for Zero Downtime

The safest approach uses two keys simultaneously during the rotation window:

```hcl
# Track two rotation schedules offset by half the rotation period
resource "time_rotating" "primary_key" {
  rotation_days = 90
}

resource "time_rotating" "secondary_key" {
  rotation_days = 90
  # Offset by 45 days so keys overlap
  rfc3339 = timeadd(time_rotating.primary_key.rfc3339, "-1080h")
}

# Create primary access key
resource "aws_iam_access_key" "primary" {
  user = aws_iam_user.service.name

  lifecycle {
    create_before_destroy = true
  }
}

# Create secondary access key
resource "aws_iam_access_key" "secondary" {
  user = aws_iam_user.service.name

  lifecycle {
    create_before_destroy = true
  }
}

# Store both keys in Secrets Manager
resource "aws_secretsmanager_secret_version" "dual_keys" {
  secret_id = aws_secretsmanager_secret.service_key.id

  secret_string = jsonencode({
    primary = {
      access_key_id     = aws_iam_access_key.primary.id
      secret_access_key = aws_iam_access_key.primary.secret
    }
    secondary = {
      access_key_id     = aws_iam_access_key.secondary.id
      secret_access_key = aws_iam_access_key.secondary.secret
    }
  })
}
```

## Rotating GCP Service Account Keys

```hcl
# Create a GCP service account
resource "google_service_account" "app" {
  account_id   = "app-service-account"
  display_name = "Application Service Account"
  project      = var.gcp_project_id
}

# Create a key that rotates on schedule
resource "google_service_account_key" "app" {
  service_account_id = google_service_account.app.name
  key_algorithm      = "KEY_ALG_RSA_2048"

  # Use keepers to trigger rotation
  keepers = {
    rotation = time_rotating.key_rotation.id
  }
}

# Store the key in GCP Secret Manager
resource "google_secret_manager_secret" "sa_key" {
  secret_id = "app-service-account-key"
  project   = var.gcp_project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "sa_key" {
  secret = google_secret_manager_secret.sa_key.id

  # Store the base64-encoded private key
  secret_data = google_service_account_key.app.private_key
}
```

## Automated Rotation with Lambda (AWS)

For fully automated rotation without Terraform runs:

```hcl
# Create a Lambda function for automatic key rotation
resource "aws_lambda_function" "key_rotator" {
  function_name = "iam-key-rotator"
  runtime       = "python3.11"
  handler       = "index.handler"
  role          = aws_iam_role.key_rotator.arn

  filename         = "key-rotator.zip"
  source_code_hash = filebase64sha256("key-rotator.zip")

  environment {
    variables = {
      SECRET_NAME  = aws_secretsmanager_secret.service_key.name
      IAM_USERNAME = aws_iam_user.service.name
      MAX_KEY_AGE  = "90"
    }
  }
}

# IAM role for the Lambda function
resource "aws_iam_role" "key_rotator" {
  name = "iam-key-rotator-role"

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

# Grant the Lambda function permission to manage keys
resource "aws_iam_role_policy" "key_rotator" {
  name = "key-rotator-policy"
  role = aws_iam_role.key_rotator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:CreateAccessKey",
          "iam:DeleteAccessKey",
          "iam:ListAccessKeys",
          "iam:UpdateAccessKey"
        ]
        Resource = aws_iam_user.service.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecret"
        ]
        Resource = aws_secretsmanager_secret.service_key.arn
      }
    ]
  })
}

# Schedule the rotation Lambda to run daily
resource "aws_cloudwatch_event_rule" "key_rotation_schedule" {
  name                = "daily-key-rotation-check"
  description         = "Check for keys that need rotation"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "key_rotation" {
  rule      = aws_cloudwatch_event_rule.key_rotation_schedule.name
  target_id = "key-rotator"
  arn       = aws_lambda_function.key_rotator.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.key_rotator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.key_rotation_schedule.arn
}
```

## Monitoring Key Age

Track the age of your keys and alert when rotation is needed:

```hcl
# Create a CloudWatch alarm for old access keys
resource "aws_cloudwatch_metric_alarm" "old_keys" {
  alarm_name          = "iam-keys-need-rotation"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "KeyAge"
  namespace           = "Custom/IAM"
  period              = 86400
  statistic           = "Maximum"
  threshold           = 80
  alarm_description   = "IAM access keys are approaching rotation deadline"
  alarm_actions       = [aws_sns_topic.key_rotation_alerts.arn]
}

resource "aws_sns_topic" "key_rotation_alerts" {
  name = "key-rotation-alerts"
}
```

## Migrating Away from Keys

The best key rotation strategy is to eliminate keys entirely. Use Workload Identity Federation for GCP and IAM roles with instance profiles or OIDC for AWS:

```hcl
# Instead of access keys, use an IAM instance profile
resource "aws_iam_instance_profile" "app" {
  name = "app-instance-profile"
  role = aws_iam_role.app.name
}

resource "aws_iam_role" "app" {
  name = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}
```

## Best Practices

Prefer federation and temporary credentials over long-lived keys whenever possible. When keys are necessary, rotate them at least every 90 days. Use the dual-key pattern to avoid service interruptions during rotation. Store keys in a secrets manager rather than in environment variables or configuration files. Monitor key age and set up alerts before keys expire. Automate the entire rotation process so it does not depend on manual intervention.

For eliminating service account keys entirely, see our guide on [GCP IAM Workload Identity](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-iam-workload-identity-in-terraform/view).

## Conclusion

Service account key rotation is a critical security practice that Terraform makes manageable through time-based triggers, dual-key patterns, and integration with secrets managers. Whether you are rotating AWS access keys or GCP service account keys, the patterns in this guide help you maintain security without disrupting your services. The ultimate goal should be to migrate toward keyless authentication, but until that is possible, automated rotation is the next best approach.

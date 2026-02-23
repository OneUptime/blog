# How to Create Bedrock Model Invocation Profiles in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Bedrock, AI, Machine Learning, Generative AI, Infrastructure as Code

Description: Learn how to set up Amazon Bedrock model access, invocation logging, custom model imports, and guardrails using Terraform for production generative AI workloads.

---

Amazon Bedrock gives you access to foundation models from Anthropic, Meta, Cohere, and others through a unified API. Instead of hosting models yourself, you call an API and AWS handles the inference infrastructure. But before you can invoke any model, you need to configure model access, set up logging, and - for production - define guardrails to keep your AI applications safe.

Terraform support for Bedrock has matured significantly. You can now manage model access, invocation logging, custom model imports, provisioned throughput, and guardrails entirely through code. This post covers the practical setup you need to get Bedrock running in a controlled, auditable way.

## Enabling Model Access

Before invoking any model, you need to request access. This is done at the account level. While the initial model access request still requires the console for some models (due to EULA acceptance), you can manage the Terraform configuration around it:

```hcl
# Configure the AWS provider for Bedrock
# Bedrock is available in specific regions
provider "aws" {
  region = "us-east-1"
}

# Data source to list available foundation models
data "aws_bedrock_foundation_models" "available" {}

# Output the available models for reference
output "available_models" {
  value = data.aws_bedrock_foundation_models.available.model_summaries[*].model_id
}
```

Once you have model access enabled, the real infrastructure work begins with invocation logging, provisioned throughput, and guardrails.

## Invocation Logging

Invocation logging captures every request and response sent to Bedrock models. This is critical for compliance, debugging, and cost tracking:

```hcl
# S3 bucket for storing invocation logs
resource "aws_s3_bucket" "bedrock_logs" {
  bucket = "my-company-bedrock-invocation-logs"

  tags = {
    Purpose   = "Bedrock invocation logging"
    ManagedBy = "terraform"
  }
}

# Enable encryption on the logs bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "bedrock_logs" {
  bucket = aws_s3_bucket.bedrock_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.bedrock.arn
    }
  }
}

# Block public access to the logs bucket
resource "aws_s3_bucket_public_access_block" "bedrock_logs" {
  bucket = aws_s3_bucket.bedrock_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudWatch log group for Bedrock invocations
resource "aws_cloudwatch_log_group" "bedrock" {
  name              = "/aws/bedrock/invocations"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.bedrock.arn

  tags = {
    ManagedBy = "terraform"
  }
}

# KMS key for Bedrock encryption
resource "aws_kms_key" "bedrock" {
  description             = "KMS key for Bedrock logging and data encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  # Allow Bedrock to use this key
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAccountRoot"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowBedrock"
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    ManagedBy = "terraform"
  }
}

# IAM role for Bedrock to write logs
resource "aws_iam_role" "bedrock_logging" {
  name = "bedrock-logging-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    ManagedBy = "terraform"
  }
}

# Policy allowing Bedrock to write to S3 and CloudWatch
resource "aws_iam_role_policy" "bedrock_logging" {
  name = "bedrock-logging-policy"
  role = aws_iam_role.bedrock_logging.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.bedrock_logs.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.bedrock.arn}:*"
      }
    ]
  })
}

# Enable Bedrock model invocation logging
resource "aws_bedrock_model_invocation_logging_configuration" "main" {
  logging_config {
    embedding_data_delivery_enabled = true

    # Log to S3
    s3_config {
      bucket_name = aws_s3_bucket.bedrock_logs.id
      key_prefix  = "invocation-logs/"
    }

    # Log to CloudWatch
    cloud_watch_config {
      log_group_name = aws_cloudwatch_log_group.bedrock.name
      role_arn       = aws_iam_role.bedrock_logging.arn

      large_data_delivery_s3_config {
        bucket_name = aws_s3_bucket.bedrock_logs.id
        key_prefix  = "large-data/"
      }
    }
  }
}

data "aws_caller_identity" "current" {}
```

The dual logging setup - S3 for long-term storage and CloudWatch for real-time monitoring - gives you the best of both worlds. S3 logs are cheaper for retention, while CloudWatch lets you set up alarms and dashboards.

## Bedrock Guardrails

Guardrails are the safety layer for your Bedrock applications. They filter harmful content, block sensitive information, and enforce content policies:

```hcl
# Create a guardrail for production use
resource "aws_bedrock_guardrail" "production" {
  name                      = "production-guardrail"
  description               = "Content filtering guardrail for production applications"
  blocked_input_messaging   = "Your request contains content that is not allowed by our usage policy."
  blocked_outputs_messaging = "The response was filtered due to content policy restrictions."

  # Content filtering - block harmful content
  content_policy_config {
    filters_config {
      type            = "SEXUAL"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }

    filters_config {
      type            = "HATE"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }

    filters_config {
      type            = "VIOLENCE"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }

    filters_config {
      type            = "INSULTS"
      input_strength  = "MEDIUM"
      output_strength = "MEDIUM"
    }

    filters_config {
      type            = "MISCONDUCT"
      input_strength  = "HIGH"
      output_strength = "HIGH"
    }

    filters_config {
      type            = "PROMPT_ATTACK"
      input_strength  = "HIGH"
      output_strength = "NONE"
    }
  }

  # Sensitive information filtering - mask or block PII
  sensitive_information_policy_config {
    pii_entities_config {
      type   = "EMAIL"
      action = "ANONYMIZE"
    }

    pii_entities_config {
      type   = "PHONE"
      action = "ANONYMIZE"
    }

    pii_entities_config {
      type   = "US_SOCIAL_SECURITY_NUMBER"
      action = "BLOCK"
    }

    pii_entities_config {
      type   = "CREDIT_DEBIT_CARD_NUMBER"
      action = "BLOCK"
    }

    # Custom regex patterns for sensitive data
    regexes_config {
      name        = "internal-project-codes"
      description = "Block internal project code references"
      pattern     = "PRJ-[A-Z]{2}-\\d{4}"
      action      = "BLOCK"
    }
  }

  # Topic restrictions - prevent the model from discussing certain topics
  topic_policy_config {
    topics_config {
      name       = "competitor-advice"
      definition = "Providing advice or recommendations about competitor products or services"
      type       = "DENY"

      examples = [
        "Which competitor product should I use instead?",
        "Compare your product to CompetitorX"
      ]
    }

    topics_config {
      name       = "financial-advice"
      definition = "Providing specific financial, investment, or trading advice"
      type       = "DENY"

      examples = [
        "Should I buy this stock?",
        "What should I invest my retirement funds in?"
      ]
    }
  }

  # Word-level filtering
  word_policy_config {
    managed_word_lists_config {
      type = "PROFANITY"
    }

    words_config {
      text = "confidential-project-name"
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Create a version of the guardrail for deployment
resource "aws_bedrock_guardrail_version" "v1" {
  guardrail_arn = aws_bedrock_guardrail.production.guardrail_arn
  description   = "Initial production version"
}
```

Guardrails are versioned, which means you can update the configuration without immediately affecting your running applications. Create a new version, test it, and then point your applications to the new version.

## Provisioned Throughput

For production workloads with predictable traffic, provisioned throughput gives you dedicated capacity:

```hcl
# Provisioned throughput for a specific model
resource "aws_bedrock_provisioned_model_throughput" "claude" {
  provisioned_model_name = "claude-production"
  model_arn              = "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
  model_units            = 1

  # Commitment - "NO_COMMITMENT" for on-demand or specify a term
  commitment_duration = "NO_COMMITMENT"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

output "provisioned_model_arn" {
  value       = aws_bedrock_provisioned_model_throughput.claude.provisioned_model_arn
  description = "ARN to use when invoking the provisioned model"
}
```

When you use provisioned throughput, you get guaranteed model capacity that is not shared with other customers. This eliminates throttling during peak traffic and gives you more predictable latency.

## IAM Policies for Bedrock Access

Control which teams can invoke which models:

```hcl
# Policy allowing invocation of specific models only
resource "aws_iam_policy" "bedrock_invoke" {
  name        = "bedrock-invoke-policy"
  description = "Allow invoking specific Bedrock models with guardrails"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow invoking specific foundation models
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-*",
          "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-*"
        ]
      },
      {
        # Require guardrail usage - deny invocations without a guardrail
        Effect = "Deny"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
        Condition = {
          StringNotLike = {
            "bedrock:GuardrailIdentifier" = [
              aws_bedrock_guardrail.production.guardrail_arn
            ]
          }
        }
      },
      {
        # Allow using the guardrail
        Effect = "Allow"
        Action = [
          "bedrock:ApplyGuardrail"
        ]
        Resource = [
          aws_bedrock_guardrail.production.guardrail_arn
        ]
      }
    ]
  })
}
```

This policy does two things: it limits which models can be invoked and it enforces that all invocations must go through the production guardrail. This gives you centralized control over AI safety for your entire organization.

## Monitoring with CloudWatch

Set up alarms to track Bedrock usage and catch issues early:

```hcl
# Alarm for high invocation error rate
resource "aws_cloudwatch_metric_alarm" "bedrock_errors" {
  alarm_name          = "bedrock-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "InvocationClientErrors"
  namespace           = "AWS/Bedrock"
  period              = 300
  statistic           = "Sum"
  threshold           = 50

  alarm_actions = [aws_sns_topic.alerts.arn]

  alarm_description = "High Bedrock invocation error rate"

  tags = {
    ManagedBy = "terraform"
  }
}

# Alarm for throttling
resource "aws_cloudwatch_metric_alarm" "bedrock_throttling" {
  alarm_name          = "bedrock-throttling"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "InvocationThrottles"
  namespace           = "AWS/Bedrock"
  period              = 60
  statistic           = "Sum"
  threshold           = 10

  alarm_actions = [aws_sns_topic.alerts.arn]

  alarm_description = "Bedrock invocations are being throttled"

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Wrapping Up

Setting up Bedrock with Terraform involves four main areas: model access, invocation logging, guardrails, and IAM policies. Logging gives you visibility into what your AI applications are doing. Guardrails enforce content safety policies. IAM policies control who can invoke which models and whether guardrails are required.

For production deployments, always enable invocation logging to both S3 and CloudWatch, create guardrails that match your organization's content policies, and use IAM conditions to enforce guardrail usage. Consider provisioned throughput if you have predictable traffic patterns and need guaranteed latency.

The Terraform resources for Bedrock are still evolving as AWS adds new features. Keep an eye on the [AWS provider changelog](https://github.com/hashicorp/terraform-provider-aws/blob/main/CHANGELOG.md) for new Bedrock resources and data sources.

# How to Create Resource-Based Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Resource Policies, S3, SQS, Infrastructure as Code

Description: Learn how to create resource-based IAM policies in Terraform for S3 buckets, SQS queues, SNS topics, KMS keys, and other AWS resources.

---

Resource-based policies are IAM policies attached directly to an AWS resource rather than to an IAM identity (user, group, or role). They specify who can access the resource and what actions they can perform. Unlike identity-based policies where you say "this role can access that resource," resource-based policies say "this resource can be accessed by that principal." This distinction matters for cross-account access, where resource-based policies can grant access without requiring the target account to create a role.

This guide covers creating resource-based policies in Terraform for common AWS services including S3, SQS, SNS, KMS, Lambda, and Secrets Manager.

## How Resource-Based Policies Work

Resource-based policies are evaluated alongside identity-based policies. For same-account access, if either the identity-based policy or the resource-based policy allows the action, it is permitted (unless explicitly denied). For cross-account access, both the identity-based policy in the source account and the resource-based policy on the target resource must allow the action.

Not all AWS services support resource-based policies. The most common ones that do include S3, SQS, SNS, KMS, Lambda, Secrets Manager, ECR, and API Gateway.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with permissions to manage the relevant services
- AWS CLI configured with valid credentials

## S3 Bucket Policy

S3 bucket policies are one of the most common resource-based policies.

```hcl
# Create an S3 bucket
resource "aws_s3_bucket" "data" {
  bucket = "my-app-data-bucket"
}

# Define the bucket policy
data "aws_iam_policy_document" "bucket_policy" {
  # Allow a specific IAM role to read objects
  statement {
    sid    = "AllowAppRoleRead"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::123456789012:role/app-role"]
    }

    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]

    resources = [
      aws_s3_bucket.data.arn,
      "${aws_s3_bucket.data.arn}/*",
    ]
  }

  # Allow cross-account access
  statement {
    sid    = "AllowCrossAccountRead"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::999888777666:root"]
    }

    actions = [
      "s3:GetObject",
    ]

    resources = [
      "${aws_s3_bucket.data.arn}/*",
    ]
  }

  # Deny unencrypted uploads
  statement {
    sid    = "DenyUnencryptedUploads"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:PutObject"]

    resources = ["${aws_s3_bucket.data.arn}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["AES256", "aws:kms"]
    }
  }

  # Enforce HTTPS
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.data.arn,
      "${aws_s3_bucket.data.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

# Attach the policy to the bucket
resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id
  policy = data.aws_iam_policy_document.bucket_policy.json
}
```

## SQS Queue Policy

SQS queue policies control who can send messages to and receive messages from a queue.

```hcl
resource "aws_sqs_queue" "processing" {
  name = "order-processing-queue"
}

data "aws_iam_policy_document" "sqs_policy" {
  # Allow a Lambda function to consume messages
  statement {
    sid    = "AllowLambdaConsume"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::123456789012:role/lambda-processor-role"]
    }

    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
    ]

    resources = [aws_sqs_queue.processing.arn]
  }

  # Allow SNS to send messages to this queue
  statement {
    sid    = "AllowSNSPublish"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    actions = ["sqs:SendMessage"]

    resources = [aws_sqs_queue.processing.arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = ["arn:aws:sns:us-east-1:123456789012:order-notifications"]
    }
  }

  # Allow S3 to send event notifications
  statement {
    sid    = "AllowS3Events"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }

    actions = ["sqs:SendMessage"]

    resources = [aws_sqs_queue.processing.arn]

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:s3:::uploads-bucket"]
    }
  }
}

resource "aws_sqs_queue_policy" "processing" {
  queue_url = aws_sqs_queue.processing.id
  policy    = data.aws_iam_policy_document.sqs_policy.json
}
```

## SNS Topic Policy

SNS topic policies control who can publish to and subscribe to a topic.

```hcl
resource "aws_sns_topic" "notifications" {
  name = "app-notifications"
}

data "aws_iam_policy_document" "sns_policy" {
  # Allow specific accounts to subscribe
  statement {
    sid    = "AllowSubscriptions"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [
        "arn:aws:iam::123456789012:root",
        "arn:aws:iam::999888777666:root",
      ]
    }

    actions = [
      "sns:Subscribe",
      "sns:Receive",
    ]

    resources = [aws_sns_topic.notifications.arn]
  }

  # Allow CloudWatch to publish alarms
  statement {
    sid    = "AllowCloudWatchAlarms"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }

    actions = ["sns:Publish"]

    resources = [aws_sns_topic.notifications.arn]
  }

  # Allow EventBridge to publish events
  statement {
    sid    = "AllowEventBridge"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    actions = ["sns:Publish"]

    resources = [aws_sns_topic.notifications.arn]
  }
}

resource "aws_sns_topic_policy" "notifications" {
  arn    = aws_sns_topic.notifications.arn
  policy = data.aws_iam_policy_document.sns_policy.json
}
```

## KMS Key Policy

KMS key policies are mandatory and the primary way to control access to KMS keys.

```hcl
data "aws_caller_identity" "current" {}

resource "aws_kms_key" "app_key" {
  description = "KMS key for application data encryption"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow the account to manage the key
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        # Allow specific roles to use the key for encryption/decryption
        Sid    = "AllowAppRoleUsage"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/app-role",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/lambda-role",
          ]
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey",
        ]
        Resource = "*"
      },
      {
        # Allow key administrators
        Sid    = "AllowKeyAdministration"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/admin-role"
        }
        Action = [
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion",
          "kms:TagResource",
          "kms:UntagResource",
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Lambda Function Policy

Lambda resource-based policies control who can invoke the function.

```hcl
resource "aws_lambda_function" "api_handler" {
  filename      = "function.zip"
  function_name = "api-handler"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
}

# Allow API Gateway to invoke the function
resource "aws_lambda_permission" "apigateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-east-1:*:*/prod/GET/*"
}

# Allow S3 to invoke the function
resource "aws_lambda_permission" "s3_trigger" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = "arn:aws:s3:::my-trigger-bucket"
}

# Allow SNS to invoke the function
resource "aws_lambda_permission" "sns_trigger" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = "arn:aws:sns:us-east-1:123456789012:my-topic"
}

# Allow cross-account invocation
resource "aws_lambda_permission" "cross_account" {
  statement_id  = "AllowCrossAccountInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "arn:aws:iam::999888777666:root"
}
```

## Secrets Manager Resource Policy

```hcl
resource "aws_secretsmanager_secret" "db_creds" {
  name = "app/database/credentials"
}

resource "aws_secretsmanager_secret_policy" "db_creds" {
  secret_arn = aws_secretsmanager_secret.db_creds.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAppAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::123456789012:role/app-role",
            "arn:aws:iam::123456789012:role/lambda-role",
          ]
        }
        Action   = "secretsmanager:GetSecretValue"
        Resource = "*"
      },
      {
        # Allow cross-account access
        Sid    = "AllowCrossAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::999888777666:role/remote-app-role"
        }
        Action   = "secretsmanager:GetSecretValue"
        Resource = "*"
      }
    ]
  })
}
```

## Best Practices

1. **Always use the `aws_iam_policy_document` data source** for resource-based policies. It provides better validation than raw JSON.
2. **Include a deny-insecure-transport statement** for S3 buckets to enforce HTTPS.
3. **Scope source ARN conditions** when allowing service principals. This prevents other resources of the same service from accessing your resource.
4. **Be careful with cross-account access.** Resource-based policies that grant access to another account's root mean any principal in that account with the right identity policy can access your resource.
5. **Test cross-account policies thoroughly.** Both the resource policy and the identity policy must allow the action.

For related topics, see [How to Create IAM Policies with aws_iam_policy_document in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-policies-with-aws-iam-policy-document-in-terraform/view) and [How to Handle IAM Policy Conditions in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-iam-policy-conditions-in-terraform/view).

## Conclusion

Resource-based policies are a fundamental part of AWS access control. They complement identity-based policies by defining access from the resource's perspective and are the primary mechanism for cross-account access to many AWS services. Terraform makes it easy to define and manage resource-based policies alongside the resources they protect. By using proper conditions, scoping principals carefully, and enforcing security controls like encryption and HTTPS, you can build a robust access control layer around your AWS resources.

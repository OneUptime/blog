# How to Create IAM Roles with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, AWS, IAM, Terraform, IaC, DevOps, Security

Description: Learn how to create AWS IAM roles, policies, and attachments with OpenTofu using aws_iam_policy_document and various attachment patterns.

## Introduction

IAM roles in AWS grant permissions to services, users, and applications. Creating them with OpenTofu ensures consistent, auditable, and reproducible permission configurations. The `aws_iam_policy_document` data source provides a clean HCL syntax for defining policies, avoiding raw JSON strings.

## EC2 Instance Role

```hcl
# Trust policy: who can assume this role

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# Create the role
resource "aws_iam_role" "app" {
  name               = "${var.environment}-app-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
  description        = "Role for ${var.environment} application EC2 instances"

  tags = {
    Name        = "${var.environment}-app-role"
    Environment = var.environment
  }
}
```

## Attaching AWS Managed Policies

```hcl
# Attach AWS managed policies
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}
```

## Custom Managed Policy

```hcl
data "aws_iam_policy_document" "app_permissions" {
  # S3 access
  statement {
    sid     = "S3Access"
    effect  = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.assets.arn,
      "${aws_s3_bucket.assets.arn}/*"
    ]
  }

  # Secrets Manager access
  statement {
    sid     = "SecretsAccess"
    effect  = "Allow"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/*"
    ]
  }

  # SQS access
  statement {
    sid     = "SQSAccess"
    effect  = "Allow"
    actions = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage"]
    resources = [aws_sqs_queue.tasks.arn]
  }
}

# Create the policy
resource "aws_iam_policy" "app" {
  name        = "${var.environment}-app-policy"
  description = "Custom permissions for the app role"
  policy      = data.aws_iam_policy_document.app_permissions.json
}

# Attach the custom policy
resource "aws_iam_role_policy_attachment" "app" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.app.arn
}

# Create the instance profile
resource "aws_iam_instance_profile" "app" {
  name = "${var.environment}-app-profile"
  role = aws_iam_role.app.name
}
```

## Lambda Execution Role

```hcl
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.environment}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach VPC access if Lambda runs in a VPC
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  count      = var.lambda_in_vpc ? 1 : 0
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
```

## Cross-Account Assume Role

```hcl
data "aws_iam_policy_document" "cross_account_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.trusted_account_id}:root"]
    }
    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = [var.external_id]
    }
  }
}

resource "aws_iam_role" "cross_account" {
  name               = "cross-account-role"
  assume_role_policy = data.aws_iam_policy_document.cross_account_trust.json
}
```

## Outputs

```hcl
output "role_arn"             { value = aws_iam_role.app.arn }
output "role_name"            { value = aws_iam_role.app.name }
output "instance_profile_arn" { value = aws_iam_instance_profile.app.arn }
```

## Conclusion

Creating IAM roles with OpenTofu combines `aws_iam_role` (the role itself), `data.aws_iam_policy_document` (the policy JSON), `aws_iam_policy` (for reusable custom policies), and `aws_iam_role_policy_attachment` (to link policies to roles). Always use `data.aws_iam_policy_document` instead of raw JSON strings - it's easier to read, validate, and merge policies. Follow least-privilege: grant only the specific actions and resources the role needs.

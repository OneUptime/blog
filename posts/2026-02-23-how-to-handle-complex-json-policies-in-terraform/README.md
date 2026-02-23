# How to Handle Complex JSON Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, JSON, IAM Policies, HCL, AWS, Infrastructure as Code

Description: Learn the best approaches for managing complex JSON policy documents in Terraform, including jsonencode, aws_iam_policy_document, and templatefile techniques.

---

JSON policy documents are everywhere in AWS - IAM policies, S3 bucket policies, SQS queue policies, KMS key policies, API Gateway authorizer policies, and more. Managing these in Terraform can be painful if you do not use the right approach. This post covers the best techniques for handling complex JSON policies cleanly.

## The Problem with Inline JSON

The naive approach is to write JSON as a string directly in Terraform:

```hcl
# Do NOT do this - hard to read, maintain, and validate
resource "aws_iam_role_policy" "bad_example" {
  name = "bad-policy"
  role = aws_iam_role.main.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::${var.bucket_name}/*"
    }
  ]
}
EOF
}
```

This works, but it has problems. JSON syntax errors are caught at apply time, not plan time. Interpolation inside JSON strings requires careful escaping. And large policies become impossible to read.

## Approach 1 - jsonencode()

The `jsonencode()` function converts HCL values to JSON. This is the simplest improvement:

```hcl
resource "aws_iam_role_policy" "main" {
  name = "s3-access"
  role = aws_iam_role.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowS3Access"
        Effect   = "Allow"
        Action   = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.bucket_name}",
          "arn:aws:s3:::${var.bucket_name}/*"
        ]
      }
    ]
  })
}
```

Benefits of `jsonencode()`:
- HCL syntax checking catches structural errors at plan time
- String interpolation works naturally
- No JSON escaping needed
- Comments work (HCL supports them, JSON does not)

## Approach 2 - aws_iam_policy_document Data Source

The Terraform AWS provider includes a dedicated data source for building IAM policy documents:

```hcl
data "aws_iam_policy_document" "s3_access" {
  statement {
    sid    = "AllowS3Access"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket",
    ]

    resources = [
      "arn:aws:s3:::${var.bucket_name}",
      "arn:aws:s3:::${var.bucket_name}/*",
    ]
  }

  statement {
    sid    = "AllowKMSDecrypt"
    effect = "Allow"

    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
    ]

    resources = [var.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "main" {
  name   = "s3-access"
  role   = aws_iam_role.main.id
  policy = data.aws_iam_policy_document.s3_access.json
}
```

This data source is the recommended approach for IAM policies because it validates the policy structure and supports features like policy merging and conditions natively.

## Approach 3 - Dynamic Statements in Policy Documents

For policies that vary based on input, combine the data source with dynamic blocks:

```hcl
variable "service_permissions" {
  description = "Permissions for each service"
  type = map(object({
    actions   = list(string)
    resources = list(string)
  }))
  default = {
    dynamodb = {
      actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
      resources = ["arn:aws:dynamodb:us-east-1:*:table/users"]
    }
    sqs = {
      actions   = ["sqs:SendMessage", "sqs:ReceiveMessage"]
      resources = ["arn:aws:sqs:us-east-1:*:processing-queue"]
    }
    secretsmanager = {
      actions   = ["secretsmanager:GetSecretValue"]
      resources = ["arn:aws:secretsmanager:us-east-1:*:secret:app/*"]
    }
  }
}

data "aws_iam_policy_document" "service_policy" {
  dynamic "statement" {
    for_each = var.service_permissions
    content {
      sid       = "Allow${title(statement.key)}"
      effect    = "Allow"
      actions   = statement.value.actions
      resources = statement.value.resources
    }
  }
}
```

## Handling Complex Conditions

IAM policy conditions add another layer of complexity. Here is how to handle them cleanly:

```hcl
data "aws_iam_policy_document" "conditional" {
  # S3 access only from specific VPC endpoint
  statement {
    sid    = "VPCEndpointOnly"
    effect = "Allow"
    actions = ["s3:*"]
    resources = [
      "arn:aws:s3:::${var.bucket_name}",
      "arn:aws:s3:::${var.bucket_name}/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "aws:sourceVpce"
      values   = [var.vpc_endpoint_id]
    }
  }

  # Deny unencrypted uploads
  statement {
    sid    = "DenyUnencryptedUploads"
    effect = "Deny"
    actions = ["s3:PutObject"]
    resources = ["arn:aws:s3:::${var.bucket_name}/*"]

    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["aws:kms"]
    }
  }

  # Time-based access restriction
  statement {
    sid     = "BusinessHoursOnly"
    effect  = "Deny"
    actions = ["*"]
    resources = ["*"]

    condition {
      test     = "DateGreaterThan"
      variable = "aws:CurrentTime"
      values   = ["2025-12-31T23:59:59Z"]
    }
  }
}
```

## Merging Multiple Policy Documents

When policy logic comes from different sources, merge them:

```hcl
# Base policy everyone gets
data "aws_iam_policy_document" "base" {
  statement {
    sid     = "AllowAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    resources = [var.role_arn]
  }
}

# Additional permissions per team
data "aws_iam_policy_document" "team_specific" {
  dynamic "statement" {
    for_each = var.team_permissions
    content {
      sid       = statement.key
      effect    = "Allow"
      actions   = statement.value.actions
      resources = statement.value.resources
    }
  }
}

# Deny policy for security guardrails
data "aws_iam_policy_document" "deny" {
  statement {
    sid    = "DenyDeleteBucket"
    effect = "Deny"
    actions = [
      "s3:DeleteBucket",
      "s3:DeleteBucketPolicy"
    ]
    resources = ["*"]
  }
}

# Combine all three
data "aws_iam_policy_document" "combined" {
  source_policy_documents = [
    data.aws_iam_policy_document.base.json,
    data.aws_iam_policy_document.team_specific.json,
  ]

  # Override policy documents take precedence (deny statements)
  override_policy_documents = [
    data.aws_iam_policy_document.deny.json,
  ]
}
```

## Using templatefile() for Policies

For policies that are too complex even for `aws_iam_policy_document`, you can use template files:

```hcl
# main.tf
resource "aws_iam_role_policy" "complex" {
  name   = "complex-policy"
  role   = aws_iam_role.main.id
  policy = templatefile("${path.module}/policies/complex-policy.json.tpl", {
    account_id  = data.aws_caller_identity.current.account_id
    region      = var.aws_region
    bucket_name = var.bucket_name
    kms_key_arn = var.kms_key_arn
    environment = var.environment
  })
}
```

```json
// policies/complex-policy.json.tpl
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3InRegion",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::${bucket_name}/*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "${region}"
        }
      }
    }
%{ if environment == "production" }
    ,{
      "Sid": "AllowKMSInProd",
      "Effect": "Allow",
      "Action": ["kms:Decrypt"],
      "Resource": "${kms_key_arn}"
    }
%{ endif }
  ]
}
```

Be careful with this approach - it is easy to produce invalid JSON with template directives. Always validate the output.

## Validating JSON Policies

Add validation to catch policy errors early:

```hcl
# Validate that a policy variable is valid JSON
variable "custom_policy" {
  type = string

  validation {
    condition     = can(jsondecode(var.custom_policy))
    error_message = "custom_policy must be valid JSON."
  }
}

# Validate policy size (IAM has limits)
variable "inline_policy" {
  type = string

  validation {
    condition     = length(var.inline_policy) <= 10240
    error_message = "Inline policy must not exceed 10,240 characters."
  }
}
```

## Working with Policy ARN References

When policies reference other resources, build the ARNs dynamically:

```hcl
locals {
  # Build resource ARNs dynamically
  dynamodb_table_arns = [
    for table in var.dynamodb_tables :
    "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${table}"
  ]

  sqs_queue_arns = [
    for queue in var.sqs_queues :
    "arn:aws:sqs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:${queue}"
  ]
}

data "aws_iam_policy_document" "app" {
  statement {
    sid       = "DynamoDBAccess"
    effect    = "Allow"
    actions   = ["dynamodb:*"]
    resources = local.dynamodb_table_arns
  }

  statement {
    sid       = "SQSAccess"
    effect    = "Allow"
    actions   = ["sqs:*"]
    resources = local.sqs_queue_arns
  }
}
```

## Choosing the Right Approach

Here is when to use each approach:

- `jsonencode()` - Good for simple policies, non-IAM JSON (like CloudWatch dashboard bodies), and when you want native HCL syntax.
- `aws_iam_policy_document` - Best for IAM policies. Supports conditions, principals, merging, and validates the structure.
- `templatefile()` - Use when you need complex conditional logic in the JSON itself, or when the policy comes from an external template.
- Inline JSON heredoc - Avoid this. There is almost always a better option.

## Performance Considerations

For large numbers of policies, the `aws_iam_policy_document` data source runs locally (no API calls), so performance is not a concern. However, be aware of IAM policy size limits:

- Inline policy: 2,048 characters (URL-encoded)
- Managed policy: 6,144 characters (JSON)
- For larger policies, split into multiple managed policies

## Summary

Complex JSON policies in Terraform are best handled with `aws_iam_policy_document` for IAM policies and `jsonencode()` for everything else. Dynamic blocks within policy documents let you generate statements from variable data, and `source_policy_documents` lets you compose policies from multiple sources. Avoid raw JSON strings whenever possible - they are harder to maintain and validate. For more on dynamic policy generation, see our post on [dynamic blocks for resource policy documents](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-resource-policy-documents/view).

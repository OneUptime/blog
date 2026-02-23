# How to Create IAM Policies with aws_iam_policy_document in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Infrastructure as Code, Security, Policy Document

Description: Learn how to use the aws_iam_policy_document data source in Terraform to create type-safe, composable IAM policies with proper validation.

---

Terraform offers a dedicated data source called `aws_iam_policy_document` that provides a native HCL way to define IAM policies. Unlike using raw JSON or `jsonencode`, this data source gives you compile-time validation, the ability to merge policy documents, and a more declarative syntax. This guide covers everything you need to know about using `aws_iam_policy_document` effectively.

## Why Use aws_iam_policy_document?

The `aws_iam_policy_document` data source generates an IAM policy document in JSON format from HCL blocks. It offers several advantages over other approaches:

- **Type safety**: Terraform validates the structure at plan time, catching errors before they reach AWS.
- **Policy merging**: You can combine multiple policy documents into one, making it easy to compose permissions from separate modules.
- **Readable syntax**: The block-based syntax is easier to read than nested JSON structures.
- **IDE support**: HCL-native syntax gets better autocomplete and validation in most editors.

## Prerequisites

You need the following to follow along:

- Terraform 1.0 or later
- An AWS account with IAM management permissions
- AWS CLI configured with valid credentials

## Basic Usage

Here is how to create a simple IAM policy using the data source.

```hcl
# Define the policy document using the data source
data "aws_iam_policy_document" "s3_read_only" {
  statement {
    sid    = "AllowS3ReadOnly"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]

    resources = [
      "arn:aws:s3:::my-bucket",
      "arn:aws:s3:::my-bucket/*",
    ]
  }
}

# Create the IAM policy using the generated JSON
resource "aws_iam_policy" "s3_read_only" {
  name        = "s3-read-only"
  description = "Allows read-only access to the my-bucket S3 bucket"
  policy      = data.aws_iam_policy_document.s3_read_only.json
}
```

The data source produces a `json` attribute that contains the properly formatted IAM policy document. You reference it with `.json` when attaching it to a policy resource.

## Multiple Statements

Adding multiple statements is straightforward. Each `statement` block represents a separate permission set.

```hcl
data "aws_iam_policy_document" "developer_access" {
  # Statement for S3 access
  statement {
    sid    = "S3Access"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = [
      "arn:aws:s3:::dev-artifacts/*",
    ]
  }

  # Statement for DynamoDB access
  statement {
    sid    = "DynamoDBAccess"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
    ]

    resources = [
      "arn:aws:dynamodb:us-east-1:123456789012:table/dev-*",
    ]
  }

  # Statement for CloudWatch Logs
  statement {
    sid    = "CloudWatchLogs"
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    resources = ["*"]
  }
}
```

## Using Conditions

The `condition` block within a statement lets you add IAM conditions. You can have multiple conditions, and they are ANDed together.

```hcl
data "aws_iam_policy_document" "restricted_access" {
  statement {
    sid    = "AllowWithMFA"
    effect = "Allow"

    actions = [
      "s3:*",
    ]

    resources = [
      "arn:aws:s3:::sensitive-data",
      "arn:aws:s3:::sensitive-data/*",
    ]

    # Require MFA authentication
    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["true"]
    }

    # Restrict to specific IP range
    condition {
      test     = "IpAddress"
      variable = "aws:SourceIp"
      values   = ["10.0.0.0/8", "172.16.0.0/12"]
    }
  }
}
```

## Using Principals

When creating resource-based policies or trust policies, you need to specify principals. The `principals` block handles this.

```hcl
# Trust policy for an IAM role
data "aws_iam_policy_document" "lambda_trust" {
  statement {
    sid    = "AllowLambdaAssume"
    effect = "Allow"

    # Specify which service can assume the role
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# Create the role with the trust policy
resource "aws_iam_role" "lambda_execution" {
  name               = "lambda-execution-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}
```

You can use different principal types including `Service`, `AWS`, `Federated`, and `*` (for anonymous access).

```hcl
# Trust policy allowing cross-account access
data "aws_iam_policy_document" "cross_account_trust" {
  statement {
    effect = "Allow"

    # Allow another AWS account to assume this role
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::123456789012:root"]
    }

    actions = ["sts:AssumeRole"]

    # Require external ID for security
    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = ["unique-external-id-12345"]
    }
  }
}
```

## Merging Policy Documents

One of the most powerful features of `aws_iam_policy_document` is the ability to merge documents using `source_policy_documents` and `override_policy_documents`.

```hcl
# Base policy with common permissions
data "aws_iam_policy_document" "base" {
  statement {
    sid    = "CloudWatchAccess"
    effect = "Allow"
    actions = [
      "cloudwatch:GetMetricData",
      "cloudwatch:ListMetrics",
    ]
    resources = ["*"]
  }
}

# Additional permissions specific to a service
data "aws_iam_policy_document" "s3_access" {
  statement {
    sid    = "S3Access"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = ["arn:aws:s3:::app-data-*"]
  }
}

# Merge both documents into one policy
data "aws_iam_policy_document" "combined" {
  # Include all statements from the base document
  source_policy_documents = [
    data.aws_iam_policy_document.base.json,
    data.aws_iam_policy_document.s3_access.json,
  ]
}

resource "aws_iam_policy" "combined" {
  name   = "combined-policy"
  policy = data.aws_iam_policy_document.combined.json
}
```

The `override_policy_documents` parameter works differently from `source_policy_documents`. When statements have the same SID, override documents will replace the statement from source documents. This is useful when you want a base policy that can be customized.

```hcl
# Override specific statements from the base
data "aws_iam_policy_document" "custom" {
  # Start with the base document
  source_policy_documents = [
    data.aws_iam_policy_document.base.json,
  ]

  # Override the CloudWatchAccess statement with more permissions
  override_policy_documents = [
    jsonencode({
      Statement = [{
        Sid      = "CloudWatchAccess"
        Effect   = "Allow"
        Action   = ["cloudwatch:*"]
        Resource = "*"
      }]
    })
  ]
}
```

## Using Dynamic Blocks

You can use dynamic blocks and `for_each` to generate statements programmatically.

```hcl
variable "bucket_permissions" {
  description = "Map of bucket names to their allowed actions"
  type = map(list(string))
  default = {
    "app-data"   = ["s3:GetObject", "s3:PutObject"]
    "app-logs"   = ["s3:GetObject"]
    "app-config" = ["s3:GetObject"]
  }
}

data "aws_iam_policy_document" "multi_bucket" {
  # Generate a statement for each bucket
  dynamic "statement" {
    for_each = var.bucket_permissions

    content {
      sid    = "Access${replace(title(statement.key), "-", "")}Bucket"
      effect = "Allow"
      actions = statement.value

      resources = [
        "arn:aws:s3:::${statement.key}",
        "arn:aws:s3:::${statement.key}/*",
      ]
    }
  }
}
```

## Not-Actions and Not-Resources

The `aws_iam_policy_document` supports `not_actions` and `not_resources`, which let you specify everything except the listed items.

```hcl
data "aws_iam_policy_document" "deny_except" {
  statement {
    sid    = "DenyAllExceptReadOnly"
    effect = "Deny"

    # Deny everything EXCEPT these actions
    not_actions = [
      "s3:GetObject",
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]

    resources = ["*"]
  }
}
```

## Comparison with jsonencode

Both `aws_iam_policy_document` and `jsonencode` are valid approaches. The data source is better when you need to merge policies from different modules, when you want stricter validation, or when you prefer HCL-native syntax. The `jsonencode` approach is simpler for straightforward policies and more familiar to those who already know the IAM JSON format. For more on the `jsonencode` approach, see [How to Create IAM Policies with jsonencode in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-policies-with-jsonencode-in-terraform/view).

## Conclusion

The `aws_iam_policy_document` data source is a powerful tool for creating IAM policies in Terraform. Its ability to merge documents, validate structure at plan time, and use HCL-native syntax makes it particularly well-suited for complex environments where policies need to be composed from multiple sources. Whether you are building trust policies for roles, resource-based policies for S3 buckets, or permission policies for users and groups, this data source provides a clean and maintainable approach to IAM policy management.

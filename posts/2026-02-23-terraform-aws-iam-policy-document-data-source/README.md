# How to Use the aws_iam_policy_document Data Source Instead of JSON

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Data Source, Infrastructure as Code

Description: Learn how to use the aws_iam_policy_document data source to define IAM policies natively in HCL with full validation and policy merging support.

---

Writing IAM policies as raw JSON inside Terraform has always been a pain point. The `aws_iam_policy_document` data source gives you a proper HCL-native way to define IAM policies. It validates your policy structure, supports merging multiple policy fragments, and catches errors before you ever hit the AWS API.

This guide covers how to replace JSON-based IAM policies with the data source approach, including advanced use cases like policy merging and dynamic statement generation.

## Basic Usage

Here is how a simple S3 read policy looks using the data source:

```hcl
# Define the policy using a data source
data "aws_iam_policy_document" "s3_read" {
  statement {
    sid    = "AllowS3Read"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]

    resources = [
      aws_s3_bucket.data.arn,
      "${aws_s3_bucket.data.arn}/*",
    ]
  }
}

# Attach the rendered JSON to an IAM policy
resource "aws_iam_policy" "s3_read" {
  name   = "s3-read-access"
  policy = data.aws_iam_policy_document.s3_read.json
}
```

The data source renders to JSON through its `.json` attribute. You never write JSON yourself. Terraform validates every field in the `statement` block, so typos in keys like `effect` or `actions` get caught at plan time rather than at apply time.

## Multiple Statements in a Single Policy

Add more `statement` blocks to build complex policies:

```hcl
data "aws_iam_policy_document" "app_permissions" {
  # S3 access for application data
  statement {
    sid    = "S3DataAccess"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = [
      "${aws_s3_bucket.app_data.arn}/*",
    ]
  }

  # DynamoDB access for session storage
  statement {
    sid    = "DynamoDBSessionAccess"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
    ]

    resources = [
      aws_dynamodb_table.sessions.arn,
    ]
  }

  # CloudWatch Logs for application logging
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

Each statement block maps directly to a JSON statement in the resulting policy. The structure is easier to scan than a long JSON blob.

## Conditions in Policies

IAM conditions work through the `condition` block inside a statement:

```hcl
data "aws_iam_policy_document" "restricted_s3" {
  statement {
    sid    = "AllowS3FromVPC"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
    ]

    resources = [
      "${aws_s3_bucket.private.arn}/*",
    ]

    # Only allow access from a specific VPC endpoint
    condition {
      test     = "StringEquals"
      variable = "aws:sourceVpce"
      values   = [aws_vpc_endpoint.s3.id]
    }
  }

  statement {
    sid    = "DenyUnencryptedUploads"
    effect = "Deny"

    actions = [
      "s3:PutObject",
    ]

    resources = [
      "${aws_s3_bucket.private.arn}/*",
    ]

    # Deny uploads that do not use server-side encryption
    condition {
      test     = "StringNotEquals"
      variable = "s3:x-amz-server-side-encryption"
      values   = ["AES256", "aws:kms"]
    }
  }
}
```

The `condition` block is cleaner than writing nested JSON objects for conditions. Each condition gets its own block with `test`, `variable`, and `values` fields.

## Principal Specifications

For trust policies (assume role policies), you need to specify principals:

```hcl
data "aws_iam_policy_document" "assume_role" {
  # Allow an EC2 instance to assume this role
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "cross_account_trust" {
  # Allow specific accounts to assume this role with MFA
  statement {
    effect = "Allow"

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::111111111111:root",
        "arn:aws:iam::222222222222:root",
      ]
    }

    actions = ["sts:AssumeRole"]

    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["true"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "application-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
```

## Merging Multiple Policy Documents

One of the most powerful features of this data source is policy merging. You can combine separate policy documents using `source_policy_documents` or `override_policy_documents`:

```hcl
# Base permissions every application gets
data "aws_iam_policy_document" "base" {
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

  statement {
    sid    = "XRayTracing"
    effect = "Allow"
    actions = [
      "xray:PutTraceSegments",
      "xray:PutTelemetryRecords",
    ]
    resources = ["*"]
  }
}

# Additional permissions for this specific application
data "aws_iam_policy_document" "app_specific" {
  statement {
    sid    = "SQSAccess"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
    ]
    resources = [aws_sqs_queue.work.arn]
  }
}

# Merge the base and app-specific policies together
data "aws_iam_policy_document" "combined" {
  source_policy_documents = [
    data.aws_iam_policy_document.base.json,
    data.aws_iam_policy_document.app_specific.json,
  ]
}

resource "aws_iam_policy" "app" {
  name   = "application-policy"
  policy = data.aws_iam_policy_document.combined.json
}
```

This pattern is great for building a library of reusable policy fragments. You define base policies once and compose them as needed for each application.

The difference between `source_policy_documents` and `override_policy_documents` matters. Source documents get merged, and if there are conflicting statement IDs, the last one wins. Override documents take priority and can replace statements from the base document.

## Dynamic Statements

You can use `dynamic` blocks to generate statements from variables:

```hcl
variable "bucket_access" {
  description = "Map of bucket names to allowed actions"
  type = map(object({
    actions   = list(string)
    prefix    = optional(string, "*")
  }))
}

data "aws_iam_policy_document" "dynamic_buckets" {
  # Generate one statement per bucket
  dynamic "statement" {
    for_each = var.bucket_access
    content {
      sid    = "Access${replace(title(statement.key), "-", "")}"
      effect = "Allow"

      actions = statement.value.actions

      resources = [
        "arn:aws:s3:::${statement.key}",
        "arn:aws:s3:::${statement.key}/${statement.value.prefix}",
      ]
    }
  }
}
```

## Not Principals and Not Actions

The data source supports `NotPrincipal`, `NotAction`, and `NotResource` through dedicated fields:

```hcl
data "aws_iam_policy_document" "deny_external" {
  statement {
    sid    = "DenyExternalAccess"
    effect = "Deny"

    # Deny all actions EXCEPT these
    not_actions = [
      "s3:GetObject",
    ]

    resources = ["*"]

    # Apply to everyone EXCEPT these principals
    not_principals {
      type        = "AWS"
      identifiers = [aws_iam_role.admin.arn]
    }
  }
}
```

## Comparing with jsonencode

The `aws_iam_policy_document` data source and `jsonencode` both avoid raw JSON strings, but they have different strengths:

| Feature | aws_iam_policy_document | jsonencode |
|---------|------------------------|------------|
| Terraform validation | Full structural validation | Basic HCL validation |
| Policy merging | Built-in | Manual with concat |
| Learning curve | Higher (custom syntax) | Lower (just HCL maps) |
| Condition syntax | Named blocks | Nested maps |
| NotPrincipal/NotAction | Dedicated fields | Manual JSON keys |

For simple policies, `jsonencode` is often enough. For complex policies with merging, conditions, and not-principals, the data source is the better tool.

## Best Practices

A few tips for working with `aws_iam_policy_document`:

1. Always set the `sid` field on statements. It makes policies easier to audit and helps with merging.
2. Keep policy documents focused. Rather than one massive document, create smaller composable ones and merge them.
3. Use `terraform plan` to inspect the generated JSON. The rendered output appears in the plan when you reference the `.json` attribute.
4. Store reusable policy fragments in modules so teams can share common patterns.

## Wrapping Up

The `aws_iam_policy_document` data source is the most robust way to write IAM policies in Terraform. It validates your policy structure at plan time, supports merging for composable policies, and provides clean syntax for conditions and principals. While `jsonencode` works for simple cases, the data source scales better as your IAM requirements grow. Adopt it as your default approach for IAM policies, and you will spend less time debugging policy JSON.

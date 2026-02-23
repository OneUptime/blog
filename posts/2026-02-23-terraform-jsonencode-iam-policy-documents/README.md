# How to Use jsonencode for IAM Policy Documents in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, JSON, Infrastructure as Code

Description: Learn how to use Terraform's jsonencode function to build IAM policy documents dynamically, avoiding raw JSON strings and improving maintainability.

---

If you have ever wrestled with multi-line JSON strings inside Terraform configuration files, you know how painful it gets. Misplaced commas, broken escaping, and diffs that are impossible to read. The `jsonencode` function solves this by letting you write IAM policy documents using native HCL data structures that Terraform converts to JSON at plan time.

This guide walks through practical examples of using `jsonencode` for IAM policies, from basic inline policies to complex ones with dynamic statements.

## Why jsonencode Beats Raw JSON Strings

When you write an IAM policy as a raw JSON string in Terraform, it looks like this:

```hcl
# The old way - raw JSON string (hard to maintain)
resource "aws_iam_policy" "s3_read" {
  name = "s3-read-access"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
EOF
}
```

This works, but the JSON lives inside a heredoc. Terraform cannot validate the structure until AWS rejects it. You also lose syntax highlighting in most editors, and variable interpolation inside heredocs is fragile.

With `jsonencode`, you write HCL instead:

```hcl
# The better way - jsonencode with HCL maps
resource "aws_iam_policy" "s3_read" {
  name = "s3-read-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::my-bucket",
          "arn:aws:s3:::my-bucket/*"
        ]
      }
    ]
  })
}
```

Terraform validates the HCL structure during `terraform validate`. Your editor gives you proper syntax highlighting. Diffs in version control are clean. And you can use variables and expressions anywhere inside the structure.

## Using Variables Inside jsonencode

One of the biggest advantages is that you can embed variables directly:

```hcl
variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "allowed_actions" {
  description = "List of S3 actions to allow"
  type        = list(string)
  default     = ["s3:GetObject", "s3:ListBucket"]
}

resource "aws_iam_policy" "s3_access" {
  name = "${var.bucket_name}-access"

  # Variables work naturally inside jsonencode
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = var.allowed_actions
        Resource = [
          "arn:aws:s3:::${var.bucket_name}",
          "arn:aws:s3:::${var.bucket_name}/*"
        ]
      }
    ]
  })
}
```

No string interpolation gymnastics. The variables slot in naturally because you are working with HCL data structures.

## Building Policies with Multiple Statements

Real-world IAM policies usually have multiple statements. `jsonencode` handles this cleanly:

```hcl
resource "aws_iam_role_policy" "app_policy" {
  name = "application-policy"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow reading from the application's S3 bucket
        Sid      = "S3ReadAccess"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.app.arn,
          "${aws_s3_bucket.app.arn}/*"
        ]
      },
      {
        # Allow writing to the logs bucket
        Sid      = "S3LogWriteAccess"
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.logs.arn}/*"
      },
      {
        # Allow reading secrets from SSM Parameter Store
        Sid    = "SSMReadAccess"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/app/*"
      }
    ]
  })
}
```

Notice how you can reference other resources (like `aws_s3_bucket.app.arn`) directly. With raw JSON, you would need messy string interpolation.

## Dynamic Statements with for Expressions

Sometimes you need to generate policy statements dynamically. The `for` expression inside `jsonencode` makes this possible:

```hcl
variable "bucket_permissions" {
  description = "Map of bucket names to their allowed actions"
  type = map(object({
    actions = list(string)
  }))
  default = {
    "data-bucket" = {
      actions = ["s3:GetObject", "s3:PutObject"]
    }
    "config-bucket" = {
      actions = ["s3:GetObject"]
    }
    "logs-bucket" = {
      actions = ["s3:PutObject"]
    }
  }
}

resource "aws_iam_policy" "multi_bucket" {
  name = "multi-bucket-access"

  # Generate one statement per bucket using a for expression
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      for bucket_name, perms in var.bucket_permissions : {
        Sid      = "Access${replace(title(bucket_name), "-", "")}"
        Effect   = "Allow"
        Action   = perms.actions
        Resource = [
          "arn:aws:s3:::${bucket_name}",
          "arn:aws:s3:::${bucket_name}/*"
        ]
      }
    ]
  })
}
```

This generates a separate statement for each bucket entry. Adding a new bucket is just a matter of adding an entry to the variable - no policy editing needed.

## Conditional Statements

You can combine `for` expressions with conditionals to include or exclude statements:

```hcl
variable "enable_dynamodb" {
  description = "Whether the application needs DynamoDB access"
  type        = bool
  default     = false
}

variable "enable_sqs" {
  description = "Whether the application needs SQS access"
  type        = bool
  default     = true
}

locals {
  # Build a list of statements conditionally
  policy_statements = concat(
    # Always include S3 access
    [
      {
        Sid      = "S3Access"
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "*"
      }
    ],
    # Conditionally include DynamoDB access
    var.enable_dynamodb ? [
      {
        Sid      = "DynamoDBAccess"
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:Query"]
        Resource = "*"
      }
    ] : [],
    # Conditionally include SQS access
    var.enable_sqs ? [
      {
        Sid      = "SQSAccess"
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:ReceiveMessage"]
        Resource = "*"
      }
    ] : []
  )
}

resource "aws_iam_policy" "conditional" {
  name = "conditional-access"

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = local.policy_statements
  })
}
```

By building the statement list in a local value, you keep the `jsonencode` call clean while still having full control over what gets included.

## Assume Role Policy Documents

`jsonencode` works just as well for assume role (trust) policies:

```hcl
variable "trusted_account_ids" {
  description = "AWS account IDs allowed to assume this role"
  type        = list(string)
}

resource "aws_iam_role" "cross_account" {
  name = "cross-account-role"

  # Trust policy allowing specific accounts to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = [
            for account_id in var.trusted_account_ids :
            "arn:aws:iam::${account_id}:root"
          ]
        }
        Action = "sts:AssumeRole"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      }
    ]
  })
}
```

## When to Use jsonencode vs. the Data Source

Terraform also offers the `aws_iam_policy_document` data source (covered in a [separate post](https://oneuptime.com/blog/post/terraform-aws-iam-policy-document-data-source/view)). Here is a quick comparison:

- Use `jsonencode` when you want something quick and readable, when your policy is relatively static, or when you are already comfortable with the JSON policy structure.
- Use the `aws_iam_policy_document` data source when you need to merge policies, when you want Terraform-native validation, or when you have complex condition blocks.

Both approaches are valid. Pick whichever keeps your configuration clearest for your team.

## Common Pitfalls

Watch out for a few things when using `jsonencode`:

1. The `jsonencode` function converts HCL booleans to JSON booleans. IAM conditions like `"aws:MultiFactorAuthPresent"` expect the string `"true"`, not the boolean `true`. Always use `"true"` in quotes for IAM conditions.

2. Keys in the HCL map become JSON keys. IAM is case-sensitive about keys like `Effect`, `Action`, and `Resource`. Capitalize them correctly.

3. If you pass a single string where IAM expects an array, it usually works. But for consistency and forward compatibility, prefer using lists: `Action = ["s3:GetObject"]` rather than `Action = "s3:GetObject"`.

## Wrapping Up

The `jsonencode` function is the simplest way to write IAM policies in Terraform without fighting raw JSON. You get variable interpolation, clean diffs, editor support, and early validation. For most IAM policies, it strikes the right balance between simplicity and flexibility. Start using it in your next Terraform project and you will wonder why you ever wrote raw JSON heredocs.

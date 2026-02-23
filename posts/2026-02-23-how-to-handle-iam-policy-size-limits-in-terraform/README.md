# How to Handle IAM Policy Size Limits in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Policy Limits, Infrastructure as Code, Troubleshooting

Description: Learn how to handle AWS IAM policy size limits in Terraform by splitting policies, using wildcards strategically, and restructuring permissions.

---

AWS imposes strict size limits on IAM policies. A managed policy can be at most 6,144 characters, an inline policy for a role is limited to 10,240 characters, and a trust policy is limited to 2,048 characters (expandable to 4,096). When your Terraform-managed policies grow beyond these limits, `terraform apply` fails with a `LimitExceeded` error. This is a common challenge in production environments where applications need access to many specific resources.

This guide covers strategies for handling IAM policy size limits in Terraform, from simple restructuring to advanced patterns for managing large permission sets.

## Understanding the Limits

Here are the IAM policy size limits:

| Policy Type | Size Limit |
|---|---|
| Managed policy | 6,144 characters |
| Inline role policy | 10,240 characters |
| Inline user policy | 2,048 characters |
| Inline group policy | 5,120 characters |
| Trust policy (assume role) | 2,048 characters (4,096 with increase) |
| Managed policies per role | 10 (can be increased to 20) |

The character count includes whitespace in the JSON document. Even if your HCL is compact, the generated JSON may exceed the limit.

## Checking Policy Size

Before hitting the limit, you can check policy sizes proactively.

```hcl
# Output the policy JSON to check its size
output "policy_size" {
  value = length(data.aws_iam_policy_document.large_policy.json)
}
```

## Strategy 1: Split into Multiple Managed Policies

The simplest approach is to split a large policy into multiple smaller managed policies attached to the same role.

```hcl
# Instead of one large policy with everything...
# Split by service or function

# Policy for S3 access
resource "aws_iam_policy" "s3_access" {
  name = "app-s3-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
      ]
      Resource = [
        "arn:aws:s3:::app-data",
        "arn:aws:s3:::app-data/*",
        "arn:aws:s3:::app-logs",
        "arn:aws:s3:::app-logs/*",
        "arn:aws:s3:::app-config",
        "arn:aws:s3:::app-config/*",
      ]
    }]
  })
}

# Policy for DynamoDB access
resource "aws_iam_policy" "dynamodb_access" {
  name = "app-dynamodb-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
      ]
      Resource = [
        "arn:aws:dynamodb:us-east-1:*:table/app-users",
        "arn:aws:dynamodb:us-east-1:*:table/app-orders",
        "arn:aws:dynamodb:us-east-1:*:table/app-sessions",
      ]
    }]
  })
}

# Policy for SQS and SNS
resource "aws_iam_policy" "messaging_access" {
  name = "app-messaging-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage"]
        Resource = "arn:aws:sqs:us-east-1:*:app-*"
      },
      {
        Effect = "Allow"
        Action = ["sns:Publish"]
        Resource = "arn:aws:sns:us-east-1:*:app-*"
      }
    ]
  })
}

# Attach all policies to the role
resource "aws_iam_role_policy_attachment" "policies" {
  for_each = toset([
    aws_iam_policy.s3_access.arn,
    aws_iam_policy.dynamodb_access.arn,
    aws_iam_policy.messaging_access.arn,
  ])

  role       = aws_iam_role.app_role.name
  policy_arn = each.value
}
```

## Strategy 2: Use Wildcards in Resource ARNs

Instead of listing every resource individually, use wildcards where safe.

```hcl
# Before: Individual ARNs (takes up a lot of space)
resource "aws_iam_policy" "verbose" {
  name = "verbose-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject"]
      Resource = [
        "arn:aws:s3:::app-data-us-east-1/*",
        "arn:aws:s3:::app-data-us-west-2/*",
        "arn:aws:s3:::app-data-eu-west-1/*",
        "arn:aws:s3:::app-data-ap-southeast-1/*",
        # ... more regions
      ]
    }]
  })
}

# After: Wildcard pattern (much shorter)
resource "aws_iam_policy" "compact" {
  name = "compact-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "arn:aws:s3:::app-data-*/*"
    }]
  })
}
```

Be careful with wildcards. They might match resources you do not intend to grant access to. Use naming conventions to make wildcards safe.

## Strategy 3: Consolidate Actions

Group related actions to reduce the number of statements.

```hcl
# Before: Multiple statements for the same resource
resource "aws_iam_policy" "multiple_statements" {
  name = "multiple-statements"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::my-bucket/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "arn:aws:s3:::my-bucket/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::my-bucket"
      }
    ]
  })
}

# After: Consolidated into fewer statements
resource "aws_iam_policy" "consolidated" {
  name = "consolidated"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
      ]
      Resource = [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*",
      ]
    }]
  })
}
```

## Strategy 4: Use Action Wildcards

When you need many actions from the same service, consider using action wildcards.

```hcl
# Instead of listing every DynamoDB action individually
resource "aws_iam_policy" "dynamo_wildcard" {
  name = "dynamo-wildcard"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      # Use service-level wildcard if all actions are needed
      Action   = "dynamodb:*"
      # But keep resources specific
      Resource = "arn:aws:dynamodb:us-east-1:*:table/app-*"
    }]
  })
}

# Or use partial wildcards for related actions
resource "aws_iam_policy" "partial_wildcard" {
  name = "partial-wildcard"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # All read actions
        Effect = "Allow"
        Action = [
          "dynamodb:Get*",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGet*",
          "dynamodb:Describe*",
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/app-*"
      }
    ]
  })
}
```

## Strategy 5: Mix Inline and Managed Policies

Use both inline and managed policies to get more total policy space.

```hcl
# Managed policies (up to 10, each 6,144 chars)
resource "aws_iam_role_policy_attachment" "managed" {
  for_each = toset([
    aws_iam_policy.policy_1.arn,
    aws_iam_policy.policy_2.arn,
  ])

  role       = aws_iam_role.app_role.name
  policy_arn = each.value
}

# Inline policy (10,240 chars for role inline policies)
resource "aws_iam_role_policy" "inline" {
  name = "inline-additional-permissions"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:*"]
      Resource = "arn:aws:logs:*:*:log-group:/app/*"
    }]
  })
}
```

## Strategy 6: Remove Whitespace with Compact JSON

Terraform's `jsonencode` produces compact JSON by default, but if you are using heredoc strings, the whitespace counts.

```hcl
# jsonencode produces compact JSON - this is the default for Terraform
resource "aws_iam_policy" "compact_json" {
  name = "compact-json-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "*"
    }]
  })
}
```

## Strategy 7: Dynamic Policy Generation

Use Terraform locals to build policies dynamically and check sizes before applying.

```hcl
variable "resources_by_service" {
  type = map(object({
    actions   = list(string)
    resources = list(string)
  }))
}

locals {
  # Group resources into buckets that fit within the size limit
  max_policy_chars = 6000  # Leave some buffer below 6144

  # Build the policy JSON
  policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [
      for service, config in var.resources_by_service : {
        Sid      = "Allow${title(service)}"
        Effect   = "Allow"
        Action   = config.actions
        Resource = config.resources
      }
    ]
  })

  # Check if we need to split
  needs_split = length(local.policy_json) > local.max_policy_chars
}

# Warn if policy is too large
resource "null_resource" "size_check" {
  count = local.needs_split ? 1 : 0

  provisioner "local-exec" {
    command = "echo 'WARNING: Policy is ${length(local.policy_json)} characters, exceeds ${local.max_policy_chars}. Consider splitting.'"
  }
}
```

## Handling Trust Policy Size Limits

Trust policies have a much smaller limit (2,048 chars). Reduce the number of principals and conditions.

```hcl
# Instead of listing many individual role ARNs...
# Trust the account root and restrict with the caller's policy
data "aws_iam_policy_document" "compact_trust" {
  statement {
    effect = "Allow"

    principals {
      type = "AWS"
      # Trust the account root instead of individual roles
      identifiers = ["arn:aws:iam::123456789012:root"]
    }

    actions = ["sts:AssumeRole"]

    # Use a tag condition instead of listing specific roles
    condition {
      test     = "StringEquals"
      variable = "aws:PrincipalTag/CanAssumeTargetRole"
      values   = ["true"]
    }
  }
}
```

## Best Practices

1. **Monitor policy sizes in CI/CD.** Add checks to your pipeline that warn when policies approach the limit.
2. **Use consistent naming conventions.** Good naming lets you use wildcards safely.
3. **Request limit increases when needed.** AWS can increase the managed-policies-per-role limit from 10 to 20.
4. **Prefer managed policies over inline.** Managed policies are reusable and easier to track.
5. **Remove unused permissions.** Regularly audit policies and remove actions that are no longer needed.

For related topics, see [How to Create IAM Policies with jsonencode in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-policies-with-jsonencode-in-terraform/view) and [How to Implement Least Privilege IAM with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-iam-with-terraform/view).

## Conclusion

IAM policy size limits are a practical constraint that every Terraform user encounters as their infrastructure grows. The key strategies are splitting policies across multiple managed policies, using wildcards in resource ARNs with safe naming conventions, consolidating statements, and mixing inline and managed policies. By proactively monitoring policy sizes and applying these techniques, you can manage even complex permission sets within AWS limits.

# How to Handle IAM Policy Variables in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Security, Infrastructure as Code

Description: Learn how to use IAM policy variables in Terraform to create dynamic, context-aware access control policies for your AWS infrastructure.

---

Managing AWS Identity and Access Management (IAM) policies becomes significantly more powerful when you leverage policy variables. These variables allow you to create dynamic policies that adapt based on the request context, such as the current user, time of request, or resource tags. In this guide, you will learn how to handle IAM policy variables effectively within your Terraform configurations.

## Understanding IAM Policy Variables

IAM policy variables are placeholders that AWS resolves at runtime. They allow you to write a single policy that works for multiple users or resources without duplicating code. Common policy variables include `${aws:username}`, `${aws:PrincipalTag/department}`, and `${aws:CurrentTime}`.

When working with Terraform, you need to be careful about the interaction between Terraform's own interpolation syntax and IAM policy variable syntax since both use the `${}` pattern.

## Setting Up the Provider

Start by configuring your AWS provider in Terraform:

```hcl
# Configure the AWS provider with your preferred region
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Escaping IAM Policy Variables in Terraform

The most important thing to understand is that Terraform uses `${}` for its own string interpolation. When you need to pass IAM policy variables through to AWS, you must escape them properly. In Terraform, you escape the dollar sign by doubling it: `$${aws:username}`.

Here is a basic example:

```hcl
# Create an IAM policy that uses policy variables
# Note the $$ escaping for IAM variables
resource "aws_iam_policy" "user_self_manage" {
  name        = "UserSelfManagePolicy"
  description = "Allow users to manage their own credentials"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowUserToManageOwnCredentials"
        Effect = "Allow"
        Action = [
          "iam:CreateAccessKey",
          "iam:DeleteAccessKey",
          "iam:UpdateAccessKey",
          "iam:GetUser",
          "iam:ChangePassword"
        ]
        # The $${aws:username} variable resolves to the current IAM user
        Resource = "arn:aws:iam::*:user/$${aws:username}"
      }
    ]
  })
}
```

## Using the aws_iam_policy_document Data Source

The recommended approach for creating IAM policies in Terraform is to use the `aws_iam_policy_document` data source. This data source handles variable escaping automatically and provides a structured way to define policies.

```hcl
# Use the policy document data source for cleaner policy definitions
data "aws_iam_policy_document" "user_home_directory" {
  statement {
    sid    = "AllowS3HomeBucket"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ]
    # Use the variable directly - the data source handles escaping
    resources = [
      "arn:aws:s3:::company-home-bucket/$${aws:username}/*",
      "arn:aws:s3:::company-home-bucket/$${aws:username}"
    ]

    # Add a condition to restrict access based on prefix
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["$${aws:username}/*"]
    }
  }
}

# Attach the policy document to an IAM policy resource
resource "aws_iam_policy" "user_home_directory" {
  name   = "UserHomeDirectoryPolicy"
  policy = data.aws_iam_policy_document.user_home_directory.json
}
```

## Working with Tag-Based Policy Variables

Tag-based policy variables are extremely useful for implementing attribute-based access control (ABAC). You can reference tags on the principal, the resource, or the request itself.

```hcl
# Implement ABAC using principal and resource tags
data "aws_iam_policy_document" "abac_policy" {
  # Allow access to EC2 instances that match the user's department tag
  statement {
    sid    = "AllowEC2AccessByDepartment"
    effect = "Allow"
    actions = [
      "ec2:StartInstances",
      "ec2:StopInstances",
      "ec2:RebootInstances"
    ]
    resources = ["*"]

    # Compare the principal's department tag with the resource's department tag
    condition {
      test     = "StringEquals"
      variable = "ec2:ResourceTag/Department"
      values   = ["$${aws:PrincipalTag/Department}"]
    }
  }

  # Allow users to manage resources they created
  statement {
    sid    = "AllowManageOwnResources"
    effect = "Allow"
    actions = [
      "ec2:TerminateInstances"
    ]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "ec2:ResourceTag/CreatedBy"
      values   = ["$${aws:PrincipalTag/Username}"]
    }
  }
}

resource "aws_iam_policy" "abac_policy" {
  name   = "ABACPolicy"
  policy = data.aws_iam_policy_document.abac_policy.json
}
```

## Combining Terraform Variables with IAM Policy Variables

Often you need to combine Terraform variables with IAM policy variables in the same policy. This requires careful attention to syntax:

```hcl
# Define Terraform variables for dynamic configuration
variable "environment" {
  type    = string
  default = "production"
}

variable "bucket_name" {
  type    = string
  default = "my-app-data"
}

# Combine Terraform variables and IAM policy variables
data "aws_iam_policy_document" "combined_variables" {
  statement {
    sid    = "AllowEnvironmentSpecificAccess"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject"
    ]
    # Mix Terraform variable (var.bucket_name, var.environment)
    # with IAM variable ($${aws:username})
    resources = [
      "arn:aws:s3:::${var.bucket_name}/${var.environment}/$${aws:username}/*"
    ]
  }
}

resource "aws_iam_policy" "combined_variables" {
  name   = "CombinedVariablesPolicy-${var.environment}"
  policy = data.aws_iam_policy_document.combined_variables.json
}
```

## Using Request Context Variables

IAM policies can reference variables from the request context, such as the source IP, the current time, or whether MFA was used. These are powerful for creating conditional access policies.

```hcl
# Create a policy that uses request context variables
data "aws_iam_policy_document" "time_based_access" {
  statement {
    sid    = "AllowAccessDuringBusinessHours"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query"
    ]
    resources = ["arn:aws:dynamodb:us-east-1:*:table/production-*"]

    # Restrict access to specific time windows
    condition {
      test     = "DateGreaterThan"
      variable = "aws:CurrentTime"
      values   = ["2026-01-01T08:00:00Z"]
    }

    condition {
      test     = "DateLessThan"
      variable = "aws:CurrentTime"
      values   = ["2026-12-31T18:00:00Z"]
    }

    # Require MFA for this access
    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["true"]
    }
  }
}

resource "aws_iam_policy" "time_based_access" {
  name   = "TimeBasedAccessPolicy"
  policy = data.aws_iam_policy_document.time_based_access.json
}
```

## Creating Reusable Modules with Policy Variables

For organizations managing many accounts, wrapping IAM policy variable patterns into reusable Terraform modules helps maintain consistency:

```hcl
# modules/abac-policy/main.tf
variable "tag_key" {
  type        = string
  description = "The tag key to use for ABAC matching"
}

variable "allowed_actions" {
  type        = list(string)
  description = "List of IAM actions to allow"
}

variable "resource_arns" {
  type        = list(string)
  description = "List of resource ARNs"
}

data "aws_iam_policy_document" "abac" {
  statement {
    effect    = "Allow"
    actions   = var.allowed_actions
    resources = var.resource_arns

    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/${var.tag_key}"
      values   = ["$${aws:PrincipalTag/${var.tag_key}}"]
    }
  }
}

output "policy_json" {
  value = data.aws_iam_policy_document.abac.json
}
```

## Debugging Policy Variable Issues

When policies with variables do not work as expected, use these strategies for debugging:

```hcl
# Output the rendered policy JSON for inspection
output "rendered_policy" {
  value = data.aws_iam_policy_document.abac_policy.json
}
```

Run `terraform plan` and inspect the output to verify that IAM variables appear correctly (with single `$` signs) while Terraform variables have been resolved to their actual values.

## Best Practices

When handling IAM policy variables in Terraform, keep these guidelines in mind. Always prefer the `aws_iam_policy_document` data source over raw JSON strings. It provides better validation and makes working with variables more predictable. Use ABAC patterns with tag-based variables to reduce the total number of policies needed. Document which IAM variables are used in each policy so that team members understand the runtime behavior. Test policies with the IAM Policy Simulator before deploying to production.

For more infrastructure monitoring after deploying your IAM configurations, check out our guide on [monitoring AWS resources](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-ec2-in-terraform/view).

## Conclusion

IAM policy variables in Terraform give you the power to create flexible, dynamic access control policies. The key challenge is managing the escaping between Terraform and IAM variable syntax, but using the `aws_iam_policy_document` data source and the `$${}` escape pattern makes this straightforward. By combining these techniques with ABAC patterns and reusable modules, you can build a scalable IAM strategy that grows with your organization.

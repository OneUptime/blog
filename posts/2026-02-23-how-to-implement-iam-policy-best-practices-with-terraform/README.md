# How to Implement IAM Policy Best Practices with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Security, Infrastructure as Code

Description: Learn how to implement AWS IAM policy best practices using Terraform including least privilege, policy boundaries, and secure role management.

---

IAM policies are the backbone of AWS security. Every API call, every service interaction, and every user action is governed by IAM. Getting these policies wrong can expose your entire cloud environment to risk. Getting them right with Terraform means you can enforce security standards consistently across every environment you manage.

This guide walks through practical IAM policy patterns in Terraform that follow AWS best practices and real-world security requirements.

## Start with Least Privilege

The single most important IAM principle is least privilege. Every role, user, and service should have only the permissions it actually needs. In Terraform, this means writing narrow policy documents instead of reaching for wildcards.

Here is a bad example that teams commonly start with:

```hcl
# DO NOT do this in production
resource "aws_iam_policy" "too_broad" {
  name = "way-too-broad-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:*"
        Resource = "*"
      }
    ]
  })
}
```

Instead, scope down to exactly what the application needs:

```hcl
# Scoped policy for a specific application bucket
resource "aws_iam_policy" "app_s3_access" {
  name        = "app-s3-read-write"
  description = "Allow read/write to the application data bucket only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowListBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.app_data.arn
      },
      {
        Sid    = "AllowObjectOperations"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.app_data.arn}/*"
      }
    ]
  })
}
```

This policy only grants access to a single bucket and only the specific actions the application requires.

## Use IAM Roles Instead of IAM Users

For services and applications, always prefer IAM roles over IAM users with long-lived credentials. Terraform makes it straightforward to create roles with proper assume role policies.

```hcl
# Create a role for an ECS task
resource "aws_iam_role" "ecs_task_role" {
  name = "ecs-app-task-role"

  # Only ECS tasks can assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Attach the scoped policy to the role
resource "aws_iam_role_policy_attachment" "ecs_task_s3" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.app_s3_access.arn
}
```

Notice the `Condition` block in the assume role policy. This prevents confused deputy attacks by ensuring only your account can trigger the role assumption.

## Implement Permission Boundaries

Permission boundaries set the maximum permissions that an IAM entity can have. Even if someone attaches a full admin policy to a role, the permission boundary caps what that role can actually do.

```hcl
# Define a permission boundary
resource "aws_iam_policy" "permission_boundary" {
  name        = "developer-permission-boundary"
  description = "Maximum permissions for developer-created roles"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowedServices"
        Effect = "Allow"
        Action = [
          "s3:*",
          "dynamodb:*",
          "sqs:*",
          "sns:*",
          "lambda:*",
          "logs:*",
          "cloudwatch:*"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyIAMChanges"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:DeleteUser",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:AttachUserPolicy",
          "iam:PutUserPolicy"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyOrganizationChanges"
        Effect = "Deny"
        Action = [
          "organizations:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# Apply the boundary when creating roles
resource "aws_iam_role" "developer_lambda_role" {
  name                 = "developer-lambda-role"
  permissions_boundary = aws_iam_policy.permission_boundary.arn

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}
```

## Use Terraform Data Sources for AWS Managed Policies

When you need AWS managed policies, reference them by data source rather than hardcoding ARNs:

```hcl
# Reference AWS managed policy by name
data "aws_iam_policy" "read_only_access" {
  name = "ReadOnlyAccess"
}

# Use it in attachments
resource "aws_iam_role_policy_attachment" "read_only" {
  role       = aws_iam_role.auditor_role.name
  policy_arn = data.aws_iam_policy.read_only_access.arn
}
```

This approach is cleaner and avoids issues with partition-specific ARN formats across AWS commercial, GovCloud, and China regions.

## Enforce MFA on Sensitive Operations

For IAM users who do need to exist (break-glass scenarios, for example), enforce MFA on sensitive actions:

```hcl
resource "aws_iam_policy" "require_mfa" {
  name = "require-mfa-for-sensitive-ops"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyWithoutMFA"
        Effect = "Deny"
        Action = [
          "iam:*",
          "s3:DeleteBucket",
          "ec2:TerminateInstances",
          "rds:DeleteDBInstance"
        ]
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })
}
```

## Create Reusable Policy Modules

If your organization has multiple teams and AWS accounts, wrap your IAM patterns in Terraform modules:

```hcl
# modules/service-role/main.tf
variable "service_name" {
  type        = string
  description = "Name of the service this role is for"
}

variable "trusted_service" {
  type        = string
  description = "AWS service principal that can assume this role"
}

variable "policy_arns" {
  type        = list(string)
  description = "List of policy ARNs to attach"
}

variable "permission_boundary_arn" {
  type        = string
  description = "ARN of the permission boundary policy"
}

resource "aws_iam_role" "this" {
  name                 = "${var.service_name}-role"
  permissions_boundary = var.permission_boundary_arn

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = var.trusted_service
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "policies" {
  count      = length(var.policy_arns)
  role       = aws_iam_role.this.name
  policy_arn = var.policy_arns[count.index]
}
```

Using this module:

```hcl
module "lambda_role" {
  source = "./modules/service-role"

  service_name            = "data-processor"
  trusted_service         = "lambda.amazonaws.com"
  permission_boundary_arn = aws_iam_policy.permission_boundary.arn
  policy_arns = [
    aws_iam_policy.app_s3_access.arn,
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  ]
}
```

## Use Policy Conditions Liberally

Conditions are one of the most underused features in IAM policies. They let you add context-based controls:

```hcl
resource "aws_iam_policy" "ip_restricted" {
  name = "ip-restricted-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowFromCorporateNetwork"
        Effect = "Allow"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.sensitive.arn,
          "${aws_s3_bucket.sensitive.arn}/*"
        ]
        Condition = {
          IpAddress = {
            "aws:SourceIp" = var.corporate_cidr_blocks
          }
        }
      }
    ]
  })
}
```

## Audit and Validate Your Policies

Use the `aws_iam_policy_document` data source for better policy composition and validation:

```hcl
data "aws_iam_policy_document" "combined" {
  # First statement from one source
  source_policy_documents = [
    data.aws_iam_policy_document.base_permissions.json,
    data.aws_iam_policy_document.additional_permissions.json
  ]

  # Add deny statements that override everything
  override_policy_documents = [
    data.aws_iam_policy_document.deny_dangerous_actions.json
  ]
}
```

This approach lets you compose policies from multiple sources while keeping each piece readable and testable.

## Summary

IAM policy management with Terraform comes down to a few key habits: scope permissions narrowly, prefer roles over users, use permission boundaries as guardrails, and wrap patterns in reusable modules. The Terraform code becomes your security documentation, and the state file becomes your audit trail for who has access to what.

For more on securing your Terraform workflows, check out our guide on [how to scan Terraform plans for security issues](https://oneuptime.com/blog/post/2026-02-23-how-to-scan-terraform-plans-for-security-issues/view) and [how to handle Terraform with compliance frameworks](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-with-compliance-frameworks-soc2-pci-hipaa/view).

# How to Create IAM Permission Boundaries in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Permission Boundaries, Security, Governance

Description: Learn how to create and enforce IAM permission boundaries in Terraform to set maximum permission limits on roles and users in your AWS account.

---

IAM permission boundaries are an advanced feature that lets you set the maximum permissions an IAM entity (user or role) can have. Even if a role has a policy that grants full administrative access, a permission boundary limits what actions the role can actually perform. Permission boundaries are essential for delegated administration scenarios where you want to allow teams to create their own IAM roles without the risk of privilege escalation.

This guide covers creating permission boundaries in Terraform, attaching them to roles and users, and building governance patterns that prevent privilege escalation.

## How Permission Boundaries Work

A permission boundary is a managed policy that you attach to an IAM entity as a boundary, not as a permissions policy. The effective permissions of the entity are the intersection of its identity-based policies and the permission boundary.

Think of it this way:
- **Identity-based policy**: "This role CAN do X, Y, Z."
- **Permission boundary**: "This role MAY do A, B, C at most."
- **Effective permissions**: Only the actions that appear in both.

If the identity policy allows `s3:*` but the boundary only allows `s3:GetObject`, the role can only perform `s3:GetObject`.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM permissions
- AWS CLI configured with valid credentials

## Creating a Basic Permission Boundary

Start with a simple permission boundary that limits a role to specific services.

```hcl
# Define the permission boundary policy
resource "aws_iam_policy" "developer_boundary" {
  name        = "developer-permission-boundary"
  description = "Permission boundary for developer-created roles"
  path        = "/boundaries/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowedServices"
        Effect = "Allow"
        Action = [
          "s3:*",
          "dynamodb:*",
          "lambda:*",
          "logs:*",
          "cloudwatch:*",
          "sqs:*",
          "sns:*",
          "events:*",
          "apigateway:*",
          "ssm:GetParameter",
          "ssm:GetParameters",
          "secretsmanager:GetSecretValue",
        ]
        Resource = "*"
      },
      {
        # Allow managing own IAM roles with the same boundary
        Sid    = "AllowIAMWithBoundary"
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:DeleteRole",
          "iam:TagRole",
          "iam:UntagRole",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "iam:PermissionsBoundary" = "arn:aws:iam::123456789012:policy/boundaries/developer-permission-boundary"
          }
        }
      },
      {
        # Deny changing or removing the permission boundary
        Sid    = "DenyBoundaryChanges"
        Effect = "Deny"
        Action = [
          "iam:DeleteRolePermissionsBoundary",
          "iam:PutRolePermissionsBoundary",
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Attaching Permission Boundaries to Roles

When creating a role, specify the permission boundary using the `permissions_boundary` argument.

```hcl
# Create a role with a permission boundary
resource "aws_iam_role" "developer_lambda_role" {
  name = "developer-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  # Apply the permission boundary
  permissions_boundary = aws_iam_policy.developer_boundary.arn

  tags = {
    ManagedBy = "developer-team"
  }
}

# Even though this policy grants broad S3 access,
# the boundary limits what actions are actually allowed
resource "aws_iam_role_policy_attachment" "lambda_s3" {
  role       = aws_iam_role.developer_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}
```

## Attaching Permission Boundaries to Users

Permission boundaries work the same way for IAM users.

```hcl
# Create a user with a permission boundary
resource "aws_iam_user" "developer" {
  name                 = "developer-user"
  permissions_boundary = aws_iam_policy.developer_boundary.arn
}
```

## Building a Delegated Administration Pattern

The real power of permission boundaries comes from allowing developers to create their own roles while preventing privilege escalation.

```hcl
# Get the current account ID
data "aws_caller_identity" "current" {}

# Permission boundary that developers must apply to roles they create
resource "aws_iam_policy" "app_boundary" {
  name = "app-permission-boundary"
  path = "/boundaries/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow common application services
        Sid    = "ApplicationServices"
        Effect = "Allow"
        Action = [
          "s3:*",
          "dynamodb:*",
          "sqs:*",
          "sns:*",
          "lambda:*",
          "logs:*",
          "cloudwatch:*",
          "xray:*",
          "kms:Decrypt",
          "kms:GenerateDataKey",
        ]
        Resource = "*"
      },
      {
        # Explicitly deny dangerous actions
        Sid    = "DenyDangerousActions"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:CreateGroup",
          "iam:CreatePolicy",
          "organizations:*",
          "account:*",
        ]
        Resource = "*"
      }
    ]
  })
}

# Policy that allows developers to create roles with the boundary
resource "aws_iam_policy" "developer_admin" {
  name        = "developer-admin-policy"
  description = "Allows developers to create IAM roles with the app boundary attached"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Allow creating roles only if the permission boundary is attached
        Sid    = "CreateRolesWithBoundary"
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:TagRole",
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/app-*"
        Condition = {
          StringEquals = {
            "iam:PermissionsBoundary" = aws_iam_policy.app_boundary.arn
          }
        }
      },
      {
        # Allow managing policies on roles with the right prefix
        Sid    = "ManageRolePolicies"
        Effect = "Allow"
        Action = [
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:DeleteRole",
          "iam:PassRole",
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/app-*"
      },
      {
        # Allow managing custom policies with the right prefix
        Sid    = "ManageCustomPolicies"
        Effect = "Allow"
        Action = [
          "iam:CreatePolicy",
          "iam:DeletePolicy",
          "iam:CreatePolicyVersion",
          "iam:DeletePolicyVersion",
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/app-*"
      },
      {
        # Prevent removing or changing the permission boundary
        Sid    = "DenyBoundaryModification"
        Effect = "Deny"
        Action = [
          "iam:DeleteRolePermissionsBoundary",
          "iam:PutRolePermissionsBoundary",
        ]
        Resource = "*"
      },
      {
        # Prevent modifying the boundary policy itself
        Sid    = "DenyBoundaryPolicyModification"
        Effect = "Deny"
        Action = [
          "iam:CreatePolicyVersion",
          "iam:DeletePolicy",
          "iam:DeletePolicyVersion",
          "iam:SetDefaultPolicyVersion",
        ]
        Resource = aws_iam_policy.app_boundary.arn
      }
    ]
  })
}
```

## Environment-Specific Boundaries

Different environments can have different permission boundaries.

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

variable "env_allowed_actions" {
  type = map(list(string))
  default = {
    dev = [
      "s3:*",
      "dynamodb:*",
      "lambda:*",
      "logs:*",
      "cloudwatch:*",
      "sqs:*",
      "sns:*",
      "ec2:*",
      "rds:*",
    ]
    staging = [
      "s3:*",
      "dynamodb:*",
      "lambda:*",
      "logs:*",
      "cloudwatch:*",
      "sqs:*",
      "sns:*",
    ]
    prod = [
      "s3:GetObject",
      "s3:ListBucket",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "logs:GetLogEvents",
      "logs:FilterLogEvents",
      "cloudwatch:GetMetricData",
    ]
  }
}

resource "aws_iam_policy" "env_boundaries" {
  for_each = toset(var.environments)

  name = "${each.value}-permission-boundary"
  path = "/boundaries/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = var.env_allowed_actions[each.value]
      Resource = "*"
    }]
  })
}
```

## Using Permission Boundaries with Terraform Modules

When creating reusable modules, accept the permission boundary as a variable.

```hcl
# In your module
variable "permissions_boundary_arn" {
  description = "ARN of the permission boundary to apply to created roles"
  type        = string
  default     = null
}

resource "aws_iam_role" "module_role" {
  name = "module-created-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  # Apply boundary if provided
  permissions_boundary = var.permissions_boundary_arn
}
```

## Best Practices

1. **Always prevent boundary removal.** Include deny statements that prevent users from removing or modifying the permission boundary.
2. **Use path-based organization.** Put boundary policies in a `/boundaries/` path to distinguish them from regular policies.
3. **Require boundaries for delegated role creation.** Use IAM conditions to ensure any role created by developers has the boundary attached.
4. **Start permissive, tighten over time.** Begin with a broader boundary and narrow it as you understand what permissions are actually needed.
5. **Test boundaries thoroughly.** A too-restrictive boundary will break applications. Test in non-production environments first.

For more on IAM security in Terraform, see [How to Implement Least Privilege IAM with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-iam-with-terraform/view) and [How to Create SCPs (Service Control Policies) in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-scps-service-control-policies-in-terraform/view).

## Conclusion

Permission boundaries are one of the most effective tools for preventing privilege escalation in AWS. They set an upper limit on what an IAM entity can do, regardless of what permissions policies are attached to it. By using Terraform to manage permission boundaries, you can enforce consistent governance across your organization, enable delegated administration safely, and maintain a clear audit trail of your security controls. Start with environment-specific boundaries and build up to full delegated administration patterns as your needs grow.

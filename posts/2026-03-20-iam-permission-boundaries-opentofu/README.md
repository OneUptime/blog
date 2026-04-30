# How to Set Up IAM Permission Boundaries with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, Permission Boundaries, Security, Delegation, Infrastructure as Code

Description: Learn how to configure IAM Permission Boundaries using OpenTofu to limit the maximum permissions that can be granted by a delegated administrator, preventing privilege escalation.

## Introduction

IAM Permission Boundaries set the maximum permissions that identity-based policies can grant to an IAM entity. They enable safe delegation-you can allow developers to create IAM roles for their services without letting identity-based policies grant permissions beyond what you've defined as the boundary.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM permissions

## Step 1: Create a Permission Boundary Policy

```hcl
data "aws_caller_identity" "current" {}

# Permission boundary limits what any role created by developers can do

# Even if a developer attaches AdministratorAccess, the boundary caps it
resource "aws_iam_policy" "developer_boundary" {
  name        = "DeveloperPermissionBoundary"
  description = "Maximum permissions for developer-created roles"
  path        = "/boundaries/"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCoreServices"
        Effect = "Allow"
        Action = [
          "s3:*",
          "dynamodb:*",
          "lambda:*",
          "sqs:*",
          "sns:*",
          "logs:*",
          "cloudwatch:*",
          "xray:*"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyPrivilegeEscalation"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:DeleteUser",
          "iam:CreateGroup",
          "iam:AttachUserPolicy",
          "iam:PutUserPolicy",
          "organizations:*"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Step 2: Apply Boundary When Creating Roles

```hcl
# A role that has the permission boundary applied
# Even if more permissive identity-based policies are attached later,
# the boundary caps the effective permissions
resource "aws_iam_role" "service_role" {
  name        = "app-service-role"
  description = "Application service role with permission boundary"
  path        = "/application/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  # Apply the permission boundary
  permissions_boundary = aws_iam_policy.developer_boundary.arn

  tags = {
    BoundaryApplied = "true"
    BoundaryPolicy  = "DeveloperPermissionBoundary"
  }
}
```

## Step 3: Allow Developers to Create Roles with Boundaries Enforced

```hcl
# IAM policy for developers to create roles,
# but only if they apply the required boundary
resource "aws_iam_policy" "developer_role_creation" {
  name        = "DeveloperRoleCreationPolicy"
  description = "Allow developers to create roles with mandatory boundary"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowRoleCreationWithBoundary"
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:PutRolePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:DeleteRolePolicy"
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/*"
        Condition = {
          StringEquals = {
            "iam:PermissionsBoundary" = aws_iam_policy.developer_boundary.arn
          }
        }
      },
      {
        Sid    = "DenyBoundaryRemoval"
        Effect = "Deny"
        Action = [
          "iam:DeleteRolePermissionsBoundary",
          "iam:PutRolePermissionsBoundary"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Step 4: Attach the Role Creation Policy to Developers

```hcl
resource "aws_iam_group" "developers" {
  name = "developers"
}

resource "aws_iam_group_policy_attachment" "developer_creation" {
  group      = aws_iam_group.developers.name
  policy_arn = aws_iam_policy.developer_role_creation.arn
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

IAM Permission Boundaries enable safe delegation-developers can create IAM roles for their services without risk of identity-based policies granting permissions beyond the defined boundary. The key insight is that effective permissions are the intersection of identity-based policies AND the boundary, and the boundary does not grant permissions on its own. Always add a `DenyBoundaryRemoval` policy to ensure developers cannot simply change or remove the boundary from roles they create.

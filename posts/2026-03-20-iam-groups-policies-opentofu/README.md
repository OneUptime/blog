# How to Create IAM Groups and Group Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM, Group, Policies, Access Management, Infrastructure as Code

Description: Learn how to create IAM user groups with attached policies using OpenTofu to manage permissions for teams of users sharing common access requirements.

## Introduction

IAM groups let you manage permissions for multiple users with similar roles by attaching policies to the group rather than individual users. When a user is added to a group, they inherit all the group's permissions. This simplifies permission management for teams.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with IAM permissions

## Step 1: Create IAM Groups

```hcl
# Group for developers with read access to development resources

resource "aws_iam_group" "developers" {
  name = "developers"
  path = "/teams/"
}

# Group for DevOps engineers with infrastructure access
resource "aws_iam_group" "devops" {
  name = "devops"
  path = "/teams/"
}

# Group for security team with audit access
resource "aws_iam_group" "security" {
  name = "security-team"
  path = "/teams/"
}
```

## Step 2: Create Group Policies

```hcl
# Policy for developers - read access to S3, logs, and metrics
resource "aws_iam_group_policy" "developers" {
  name  = "developers-policy"
  group = aws_iam_group.developers.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3ReadDev"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.project_name}-dev-*",
          "arn:aws:s3:::${var.project_name}-dev-*/*"
        ]
      },
      {
        Sid    = "AllowCloudWatchReadOnly"
        Effect = "Allow"
        Action = ["cloudwatch:GetMetricData", "logs:Describe*", "logs:GetLog*"]
        Resource = "*"
      }
    ]
  })
}

# Attach AWS-managed policies to the DevOps group
resource "aws_iam_group_policy_attachment" "devops_poweruser" {
  group      = aws_iam_group.devops.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

# Attach a custom policy for DevOps IAM management
resource "aws_iam_group_policy_attachment" "devops_iam" {
  group      = aws_iam_group.devops.name
  policy_arn = aws_iam_policy.iam_limited.arn
}

data "aws_caller_identity" "current" {}

resource "aws_iam_policy" "iam_limited" {
  name        = "IAMLimitedPolicy"
  description = "Limited IAM access for DevOps"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowIAMReadOnly"
        Effect = "Allow"
        Action = [
          "iam:List*",
          "iam:Get*"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowRolePolicyManagementWithBoundary"
        Effect = "Allow"
        Action = [
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy"
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/*"
        Condition = {
          ArnEquals = {
            "iam:PermissionsBoundary" = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/DevOpsBoundary"
          }
        }
      }
    ]
  })
}

# Security team gets read-only access + security service access
resource "aws_iam_group_policy_attachment" "security_readonly" {
  group      = aws_iam_group.security.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

resource "aws_iam_group_policy_attachment" "security_audit" {
  group      = aws_iam_group.security.name
  policy_arn = "arn:aws:iam::aws:policy/SecurityAudit"
}
```

## Step 3: Create IAM Users and Add to Groups

```hcl
resource "aws_iam_user" "developers" {
  for_each = toset(var.developer_usernames)

  name = each.value
  path = "/users/"

  tags = {
    Team = "Development"
  }
}

# Add all developers to the developers group
resource "aws_iam_user_group_membership" "developers" {
  for_each = aws_iam_user.developers

  user   = each.value.name
  groups = [aws_iam_group.developers.name]
}

# A DevOps user who is in multiple groups
resource "aws_iam_user" "devops_lead" {
  name = "devops-lead"
  path = "/users/"
}

resource "aws_iam_user_group_membership" "devops_lead" {
  user = aws_iam_user.devops_lead.name
  groups = [
    aws_iam_group.developers.name,
    aws_iam_group.devops.name,
  ]
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

If you're using IAM users, groups are the standard way to manage their permissions. For human users in AWS organizations, AWS generally recommends federation or IAM Identity Center instead of long-term IAM users. Attach policies to groups rather than individual users to reduce administrative overhead; adding or removing a user from a group changes their effective permissions, though IAM changes can take time to propagate. Use multiple groups with specific permissions (e.g., `developers` + `devops`) to compose the exact permission set each person needs.

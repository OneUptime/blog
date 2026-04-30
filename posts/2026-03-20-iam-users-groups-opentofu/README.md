# How to Manage IAM Users and Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, IAM, AWS, Security, Users, Group, Infrastructure as Code

Description: Learn how to manage AWS IAM users, groups, and memberships with OpenTofu - creating users, organizing them into groups with policies, setting up programmatic access, and enforcing MFA requirements.

## Introduction

AWS IAM users and groups control human and programmatic access to AWS APIs. OpenTofu manages users, group memberships, policy attachments, and access key lifecycle - all as code that can be reviewed, audited, and version-controlled. For human users, prefer AWS SSO (IAM Identity Center) over long-lived IAM users.

## IAM Groups with Policies

```hcl
# Group for developers - read-only baseline plus lifecycle access to tagged dev EC2 instances

resource "aws_iam_group" "developers" {
  name = "developers"
  path = "/engineering/"
}

resource "aws_iam_group_policy_attachment" "developers_readonly" {
  group      = aws_iam_group.developers.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Custom policy for selected dev instance actions
resource "aws_iam_group_policy" "developers_custom" {
  name  = "developers-custom"
  group = aws_iam_group.developers.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowDevEnvironmentAccess"
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:RebootInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = "dev"
          }
        }
      }
    ]
  })
}

# Group for operations
resource "aws_iam_group" "operations" {
  name = "operations"
  path = "/ops/"
}

resource "aws_iam_group_policy_attachment" "ops_admin" {
  group      = aws_iam_group.operations.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Group for security team - read-only security services
resource "aws_iam_group" "security" {
  name = "security"
  path = "/security/"
}

resource "aws_iam_group_policy_attachment" "security_audit" {
  group      = aws_iam_group.security.name
  policy_arn = "arn:aws:iam::aws:policy/SecurityAudit"
}
```

## IAM Users

```hcl
variable "iam_users" {
  description = "Map of IAM users to create"
  type = map(object({
    groups = list(string)
    tags   = map(string)
  }))
  default = {
    "alice" = {
      groups = ["developers"]
      tags   = { Team = "backend" }
    }
    "bob" = {
      groups = ["developers", "operations"]
      tags   = { Team = "platform" }
    }
    "carol" = {
      groups = ["security"]
      tags   = { Team = "security" }
    }
  }
}

resource "aws_iam_user" "users" {
  for_each = var.iam_users

  name          = each.key
  path          = "/users/"
  force_destroy = true  # Allows deletion even with access keys/MFA

  tags = merge(each.value.tags, {
    ManagedBy = "opentofu"
  })
}

# Group memberships
resource "aws_iam_user_group_membership" "users" {
  for_each = var.iam_users

  user   = aws_iam_user.users[each.key].name
  groups = each.value.groups

  depends_on = [aws_iam_group.developers, aws_iam_group.operations, aws_iam_group.security]
}
```

## Access Key Management for Programmatic Access

```hcl
# Service account for CI/CD pipeline (prefer OIDC roles where possible)
resource "aws_iam_user" "cicd" {
  name = "cicd-pipeline"
  path = "/service-accounts/"

  tags = { Purpose = "CI/CD pipeline automation" }
}

resource "aws_iam_access_key" "cicd" {
  user = aws_iam_user.cicd.name
}

# Store access key in Secrets Manager
resource "aws_secretsmanager_secret" "cicd_keys" {
  name        = "/cicd/aws-credentials"
  description = "AWS credentials for CI/CD pipeline"
}

resource "aws_secretsmanager_secret_version" "cicd_keys" {
  secret_id = aws_secretsmanager_secret.cicd_keys.id

  secret_string = jsonencode({
    access_key_id     = aws_iam_access_key.cicd.id
    secret_access_key = aws_iam_access_key.cicd.secret
  })
}
```

## MFA Enforcement Policy

```hcl
# Policy that enforces MFA for all actions except the minimum actions
# needed to manage an MFA device and request a session token
resource "aws_iam_policy" "enforce_mfa" {
  name        = "EnforceMFA"
  description = "Deny all API calls unless MFA is present"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowViewAccountInfo"
        Effect = "Allow"
        Action = "iam:ListVirtualMFADevices"
        Resource = "*"
      },
      {
        Sid    = "AllowManageOwnVirtualMFADevice"
        Effect = "Allow"
        Action = ["iam:CreateVirtualMFADevice"]
        Resource = "arn:aws:iam::*:mfa/*"
      },
      {
        Sid    = "AllowManageOwnUserMFA"
        Effect = "Allow"
        Action = [
          "iam:DeactivateMFADevice",
          "iam:EnableMFADevice",
          "iam:GetUser",
          "iam:GetMFADevice",
          "iam:ListMFADevices",
          "iam:ResyncMFADevice"
        ]
        Resource = "arn:aws:iam::*:user/$${aws:username}"
      },
      {
        Sid    = "DenyWithoutMFA"
        Effect = "Deny"
        NotAction = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:GetMFADevice",
          "iam:GetUser",
          "iam:ListMFADevices",
          "iam:ListVirtualMFADevices",
          "iam:ResyncMFADevice",
          "sts:GetSessionToken"
        ]
        Resource = "*"
        Condition = {
          BoolIfExists = { "aws:MultiFactorAuthPresent" = "false" }
        }
      }
    ]
  })
}

resource "aws_iam_group_policy_attachment" "developers_mfa" {
  group      = aws_iam_group.developers.name
  policy_arn = aws_iam_policy.enforce_mfa.arn
}
```

## Account Password Policy

```hcl
resource "aws_iam_account_password_policy" "main" {
  minimum_password_length        = 16
  require_lowercase_characters   = true
  require_numbers                = true
  require_uppercase_characters   = true
  require_symbols                = true
  allow_users_to_change_password = true
  max_password_age               = 90   # Force rotation every 90 days
  password_reuse_prevention      = 24   # Cannot reuse last 24 passwords
  hard_expiry                    = false # Allow users to reset expired passwords themselves
}
```

## Conclusion

IAM users and groups with OpenTofu provide auditable access management for AWS. Use groups to assign permissions - never attach policies directly to users, as group-based policies scale better across team changes. For human users, prefer AWS IAM Identity Center (SSO) over long-lived IAM users - it integrates with your identity provider and doesn't require access key management. When IAM users are necessary (legacy systems, specific tooling), enforce MFA with the deny policy shown above and rotate access keys regularly.

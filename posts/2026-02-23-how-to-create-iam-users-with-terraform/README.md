# How to Create IAM Users with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Security, Access Management, Identity

Description: Learn how to create and manage AWS IAM users with Terraform including policies, groups, access keys, MFA enforcement, and security best practices for identity management.

---

AWS Identity and Access Management (IAM) is the foundation of AWS security. IAM users represent individual people or applications that need access to your AWS resources. Managing IAM users with Terraform ensures your access control is documented, auditable, version-controlled, and consistently applied. This prevents the configuration drift that commonly occurs with manually managed IAM resources.

This guide covers how to create IAM users with Terraform, including group memberships, policy attachments, access key management, and security best practices.

## Creating a Basic IAM User

### Simple User Creation

```hcl
# Basic IAM user
resource "aws_iam_user" "developer" {
  name = "john.doe"
  path = "/developers/"

  # Force destroy allows deletion even if the user has non-Terraform-managed resources
  force_destroy = true

  tags = {
    Team        = "Engineering"
    Department  = "Product"
    Environment = "production"
  }
}

# Login profile for console access
resource "aws_iam_user_login_profile" "developer" {
  user                    = aws_iam_user.developer.name
  password_reset_required = true  # Force password change on first login
}

# Access key for programmatic access
resource "aws_iam_access_key" "developer" {
  user = aws_iam_user.developer.name
}
```

## Creating Multiple Users

### Using for_each for Multiple Users

```hcl
# Define users with their configurations
variable "users" {
  description = "Map of IAM users to create"
  type = map(object({
    path        = string
    groups      = list(string)
    tags        = map(string)
    console_access = bool
    programmatic_access = bool
  }))
  default = {
    "alice.smith" = {
      path   = "/developers/"
      groups = ["developers", "readonly"]
      tags = {
        Team       = "Backend"
        Department = "Engineering"
      }
      console_access      = true
      programmatic_access = true
    }
    "bob.jones" = {
      path   = "/developers/"
      groups = ["developers"]
      tags = {
        Team       = "Frontend"
        Department = "Engineering"
      }
      console_access      = true
      programmatic_access = false
    }
    "carol.white" = {
      path   = "/admins/"
      groups = ["administrators"]
      tags = {
        Team       = "Platform"
        Department = "Engineering"
      }
      console_access      = true
      programmatic_access = true
    }
    "deploy-bot" = {
      path   = "/service-accounts/"
      groups = ["deployers"]
      tags = {
        Type    = "service-account"
        Purpose = "CI/CD deployment"
      }
      console_access      = false
      programmatic_access = true
    }
  }
}

# Create IAM users
resource "aws_iam_user" "users" {
  for_each = var.users

  name          = each.key
  path          = each.value.path
  force_destroy = true
  tags          = each.value.tags
}

# Console login profiles for users who need console access
resource "aws_iam_user_login_profile" "console_users" {
  for_each = {
    for name, config in var.users : name => config
    if config.console_access
  }

  user                    = aws_iam_user.users[each.key].name
  password_reset_required = true
}

# Access keys for users who need programmatic access
resource "aws_iam_access_key" "programmatic_users" {
  for_each = {
    for name, config in var.users : name => config
    if config.programmatic_access
  }

  user = aws_iam_user.users[each.key].name
}
```

## Creating IAM Groups

```hcl
# Developers group
resource "aws_iam_group" "developers" {
  name = "developers"
  path = "/groups/"
}

# Administrators group
resource "aws_iam_group" "administrators" {
  name = "administrators"
  path = "/groups/"
}

# Read-only group
resource "aws_iam_group" "readonly" {
  name = "readonly"
  path = "/groups/"
}

# Deployers group for CI/CD
resource "aws_iam_group" "deployers" {
  name = "deployers"
  path = "/groups/"
}

# Map of all groups for dynamic membership
locals {
  groups = {
    developers     = aws_iam_group.developers.name
    administrators = aws_iam_group.administrators.name
    readonly       = aws_iam_group.readonly.name
    deployers      = aws_iam_group.deployers.name
  }
}

# Dynamic group memberships
resource "aws_iam_user_group_membership" "memberships" {
  for_each = var.users

  user   = aws_iam_user.users[each.key].name
  groups = [for g in each.value.groups : local.groups[g]]
}
```

## Attaching Policies to Groups

```hcl
# Developer group policy - access to specific services
resource "aws_iam_group_policy" "developers" {
  name  = "developer-policy"
  group = aws_iam_group.developers.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EC2Access"
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "ec2:StartInstances",
          "ec2:StopInstances"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = ["development", "staging"]
          }
        }
      },
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::dev-*",
          "arn:aws:s3:::dev-*/*"
        ]
      },
      {
        Sid    = "CloudWatchAccess"
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:ListMetrics",
          "logs:GetLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}

# Administrator group - full admin with MFA required
resource "aws_iam_group_policy_attachment" "admin_access" {
  group      = aws_iam_group.administrators.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Read-only group - view-only access
resource "aws_iam_group_policy_attachment" "readonly_access" {
  group      = aws_iam_group.readonly.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Deployer group - specific deployment permissions
resource "aws_iam_group_policy" "deployers" {
  name  = "deployer-policy"
  group = aws_iam_group.deployers.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECSDeployment"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:DeregisterTaskDefinition"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRAccess"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = "*"
      },
      {
        Sid    = "PassRole"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = [
          "arn:aws:iam::*:role/ecs-*",
          "arn:aws:iam::*:role/lambda-*"
        ]
      }
    ]
  })
}
```

## Enforcing MFA

```hcl
# Policy requiring MFA for all actions except setting up MFA
resource "aws_iam_policy" "require_mfa" {
  name        = "RequireMFA"
  description = "Requires MFA for all actions except managing own MFA"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowViewAccountInfo"
        Effect = "Allow"
        Action = [
          "iam:GetAccountPasswordPolicy",
          "iam:ListVirtualMFADevices"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowManageOwnMFA"
        Effect = "Allow"
        Action = [
          "iam:CreateVirtualMFADevice",
          "iam:DeleteVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:ListMFADevices",
          "iam:ResyncMFADevice"
        ]
        Resource = [
          "arn:aws:iam::*:mfa/$${aws:username}",
          "arn:aws:iam::*:user/$${aws:username}"
        ]
      },
      {
        Sid    = "AllowManageOwnPasswords"
        Effect = "Allow"
        Action = [
          "iam:ChangePassword",
          "iam:GetUser"
        ]
        Resource = "arn:aws:iam::*:user/$${aws:username}"
      },
      {
        Sid    = "DenyAllExceptMFASetup"
        Effect = "Deny"
        NotAction = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:GetUser",
          "iam:ListMFADevices",
          "iam:ListVirtualMFADevices",
          "iam:ResyncMFADevice",
          "iam:ChangePassword",
          "sts:GetSessionToken"
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

# Attach MFA policy to all groups
resource "aws_iam_group_policy_attachment" "require_mfa" {
  for_each = {
    developers     = aws_iam_group.developers.name
    administrators = aws_iam_group.administrators.name
    readonly       = aws_iam_group.readonly.name
  }

  group      = each.value
  policy_arn = aws_iam_policy.require_mfa.arn
}
```

## Password Policy

```hcl
# Account-level password policy
resource "aws_iam_account_password_policy" "strict" {
  minimum_password_length        = 14
  require_lowercase_characters   = true
  require_numbers                = true
  require_uppercase_characters   = true
  require_symbols                = true
  allow_users_to_change_password = true
  max_password_age               = 90
  password_reuse_prevention      = 12
  hard_expiry                    = false
}
```

## Access Key Rotation

```hcl
# Track access key age with a null_resource
resource "null_resource" "key_rotation_reminder" {
  for_each = {
    for name, config in var.users : name => config
    if config.programmatic_access
  }

  # Trigger recreation every 90 days
  triggers = {
    rotation_date = formatdate("YYYY-MM", timestamp())
  }

  provisioner "local-exec" {
    command = "echo 'Reminder: Review access key for ${each.key}'"
  }
}
```

## Outputs

```hcl
output "user_arns" {
  description = "ARNs of created IAM users"
  value       = { for name, user in aws_iam_user.users : name => user.arn }
}

output "access_key_ids" {
  description = "Access key IDs for programmatic users"
  value       = { for name, key in aws_iam_access_key.programmatic_users : name => key.id }
  sensitive   = false
}

output "access_key_secrets" {
  description = "Access key secrets for programmatic users"
  value       = { for name, key in aws_iam_access_key.programmatic_users : name => key.secret }
  sensitive   = true  # Mark as sensitive to prevent display
}

output "initial_passwords" {
  description = "Initial passwords for console users"
  value       = { for name, profile in aws_iam_user_login_profile.console_users : name => profile.password }
  sensitive   = true
}
```

## Monitoring with OneUptime

IAM security is critical to your AWS environment. OneUptime can monitor your AWS account for unauthorized access patterns, unusual API call volumes, and security compliance. Set up alerts for when new access keys are created or when users access resources outside their normal patterns. Visit [OneUptime](https://oneuptime.com) for security monitoring.

## Conclusion

Managing IAM users with Terraform provides a secure, auditable, and reproducible approach to identity management. Group-based permissions simplify policy management and ensure consistent access levels. MFA enforcement protects against compromised credentials. Password policies establish baseline security requirements. By keeping IAM configuration in Terraform, you have a complete audit trail of who has access to what, when changes were made, and who approved them. This is invaluable for security reviews, compliance audits, and incident response. Always prefer groups over individual user policies, enforce MFA for all human users, and use service accounts with minimal permissions for automated processes.

For more AWS security topics, see [How to Handle Container Secrets in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-container-secrets-in-terraform/view) and [How to Create Serverless API Backend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-serverless-api-backend-with-terraform/view).

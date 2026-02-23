# How to Create AWS SSO Permission Sets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, SSO, IAM Identity Center, Security, Infrastructure as Code

Description: Learn how to create and manage AWS IAM Identity Center (SSO) permission sets using Terraform for centralized multi-account access management.

---

AWS IAM Identity Center, formerly known as AWS SSO, provides centralized access management for multiple AWS accounts. Permission sets define the level of access that users and groups have when they sign in to an AWS account. Managing these permission sets with Terraform ensures consistency across your organization. This guide covers creating, customizing, and assigning permission sets.

## Understanding Permission Sets

A permission set is a collection of IAM policies that you create in IAM Identity Center. When you assign a permission set to a user or group for a specific AWS account, Identity Center creates a corresponding IAM role in that account. Users then assume this role when they access the account.

## Setting Up the Provider

```hcl
# Configure the AWS provider
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

# Get the Identity Center instance
data "aws_ssoadmin_instances" "main" {}

locals {
  identity_store_id = tolist(data.aws_ssoadmin_instances.main.identity_store_ids)[0]
  instance_arn      = tolist(data.aws_ssoadmin_instances.main.arns)[0]
}
```

## Creating Basic Permission Sets

Start with common permission sets based on AWS managed policies:

```hcl
# Create a ReadOnly permission set
resource "aws_ssoadmin_permission_set" "readonly" {
  name             = "ReadOnlyAccess"
  description      = "Provides read-only access to AWS services and resources"
  instance_arn     = local.instance_arn
  session_duration = "PT8H"  # 8-hour session

  tags = {
    ManagedBy = "terraform"
  }
}

# Attach the AWS managed ReadOnly policy
resource "aws_ssoadmin_managed_policy_attachment" "readonly" {
  instance_arn       = local.instance_arn
  managed_policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
  permission_set_arn = aws_ssoadmin_permission_set.readonly.arn
}

# Create an Administrator permission set
resource "aws_ssoadmin_permission_set" "admin" {
  name             = "AdministratorAccess"
  description      = "Provides full access to AWS services and resources"
  instance_arn     = local.instance_arn
  session_duration = "PT4H"  # Shorter session for admin access

  tags = {
    ManagedBy = "terraform"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "admin" {
  instance_arn       = local.instance_arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  permission_set_arn = aws_ssoadmin_permission_set.admin.arn
}
```

## Creating Custom Permission Sets with Inline Policies

For specific permission requirements, use inline policies:

```hcl
# Create a developer permission set with custom inline policy
resource "aws_ssoadmin_permission_set" "developer" {
  name             = "DeveloperAccess"
  description      = "Custom access for development teams"
  instance_arn     = local.instance_arn
  session_duration = "PT8H"

  tags = {
    ManagedBy = "terraform"
    Team      = "engineering"
  }
}

# Attach a managed policy for basic access
resource "aws_ssoadmin_managed_policy_attachment" "developer_poweruser" {
  instance_arn       = local.instance_arn
  managed_policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn
}

# Add an inline policy for additional restrictions
resource "aws_ssoadmin_permission_set_inline_policy" "developer_restrictions" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn

  inline_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyIAMChanges"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:DeleteUser",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy"
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
      },
      {
        Sid    = "DenyBillingAccess"
        Effect = "Deny"
        Action = [
          "aws-portal:*",
          "budgets:*"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Permission Sets with Permission Boundaries

Add permission boundaries to limit the maximum permissions:

```hcl
# Create a permission set with a permissions boundary
resource "aws_ssoadmin_permission_set" "sandbox" {
  name             = "SandboxAccess"
  description      = "Limited access for sandbox environments"
  instance_arn     = local.instance_arn
  session_duration = "PT8H"
}

resource "aws_ssoadmin_managed_policy_attachment" "sandbox_poweruser" {
  instance_arn       = local.instance_arn
  managed_policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
  permission_set_arn = aws_ssoadmin_permission_set.sandbox.arn
}

# Attach a permissions boundary
resource "aws_ssoadmin_permissions_boundary_attachment" "sandbox" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.sandbox.arn

  permissions_boundary {
    managed_policy_arn = aws_iam_policy.sandbox_boundary.arn
  }
}

# Define the permissions boundary policy
resource "aws_iam_policy" "sandbox_boundary" {
  name = "SandboxBoundary"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowedServices"
        Effect = "Allow"
        Action = [
          "ec2:*",
          "s3:*",
          "lambda:*",
          "dynamodb:*",
          "cloudwatch:*",
          "logs:*"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyExpensiveServices"
        Effect = "Deny"
        Action = [
          "redshift:*",
          "rds:CreateDBInstance",
          "ec2:RunInstances"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "ec2:InstanceType" = ["t3.micro", "t3.small", "t3.medium"]
          }
        }
      }
    ]
  })
}
```

## Creating Permission Sets at Scale

Use variables and loops for managing many permission sets:

```hcl
# Define permission sets as a variable
variable "permission_sets" {
  type = map(object({
    description      = string
    session_duration = string
    managed_policies = list(string)
    inline_policy    = string
  }))
  default = {
    "NetworkAdmin" = {
      description      = "Network administration access"
      session_duration = "PT4H"
      managed_policies = [
        "arn:aws:iam::aws:policy/job-function/NetworkAdministrator"
      ]
      inline_policy = ""
    }
    "DatabaseAdmin" = {
      description      = "Database administration access"
      session_duration = "PT4H"
      managed_policies = [
        "arn:aws:iam::aws:policy/job-function/DatabaseAdministrator"
      ]
      inline_policy = ""
    }
    "SecurityAuditor" = {
      description      = "Security audit and compliance access"
      session_duration = "PT8H"
      managed_policies = [
        "arn:aws:iam::aws:policy/SecurityAudit",
        "arn:aws:iam::aws:policy/job-function/ViewOnlyAccess"
      ]
      inline_policy = ""
    }
  }
}

# Create permission sets dynamically
resource "aws_ssoadmin_permission_set" "dynamic" {
  for_each = var.permission_sets

  name             = each.key
  description      = each.value.description
  instance_arn     = local.instance_arn
  session_duration = each.value.session_duration
}

# Attach managed policies
resource "aws_ssoadmin_managed_policy_attachment" "dynamic" {
  for_each = {
    for item in flatten([
      for ps_name, ps in var.permission_sets : [
        for policy_arn in ps.managed_policies : {
          key        = "${ps_name}-${policy_arn}"
          ps_name    = ps_name
          policy_arn = policy_arn
        }
      ]
    ]) : item.key => item
  }

  instance_arn       = local.instance_arn
  managed_policy_arn = each.value.policy_arn
  permission_set_arn = aws_ssoadmin_permission_set.dynamic[each.value.ps_name].arn
}
```

## Assigning Permission Sets to Accounts

```hcl
# Assign the developer permission set to the dev team in the dev account
resource "aws_ssoadmin_account_assignment" "dev_team_dev_account" {
  instance_arn       = local.instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn

  principal_id   = data.aws_identitystore_group.developers.group_id
  principal_type = "GROUP"

  target_id   = var.dev_account_id
  target_type = "AWS_ACCOUNT"
}

# Look up the group in Identity Store
data "aws_identitystore_group" "developers" {
  identity_store_id = local.identity_store_id

  alternate_identifier {
    unique_attribute {
      attribute_path  = "DisplayName"
      attribute_value = "Developers"
    }
  }
}

variable "dev_account_id" {
  type        = string
  description = "AWS account ID for the development environment"
}
```

## Best Practices

Use descriptive names for permission sets that clearly indicate the level of access granted. Keep session durations short for high-privilege permission sets. Use inline deny policies to create guardrails even when attaching broad managed policies. Always test permission sets in a non-production account before rolling them out. Use permission boundaries to create an upper limit on permissions that cannot be exceeded.

For assigning permission sets to users and groups, see our guide on [Identity Center Assignments](https://oneuptime.com/blog/post/2026-02-23-how-to-create-identity-center-assignments-with-terraform/view).

## Conclusion

AWS IAM Identity Center permission sets managed through Terraform provide a scalable, consistent approach to multi-account access management. By defining permission sets as code, you can version control your access policies, review changes through pull requests, and automate deployments. Whether you need simple managed policy attachments or complex custom permission sets with boundaries, Terraform handles the full spectrum of SSO configuration.

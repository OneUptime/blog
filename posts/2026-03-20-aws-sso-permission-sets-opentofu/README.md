# How to Create AWS SSO Permission Sets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, IAM Identity Center, SSO, Permission Sets, Infrastructure as Code, Access Management

Description: Learn how to create and manage AWS IAM Identity Center (SSO) permission sets using OpenTofu to define role-based access for users across multiple AWS accounts.

## Introduction

AWS IAM Identity Center permission sets define the AWS access granted to users and groups when they sign in via SSO. Permission sets are templates-you create them once and assign them to users/groups in specific accounts. This guide covers creating permission sets from AWS-managed and custom policies.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Identity Center and Organizations permissions
- AWS IAM Identity Center enabled in the management account
- AWS provider configured for the AWS Region where IAM Identity Center is enabled

## Step 1: Get the Identity Center Instance

```hcl
# Data source to get the SSO instance ARN and identity store ID

data "aws_ssoadmin_instances" "main" {}

locals {
  sso_instance_arn      = tolist(data.aws_ssoadmin_instances.main.arns)[0]
  sso_identity_store_id = tolist(data.aws_ssoadmin_instances.main.identity_store_ids)[0]
}
```

## Step 2: Create Permission Sets

```hcl
# Read-only permission set for auditors
resource "aws_ssoadmin_permission_set" "read_only" {
  name             = "ReadOnly"
  description      = "Read-only access for auditors and stakeholders"
  instance_arn     = local.sso_instance_arn
  session_duration = "PT4H"  # ISO 8601 duration - 4 hours

  tags = { Role = "Auditor" }
}

# Developer permission set with broad AWS service access
resource "aws_ssoadmin_permission_set" "developer" {
  name             = "Developer"
  description      = "Developer access for application teams"
  instance_arn     = local.sso_instance_arn
  session_duration = "PT8H"  # 8 hours

  tags = { Role = "Developer" }
}

# Admin permission set for infrastructure team
resource "aws_ssoadmin_permission_set" "admin" {
  name             = "Administrator"
  description      = "Full administrator access"
  instance_arn     = local.sso_instance_arn
  session_duration = "PT1H"  # Short session for privileged access

  tags = { Role = "Administrator" }
}
```

## Step 3: Attach AWS Managed Policies

```hcl
# Attach ReadOnlyAccess to the auditor permission set
resource "aws_ssoadmin_managed_policy_attachment" "read_only" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.read_only.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Attach PowerUserAccess to the developer permission set
resource "aws_ssoadmin_managed_policy_attachment" "developer_poweruser" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

# Attach AdministratorAccess to the admin permission set
resource "aws_ssoadmin_managed_policy_attachment" "admin" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.admin.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

## Step 4: Attach Custom Inline Policies

```hcl
# Add custom permissions to the developer permission set
resource "aws_ssoadmin_permission_set_inline_policy" "developer_custom" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn

  inline_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyProductionEc2Termination"
        Effect = "Deny"
        Action = ["ec2:TerminateInstances"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = "production"
          }
        }
      },
      {
        Sid    = "DenyProductionRdsDeletion"
        Effect = "Deny"
        Action = ["rds:DeleteDBInstance"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "rds:db-tag/Environment" = "production"
          }
        }
      }
    ]
  })
}
```

## Step 5: Assign Permission Sets to Accounts

```hcl
# Assign read-only permission set to all users in the auditor group
data "aws_identitystore_group" "auditors" {
  identity_store_id = local.sso_identity_store_id

  alternate_identifier {
    unique_attribute {
      attribute_path  = "DisplayName"
      attribute_value = "Auditors"
    }
  }
}

resource "aws_ssoadmin_account_assignment" "auditor_dev" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.read_only.arn

  principal_id   = data.aws_identitystore_group.auditors.group_id
  principal_type = "GROUP"

  target_id   = var.dev_account_id
  target_type = "AWS_ACCOUNT"
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

AWS IAM Identity Center permission sets enable centralized, role-based access management across your entire AWS organization. Define permission sets once and assign them to different accounts-the same "Developer" set can have access in dev but not production. Set short session durations for privileged permission sets and use custom inline policies to add guardrails like preventing production EC2 instance termination or RDS DB instance deletion by developer accounts.

# How to Create SSO Permission Sets in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, SSO, IAM Identity Center, Security, Infrastructure as Code

Description: Learn how to create and manage AWS IAM Identity Center (SSO) permission sets, account assignments, and inline policies using Terraform.

---

AWS IAM Identity Center (formerly AWS SSO) is how you manage human access to multiple AWS accounts from a single place. Instead of creating IAM users in every account, you define permission sets centrally and assign them to users or groups for specific accounts. Managing permission sets through Terraform gives you auditability, consistency, and the ability to review access changes in pull requests before they take effect.

This guide covers creating permission sets, attaching managed and inline policies, and assigning them to groups and accounts.

## Prerequisites

- Terraform 1.0 or later
- AWS IAM Identity Center enabled in your organization
- AWS Organizations set up (SSO requires it)
- Administrative access to the management account

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

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

## Getting the SSO Instance

Before creating permission sets, you need to reference your existing SSO instance.

```hcl
# Look up the SSO instance in your organization
data "aws_ssoadmin_instances" "main" {}

# Store the instance ARN and identity store ID for reuse
locals {
  sso_instance_arn = tolist(data.aws_ssoadmin_instances.main.arns)[0]
  identity_store_id = tolist(data.aws_ssoadmin_instances.main.identity_store_ids)[0]
}
```

## Creating a Basic Permission Set

A permission set is essentially a collection of policies that define what someone can do when they assume access to an account.

```hcl
# Administrator permission set
resource "aws_ssoadmin_permission_set" "admin" {
  name             = "AdministratorAccess"
  description      = "Full administrator access to the AWS account"
  instance_arn     = local.sso_instance_arn
  session_duration = "PT4H" # 4 hour session

  tags = {
    ManagedBy = "Terraform"
  }
}

# Attach the AWS managed AdministratorAccess policy
resource "aws_ssoadmin_managed_policy_attachment" "admin_policy" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.admin.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

## Read-Only Permission Set

```hcl
# Read-only permission set for auditors and viewers
resource "aws_ssoadmin_permission_set" "readonly" {
  name             = "ReadOnlyAccess"
  description      = "Read-only access for viewing resources without making changes"
  instance_arn     = local.sso_instance_arn
  session_duration = "PT8H" # 8 hour session for read-only

  tags = {
    ManagedBy = "Terraform"
  }
}

resource "aws_ssoadmin_managed_policy_attachment" "readonly_policy" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.readonly.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

## Developer Permission Set with Custom Inline Policy

For developer access, you often want a mix of managed policies and custom inline policies that tailor permissions to your organization.

```hcl
# Developer permission set with custom permissions
resource "aws_ssoadmin_permission_set" "developer" {
  name             = "DeveloperAccess"
  description      = "Developer access for building and deploying applications"
  instance_arn     = local.sso_instance_arn
  session_duration = "PT8H"

  # Relay state URL - where users land after signing in
  relay_state = "https://console.aws.amazon.com/ecs/home"

  tags = {
    ManagedBy = "Terraform"
    Role      = "developer"
  }
}

# Attach PowerUserAccess as a base
resource "aws_ssoadmin_managed_policy_attachment" "developer_power_user" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

# Add an inline policy to restrict what developers cannot do
resource "aws_ssoadmin_permission_set_inline_policy" "developer_restrictions" {
  instance_arn       = local.sso_instance_arn
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
          "iam:DetachRolePolicy",
          "iam:PutRolePolicy",
        ]
        Resource = "*"
        # Allow changes to roles that start with "app-" prefix
        Condition = {
          StringNotLike = {
            "iam:ResourceTag/ManagedBy" = "application"
          }
        }
      },
      {
        Sid    = "DenyBillingAccess"
        Effect = "Deny"
        Action = [
          "aws-portal:*",
          "budgets:ModifyBudget",
          "budgets:DeleteBudget",
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Permission Set with Customer Managed Policies

You can also reference customer managed policies that exist in the target accounts.

```hcl
# Permission set for database administrators
resource "aws_ssoadmin_permission_set" "dba" {
  name             = "DatabaseAdmin"
  description      = "Database administrator access for RDS and DynamoDB"
  instance_arn     = local.sso_instance_arn
  session_duration = "PT4H"
}

# Attach AWS managed RDS policy
resource "aws_ssoadmin_managed_policy_attachment" "dba_rds" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.dba.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AmazonRDSFullAccess"
}

# Attach AWS managed DynamoDB policy
resource "aws_ssoadmin_managed_policy_attachment" "dba_dynamodb" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.dba.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# Reference a customer managed policy that must exist in target accounts
resource "aws_ssoadmin_customer_managed_policy_attachment" "dba_custom" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.dba.arn

  customer_managed_policy_reference {
    name = "CustomDatabaseAdminPolicy"
    path = "/"
  }
}
```

## Permission Boundaries

You can set a permissions boundary on a permission set to cap the maximum privileges.

```hcl
# Permission set with a permissions boundary
resource "aws_ssoadmin_permission_set" "contractor" {
  name             = "ContractorAccess"
  description      = "Limited access for contractors with permissions boundary"
  instance_arn     = local.sso_instance_arn
  session_duration = "PT2H" # Short session for contractors
}

resource "aws_ssoadmin_permissions_boundary_attachment" "contractor_boundary" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.contractor.arn

  permissions_boundary {
    managed_policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
  }
}
```

## Looking Up Groups in Identity Store

To assign permission sets, you need the group IDs from your identity store.

```hcl
# Look up existing groups in Identity Center
data "aws_identitystore_group" "admins" {
  identity_store_id = local.identity_store_id

  alternate_identifier {
    unique_attribute {
      attribute_path  = "DisplayName"
      attribute_value = "Administrators"
    }
  }
}

data "aws_identitystore_group" "developers" {
  identity_store_id = local.identity_store_id

  alternate_identifier {
    unique_attribute {
      attribute_path  = "DisplayName"
      attribute_value = "Developers"
    }
  }
}

data "aws_identitystore_group" "readonly_users" {
  identity_store_id = local.identity_store_id

  alternate_identifier {
    unique_attribute {
      attribute_path  = "DisplayName"
      attribute_value = "ReadOnlyUsers"
    }
  }
}
```

## Assigning Permission Sets to Accounts

Account assignments connect a group (or user) to a permission set for a specific account.

```hcl
# Variables for account IDs
variable "production_account_id" {
  type    = string
  default = "111111111111"
}

variable "staging_account_id" {
  type    = string
  default = "222222222222"
}

variable "dev_account_id" {
  type    = string
  default = "333333333333"
}

# Admins get AdministratorAccess in all accounts
resource "aws_ssoadmin_account_assignment" "admins_prod" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.admin.arn

  principal_id   = data.aws_identitystore_group.admins.group_id
  principal_type = "GROUP"

  target_id   = var.production_account_id
  target_type = "AWS_ACCOUNT"
}

resource "aws_ssoadmin_account_assignment" "admins_staging" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.admin.arn

  principal_id   = data.aws_identitystore_group.admins.group_id
  principal_type = "GROUP"

  target_id   = var.staging_account_id
  target_type = "AWS_ACCOUNT"
}

# Developers get DeveloperAccess in staging and dev
resource "aws_ssoadmin_account_assignment" "devs_staging" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn

  principal_id   = data.aws_identitystore_group.developers.group_id
  principal_type = "GROUP"

  target_id   = var.staging_account_id
  target_type = "AWS_ACCOUNT"
}

resource "aws_ssoadmin_account_assignment" "devs_dev" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.developer.arn

  principal_id   = data.aws_identitystore_group.developers.group_id
  principal_type = "GROUP"

  target_id   = var.dev_account_id
  target_type = "AWS_ACCOUNT"
}

# Developers get read-only in production
resource "aws_ssoadmin_account_assignment" "devs_prod_readonly" {
  instance_arn       = local.sso_instance_arn
  permission_set_arn = aws_ssoadmin_permission_set.readonly.arn

  principal_id   = data.aws_identitystore_group.developers.group_id
  principal_type = "GROUP"

  target_id   = var.production_account_id
  target_type = "AWS_ACCOUNT"
}
```

## Scaling with for_each

When you have many accounts and groups, use `for_each` to keep things manageable.

```hcl
# Define assignments as a map
locals {
  account_assignments = {
    "admins-prod" = {
      group_name         = "Administrators"
      permission_set_arn = aws_ssoadmin_permission_set.admin.arn
      account_id         = var.production_account_id
    }
    "admins-staging" = {
      group_name         = "Administrators"
      permission_set_arn = aws_ssoadmin_permission_set.admin.arn
      account_id         = var.staging_account_id
    }
    "devs-dev" = {
      group_name         = "Developers"
      permission_set_arn = aws_ssoadmin_permission_set.developer.arn
      account_id         = var.dev_account_id
    }
  }

  # Lookup group IDs
  group_ids = {
    "Administrators" = data.aws_identitystore_group.admins.group_id
    "Developers"     = data.aws_identitystore_group.developers.group_id
    "ReadOnlyUsers"  = data.aws_identitystore_group.readonly_users.group_id
  }
}

resource "aws_ssoadmin_account_assignment" "assignments" {
  for_each = local.account_assignments

  instance_arn       = local.sso_instance_arn
  permission_set_arn = each.value.permission_set_arn

  principal_id   = local.group_ids[each.value.group_name]
  principal_type = "GROUP"

  target_id   = each.value.account_id
  target_type = "AWS_ACCOUNT"
}
```

## Best Practices

1. **Assign to groups, not users.** Always assign permission sets to groups. When someone joins or leaves a team, you just update their group membership rather than modifying Terraform.

2. **Use short session durations for privileged access.** Admin sessions should be 1-4 hours. Read-only sessions can be longer.

3. **Follow least privilege.** Start with minimal permissions and add more as needed. It is easier to grant access than to take it away.

4. **Use inline policies for deny rules.** Attach managed policies for what you want to allow, and use inline policies for explicit deny statements.

5. **Document your permission sets.** Use meaningful names and descriptions so people know what each permission set is for without reading the policy details.

6. **Review assignments regularly.** Just because Terraform manages the assignments does not mean you should skip access reviews.

## Conclusion

Managing AWS IAM Identity Center permission sets through Terraform brings the same rigor to access management that you apply to infrastructure. Every permission change goes through version control and code review, giving you a clear audit trail of who has access to what and when it changed. Start with a few well-defined permission sets and expand as your organization's needs grow.

For more on multi-account management, check out our guide on [creating Organizations and SCPs in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-organizations-and-scps-in-terraform/view).

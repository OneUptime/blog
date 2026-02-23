# How to Create Identity Center Assignments with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM Identity Center, SSO, Security, Infrastructure as Code

Description: Learn how to manage AWS IAM Identity Center account assignments using Terraform to control who can access which AWS accounts with what permissions.

---

AWS IAM Identity Center account assignments are the glue that connects users and groups to specific AWS accounts with defined permission sets. Managing these assignments through Terraform gives you a clear, auditable record of who has access to what across your entire AWS organization. This guide walks you through creating and managing Identity Center assignments at scale.

## Understanding Account Assignments

An account assignment in IAM Identity Center has three components: a principal (user or group), an AWS account (the target), and a permission set (the level of access). When you create an assignment, Identity Center automatically provisions an IAM role in the target account.

## Setting Up the Provider

```hcl
# Configure the AWS provider for Identity Center management
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

# Get the Identity Center instance details
data "aws_ssoadmin_instances" "main" {}

locals {
  instance_arn      = tolist(data.aws_ssoadmin_instances.main.arns)[0]
  identity_store_id = tolist(data.aws_ssoadmin_instances.main.identity_store_ids)[0]
}

# Get the AWS Organization details
data "aws_organizations_organization" "main" {}
```

## Looking Up Groups and Users

Before creating assignments, you need to reference the principals:

```hcl
# Look up groups from the Identity Store
data "aws_identitystore_group" "platform" {
  identity_store_id = local.identity_store_id
  alternate_identifier {
    unique_attribute {
      attribute_path  = "DisplayName"
      attribute_value = "Platform Engineering"
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

data "aws_identitystore_group" "security" {
  identity_store_id = local.identity_store_id
  alternate_identifier {
    unique_attribute {
      attribute_path  = "DisplayName"
      attribute_value = "Security Team"
    }
  }
}

# Look up a specific user
data "aws_identitystore_user" "admin" {
  identity_store_id = local.identity_store_id
  alternate_identifier {
    unique_attribute {
      attribute_path  = "UserName"
      attribute_value = "admin@company.com"
    }
  }
}
```

## Referencing Permission Sets

```hcl
# Reference existing permission sets
data "aws_ssoadmin_permission_set" "admin" {
  instance_arn = local.instance_arn
  name         = "AdministratorAccess"
}

data "aws_ssoadmin_permission_set" "readonly" {
  instance_arn = local.instance_arn
  name         = "ReadOnlyAccess"
}

data "aws_ssoadmin_permission_set" "developer" {
  instance_arn = local.instance_arn
  name         = "DeveloperAccess"
}
```

## Creating Basic Assignments

```hcl
# Assign the Platform Engineering group as admins to the production account
resource "aws_ssoadmin_account_assignment" "platform_prod_admin" {
  instance_arn       = local.instance_arn
  permission_set_arn = data.aws_ssoadmin_permission_set.admin.arn

  principal_id   = data.aws_identitystore_group.platform.group_id
  principal_type = "GROUP"

  target_id   = var.production_account_id
  target_type = "AWS_ACCOUNT"
}

# Assign developers read-only access to production
resource "aws_ssoadmin_account_assignment" "developers_prod_readonly" {
  instance_arn       = local.instance_arn
  permission_set_arn = data.aws_ssoadmin_permission_set.readonly.arn

  principal_id   = data.aws_identitystore_group.developers.group_id
  principal_type = "GROUP"

  target_id   = var.production_account_id
  target_type = "AWS_ACCOUNT"
}

# Assign developers full access to the development account
resource "aws_ssoadmin_account_assignment" "developers_dev_full" {
  instance_arn       = local.instance_arn
  permission_set_arn = data.aws_ssoadmin_permission_set.developer.arn

  principal_id   = data.aws_identitystore_group.developers.group_id
  principal_type = "GROUP"

  target_id   = var.development_account_id
  target_type = "AWS_ACCOUNT"
}

variable "production_account_id" {
  type = string
}

variable "development_account_id" {
  type = string
}
```

## Scaling Assignments with a Matrix Pattern

Define assignments as a matrix of groups, accounts, and permission sets:

```hcl
# Define the access matrix
variable "access_matrix" {
  type = list(object({
    group_name     = string
    account_id     = string
    permission_set = string
  }))
  default = [
    # Platform team gets admin everywhere
    { group_name = "Platform Engineering", account_id = "111111111111", permission_set = "AdministratorAccess" },
    { group_name = "Platform Engineering", account_id = "222222222222", permission_set = "AdministratorAccess" },
    { group_name = "Platform Engineering", account_id = "333333333333", permission_set = "AdministratorAccess" },

    # Developers get full access to dev, read-only to staging and prod
    { group_name = "Developers", account_id = "111111111111", permission_set = "DeveloperAccess" },
    { group_name = "Developers", account_id = "222222222222", permission_set = "ReadOnlyAccess" },
    { group_name = "Developers", account_id = "333333333333", permission_set = "ReadOnlyAccess" },

    # Security team gets audit access everywhere
    { group_name = "Security Team", account_id = "111111111111", permission_set = "SecurityAudit" },
    { group_name = "Security Team", account_id = "222222222222", permission_set = "SecurityAudit" },
    { group_name = "Security Team", account_id = "333333333333", permission_set = "SecurityAudit" },
  ]
}

# Look up all unique groups referenced in the matrix
locals {
  unique_groups = toset([for a in var.access_matrix : a.group_name])
  unique_permission_sets = toset([for a in var.access_matrix : a.permission_set])
}

data "aws_identitystore_group" "matrix_groups" {
  for_each          = local.unique_groups
  identity_store_id = local.identity_store_id
  alternate_identifier {
    unique_attribute {
      attribute_path  = "DisplayName"
      attribute_value = each.value
    }
  }
}

data "aws_ssoadmin_permission_set" "matrix_sets" {
  for_each     = local.unique_permission_sets
  instance_arn = local.instance_arn
  name         = each.value
}

# Create all assignments from the matrix
resource "aws_ssoadmin_account_assignment" "matrix" {
  for_each = {
    for idx, assignment in var.access_matrix :
    "${assignment.group_name}-${assignment.account_id}-${assignment.permission_set}" => assignment
  }

  instance_arn       = local.instance_arn
  permission_set_arn = data.aws_ssoadmin_permission_set.matrix_sets[each.value.permission_set].arn

  principal_id   = data.aws_identitystore_group.matrix_groups[each.value.group_name].group_id
  principal_type = "GROUP"

  target_id   = each.value.account_id
  target_type = "AWS_ACCOUNT"
}
```

## Assigning to All Accounts in an OU

Automatically assign permissions to all accounts in an organizational unit:

```hcl
# Get all accounts in a specific OU
data "aws_organizations_organizational_unit_descendant_accounts" "production" {
  parent_id = var.production_ou_id
}

variable "production_ou_id" {
  type        = string
  description = "ID of the Production organizational unit"
}

# Assign security audit access to all production accounts
resource "aws_ssoadmin_account_assignment" "security_all_prod" {
  for_each = {
    for account in data.aws_organizations_organizational_unit_descendant_accounts.production.accounts :
    account.id => account
    if account.status == "ACTIVE"
  }

  instance_arn       = local.instance_arn
  permission_set_arn = data.aws_ssoadmin_permission_set.readonly.arn

  principal_id   = data.aws_identitystore_group.security.group_id
  principal_type = "GROUP"

  target_id   = each.key
  target_type = "AWS_ACCOUNT"
}
```

## Generating Assignment Reports

```hcl
# Output a summary of all assignments
output "assignment_summary" {
  value = {
    for key, assignment in aws_ssoadmin_account_assignment.matrix :
    key => {
      group      = split("-", key)[0]
      account    = assignment.target_id
      permission = split("-", key)[2]
    }
  }
  description = "Summary of all Identity Center assignments"
}
```

## Best Practices

Always assign permissions to groups rather than individual users. This makes it easier to onboard and offboard team members. Use the matrix pattern to define your entire access model in a single, readable data structure. Assign the minimum permission set needed for each group-account combination. Create separate permission sets for different environments rather than relying on the same set everywhere. Review assignments regularly and remove any that are no longer needed.

For creating the permission sets referenced in your assignments, see our guide on [AWS SSO Permission Sets](https://oneuptime.com/blog/post/2026-02-23-how-to-create-aws-sso-permission-sets-with-terraform/view).

## Conclusion

Managing IAM Identity Center assignments with Terraform transforms a manual, error-prone process into a structured, auditable workflow. The matrix pattern makes it easy to understand your entire access model at a glance, while for_each loops handle the scaling. By combining permission sets with account assignments, you create a complete access management system that grows with your AWS organization.

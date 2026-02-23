# How to Create Cross-Account IAM Roles in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Cross-Account, Security, Multi-Account

Description: Learn how to create cross-account IAM roles in Terraform to enable secure access between AWS accounts with trust policies and external IDs.

---

In multi-account AWS environments, services and users in one account often need to access resources in another account. Cross-account IAM roles provide a secure mechanism for this. Instead of sharing long-lived credentials between accounts, you create a role in the target account that principals from the source account can assume. Terraform makes it easy to set up both sides of this relationship.

This guide walks through creating cross-account IAM roles in Terraform, covering trust policies, external IDs, permission boundaries, and real-world patterns for multi-account architectures.

## How Cross-Account Access Works

Cross-account access in AWS follows a two-step process:

1. **Target account**: Create an IAM role with a trust policy that allows principals from the source account to assume it.
2. **Source account**: Grant the IAM users or roles in the source account permission to call `sts:AssumeRole` on the target account's role.

When a principal assumes the cross-account role, AWS issues temporary security credentials scoped to that role's permissions. These credentials expire automatically, making this approach more secure than sharing access keys.

## Prerequisites

You need:

- Terraform 1.0 or later
- Two AWS accounts (source and target)
- Administrative access to both accounts
- AWS CLI profiles configured for both accounts

## Setting Up Terraform for Multiple Accounts

Configure Terraform to work with both AWS accounts using provider aliases.

```hcl
# Provider for the source account (where users/services are)
provider "aws" {
  alias   = "source"
  region  = "us-east-1"
  profile = "source-account"
}

# Provider for the target account (where resources are)
provider "aws" {
  alias   = "target"
  region  = "us-east-1"
  profile = "target-account"
}

# Get account IDs for reference
data "aws_caller_identity" "source" {
  provider = aws.source
}

data "aws_caller_identity" "target" {
  provider = aws.target
}
```

## Creating the Cross-Account Role in the Target Account

The target account hosts the role that will be assumed.

```hcl
# Trust policy: Allow the source account to assume this role
data "aws_iam_policy_document" "cross_account_trust" {
  statement {
    effect = "Allow"

    # Allow the entire source account (root) to assume this role
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.source.account_id}:root"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# Create the role in the target account
resource "aws_iam_role" "cross_account_role" {
  provider = aws.target

  name               = "cross-account-access-role"
  assume_role_policy = data.aws_iam_policy_document.cross_account_trust.json
  max_session_duration = 3600  # 1 hour

  tags = {
    Purpose   = "cross-account-access"
    ManagedBy = "terraform"
  }
}

# Attach permissions to the role
resource "aws_iam_role_policy" "cross_account_permissions" {
  provider = aws.target

  name = "cross-account-permissions"
  role = aws_iam_role.cross_account_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::shared-data-bucket",
          "arn:aws:s3:::shared-data-bucket/*",
        ]
      }
    ]
  })
}
```

## Granting AssumeRole Permission in the Source Account

In the source account, create a policy that allows users or roles to assume the cross-account role.

```hcl
# Policy allowing source account entities to assume the target role
resource "aws_iam_policy" "assume_cross_account" {
  provider = aws.source

  name        = "assume-cross-account-role"
  description = "Allows assuming the cross-account role in the target account"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = aws_iam_role.cross_account_role.arn
    }]
  })
}

# Attach the policy to a group in the source account
resource "aws_iam_group" "cross_account_users" {
  provider = aws.source
  name     = "cross-account-users"
}

resource "aws_iam_group_policy_attachment" "cross_account" {
  provider   = aws.source
  group      = aws_iam_group.cross_account_users.name
  policy_arn = aws_iam_policy.assume_cross_account.arn
}
```

## Adding External ID for Security

When a third party needs to assume a role in your account, always use an external ID. This prevents the confused deputy problem where an attacker could trick the third party into assuming your role.

```hcl
variable "external_id" {
  description = "External ID for cross-account role assumption"
  type        = string
  sensitive   = true
  default     = "unique-external-id-abc123"
}

# Trust policy with external ID requirement
data "aws_iam_policy_document" "third_party_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::999888777666:root"]  # Third party account
    }

    actions = ["sts:AssumeRole"]

    # Require the external ID for assumption
    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = [var.external_id]
    }
  }
}

resource "aws_iam_role" "third_party_role" {
  provider = aws.target

  name               = "third-party-access-role"
  assume_role_policy = data.aws_iam_policy_document.third_party_trust.json
}
```

## Restricting Access to Specific Roles or Users

Instead of trusting the entire source account (root), you can restrict access to specific IAM entities.

```hcl
# Trust only specific roles from the source account
data "aws_iam_policy_document" "restricted_trust" {
  statement {
    effect = "Allow"

    principals {
      type = "AWS"
      identifiers = [
        # Only these specific roles can assume the cross-account role
        "arn:aws:iam::${data.aws_caller_identity.source.account_id}:role/ci-cd-pipeline-role",
        "arn:aws:iam::${data.aws_caller_identity.source.account_id}:role/admin-role",
      ]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "restricted_cross_account" {
  provider = aws.target

  name               = "restricted-cross-account-role"
  assume_role_policy = data.aws_iam_policy_document.restricted_trust.json
}
```

## Requiring MFA for Cross-Account Access

For sensitive operations, require MFA when assuming the cross-account role.

```hcl
data "aws_iam_policy_document" "mfa_required_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.source.account_id}:root"]
    }

    actions = ["sts:AssumeRole"]

    # Require MFA for role assumption
    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["true"]
    }

    # Require MFA to have been authenticated within the last hour
    condition {
      test     = "NumericLessThan"
      variable = "aws:MultiFactorAuthAge"
      values   = ["3600"]
    }
  }
}

resource "aws_iam_role" "mfa_protected_role" {
  provider = aws.target

  name               = "mfa-protected-cross-account-role"
  assume_role_policy = data.aws_iam_policy_document.mfa_required_trust.json
}
```

## Creating Multiple Cross-Account Roles

In a multi-account organization, you might need different roles for different purposes.

```hcl
variable "cross_account_roles" {
  description = "Map of cross-account roles to create"
  type = map(object({
    source_account_id = string
    policy_arns       = list(string)
    require_mfa       = bool
  }))
  default = {
    dev-readonly = {
      source_account_id = "111111111111"
      policy_arns       = ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
      require_mfa       = false
    }
    staging-deploy = {
      source_account_id = "222222222222"
      policy_arns       = ["arn:aws:iam::aws:policy/PowerUserAccess"]
      require_mfa       = true
    }
    prod-admin = {
      source_account_id = "333333333333"
      policy_arns       = ["arn:aws:iam::aws:policy/AdministratorAccess"]
      require_mfa       = true
    }
  }
}

# Create trust policies dynamically
data "aws_iam_policy_document" "cross_account_trusts" {
  for_each = var.cross_account_roles

  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${each.value.source_account_id}:root"]
    }

    actions = ["sts:AssumeRole"]

    dynamic "condition" {
      for_each = each.value.require_mfa ? [1] : []

      content {
        test     = "Bool"
        variable = "aws:MultiFactorAuthPresent"
        values   = ["true"]
      }
    }
  }
}

# Create all roles
resource "aws_iam_role" "cross_account_roles" {
  for_each = var.cross_account_roles

  name               = "${each.key}-cross-account"
  assume_role_policy = data.aws_iam_policy_document.cross_account_trusts[each.key].json
}

# Attach policies to each role
locals {
  role_policy_attachments = flatten([
    for role_name, config in var.cross_account_roles : [
      for arn in config.policy_arns : {
        role_name  = role_name
        policy_arn = arn
      }
    ]
  ])
}

resource "aws_iam_role_policy_attachment" "cross_account" {
  for_each = {
    for item in local.role_policy_attachments :
    "${item.role_name}-${item.policy_arn}" => item
  }

  role       = aws_iam_role.cross_account_roles[each.value.role_name].name
  policy_arn = each.value.policy_arn
}
```

## Using the Cross-Account Role in Terraform Providers

You can also configure Terraform itself to assume a cross-account role.

```hcl
# Configure a provider that assumes a cross-account role
provider "aws" {
  alias  = "target_via_assume"
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::987654321098:role/terraform-deployment-role"
    session_name = "terraform-deployment"
    external_id  = "terraform-external-id"
  }
}

# Now use this provider to manage resources in the target account
resource "aws_s3_bucket" "target_bucket" {
  provider = aws.target_via_assume
  bucket   = "cross-account-managed-bucket"
}
```

## Best Practices

1. **Use least privilege.** Only grant the minimum permissions needed for the cross-account role.
2. **Always use external IDs** when the trust is with a third party account.
3. **Require MFA** for roles that grant sensitive access.
4. **Set appropriate session durations.** Shorter sessions are more secure.
5. **Log and monitor role assumptions** using CloudTrail.
6. **Use specific principal ARNs** instead of account root when possible.

For related topics, see [How to Create STS Assume Role Policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-sts-assume-role-policies-in-terraform/view) and [How to Create IAM Roles with Trust Policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-with-trust-policies-in-terraform/view).

## Conclusion

Cross-account IAM roles are the standard mechanism for secure access between AWS accounts. Terraform makes it easy to manage both sides of the trust relationship, enforce security controls like MFA and external IDs, and create multiple roles dynamically. By following least privilege principles and adding appropriate conditions to your trust policies, you can build a secure multi-account architecture that scales with your organization.

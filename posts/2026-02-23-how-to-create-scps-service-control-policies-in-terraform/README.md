# How to Create SCPs (Service Control Policies) in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, SCP, Organizations, Security, Governance

Description: Learn how to create AWS Service Control Policies (SCPs) in Terraform to enforce organization-wide guardrails across all accounts in your AWS Organization.

---

Service Control Policies (SCPs) are a feature of AWS Organizations that let you set permission guardrails across all accounts in your organization. Unlike IAM policies that grant permissions, SCPs restrict the maximum available permissions for accounts. Even if an IAM role in an account has `AdministratorAccess`, an SCP can prevent it from performing certain actions. This makes SCPs a powerful tool for enforcing compliance and security requirements at the organization level.

This guide covers creating and managing SCPs with Terraform, from basic deny policies to complex multi-account governance strategies.

## How SCPs Work

SCPs work by filtering the permissions available in an account. They do not grant permissions - they only restrict them. Here is the evaluation logic:

1. If an SCP explicitly denies an action, it is denied regardless of any IAM policies.
2. If an SCP does not allow an action (and the default deny-all is in place), it is denied.
3. If an SCP allows an action, the IAM policies in the account determine whether the action is ultimately allowed.

SCPs can be attached to:
- The organization root (applies to all accounts)
- Organizational Units (OUs) (applies to all accounts in the OU)
- Individual accounts (applies only to that account)

SCPs do not affect the management account.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS Organization with all features enabled
- Management account credentials with Organizations admin permissions
- AWS CLI configured with valid credentials

## Enabling SCPs in Your Organization

Before creating SCPs, you need to enable them in your organization.

```hcl
# Enable SCP policy type for the organization
resource "aws_organizations_organization" "main" {
  feature_set = "ALL"

  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
  ]
}
```

## Creating a Basic SCP

Here is a simple SCP that denies access to specific regions.

```hcl
# SCP: Deny actions outside approved regions
resource "aws_organizations_policy" "region_restriction" {
  name        = "restrict-regions"
  description = "Deny all actions outside approved AWS regions"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyNonApprovedRegions"
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = [
              "us-east-1",
              "us-west-2",
              "eu-west-1",
            ]
          }
        }
      }
    ]
  })
}
```

## Attaching SCPs to OUs and Accounts

SCPs are attached to targets using the `aws_organizations_policy_attachment` resource.

```hcl
# Attach to an OU
resource "aws_organizations_policy_attachment" "production_ou" {
  policy_id = aws_organizations_policy.region_restriction.id
  target_id = aws_organizations_organizational_unit.production.id
}

# Attach to a specific account
resource "aws_organizations_policy_attachment" "sandbox_account" {
  policy_id = aws_organizations_policy.region_restriction.id
  target_id = "123456789012"  # Account ID
}

# Attach to the organization root
resource "aws_organizations_policy_attachment" "org_root" {
  policy_id = aws_organizations_policy.region_restriction.id
  target_id = aws_organizations_organization.main.roots[0].id
}
```

## Common SCP Patterns

### Prevent Leaving the Organization

```hcl
resource "aws_organizations_policy" "deny_leave_org" {
  name        = "deny-leave-organization"
  description = "Prevent accounts from leaving the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "DenyLeaveOrganization"
      Effect   = "Deny"
      Action   = "organizations:LeaveOrganization"
      Resource = "*"
    }]
  })
}
```

### Protect CloudTrail

```hcl
resource "aws_organizations_policy" "protect_cloudtrail" {
  name        = "protect-cloudtrail"
  description = "Prevent disabling or modifying CloudTrail"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ProtectCloudTrail"
      Effect = "Deny"
      Action = [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "cloudtrail:PutEventSelectors",
        "cloudtrail:UpdateTrail",
      ]
      Resource = "*"
    }]
  })
}
```

### Deny Root Account Usage

```hcl
resource "aws_organizations_policy" "deny_root_usage" {
  name        = "deny-root-account-usage"
  description = "Deny all actions by root user except what is necessary"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyRootAccount"
      Effect    = "Deny"
      Action    = "*"
      Resource  = "*"
      Condition = {
        StringLike = {
          "aws:PrincipalArn" = "arn:aws:iam::*:root"
        }
      }
    }]
  })
}
```

### Require Encryption for S3

```hcl
resource "aws_organizations_policy" "require_s3_encryption" {
  name        = "require-s3-encryption"
  description = "Deny S3 uploads without server-side encryption"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedUploads"
        Effect = "Deny"
        Action = "s3:PutObject"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = ["AES256", "aws:kms"]
          }
        }
      },
      {
        Sid    = "DenyNoEncryptionHeader"
        Effect = "Deny"
        Action = "s3:PutObject"
        Resource = "*"
        Condition = {
          Null = {
            "s3:x-amz-server-side-encryption" = "true"
          }
        }
      }
    ]
  })
}
```

### Deny Specific Expensive Services

```hcl
resource "aws_organizations_policy" "deny_expensive_services" {
  name        = "deny-expensive-services"
  description = "Deny access to expensive services in non-production accounts"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyExpensiveServices"
      Effect = "Deny"
      Action = [
        "redshift:*",
        "emr:*",
        "sagemaker:CreateNotebookInstance",
        "sagemaker:CreateTrainingJob",
        "ec2:RunInstances",
      ]
      Resource = "*"
      Condition = {
        # Only deny large instance types
        "ForAnyValue:StringLike" = {
          "ec2:InstanceType" = [
            "*.8xlarge",
            "*.12xlarge",
            "*.16xlarge",
            "*.24xlarge",
            "*.metal",
            "p3.*",
            "p4.*",
          ]
        }
      }
    }]
  })
}
```

### Require Tags on Resources

```hcl
resource "aws_organizations_policy" "require_tags" {
  name        = "require-resource-tags"
  description = "Deny creating resources without required tags"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "RequireTags"
      Effect = "Deny"
      Action = [
        "ec2:RunInstances",
        "ec2:CreateVolume",
        "rds:CreateDBInstance",
        "s3:CreateBucket",
        "lambda:CreateFunction",
      ]
      Resource = "*"
      Condition = {
        Null = {
          "aws:RequestTag/Environment" = "true"
          "aws:RequestTag/Team"        = "true"
        }
      }
    }]
  })
}
```

## Managing Multiple SCPs

For organizations with many SCPs, use a map-based approach.

```hcl
variable "scps" {
  description = "Map of SCP configurations"
  type = map(object({
    description = string
    policy      = any
    targets     = list(string)
  }))
}

# Create all SCPs
resource "aws_organizations_policy" "scps" {
  for_each = var.scps

  name        = each.key
  description = each.value.description
  type        = "SERVICE_CONTROL_POLICY"
  content     = jsonencode(each.value.policy)
}

# Attach SCPs to targets
locals {
  scp_attachments = flatten([
    for scp_name, scp_config in var.scps : [
      for target in scp_config.targets : {
        scp_name = scp_name
        target   = target
      }
    ]
  ])
}

resource "aws_organizations_policy_attachment" "scp_attachments" {
  for_each = {
    for item in local.scp_attachments :
    "${item.scp_name}-${item.target}" => item
  }

  policy_id = aws_organizations_policy.scps[each.value.scp_name].id
  target_id = each.value.target
}
```

## SCP with Exemptions

Sometimes you need to exempt specific roles from SCP restrictions, such as break-glass admin roles.

```hcl
resource "aws_organizations_policy" "deny_with_exemption" {
  name        = "deny-with-admin-exemption"
  description = "Deny actions with exemption for emergency admin role"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyWithExemption"
      Effect = "Deny"
      Action = [
        "ec2:TerminateInstances",
        "rds:DeleteDBInstance",
        "s3:DeleteBucket",
      ]
      Resource = "*"
      Condition = {
        StringNotLike = {
          # Exempt the emergency admin role
          "aws:PrincipalArn" = [
            "arn:aws:iam::*:role/emergency-admin",
            "arn:aws:iam::*:role/OrganizationAccountAccessRole",
          ]
        }
      }
    }]
  })
}
```

## Best Practices

1. **Test SCPs in a sandbox first.** A misconfigured SCP can lock you out of accounts.
2. **Use deny-based SCPs.** It is safer to deny specific actions than to try to allow only certain actions.
3. **Always exempt emergency admin roles.** Have a break-glass mechanism that bypasses SCPs.
4. **Start broad, then tighten.** Apply restrictive SCPs to OUs gradually.
5. **Remember SCPs do not affect the management account.** Do not rely on SCPs for management account security.

For related topics, see [How to Create IAM Permission Boundaries in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-permission-boundaries-in-terraform/view) and [How to Implement Least Privilege IAM with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-iam-with-terraform/view).

## Conclusion

SCPs are the highest-level guardrails in AWS. They enforce security and compliance requirements across your entire organization, regardless of what IAM policies exist in individual accounts. Terraform makes it straightforward to manage SCPs as code, version control them, and apply them consistently to OUs and accounts. Start with essential guardrails like region restrictions and CloudTrail protection, then add more specific controls as your governance requirements evolve.

# How to Create Organizations and SCPs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Organization, SCP, Security, Governance, Infrastructure as Code

Description: Learn how to create AWS Organizations, organizational units, accounts, and service control policies using Terraform for multi-account governance.

---

AWS Organizations is the backbone of multi-account AWS management. It lets you centrally manage billing, control access, and enforce policies across all your AWS accounts. Service Control Policies (SCPs) are the guardrails - they define the maximum permissions available to accounts in your organization. Managing all of this through Terraform means your entire organizational structure and policy framework lives in version control.

This guide covers creating an organization from scratch, setting up organizational units, creating accounts, and writing effective SCPs.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials for the management account (the account that will own the organization)
- Understanding of AWS multi-account strategy concepts

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

# This provider uses credentials from the management account
provider "aws" {
  region = "us-east-1"
}
```

## Creating the Organization

The first step is creating the AWS Organization itself. You only do this once from the management account.

```hcl
# Create the AWS Organization with all features enabled
resource "aws_organizations_organization" "org" {
  # ALL_FEATURES enables SCPs and other policy types
  # CONSOLIDATED_BILLING is the other option but limits what you can do
  feature_set = "ALL_FEATURES"

  # Enable the policy types you need
  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
    "TAG_POLICY",
    "BACKUP_POLICY",
  ]

  # Enable trusted access for AWS services
  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "sso.amazonaws.com",
    "guardduty.amazonaws.com",
    "securityhub.amazonaws.com",
  ]
}
```

## Creating Organizational Units

Organizational units (OUs) give your organization a hierarchical structure. A common pattern is to have top-level OUs for workload types and nested OUs for environments.

```hcl
# Top-level OUs under the root
resource "aws_organizations_organizational_unit" "security" {
  name      = "Security"
  parent_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_organizational_unit" "infrastructure" {
  name      = "Infrastructure"
  parent_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "Workloads"
  parent_id = aws_organizations_organization.org.roots[0].id
}

resource "aws_organizations_organizational_unit" "sandbox" {
  name      = "Sandbox"
  parent_id = aws_organizations_organization.org.roots[0].id
}

# Nested OUs under Workloads for different environments
resource "aws_organizations_organizational_unit" "workloads_prod" {
  name      = "Production"
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_organizational_unit" "workloads_staging" {
  name      = "Staging"
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_organizational_unit" "workloads_dev" {
  name      = "Development"
  parent_id = aws_organizations_organizational_unit.workloads.id
}
```

## Creating Member Accounts

You can create new AWS accounts directly through Organizations.

```hcl
# Security account for centralized logging and audit
resource "aws_organizations_account" "security" {
  name      = "security-audit"
  email     = "aws-security@company.com"
  role_name = "OrganizationAccountAccessRole"
  parent_id = aws_organizations_organizational_unit.security.id

  # Prevent Terraform from trying to delete the account
  # AWS accounts cannot be deleted via API
  lifecycle {
    ignore_changes = [role_name]
  }

  tags = {
    Purpose = "security-and-audit"
  }
}

# Log archive account
resource "aws_organizations_account" "log_archive" {
  name      = "log-archive"
  email     = "aws-logs@company.com"
  role_name = "OrganizationAccountAccessRole"
  parent_id = aws_organizations_organizational_unit.security.id

  lifecycle {
    ignore_changes = [role_name]
  }

  tags = {
    Purpose = "centralized-logging"
  }
}

# Shared services account
resource "aws_organizations_account" "shared_services" {
  name      = "shared-services"
  email     = "aws-shared@company.com"
  role_name = "OrganizationAccountAccessRole"
  parent_id = aws_organizations_organizational_unit.infrastructure.id

  lifecycle {
    ignore_changes = [role_name]
  }

  tags = {
    Purpose = "shared-infrastructure"
  }
}

# Production workload account
resource "aws_organizations_account" "prod_app" {
  name      = "production-app"
  email     = "aws-prod-app@company.com"
  role_name = "OrganizationAccountAccessRole"
  parent_id = aws_organizations_organizational_unit.workloads_prod.id

  lifecycle {
    ignore_changes = [role_name]
  }

  tags = {
    Purpose     = "production-workload"
    Application = "main-app"
  }
}
```

## Creating Service Control Policies

SCPs are the real power of Organizations. They set permission boundaries that apply to all principals in the target accounts. Remember that SCPs do not grant permissions - they only restrict what is allowed.

### Deny Leaving the Organization

```hcl
# Prevent any account from leaving the organization
resource "aws_organizations_policy" "deny_leave_org" {
  name        = "deny-leave-organization"
  description = "Prevents accounts from leaving the AWS Organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyLeaveOrganization"
        Effect    = "Deny"
        Action    = "organizations:LeaveOrganization"
        Resource  = "*"
      }
    ]
  })
}
```

### Deny Root Account Usage

```hcl
# Deny usage of the root user in member accounts
resource "aws_organizations_policy" "deny_root_user" {
  name        = "deny-root-user-actions"
  description = "Prevents the use of root user credentials in member accounts"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyRootUserActions"
        Effect    = "Deny"
        Action    = "*"
        Resource  = "*"
        Condition = {
          StringLike = {
            "aws:PrincipalArn" = "arn:aws:iam::*:root"
          }
        }
      }
    ]
  })
}
```

### Restrict Regions

```hcl
# Only allow actions in approved regions
resource "aws_organizations_policy" "restrict_regions" {
  name        = "restrict-regions"
  description = "Restricts AWS usage to approved regions only"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnapprovedRegions"
        Effect    = "Deny"
        Action    = "*"
        Resource  = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = [
              "us-east-1",
              "us-west-2",
              "eu-west-1"
            ]
          }
          # Exclude global services that only work in us-east-1
          ArnNotLike = {
            "aws:PrincipalArn" = [
              "arn:aws:iam::*:role/OrganizationAccountAccessRole"
            ]
          }
        }
      }
    ]
  })
}
```

### Deny Disabling Security Services

```hcl
# Prevent disabling critical security services
resource "aws_organizations_policy" "protect_security_services" {
  name        = "protect-security-services"
  description = "Prevents disabling CloudTrail, GuardDuty, Config, and SecurityHub"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ProtectCloudTrail"
        Effect = "Deny"
        Action = [
          "cloudtrail:StopLogging",
          "cloudtrail:DeleteTrail",
        ]
        Resource = "*"
      },
      {
        Sid    = "ProtectGuardDuty"
        Effect = "Deny"
        Action = [
          "guardduty:DeleteDetector",
          "guardduty:DisassociateFromMasterAccount",
        ]
        Resource = "*"
      },
      {
        Sid    = "ProtectConfig"
        Effect = "Deny"
        Action = [
          "config:StopConfigurationRecorder",
          "config:DeleteConfigurationRecorder",
        ]
        Resource = "*"
      },
      {
        Sid    = "ProtectSecurityHub"
        Effect = "Deny"
        Action = [
          "securityhub:DisableSecurityHub",
          "securityhub:DeleteMembers",
        ]
        Resource = "*"
      }
    ]
  })
}
```

### Deny Expensive Services in Sandbox

```hcl
# Limit which services sandbox accounts can use
resource "aws_organizations_policy" "sandbox_restrictions" {
  name        = "sandbox-service-restrictions"
  description = "Restricts expensive or sensitive services in sandbox accounts"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyExpensiveServices"
        Effect = "Deny"
        Action = [
          "redshift:*",
          "emr:*",
          "es:*",
          "dms:*",
          "directconnect:*",
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyLargeInstances"
        Effect = "Deny"
        Action = "ec2:RunInstances"
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          ForAnyValue_StringLike = {
            "ec2:InstanceType" = [
              "*.8xlarge",
              "*.12xlarge",
              "*.16xlarge",
              "*.24xlarge",
              "*.metal",
              "p3.*",
              "p4.*",
              "x1.*",
            ]
          }
        }
      }
    ]
  })
}
```

## Attaching SCPs to OUs and Accounts

Once you have your SCPs defined, attach them to the appropriate OUs or accounts.

```hcl
# Attach the "deny leave org" SCP to the root - applies to all accounts
resource "aws_organizations_policy_attachment" "deny_leave_org_root" {
  policy_id = aws_organizations_policy.deny_leave_org.id
  target_id = aws_organizations_organization.org.roots[0].id
}

# Attach root user denial to the root
resource "aws_organizations_policy_attachment" "deny_root_user_all" {
  policy_id = aws_organizations_policy.deny_root_user.id
  target_id = aws_organizations_organization.org.roots[0].id
}

# Attach region restrictions to all workload accounts
resource "aws_organizations_policy_attachment" "restrict_regions_workloads" {
  policy_id = aws_organizations_policy.restrict_regions.id
  target_id = aws_organizations_organizational_unit.workloads.id
}

# Attach security protection to all accounts
resource "aws_organizations_policy_attachment" "protect_security_all" {
  policy_id = aws_organizations_policy.protect_security_services.id
  target_id = aws_organizations_organization.org.roots[0].id
}

# Attach sandbox restrictions only to sandbox OU
resource "aws_organizations_policy_attachment" "sandbox_restrictions" {
  policy_id = aws_organizations_policy.sandbox_restrictions.id
  target_id = aws_organizations_organizational_unit.sandbox.id
}
```

## Tag Policies

Tag policies help enforce consistent tagging across your organization.

```hcl
# Tag policy requiring specific tags
resource "aws_organizations_policy" "tagging_policy" {
  name        = "required-tags"
  description = "Enforce required tags across the organization"
  type        = "TAG_POLICY"

  content = jsonencode({
    tags = {
      Environment = {
        tag_key = {
          "@@assign" = "Environment"
        }
        tag_value = {
          "@@assign" = [
            "production",
            "staging",
            "development",
            "sandbox"
          ]
        }
        enforced_for = {
          "@@assign" = [
            "ec2:instance",
            "ec2:volume",
            "rds:db",
            "s3:bucket"
          ]
        }
      }
    }
  })
}

# Attach tag policy to the root
resource "aws_organizations_policy_attachment" "tagging_root" {
  policy_id = aws_organizations_policy.tagging_policy.id
  target_id = aws_organizations_organization.org.roots[0].id
}
```

## Delegated Administrator

You can delegate administration of certain AWS services to member accounts.

```hcl
# Delegate SecurityHub administration to the security account
resource "aws_organizations_delegated_administrator" "security_hub" {
  account_id        = aws_organizations_account.security.id
  service_principal = "securityhub.amazonaws.com"
}

# Delegate GuardDuty administration
resource "aws_organizations_delegated_administrator" "guard_duty" {
  account_id        = aws_organizations_account.security.id
  service_principal = "guardduty.amazonaws.com"
}
```

## Best Practices

1. **Start with deny-list SCPs.** The default FullAWSAccess SCP allows everything. Add deny statements for things you want to block rather than trying to enumerate everything you want to allow.

2. **Test SCPs in sandbox first.** Attach new SCPs to your sandbox OU first. A misconfigured SCP can lock you out of accounts.

3. **Never remove the FullAWSAccess SCP.** Every OU needs this policy unless you are using an allow-list strategy. Removing it without a replacement effectively denies everything.

4. **Protect your management account.** SCPs do not apply to the management account. Use IAM policies and careful access controls there instead.

5. **Use lifecycle ignore_changes for accounts.** AWS accounts cannot be deleted via API, so add lifecycle rules to prevent Terraform from trying to recreate them.

6. **Version control your SCPs.** Store SCP JSON in separate files and use `file()` to load them. This makes them easier to review in pull requests.

## Conclusion

AWS Organizations and SCPs give you centralized governance over your entire AWS estate. With Terraform managing the whole structure, changes to your organizational hierarchy and security policies go through the same review process as your infrastructure code. Start with the essential SCPs - deny leaving the organization, restrict regions, and protect security services - and add more granular controls as your needs grow.

For related reading, check out our guide on [creating SSO permission sets in Terraform](https://oneuptime.com/blog/post/2026-02-23-create-sso-permission-sets-in-terraform/view).

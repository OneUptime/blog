# How to Implement AWS Organizations SCPs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Organization, Service Control Policies, Governance, Infrastructure as Code, Multi-Account

Description: Learn how to create and attach AWS Organizations Service Control Policies (SCPs) using OpenTofu to enforce guardrails across all accounts in your organization.

## Introduction

Service Control Policies (SCPs) are organizational policies that set maximum permissions for accounts in your AWS Organization. Unlike IAM policies, SCPs affect even the root user of member accounts. They are used to prevent specific actions organization-wide, such as disabling CloudTrail or creating resources in disallowed regions.

## Prerequisites

- OpenTofu v1.6+
- AWS Organizations management account credentials
- AWS Organizations with SCPs enabled

## Step 1: Reference the Organization and Create an OU

```hcl
# Data source to get the organization details

data "aws_organizations_organization" "main" {}

# Create an OU structure
resource "aws_organizations_organizational_unit" "production" {
  name      = "Production"
  parent_id = data.aws_organizations_organization.main.roots[0].id
}
```

## Step 2: Create a Region Restriction SCP

```hcl
# Update these to the regions you want to allow.
variable "allowed_regions" {
  type    = list(string)
  default = ["us-east-1", "us-west-2"]
}

# Deny any actions outside approved regions
resource "aws_organizations_policy" "region_restriction" {
  name        = "RegionRestriction"
  description = "Restrict resource creation to approved regions"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyOutsideApprovedRegions"
        Effect = "Deny"
        NotAction = [
          # Global services that don't use region
          "iam:*",
          "organizations:*",
          "route53:*",
          "budgets:*",
          "waf:*",
          "cloudfront:*",
          "support:*",
          "sts:*"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = var.allowed_regions
          }
        }
      }
    ]
  })

  tags = { Name = "region-restriction-scp" }
}
```

## Step 3: Create Security Guardrail SCPs

```hcl
# Prevent disabling CloudTrail
resource "aws_organizations_policy" "protect_cloudtrail" {
  name        = "ProtectCloudTrail"
  description = "Prevent disabling or modifying CloudTrail"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyCloudTrailModification"
      Effect = "Deny"
      Action = [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "cloudtrail:UpdateTrail",
        "cloudtrail:PutEventSelectors"
      ]
      Resource = "*"
    }]
  })
}

# Prevent leaving the AWS Organization
resource "aws_organizations_policy" "prevent_org_leave" {
  name        = "PreventOrgLeave"
  description = "Prevent accounts from leaving the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyLeaveOrganization"
      Effect = "Deny"
      Action = ["organizations:LeaveOrganization"]
      Resource = "*"
    }]
  })
}

# Prevent creating root user access keys
resource "aws_organizations_policy" "no_root_keys" {
  name        = "NoRootAccessKeys"
  description = "Prevent creating root user access keys"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyRootUserAccessKeys"
      Effect = "Deny"
      Action = [
        "iam:CreateAccessKey"
      ]
      Resource = "*"
      Condition = {
        ArnLike = {
          "aws:PrincipalArn" = "arn:aws:iam::*:root"
        }
      }
    }]
  })
}
```

## Step 4: Attach SCPs to the Root and OUs

```hcl
# Attach region restriction to the production OU
resource "aws_organizations_policy_attachment" "region_to_prod" {
  policy_id = aws_organizations_policy.region_restriction.id
  target_id = aws_organizations_organizational_unit.production.id
}

# Attach CloudTrail protection to the root (all accounts)
resource "aws_organizations_policy_attachment" "cloudtrail_to_root" {
  policy_id = aws_organizations_policy.protect_cloudtrail.id
  target_id = data.aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_policy_attachment" "no_leave_root" {
  policy_id = aws_organizations_policy.prevent_org_leave.id
  target_id = data.aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_policy_attachment" "no_root_keys_root" {
  policy_id = aws_organizations_policy.no_root_keys.id
  target_id = data.aws_organizations_organization.main.roots[0].id
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

SCPs are the most powerful governance tool in AWS Organizations-they apply to IAM users and roles in attached member accounts, including the root user, with exceptions such as service-linked roles, and cannot be overridden by account-level policies. Use them for immutable guardrails: region restrictions, protecting audit infrastructure, preventing privilege escalation, and enforcing tagging. Remember that SCPs don't grant permissions-they set the maximum available permissions. Accounts still need identity-based policies to allow actions within the SCP boundary.

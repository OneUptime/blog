# How to Set Up AWS Organizations with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS Organizations, Multi-Account, Governance, Infrastructure as Code

Description: Learn how to set up and manage AWS Organizations with OpenTofu to govern multiple AWS accounts with centralized policies and consolidated billing.

AWS Organizations lets you manage multiple AWS accounts as a hierarchy, apply Service Control Policies (SCPs), and consolidate billing. OpenTofu lets you define the organization structure, OUs, accounts, and policies as code.

## Enabling AWS Organizations

```hcl
resource "aws_organizations_organization" "main" {
  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "sso.amazonaws.com",
    "account.amazonaws.com",
    "securityhub.amazonaws.com",
  ]

  feature_set = "ALL"  # ALL or CONSOLIDATED_BILLING

  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
    "TAG_POLICY",
  ]
}
```

## Creating Organizational Units

```hcl
# Top-level OUs

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "Workloads"
  parent_id = aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_organizational_unit" "security" {
  name      = "Security"
  parent_id = aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_organizational_unit" "infrastructure" {
  name      = "Infrastructure"
  parent_id = aws_organizations_organization.main.roots[0].id
}

# Child OUs
resource "aws_organizations_organizational_unit" "production" {
  name      = "Production"
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_organizational_unit" "staging" {
  name      = "Staging"
  parent_id = aws_organizations_organizational_unit.workloads.id
}
```

## Creating a Service Control Policy

```hcl
resource "aws_organizations_policy" "deny_outside_regions" {
  name        = "DenyOutsideRegions"
  description = "Prevent resource creation outside approved regions"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyOutsideRegions"
      Effect = "Deny"
      Action = "*"
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "aws:RequestedRegion" = ["us-east-1", "us-west-2", "eu-west-1"]
        }
        ArnNotLike = {
          "aws:PrincipalARN" = ["arn:aws:iam::*:role/OrgAdmin"]
        }
      }
    }]
  })
}

resource "aws_organizations_policy_attachment" "deny_outside_regions" {
  policy_id = aws_organizations_policy.deny_outside_regions.id
  target_id = aws_organizations_organizational_unit.workloads.id
}
```

## Delegated Administrators

```hcl
# Delegate Security Hub administration to the security account in the provider region
resource "aws_securityhub_organization_admin_account" "security_hub" {
  depends_on       = [aws_organizations_organization.main]
  admin_account_id = var.security_account_id
}
```

## Outputs

```hcl
output "organization_id" {
  value = aws_organizations_organization.main.id
}

output "root_id" {
  value = aws_organizations_organization.main.roots[0].id
}

output "master_account_id" {
  value = aws_organizations_organization.main.master_account_id
}
```

## Conclusion

AWS Organizations in OpenTofu provides the foundation for multi-account governance. Create OUs to mirror your organizational structure, attach SCPs to enforce guardrails at scale, and delegate service administration to specialized accounts. Run organization-level OpenTofu from the management account with administrative IAM credentials.

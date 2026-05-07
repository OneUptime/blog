# How to Set Up AWS Firewall Manager with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Firewall Manager, WAF, Security Group, Organization, Infrastructure as Code

Description: Learn how to configure AWS Firewall Manager with OpenTofu to centrally manage WAF rules, security groups, and Shield Advanced protections across all accounts in an AWS Organization.

## Introduction

AWS Firewall Manager provides centralized security policy management across accounts in AWS Organizations. Firewall Manager policies can enforce WAF Web ACLs, security group rules, Shield Advanced protections, and Network Firewall configurations across hundreds of accounts and resources-new accounts automatically receive in-scope policies when they join the organization.

## Prerequisites

- OpenTofu v1.6+
- AWS Organizations enabled
- AWS Shield Advanced subscription (for Shield policies)
- AWS credentials for the Organizations management account and the designated Firewall Manager administrator account

## Step 1: Designate Firewall Manager Admin Account

```hcl
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Designate an account as Firewall Manager admin (done once in the management account, in us-east-1)
resource "aws_fms_admin_account" "main" {
  provider   = aws.us_east_1
  account_id = var.security_account_id  # Security/audit account
}
```

## Step 2: Create WAF Policy to Enforce Managed Rules

```hcl
# Enforce WAF rules across all ALBs in one AWS Region in the Organization
resource "aws_fms_policy" "waf_policy" {
  depends_on = [aws_fms_admin_account.main]

  name                        = "${var.project_name}-waf-policy"
  exclude_resource_tags       = false
  remediation_enabled         = true  # Automatically associate in-scope ALBs that are missing the policy
  resource_type               = "AWS::ElasticLoadBalancingV2::LoadBalancer"

  security_service_policy_data {
    type = "WAFV2"

    managed_service_data = jsonencode({
      type = "WAFV2"
      preProcessRuleGroups = [
        {
          ruleGroupType          = "ManagedRuleGroup"
          sampledRequestsEnabled = true
          managedRuleGroupIdentifier = {
            versionEnabled       = false
            vendorName           = "AWS"
            managedRuleGroupName = "AWSManagedRulesCommonRuleSet"
          }
          overrideAction = { type = "NONE" }
          priority       = 1
        }
      ]
      postProcessRuleGroups               = []
      sampledRequestsEnabledForDefaultActions = true
      defaultAction                       = { type = "ALLOW" }
      overrideCustomerWebACLAssociation = false
    })
  }

  # Omit include_map to apply the policy to all accounts in the organization.
  include_map {
    account = var.included_account_ids
  }

  tags = {
    Name = "${var.project_name}-waf-policy"
  }
}
```

## Step 3: Create Security Group Policy

```hcl
# Audit security groups for public SSH access
resource "aws_security_group" "public_ssh_audit" {
  name        = "${var.project_name}-public-ssh-audit"
  description = "Reference rule set for Firewall Manager content audit"
  vpc_id      = var.audit_vpc_id

  ingress {
    description = "Disallow public SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-public-ssh-audit"
  }
}

# The audit security group is only a template used by Firewall Manager for comparison
resource "aws_fms_policy" "sg_policy" {
  depends_on = [aws_fms_admin_account.main]

  name                  = "${var.project_name}-no-public-ssh"
  exclude_resource_tags = false
  remediation_enabled   = false  # Review findings first, then enable remediation
  resource_type         = "AWS::EC2::SecurityGroup"

  security_service_policy_data {
    type = "SECURITY_GROUPS_CONTENT_AUDIT"

    managed_service_data = jsonencode({
      type = "SECURITY_GROUPS_CONTENT_AUDIT"
      securityGroupAction = {
        type = "DENY"
      }
      securityGroups = [
        {
          id = aws_security_group.public_ssh_audit.id
        }
      ]
    })
  }

  tags = {
    Name = "${var.project_name}-no-public-ssh"
  }
}
```

## Step 4: Create Shield Advanced Policy

```hcl
# Enforce Shield Advanced protection on all CloudFront distributions
resource "aws_fms_policy" "shield_cloudfront" {
  depends_on = [aws_fms_admin_account.main]

  name                  = "${var.project_name}-shield-cloudfront"
  exclude_resource_tags = false
  remediation_enabled   = true
  resource_type         = "AWS::CloudFront::Distribution"

  security_service_policy_data {
    type = "SHIELD_ADVANCED"

    managed_service_data = jsonencode({
      type = "SHIELD_ADVANCED"
      optimizeUnassociatedWebACL = false
    })
  }

  include_map {
    orgunit = var.production_ou_ids  # Only apply to production OU
  }

  tags = {
    Name = "${var.project_name}-shield-cloudfront"
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# View policy compliance across accounts
aws fms list-compliance-status \
  --policy-id <policy-id>
```

## Conclusion

Firewall Manager is the most efficient tool for security governance at scale in AWS Organizations-each policy definition enforces one type of security control across dozens or hundreds of accounts without per-account configuration. Enable `remediation_enabled = true` to automatically apply policies to resources that should be protected but aren't, ensuring new accounts and new resources are automatically covered. For regional resources such as ALBs, create separate policies per Region. Use OUs in `include_map` to apply different policies to production vs. development environments.

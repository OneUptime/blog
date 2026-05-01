# How to Enforce Tagging Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tagging Policies, Governance, Compliance, Infrastructure as Code, FinOps

Description: Learn how to enforce mandatory resource tagging in OpenTofu through variable validation, OPA policies, and provider default_tags - ensuring every resource is properly labeled for cost allocation...

## Introduction

Mandatory resource tagging is one of the most impactful governance controls in cloud environments. It enables accurate cost allocation, security auditing, and compliance reporting. OpenTofu provides multiple layers to enforce tagging - from provider defaults to policy-as-code gates.

## Layer 1: Provider default_tags (AWS)

The most reliable baseline for supported tagged resources - tags applied automatically at the provider level, with exceptions such as `aws_autoscaling_group`:

```hcl
variable "aws_region"   { type = string }
variable "environment" { type = string }
variable "team"        { type = string }
variable "cost_center" { type = string }

provider "aws" {
  region = var.aws_region

  # These tags are applied automatically to supported tagged resources
  default_tags {
    tags = {
      Environment = var.environment
      Team        = var.team
      CostCenter  = var.cost_center
      ManagedBy   = "opentofu"
      Repository  = "my-org/infra-repo"
    }
  }
}
```

## Layer 2: Variable Validation for Tag Values

```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "cost_center" {
  type = string
  validation {
    condition     = can(regex("^CC-[0-9]{4}$", var.cost_center))
    error_message = "CostCenter must follow the format CC-XXXX (e.g., CC-1234)."
  }
}
```

## Layer 3: OPA Policy to Block Missing Tags

```rego
# policies/require_tags.rego

package main

required_tags := {"Environment", "Team", "CostCenter", "ManagedBy"}

taggable_resources := {
    "aws_instance", "aws_db_instance", "aws_s3_bucket",
    "aws_eks_cluster", "aws_vpc", "aws_lambda_function"
}

deny contains msg if {
    some resource in input.resource_changes
    resource.type in taggable_resources

    some action in resource.change.actions
    action in {"create", "update"}

    present := {tag | resource.change.after.tags_all[tag]}
    missing := required_tags - present
    count(missing) > 0

    msg := sprintf("Resource '%s' missing required tags: %v", [resource.address, missing])
}
```

```bash
# Run policy check before apply
tofu plan -out=tfplan.binary
tofu show -json tfplan.binary > tfplan.json
conftest test tfplan.json --policy policies/
```

## Layer 4: AWS Tag Policies (Organization Level)

In AWS provider 6.22.0+, define required tag keys at the AWS Organization level and set `tag_policy_compliance = "error"` in your existing `aws` provider to fail plans that miss them:

```hcl
# Define required tags at the AWS Organization level
resource "aws_organizations_policy" "tagging" {
  name        = "RequiredTags"
  type        = "TAG_POLICY"
  description = "Require standard tags on supported resources"

  content = jsonencode({
    tags = {
      Environment = {
        report_required_tag_for = {
          "@@assign" = ["ec2:instance", "rds:db", "s3:bucket", "lambda:function"]
        }
        tag_key = { "@@assign" = "Environment" }
        tag_value = {
          "@@assign" = ["dev", "staging", "prod"]
        }
      }
      Team = {
        report_required_tag_for = {
          "@@assign" = ["ec2:instance", "rds:db", "s3:bucket", "lambda:function"]
        }
        tag_key = { "@@assign" = "Team" }
      }
      CostCenter = {
        report_required_tag_for = {
          "@@assign" = ["ec2:instance", "rds:db", "s3:bucket", "lambda:function"]
        }
        tag_key = { "@@assign" = "CostCenter" }
      }
      ManagedBy = {
        report_required_tag_for = {
          "@@assign" = ["ec2:instance", "rds:db", "s3:bucket", "lambda:function"]
        }
        tag_key = { "@@assign" = "ManagedBy" }
      }
    }
  })
}
```

## Automated Tag Remediation

For resources that slip through with missing tags, automate detection and notification:

```bash
#!/bin/bash
# find-missing-environment.sh - find EC2 instances missing the Environment tag
aws resource-explorer-2 search \
  --query-string "resourcetype:ec2:instance -tag.key:Environment" \
  --query "Resources[].Arn" \
  --output text
```

## Conclusion

Enforcing tagging policies requires multiple complementary layers: provider `default_tags` applies baseline tags on supported resources, variable validation ensures valid tag values, OPA policies block deployments with missing tags, and AWS Tag Policies define organization-wide required tag keys that the AWS provider can enforce during plan and apply. Together they make it much harder to deploy resources with missing or inconsistent tags.

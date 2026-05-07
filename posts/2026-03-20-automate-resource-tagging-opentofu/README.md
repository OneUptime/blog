# How to Automate Resource Tagging with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Tagging, Cost Management, Governance, Infrastructure as Code

Description: Learn how to implement consistent resource tagging across all OpenTofu-managed resources using default tags, local variables, and provider-level tag defaults.

## Introduction

Consistent resource tagging enables cost allocation, security policy enforcement, and automated governance. In OpenTofu, the AWS provider supports provider-level default tags, and you can combine that with local tag variables and merge patterns to ensure every resource gets the right tags without repetition.

## Provider-Level Default Tags

AWS provider supports `default_tags` for resources that implement `tags`, with `aws_autoscaling_group` as a notable exception.

```hcl
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment  = var.environment
      Project      = var.project
      Team         = var.team
      ManagedBy    = "opentofu"
      CostCenter   = var.cost_center
      Terraform    = "true"
    }
  }
}
```

## Centralized Tag Local Variables

```hcl
# modules/tagging/main.tf

variable "environment" { type = string }
variable "project"     { type = string }
variable "team"        { type = string }
variable "cost_center" { type = string }
variable "extra_tags"  {
  type    = map(string)
  default = {}
}

locals {
  # Base tags applied to all resources
  base_tags = {
    Environment = var.environment
    Project     = var.project
    Team        = var.team
    CostCenter  = var.cost_center
    ManagedBy   = "opentofu"
  }

  # Merge base tags with resource-specific extra tags
  # Extra tags override base tags on conflict
  all_tags = merge(local.base_tags, var.extra_tags)
}

output "tags" {
  value = local.all_tags
}
```

## Using the Tagging Module

```hcl
module "tags" {
  source      = "./modules/tagging"
  environment = var.environment
  project     = "payment-service"
  team        = "platform"
  cost_center = "engineering-001"

  extra_tags = {
    Component = "database"
    BackupEnabled = "true"
  }
}

resource "aws_db_instance" "main" {
  identifier = "payments-db"
  # ... other config ...

  tags = module.tags.tags
}

resource "aws_s3_bucket" "backups" {
  bucket = "payments-backups-${var.environment}"

  tags = merge(module.tags.tags, {
    DataClassification = "confidential"
    RetentionDays      = "90"
  })
}
```

## Validating Required Tags with check Blocks

OpenTofu supports `check` blocks for non-blocking validation during plan and apply.

```hcl
check "all_resources_tagged" {
  assert {
    condition = length([
      for resource_tags in [
        aws_db_instance.main.tags_all,
        aws_s3_bucket.backups.tags_all
      ] : resource_tags
      if !contains(keys(resource_tags), "CostCenter")
    ]) == 0
    error_message = "All resources must have a CostCenter tag."
  }
}
```

## Automated Tag Compliance Script

```bash
#!/bin/bash
# scripts/check-tag-compliance.sh
# Scan OpenTofu state for missing required tags
# Requires: jq

set -euo pipefail

REQUIRED_TAGS='["Environment", "Project", "Team", "CostCenter"]'
VIOLATIONS=0

missing_tags=$(
  tofu show -state -json | jq -r --argjson required_tags "$REQUIRED_TAGS" '
    def resources(mod):
      (mod.resources // [])[],
      ((mod.child_modules // [])[] | resources(.));

    .values.root_module? as $root
    | if $root == null then
        empty
      else
        $root
        | resources(.)
        | select(.mode == "managed")
        | select((.values.tags_all // .values.tags // null) != null)
        | . as $resource
        | (.values.tags_all // .values.tags // {}) as $tags
        | $required_tags[]
        | select($tags[.] == null)
        | "MISSING TAG '\''\(.)'\'' on: \($resource.address)"
      end
  '
)

if [[ -n "$missing_tags" ]]; then
  echo "$missing_tags"
  VIOLATIONS=$(printf '%s\n' "$missing_tags" | wc -l | tr -d ' ')
fi

if [[ $VIOLATIONS -gt 0 ]]; then
  echo "Found $VIOLATIONS tag violations."
  exit 1
fi

echo "All resources comply with tagging policy."
```

## Variable File with Tags

```hcl
# environments/prod.tfvars
environment = "prod"
project     = "payment-service"
team        = "platform-eng"
cost_center = "cc-1234"
```

## Summary

Consistent resource tagging requires a combination of provider-level default tags, centralized tag modules, and compliance checks. OpenTofu's `default_tags` in the AWS provider eliminates tag repetition, while `check` blocks and compliance scripts help validate tag governance across the entire resource fleet.

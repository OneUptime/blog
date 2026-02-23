# How to Implement Cost Policies with Sentinel for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Cost Management, Terraform Cloud, HashiCorp

Description: Learn how to implement cost policies with Sentinel for Terraform to enforce spending limits, restrict expensive resources, and automate cost governance in CI/CD.

---

Sentinel is HashiCorp's policy-as-code framework that integrates directly with Terraform Cloud and Terraform Enterprise. It allows you to define fine-grained policies that are evaluated during the Terraform plan phase, before any infrastructure changes are applied. For cost management, this means you can prevent expensive resources from being created, enforce instance type restrictions, and require cost-related tags on every resource.

This guide covers how to write and deploy Sentinel policies that enforce cost governance across your Terraform workspaces.

## Understanding Sentinel Policy Enforcement

Sentinel policies run after terraform plan but before terraform apply. This timing is critical for cost governance because it means you can evaluate the financial impact of a change and block it if necessary, before any money is spent. Policies can be set to advisory (warn but allow), soft-mandatory (can be overridden), or hard-mandatory (cannot be overridden).

## Restricting Instance Types by Environment

One of the most impactful cost policies is preventing expensive instance types in non-production environments.

```python
# restrict-instance-types.sentinel
# Policy: Restrict EC2 instance types based on environment

import "tfplan/v2" as tfplan
import "strings"

# Define allowed instance types per environment
allowed_types = {
  "development": [
    "t3.micro", "t3.small", "t3.medium",
    "t3a.micro", "t3a.small", "t3a.medium",
  ],
  "staging": [
    "t3.micro", "t3.small", "t3.medium", "t3.large",
    "t3a.micro", "t3a.small", "t3a.medium", "t3a.large",
    "m5.large", "m6i.large",
  ],
  "production": [
    "t3.medium", "t3.large", "t3.xlarge",
    "m5.large", "m5.xlarge", "m5.2xlarge",
    "m6i.large", "m6i.xlarge", "m6i.2xlarge",
    "r5.large", "r5.xlarge", "r5.2xlarge",
    "r6i.large", "r6i.xlarge", "r6i.2xlarge",
    "c5.large", "c5.xlarge", "c5.2xlarge",
  ],
}

# Get the environment from workspace variables
param environment default "development"

# Find all EC2 instances being created or updated
ec2_instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_instance" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check each instance against allowed types
violations = []
for ec2_instances as _, instance {
  instance_type = instance.change.after.instance_type
  if instance_type not in allowed_types[environment] {
    append(violations, "Instance " + instance.address +
      " uses type " + instance_type +
      " which is not allowed in " + environment)
  }
}

# Main rule - fail if any violations found
main = rule {
  length(violations) is 0
}
```

## Enforcing Maximum Resource Costs

Use Sentinel with Terraform Cloud's cost estimation feature to block changes that exceed a cost threshold.

```python
# restrict-monthly-cost-increase.sentinel
# Policy: Block changes that increase monthly costs above threshold

import "tfrun"
import "decimal"

# Maximum allowed monthly cost increase per apply
param max_monthly_increase default 500

# Maximum total monthly cost
param max_total_monthly default 10000

# Get cost estimation data from the run
cost_estimate = tfrun.cost_estimate

# Check if cost estimation is available
has_cost_estimate = rule {
  cost_estimate is not null and
  cost_estimate is not undefined
}

# Check monthly cost increase
cost_increase_acceptable = rule when has_cost_estimate {
  decimal.new(cost_estimate.delta_monthly_cost).less_than(
    decimal.new(max_monthly_increase)
  )
}

# Check total monthly cost
total_cost_acceptable = rule when has_cost_estimate {
  decimal.new(cost_estimate.proposed_monthly_cost).less_than(
    decimal.new(max_total_monthly)
  )
}

# Main rule
main = rule {
  has_cost_estimate and
  cost_increase_acceptable and
  total_cost_acceptable
}
```

## Requiring Cost Tags on All Resources

Ensure every resource has the tags needed for cost allocation and tracking.

```python
# require-cost-tags.sentinel
# Policy: Require cost allocation tags on all taggable resources

import "tfplan/v2" as tfplan

# Required tags for cost allocation
required_tags = [
  "Environment",
  "Team",
  "CostCenter",
  "Project",
  "ManagedBy",
]

# Resource types that must have tags
taggable_resources = [
  "aws_instance",
  "aws_db_instance",
  "aws_rds_cluster",
  "aws_s3_bucket",
  "aws_lambda_function",
  "aws_ecs_cluster",
  "aws_ecs_service",
  "aws_lb",
  "aws_ebs_volume",
  "aws_elasticache_cluster",
  "aws_elasticsearch_domain",
  "aws_kinesis_stream",
  "aws_sqs_queue",
  "aws_sns_topic",
]

# Find all taggable resources being created or updated
resources = filter tfplan.resource_changes as _, rc {
  rc.type in taggable_resources and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check each resource for required tags
violations = []
for resources as _, resource {
  tags = resource.change.after.tags else {}
  if tags is null {
    tags = {}
  }

  for required_tags as tag {
    if tag not in keys(tags) {
      append(violations, resource.address + " is missing required tag: " + tag)
    } else if tags[tag] is "" or tags[tag] is null {
      append(violations, resource.address + " has empty value for tag: " + tag)
    }
  }
}

# Print violations for debugging
if length(violations) > 0 {
  print("Tag violations found:")
  for violations as v {
    print("  - " + v)
  }
}

main = rule {
  length(violations) is 0
}
```

## Preventing Unencrypted Storage

Unencrypted storage may lead to compliance issues and often misses the opportunity to use cheaper storage tiers that require encryption.

```python
# require-encryption.sentinel
# Policy: Require encryption on all storage resources

import "tfplan/v2" as tfplan

# Find all EBS volumes
ebs_volumes = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_ebs_volume" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Find all RDS instances
rds_instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_db_instance" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check EBS encryption
ebs_encrypted = rule {
  all ebs_volumes as _, vol {
    vol.change.after.encrypted is true
  }
}

# Check RDS encryption
rds_encrypted = rule {
  all rds_instances as _, db {
    db.change.after.storage_encrypted is true
  }
}

main = rule {
  ebs_encrypted and rds_encrypted
}
```

## Deploying Sentinel Policies

Sentinel policies are configured in Terraform Cloud using policy sets.

```hcl
# Terraform configuration to manage Sentinel policy sets
resource "tfe_policy_set" "cost_governance" {
  name         = "cost-governance-policies"
  description  = "Policies for cloud cost governance"
  organization = var.tfc_organization
  kind         = "sentinel"

  # Apply to all workspaces
  global = false

  # Apply to specific workspaces
  workspace_ids = var.governed_workspace_ids
}

# Individual policy definitions
resource "tfe_sentinel_policy" "restrict_instances" {
  name         = "restrict-instance-types"
  description  = "Restrict EC2 instance types by environment"
  organization = var.tfc_organization
  policy       = file("${path.module}/policies/restrict-instance-types.sentinel")
  enforce_mode = "hard-mandatory"
}

resource "tfe_sentinel_policy" "cost_limit" {
  name         = "restrict-monthly-cost"
  description  = "Block changes exceeding cost threshold"
  organization = var.tfc_organization
  policy       = file("${path.module}/policies/restrict-monthly-cost-increase.sentinel")
  enforce_mode = "soft-mandatory"
}

resource "tfe_sentinel_policy" "require_tags" {
  name         = "require-cost-tags"
  description  = "Require cost allocation tags on all resources"
  organization = var.tfc_organization
  policy       = file("${path.module}/policies/require-cost-tags.sentinel")
  enforce_mode = "hard-mandatory"
}

# Policy set parameters
resource "tfe_policy_set_parameter" "environment" {
  key          = "environment"
  value        = var.environment
  policy_set_id = tfe_policy_set.cost_governance.id
}

resource "tfe_policy_set_parameter" "max_monthly" {
  key          = "max_monthly_increase"
  value        = var.max_monthly_cost_increase
  policy_set_id = tfe_policy_set.cost_governance.id
}
```

## Best Practices

Start with advisory policies that warn but do not block. This gives teams time to adjust their configurations before enforcement begins. Use soft-mandatory for cost policies that may need exceptions, and hard-mandatory for absolute limits like preventing GPU instances in development accounts.

Keep policies focused and composable. A single policy should check one thing well. Combine multiple focused policies rather than creating one monolithic policy that checks everything.

For more on cost governance, see our guides on [cost governance with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-governance-with-terraform/view) and [cost allocation tags with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cost-allocation-tags-across-teams-with-terraform/view).

## Conclusion

Sentinel policies for Terraform provide the enforcement layer that turns cost guidelines into automated guardrails. By checking resource types, estimated costs, required tags, and security configurations during the plan phase, you prevent expensive mistakes before they happen. Combined with Terraform Cloud's cost estimation feature, Sentinel creates a powerful feedback loop where every infrastructure change is evaluated for its financial impact before it reaches production.

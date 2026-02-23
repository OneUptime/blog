# How to Implement Cost Controls with Terraform Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Controls, Policy as Code, Sentinel, OPA

Description: Learn how to implement cost control policies for Terraform using Sentinel, OPA, and custom validation rules to prevent expensive infrastructure deployments.

---

Without guardrails, developers can accidentally deploy expensive infrastructure that blows through budgets. Policy-as-code enables you to enforce cost controls at the Terraform level, preventing costly resources from being created without approval. This guide covers implementing cost policies using Sentinel, OPA, and Terraform's built-in validation features.

## Types of Cost Control Policies

Cost control policies fall into several categories: instance size restrictions that prevent oversized resources, region restrictions that limit deployment to cheaper regions, resource quantity limits that cap the number of expensive resources, mandatory tagging for cost allocation, and approval requirements for resources exceeding cost thresholds.

## Sentinel Policies (HCP Terraform)

Sentinel is the policy-as-code framework built into HCP Terraform:

```python
# restrict-instance-sizes.sentinel
# Prevent deployment of expensive instance types

import "tfplan/v2" as tfplan

# Allowed instance types per environment
allowed_types = {
    "development": ["t3.micro", "t3.small", "t3.medium"],
    "staging":     ["t3.small", "t3.medium", "t3.large"],
    "production":  ["t3.medium", "t3.large", "t3.xlarge", "m5.large", "m5.xlarge"],
}

# Get the environment from variables
environment = tfplan.variables.environment.value

# Check all EC2 instances
main = rule {
    all tfplan.resource_changes as _, rc {
        rc.type is "aws_instance" and
        rc.change.actions contains "create" implies
            rc.change.after.instance_type in allowed_types[environment]
    }
}
```

```python
# max-monthly-cost.sentinel
# Enforce a maximum monthly cost for new resources

import "tfplan/v2" as tfplan
import "decimal"

# Monthly cost estimates per instance type (simplified)
cost_map = {
    "t3.micro":    decimal.new(7.59),
    "t3.small":    decimal.new(15.18),
    "t3.medium":   decimal.new(30.37),
    "t3.large":    decimal.new(60.74),
    "t3.xlarge":   decimal.new(121.47),
    "m5.large":    decimal.new(70.08),
    "m5.xlarge":   decimal.new(140.16),
    "m5.2xlarge":  decimal.new(280.32),
}

max_monthly_increase = decimal.new(500)

# Calculate total monthly cost of new instances
total_new_cost = decimal.new(0)
for tfplan.resource_changes as _, rc {
    if rc.type is "aws_instance" and rc.change.actions contains "create" {
        instance_type = rc.change.after.instance_type
        if instance_type in cost_map {
            total_new_cost = total_new_cost.add(cost_map[instance_type])
        }
    }
}

main = rule {
    total_new_cost.less_than(max_monthly_increase)
}
```

## OPA Policies

Open Policy Agent works with any Terraform setup:

```rego
# cost-controls.rego
package terraform.cost

# Deny expensive instance types in non-production
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_instance"
    resource.change.actions[_] == "create"

    expensive_types := {"m5.4xlarge", "m5.8xlarge", "m5.12xlarge", "m5.16xlarge", "m5.24xlarge", "r5.4xlarge", "r5.8xlarge", "c5.9xlarge", "c5.18xlarge"}
    resource.change.after.instance_type == expensive_types[_]

    # Check if the workspace indicates non-production
    not contains(input.configuration.root_module.variables.environment.default, "production")

    msg := sprintf("Instance type %s is too expensive for non-production. Resource: %s", [resource.change.after.instance_type, resource.address])
}

# Deny RDS instances larger than allowed
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_db_instance"
    resource.change.actions[_] == "create"

    blocked_classes := {"db.r5.4xlarge", "db.r5.8xlarge", "db.r5.12xlarge", "db.r5.16xlarge", "db.m5.4xlarge", "db.m5.8xlarge"}
    resource.change.after.instance_class == blocked_classes[_]

    msg := sprintf("RDS instance class %s requires approval. Resource: %s", [resource.change.after.instance_class, resource.address])
}

# Require encryption on all storage
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_ebs_volume"
    resource.change.actions[_] == "create"
    not resource.change.after.encrypted

    msg := sprintf("EBS volume must be encrypted: %s", [resource.address])
}
```

Run OPA against a Terraform plan:

```bash
# Generate plan JSON
terraform plan -out=plan.binary
terraform show -json plan.binary > plan.json

# Evaluate OPA policies
opa eval --data cost-controls.rego --input plan.json "data.terraform.cost.deny"
```

## Terraform Variable Validation

Use built-in validation for basic cost controls:

```hcl
variable "instance_type" {
  type = string

  validation {
    condition = contains([
      "t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge",
      "m5.large", "m5.xlarge"
    ], var.instance_type)
    error_message = "Instance type must be from the approved list. Contact platform team for exceptions."
  }
}

variable "rds_instance_class" {
  type = string

  validation {
    condition = contains([
      "db.t3.micro", "db.t3.small", "db.t3.medium", "db.t3.large",
      "db.r5.large", "db.r5.xlarge"
    ], var.rds_instance_class)
    error_message = "RDS instance class must be from the approved list."
  }
}

variable "ebs_volume_size" {
  type = number

  validation {
    condition     = var.ebs_volume_size <= 1000
    error_message = "EBS volume size cannot exceed 1000 GB without approval."
  }
}

variable "instance_count" {
  type = number

  validation {
    condition     = var.instance_count <= 20
    error_message = "Cannot create more than 20 instances. Contact platform team for higher limits."
  }
}
```

## Integrating Infracost with Policies

Combine Infracost with policy enforcement:

```bash
#!/bin/bash
# cost-gate.sh
# Enforce cost policies using Infracost output

# Generate cost estimate
infracost breakdown --path . --format json > costs.json

# Extract monthly cost
MONTHLY_COST=$(jq -r '.totalMonthlyCost' costs.json)
DIFF_COST=$(jq -r '.diffTotalMonthlyCost // 0' costs.json)

echo "Current monthly cost: $MONTHLY_COST"
echo "Cost change: $DIFF_COST"

# Policy: Maximum monthly cost per project
MAX_MONTHLY=10000
if (( $(echo "$MONTHLY_COST > $MAX_MONTHLY" | bc -l) )); then
  echo "BLOCKED: Monthly cost (\$$MONTHLY_COST) exceeds maximum (\$$MAX_MONTHLY)"
  exit 1
fi

# Policy: Maximum single change cost increase
MAX_INCREASE=500
if (( $(echo "$DIFF_COST > $MAX_INCREASE" | bc -l) )); then
  echo "REQUIRES APPROVAL: Cost increase (\$$DIFF_COST) exceeds \$$MAX_INCREASE"
  echo "Please get approval from finance team before applying."
  exit 1
fi

echo "PASSED: All cost policies satisfied"
```

## CI/CD Integration

Add cost policies to your pipeline:

```yaml
# .github/workflows/cost-policy.yml
name: Cost Policy Check
on:
  pull_request:
    paths:
      - '**/*.tf'

jobs:
  cost-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Generate plan
        run: |
          terraform init
          terraform plan -out=plan.binary
          terraform show -json plan.binary > plan.json

      - name: Run OPA policies
        uses: open-policy-agent/opa-action@v2
        with:
          tests: policies/
          input: plan.json

      - name: Check Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - run: |
          infracost breakdown --path . --format json > costs.json
          ./scripts/cost-gate.sh
```

## Best Practices

Layer policies from permissive to restrictive: allow small resources freely, require review for medium resources, and block large resources unless explicitly approved. Use Infracost for dollar-based policies and Sentinel/OPA for attribute-based policies. Apply different policy sets per environment. Provide clear error messages that explain how to request exceptions. Review and update cost policies quarterly as pricing changes.

## Conclusion

Cost control policies in Terraform prevent budget surprises by enforcing guardrails at deployment time. Whether using Sentinel, OPA, or Terraform validation, the goal is to catch expensive changes before they reach production. Combined with Infracost for dollar-based estimates, these policies create a comprehensive cost governance framework that balances developer velocity with financial responsibility.

For related guides, see [How to Set Up Infracost in CI/CD Pipelines for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-infracost-in-cicd-pipelines-for-terraform/view) and [How to Use Terraform for FinOps Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-for-finops-best-practices/view).

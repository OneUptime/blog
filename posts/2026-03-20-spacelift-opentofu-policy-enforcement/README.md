# How to Use Spacelift with OpenTofu for Policy Enforcement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Spacelift, Policy Enforcement, OPA, Infrastructure as Code, DevOps

Description: Learn how to connect Spacelift to your OpenTofu stacks and use its Open Policy Agent-based policies to enforce security, cost, and governance rules before infrastructure changes reach production.

## Introduction

Spacelift is a CI/CD platform purpose-built for infrastructure-as-code. Its standout feature is policy enforcement: OpenTofu plan data can be evaluated against Open Policy Agent (OPA) policies that warn or block changes, while approval policies can require sign-off before changes are applied.

## Creating a Spacelift Stack for OpenTofu

In the Spacelift UI (or via its Terraform/OpenTofu provider), create a stack that uses the OpenTofu workflow tool:

```hcl
# spacelift.tf - manage Spacelift stacks with OpenTofu

terraform {
  required_providers {
    spacelift = {
      source  = "spacelift-io/spacelift"
      version = "~> 1.0"
    }
  }
}

provider "spacelift" {}

resource "spacelift_stack" "production_infra" {
  name       = "production-infra"
  repository = "infra-repo"
  branch     = "main"
  project_root = "environments/production"

  # Use OpenTofu instead of Terraform
  terraform_workflow_tool = "OPEN_TOFU"
  terraform_version       = "1.9.0"

  # Keep auto-apply on push to main disabled for production
  autodeploy = false
}
```

## Writing an OPA Policy in Spacelift

Spacelift policies are written in Rego. The examples below use Rego v1 syntax. This example denies any plan that destroys more than 5 resources:

```rego
# policies/deny-mass-destroy.rego
package spacelift

# Collect all resources that will be destroyed
destroyed_resources := [resource |
    some resource in input.terraform.resource_changes
    "delete" in resource.change.actions
]

# Deny if more than 5 resources would be destroyed at once
deny contains "Mass destruction: more than 5 resources would be deleted" if {
    count(destroyed_resources) > 5
}

# Warn if any resource change involves a database instance
warn contains "Database instance change detected - review carefully" if {
    some resource in input.terraform.resource_changes
    contains(resource.type, "db_instance")
    some action in resource.change.actions
    action != "no-op"
}
```

## Enforcing Mandatory Tags Policy

```rego
# policies/require-tags.rego
package spacelift

required_tags := {"Environment", "Owner", "CostCenter"}

has_action(resource, action) if {
    some planned_action in resource.change.actions
    planned_action == action
}

has_required_tag(resource, tag) if {
    _ := resource.change.after.tags[tag]
}

# Collect resources missing required tag keys
resources_missing_tags := {resource.address |
    some resource in input.terraform.resource_changes
    not has_action(resource, "delete")
    not has_action(resource, "no-op")
    some tag in required_tags
    not has_required_tag(resource, tag)
}

deny contains msg if {
    count(resources_missing_tags) > 0
    msg := sprintf("Resources missing required tags: %v", [sort(resources_missing_tags)])
}
```

## Attaching a Policy to a Stack

```hcl
# Create the policy resource
resource "spacelift_policy" "deny_mass_destroy" {
  name        = "deny-mass-destroy"
  body        = file("policies/deny-mass-destroy.rego")
  type        = "PLAN"
  engine_type = "REGO_V1"
}

# Attach it to the stack
resource "spacelift_policy_attachment" "production_deny_mass_destroy" {
  policy_id = spacelift_policy.deny_mass_destroy.id
  stack_id  = spacelift_stack.production_infra.id
}
```

## Environment Variables and Secrets

```hcl
# Inject AWS configuration as environment variables into the stack
resource "spacelift_environment_variable" "aws_region" {
  stack_id   = spacelift_stack.production_infra.id
  name       = "AWS_DEFAULT_REGION"
  value      = "us-east-1"
  write_only = false
}

resource "spacelift_environment_variable" "aws_role" {
  stack_id   = spacelift_stack.production_infra.id
  name       = "AWS_ROLE_ARN"
  value      = "arn:aws:iam::123456789012:role/spacelift-role"
  write_only = false
}
```

## Approval Policies

Use an approval policy to require human sign-off before applying:

```rego
# policies/require-approval.rego
package spacelift

# Require at least one approval for production stacks
approve if {
    count(input.reviews.current.approvals) >= 1
    count(input.reviews.current.rejections) == 0
}
```

## Conclusion

Spacelift provides a managed GitOps platform for OpenTofu with built-in OPA policy enforcement. By attaching plan and approval policies to your stacks, you get automated guardrails that prevent destructive changes, enforce tagging standards, and require human review - all before a single resource is modified in production.

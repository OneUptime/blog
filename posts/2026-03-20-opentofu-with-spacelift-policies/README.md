# How to Use OpenTofu with Spacelift Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Spacelift, Policies, OPA, Rego, GitOps, CI/CD

Description: Learn how to use Spacelift's policy-as-code engine with OpenTofu to enforce infrastructure standards, require approvals, and block dangerous changes automatically.

## Introduction

Spacelift provides a policy engine based on Open Policy Agent (OPA) that integrates with OpenTofu plan output. Policies can approve, reject, warn on, or require human approval for changes before they're applied.

## Setting Up Spacelift for OpenTofu

```hcl
# spacelift/stack.tf - Define the OpenTofu stack in Spacelift via Terraform provider

provider "spacelift" {}

resource "spacelift_stack" "app" {
  name        = "production-app"
  description = "Production application infrastructure"

  # Use OpenTofu instead of Terraform
  terraform_workflow_tool = "OPEN_TOFU"
  terraform_version       = "1.7.0"

  repository   = "my-org/infrastructure"
  branch       = "main"
  project_root = "environments/prod"

  # Auto-apply on push to main (after policies approve)
  autodeploy = true
}
```

## Plan Policy: Block Deletions of Critical Resources

```rego
# policies/protect-production.rego
# Deny plans that would destroy production databases or buckets

package spacelift

# Deny if any resource destruction would affect critical resources
deny[sprintf("Destroying critical resource: %s (%s)", [resource.address, resource.type])] {
    resource := input.terraform.resource_changes[_]
    resource.change.actions[_] == "delete"
    critical_types := {
        "aws_db_instance",
        "aws_rds_cluster",
        "aws_s3_bucket",
        "aws_elasticache_replication_group"
    }
    critical_types[resource.type]
}
```

## Approval Policy: Require Human Review for Production

```rego
# policies/require-approval.rego
# Auto-approve safe runs; everything else falls through to human approval

package spacelift

import future.keywords.every

# Auto-approve runs with no resource changes
approve {
    count(input.run.changes) == 0
}

# Auto-approve runs that only add resources
approve {
    every change in input.run.changes {
        change.action == "added"
    }
}

# Any run with modifications or deletions has no `approve` rule firing,
# so it requires human approval before it can proceed.
```

## Tag Compliance Policy

```rego
# policies/tagging.rego
# Warn when resources are missing required tags

package spacelift

required_tags := {"Environment", "Project", "Team"}

warn[sprintf("Resource %s is missing required tags: %v", [resource.address, missing])] {
    resource := input.terraform.resource_changes[_]
    resource.change.actions[_] == "create"
    after_tags := {k | k := object.keys(resource.change.after.tags)[_]}
    missing := required_tags - after_tags
    count(missing) > 0
}
```

## Attaching Policies to Stacks

```hcl
resource "spacelift_policy" "protect_production" {
  name = "protect-production-resources"
  type = "PLAN"
  body = file("policies/protect-production.rego")
}

resource "spacelift_policy_attachment" "app" {
  policy_id = spacelift_policy.protect_production.id
  stack_id  = spacelift_stack.app.id
}
```

## Login Policy: Team-Based Stack Access

```rego
# policies/login.rego
# Grant access based on GitHub team membership

package spacelift

# Platform team members get admin access
admin {
    input.session.teams[_] == "my-org/platform-team"
}

# All engineers can log in as non-admin users
allow {
    input.session.teams[_] == "my-org/engineering"
}
```

## Conclusion

Spacelift policies give you guardrails for OpenTofu operations without requiring changes to your HCL code. Plan policies block dangerous operations, approval policies route changes to the right reviewers, and tag compliance policies enforce organizational standards. All policies are written in Rego and version-controlled alongside your infrastructure code.

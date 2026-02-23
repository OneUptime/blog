# How to Use Sentinel with Terraform Enterprise

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Terraform Enterprise, Policy as Code, Governance, HashiCorp, DevOps

Description: Set up and manage Sentinel policies in Terraform Enterprise with policy sets, enforcement levels, workspace scoping, and organizational governance workflows.

---

Terraform Enterprise gives you the self-hosted version of Terraform Cloud with additional features for large organizations. One of its most valuable capabilities is Sentinel integration, which lets you enforce policies on every Terraform run across your entire organization. Unlike open-source Terraform where policy enforcement requires external tools, Terraform Enterprise makes Sentinel a native part of the workflow.

This post covers how to set up Sentinel in Terraform Enterprise from scratch, manage policy sets, scope policies to the right workspaces, and build an organizational governance workflow.

## How Sentinel Fits into the Terraform Enterprise Workflow

In Terraform Enterprise, every run goes through a defined sequence: plan, policy check, and then apply. Sentinel sits between plan and apply. After Terraform generates a plan, Sentinel evaluates the planned changes against your policies. If a hard-mandatory policy fails, the apply is blocked. If a soft-mandatory policy fails, authorized users can override the failure and proceed.

This position in the workflow is powerful because Sentinel has access to the full plan data - every resource being created, modified, or destroyed, along with all their attributes and the current state.

## Setting Up Your First Policy Set

Policy sets in Terraform Enterprise are collections of Sentinel policies that are applied to one or more workspaces. You can create them through the UI or the API.

Start by creating a Git repository for your policies:

```
sentinel-policies/
    policies/
        require-tags.sentinel
        restrict-regions.sentinel
    modules/
        common/
            common.sentinel
    test/
        require-tags/
            pass.hcl
            fail.hcl
    sentinel.hcl
```

The `sentinel.hcl` file defines the policy set configuration:

```hcl
# sentinel.hcl
# Main configuration for the Sentinel policy set

# Import shared module
module "common" {
    source = "./modules/common/common.sentinel"
}

# Tag enforcement policy
policy "require-tags" {
    source            = "./policies/require-tags.sentinel"
    enforcement_level = "hard-mandatory"
}

# Region restriction policy
policy "restrict-regions" {
    source            = "./policies/restrict-regions.sentinel"
    enforcement_level = "hard-mandatory"
}
```

## Connecting Policy Sets via the API

While you can connect policy sets through the UI, the API gives you more control and is better for automation:

```bash
# Create a policy set connected to a VCS repository
curl \
    --header "Authorization: Bearer $TFE_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data '{
        "data": {
            "type": "policy-sets",
            "attributes": {
                "name": "security-policies",
                "description": "Organization-wide security policies",
                "global": false,
                "policies-path": "",
                "vcs-repo": {
                    "identifier": "myorg/sentinel-policies",
                    "branch": "main",
                    "oauth-token-id": "ot-xxxxxxxxxxxx"
                }
            },
            "relationships": {
                "workspaces": {
                    "data": [
                        { "id": "ws-xxxxxxxxxxxx", "type": "workspaces" }
                    ]
                }
            }
        }
    }' \
    "https://tfe.mycompany.com/api/v2/organizations/myorg/policy-sets"
```

## Scoping Policies to Workspaces

Not every policy applies to every workspace. Development workspaces might have relaxed policies while production workspaces need strict enforcement. Terraform Enterprise gives you several scoping options.

**Global policies** apply to every workspace in the organization:

```bash
# Create a global policy set
curl \
    --header "Authorization: Bearer $TFE_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data '{
        "data": {
            "type": "policy-sets",
            "attributes": {
                "name": "global-security",
                "global": true
            }
        }
    }' \
    "https://tfe.mycompany.com/api/v2/organizations/myorg/policy-sets"
```

**Workspace-scoped policies** apply only to listed workspaces:

```bash
# Attach a policy set to specific workspaces
curl \
    --header "Authorization: Bearer $TFE_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data '{
        "data": [
            { "id": "ws-prod-api", "type": "workspaces" },
            { "id": "ws-prod-web", "type": "workspaces" }
        ]
    }' \
    "https://tfe.mycompany.com/api/v2/policy-sets/polset-xxxx/relationships/workspaces"
```

**Project-scoped policies** apply to all workspaces within a project, which is useful for team-level governance.

## Understanding Enforcement Levels

Terraform Enterprise supports three enforcement levels that determine what happens when a policy fails:

**hard-mandatory**: The run is blocked. No one can override the failure. Use this for security-critical rules like "no public databases" or "encryption required."

**soft-mandatory**: The run is blocked by default, but users with the "Manage Policy Overrides" permission can approve the run anyway. Use this for rules that might have legitimate exceptions.

**advisory**: The policy check result is shown but never blocks the run. Use this for new policies you are rolling out or for best-practice recommendations.

Here is a pattern that works well for organizations:

```hcl
# sentinel.hcl - Tiered enforcement

# Security: Never allow exceptions
policy "no-public-databases" {
    source            = "./policies/no-public-databases.sentinel"
    enforcement_level = "hard-mandatory"
}

# Compliance: Allow documented exceptions
policy "require-encryption" {
    source            = "./policies/require-encryption.sentinel"
    enforcement_level = "soft-mandatory"
}

# Best practices: Inform but do not block
policy "naming-conventions" {
    source            = "./policies/naming-conventions.sentinel"
    enforcement_level = "advisory"
}
```

## Using Sentinel Imports in Enterprise

Terraform Enterprise provides several imports that give Sentinel access to run data:

```python
# tfplan/v2 - Access the Terraform plan
import "tfplan/v2" as tfplan

# tfconfig/v2 - Access the Terraform configuration
import "tfconfig/v2" as tfconfig

# tfstate/v2 - Access the current Terraform state
import "tfstate/v2" as tfstate

# tfrun - Access run metadata
import "tfrun"
```

The `tfrun` import is particularly useful in Enterprise because it gives you access to workspace metadata:

```python
# workspace-aware-policy.sentinel
# Apply different rules based on workspace name

import "tfplan/v2" as tfplan
import "tfrun"

# Get workspace name
workspace_name = tfrun.workspace.name

# Determine environment from workspace name
is_production = workspace_name matches ".*-prod$" or
                workspace_name matches ".*-production$"

# Only enforce strict rules in production
if is_production {
    instances = filter tfplan.resource_changes as _, rc {
        rc.type is "aws_instance" and
        rc.mode is "managed" and
        (rc.change.actions contains "create" or
         rc.change.actions contains "update")
    }

    violations = []
    for instances as address, instance {
        # Production instances must use approved types
        instance_type = instance.change.after.instance_type else ""
        if instance_type matches "^t2\\." {
            append(violations, address + " - t2 instances not allowed in production")
        }
    }

    main = rule {
        length(violations) is 0
    }
} else {
    # Non-production: always pass
    main = rule { true }
}
```

## Cost Estimation Policies

Terraform Enterprise includes cost estimation. You can write Sentinel policies that enforce cost limits:

```python
# cost-limit.sentinel
# Enforce maximum cost increase per run

import "tfrun"
import "decimal"

# Maximum allowed monthly cost increase per run (in USD)
max_monthly_increase = decimal.new(500)

# Get the cost estimate
proposed_cost = decimal.new(tfrun.cost_estimate.proposed_monthly_cost)
previous_cost = decimal.new(tfrun.cost_estimate.prior_monthly_cost)
cost_increase = proposed_cost.subtract(previous_cost)

print("Previous monthly cost: $" + previous_cost.string())
print("Proposed monthly cost: $" + proposed_cost.string())
print("Cost increase: $" + cost_increase.string())

# Check if the cost increase exceeds the limit
main = rule {
    cost_increase.less_than_or_equals(max_monthly_increase)
}
```

## Managing Policy Set Versions

When you connect a policy set to a VCS repository, Terraform Enterprise automatically picks up changes when you push to the configured branch. This creates a natural versioning workflow:

1. Develop and test policies on a feature branch
2. Open a pull request for peer review
3. Merge to the main branch
4. Terraform Enterprise automatically updates the policy set

For more controlled rollouts, use branch-based policy sets:

```bash
# Create a policy set that tracks a specific branch
# Use "staging" branch for testing before promoting to "main"
```

## Organizing Policy Sets for Large Organizations

For organizations with many teams and workspaces, structure your policy sets by scope and concern:

```
# Global policies - apply to all workspaces
global-security/
    sentinel.hcl
    policies/
        require-encryption.sentinel
        deny-public-access.sentinel

# Team-specific policies
team-platform/
    sentinel.hcl
    policies/
        naming-conventions.sentinel
        approved-instance-types.sentinel

# Environment-specific policies
production-only/
    sentinel.hcl
    policies/
        require-multi-az.sentinel
        require-deletion-protection.sentinel
        cost-limits.sentinel
```

Each directory is a separate policy set in Terraform Enterprise, connected to the same or different repositories.

## Monitoring Policy Results

Use the Terraform Enterprise API to monitor policy check results across your organization:

```bash
# Get policy check results for a run
curl \
    --header "Authorization: Bearer $TFE_TOKEN" \
    "https://tfe.mycompany.com/api/v2/runs/run-xxxx/policy-checks"

# List all policy check results (for reporting)
curl \
    --header "Authorization: Bearer $TFE_TOKEN" \
    "https://tfe.mycompany.com/api/v2/organizations/myorg/policy-checks"
```

Build dashboards that track policy pass rates, common violations, and override frequency to measure your governance program's effectiveness.

## Conclusion

Sentinel in Terraform Enterprise gives you automated, consistent policy enforcement across your entire organization. Start with global security policies that apply everywhere, add workspace-scoped policies for team-specific requirements, and use the tiered enforcement levels to roll out new policies without disrupting existing workflows. The combination of VCS-connected policy sets, workspace scoping, and cost estimation policies makes Terraform Enterprise a powerful governance platform.

For writing effective Sentinel policies, see our guide on [debugging Sentinel policy failures](https://oneuptime.com/blog/post/2026-02-23-how-to-debug-sentinel-policy-failures/view).

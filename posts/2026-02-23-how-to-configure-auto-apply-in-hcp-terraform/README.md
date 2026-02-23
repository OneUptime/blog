# How to Configure Auto-Apply in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Auto-Apply, CI/CD, Automation, DevOps

Description: Learn how to configure auto-apply in HCP Terraform workspaces to automatically apply successful plans without manual approval.

---

By default, HCP Terraform requires manual confirmation before applying a Terraform plan. This is a sensible safety measure for production infrastructure, but it adds friction to environments where you want fully automated deployments. Auto-apply removes that manual step - when a plan succeeds and passes all policy checks, HCP Terraform applies it immediately.

This guide covers when to use auto-apply, how to configure it, and how to set up guardrails so you can automate safely.

## How Auto-Apply Works

With auto-apply enabled:

1. A run is triggered (via VCS push, API call, or CLI)
2. Terraform runs the plan phase
3. If the plan succeeds and all policies pass, the apply starts immediately
4. No manual confirmation is needed

Without auto-apply (the default):

1. A run is triggered
2. Terraform runs the plan phase
3. The run pauses in a "Planned" state
4. Someone reviews the plan and clicks "Confirm & Apply"
5. The apply runs

## When to Use Auto-Apply

Auto-apply is appropriate for:

- **Development environments**: Fast iteration, low risk
- **Staging environments**: Automated deployments from CI/CD
- **Non-critical infrastructure**: Monitoring dashboards, internal tools
- **Run trigger chains**: When workspace B should apply after workspace A

Auto-apply is generally not recommended for:

- **Production infrastructure**: You want a human reviewing changes
- **Workspaces with destructive operations**: Database changes, network modifications
- **Shared infrastructure**: Resources used by multiple teams

## Enabling Auto-Apply

### Through the UI

1. Go to your workspace in HCP Terraform
2. Navigate to **Settings** > **General**
3. Under **Apply Method**, select **Auto apply**
4. Click **Save settings**

### Using the TFE Provider

```hcl
# Development workspace with auto-apply
resource "tfe_workspace" "dev" {
  name           = "app-development"
  organization   = "your-org"
  execution_mode = "remote"
  auto_apply     = true

  vcs_repo {
    identifier     = "your-org/app-infrastructure"
    branch         = "develop"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  tag_names = ["development", "auto-apply"]
}

# Production workspace WITHOUT auto-apply
resource "tfe_workspace" "prod" {
  name           = "app-production"
  organization   = "your-org"
  execution_mode = "remote"
  auto_apply     = false  # Manual confirmation required

  vcs_repo {
    identifier     = "your-org/app-infrastructure"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  tag_names = ["production", "manual-apply"]
}
```

### Through the API

```bash
# Enable auto-apply on a workspace
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "auto-apply": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}"
```

## Auto-Apply for Specific Run Types

You can configure auto-apply behavior more granularly:

### Auto-Apply Only for Run Triggers

If you use run triggers to chain workspaces together, you might want auto-apply only for triggered runs - not for VCS-triggered or manual runs:

```hcl
resource "tfe_workspace" "downstream" {
  name           = "app-downstream"
  organization   = "your-org"
  execution_mode = "remote"

  # Auto-apply for run triggers only
  auto_apply             = false  # No auto-apply for VCS/manual runs
  auto_apply_run_trigger = true   # Auto-apply when triggered by another workspace
}
```

### Per-Run Auto-Apply Override

When triggering a run via the API, you can override the workspace setting:

```bash
# Trigger a run with auto-apply, even if the workspace has it disabled
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data "{
    \"data\": {
      \"type\": \"runs\",
      \"attributes\": {
        \"message\": \"Automated deployment v2.1.0\",
        \"auto-apply\": true
      },
      \"relationships\": {
        \"workspace\": {
          \"data\": {
            \"type\": \"workspaces\",
            \"id\": \"${WORKSPACE_ID}\"
          }
        }
      }
    }
  }" \
  "https://app.terraform.io/api/v2/runs"
```

Note: This only works if the user or team token has apply permissions on the workspace.

## Adding Safety Guardrails

Auto-apply without guardrails is dangerous. Here is how to keep things safe:

### Sentinel Policies

Use Sentinel policies to prevent risky changes from being auto-applied:

```python
# sentinel/prevent-production-destroys.sentinel
# Prevent any resource destruction in production workspaces

import "tfrun"
import "tfplan/v2" as tfplan

# Check if this is a production workspace
is_production = "production" in (tfrun.workspace.tags else [])

# Count resource destructions
resource_destructions = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "delete"
}

# Rule: No destroys in production
main = rule when is_production {
    length(resource_destructions) is 0
}
```

```python
# sentinel/limit-resource-changes.sentinel
# Limit the number of resources that can change in a single apply

import "tfplan/v2" as tfplan

# Count all resource changes
total_changes = length(filter tfplan.resource_changes as _, rc {
    rc.change.actions is not ["no-op"] and
    rc.change.actions is not ["read"]
})

# Rule: No more than 20 resources changed at once
main = rule {
    total_changes <= 20
}
```

### OPA Policies

If you prefer Open Policy Agent:

```rego
# policies/auto-apply-safety.rego
package terraform

import input.plan as plan

# Deny if any resources are being destroyed
deny[msg] {
    resource := plan.resource_changes[_]
    resource.change.actions[_] == "delete"
    msg := sprintf("Resource %s is being destroyed - manual review required", [resource.address])
}

# Deny if changing sensitive resource types
deny[msg] {
    resource := plan.resource_changes[_]
    sensitive_types := {"aws_db_instance", "aws_rds_cluster", "aws_iam_role"}
    sensitive_types[resource.type]
    resource.change.actions[_] != "no-op"
    msg := sprintf("Sensitive resource type %s is being modified - manual review required", [resource.type])
}
```

### Run Tasks

Use run tasks to add external validation before auto-apply:

```hcl
# Create a run task for security scanning
resource "tfe_organization_run_task" "security_scan" {
  organization = "your-org"
  url          = "https://security-scanner.example.com/terraform-run-task"
  name         = "security-scan"
  enabled      = true
  hmac_key     = var.run_task_hmac_key
}

# Attach the run task to the workspace
resource "tfe_workspace_run_task" "dev_security" {
  workspace_id      = tfe_workspace.dev.id
  task_id           = tfe_organization_run_task.security_scan.id
  enforcement_level = "mandatory"  # Must pass before auto-apply
  stage             = "post_plan"
}
```

## Environment-Based Auto-Apply Strategy

A common pattern is to enable auto-apply based on environment:

```hcl
# Variables for environment configuration
variable "environments" {
  default = {
    development = {
      auto_apply = true
      branch     = "develop"
    }
    staging = {
      auto_apply = true
      branch     = "staging"
    }
    production = {
      auto_apply = false
      branch     = "main"
    }
  }
}

# Create workspaces with environment-appropriate settings
resource "tfe_workspace" "app" {
  for_each = var.environments

  name           = "app-${each.key}"
  organization   = "your-org"
  execution_mode = "remote"
  auto_apply     = each.value.auto_apply

  vcs_repo {
    identifier     = "your-org/app-infrastructure"
    branch         = each.value.branch
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  tag_names = [each.key, each.value.auto_apply ? "auto-apply" : "manual-apply"]
}
```

## Monitoring Auto-Applied Runs

Since auto-apply runs do not wait for human review, monitoring becomes even more important:

```hcl
# Notification for all run completions
resource "tfe_notification_configuration" "run_alerts" {
  name             = "Run Completion Alerts"
  enabled          = true
  destination_type = "slack"
  url              = var.slack_webhook_url
  workspace_id     = tfe_workspace.dev.id

  triggers = [
    "run:completed",  # Successful applies
    "run:errored",    # Failed runs
  ]
}
```

Set up a script to audit auto-apply activity:

```bash
#!/bin/bash
# audit-auto-applies.sh - List recent auto-applied runs

WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/runs?page[size]=20" \
  | jq '.data[] | select(.attributes["auto-apply"] == true) | {
    id: .id,
    status: .attributes.status,
    message: .attributes.message,
    created: .attributes["created-at"],
    additions: .attributes["resource-additions"],
    changes: .attributes["resource-changes"],
    destructions: .attributes["resource-destructions"]
  }'
```

## Disabling Auto-Apply Temporarily

For maintenance windows or risky rollouts, you might want to temporarily disable auto-apply:

```bash
#!/bin/bash
# toggle-auto-apply.sh - Toggle auto-apply on/off

WORKSPACE_ID="$1"
ENABLED="$2"  # true or false

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"auto-apply\": ${ENABLED}
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}"

echo "Auto-apply set to ${ENABLED} for workspace ${WORKSPACE_ID}"
```

Usage:

```bash
# Disable auto-apply before a risky change
./toggle-auto-apply.sh ws-xxxxxxxx false

# Re-enable after the change is safely applied
./toggle-auto-apply.sh ws-xxxxxxxx true
```

## Summary

Auto-apply is a powerful tool for streamlining your Terraform workflow, but it needs guardrails. Enable it for development and staging environments where fast iteration matters, keep it disabled for production where human review is worth the extra time, and always pair it with Sentinel policies or run tasks to catch dangerous changes before they are applied. The combination of auto-apply with strong policy enforcement gives you both speed and safety.

For related topics, see our guides on [speculative plans](https://oneuptime.com/blog/post/2026-02-23-how-to-use-speculative-plans-in-hcp-terraform/view) and [monitoring run status](https://oneuptime.com/blog/post/2026-02-23-how-to-monitor-run-status-and-history-in-hcp-terraform/view).

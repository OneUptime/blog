# How to Use Cloud Backend for Team Collaboration in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloud Backend, Team Collaboration, Terraform Cloud, Workflow

Description: Learn how to use the Terraform Cloud backend for team collaboration in OpenTofu, including plan reviews, state locking, access controls, and collaborative workflows.

## Introduction

The HCP Terraform cloud backend (formerly Terraform Cloud) transforms OpenTofu from a local CLI tool into a collaborative platform. Teams can review plans before applying, see who ran what and when, share state safely with locking, and enforce policies. This guide covers the collaboration features and how to structure team workflows around them.

## Collaborative Plan Review Workflow

```bash
# Developer creates a plan

tofu plan -out=plan.tfplan

# HCP Terraform shows the plan in the UI:
# https://app.terraform.io/app/my-company/workspaces/production/runs/run-abc123

# Team members can review the plan in the browser
# Comments, approvals, and discards are visible to everyone

# After approval, apply from CLI:
tofu apply plan.tfplan
# or apply from the HCP Terraform UI
```

## Access Control and Teams

```bash
# Create teams with different permissions

# 1. Create a "developers" team (plan only)
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-company/teams" \
  -d '{
    "data": {
      "type": "teams",
      "attributes": {
        "name": "developers",
        "organization-access": {
          "manage-workspaces": false,
          "manage-policies": false
        }
      }
    }
  }'

# 2. Grant team read+plan access to development workspaces
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/team-workspaces" \
  -d '{
    "data": {
      "type": "team-workspaces",
      "attributes": {
        "access": "plan"
      },
      "relationships": {
        "team": {"data": {"type": "teams", "id": "team-devs"}},
        "workspace": {"data": {"type": "workspaces", "id": "ws-development"}}
      }
    }
  }'

# Access levels:
# read        - view state and runs
# plan        - queue plans
# write       - queue applies
# admin       - manage workspace settings
```

## State Locking for Team Safety

```bash
# HCP Terraform automatically locks state during runs
# Multiple engineers trying to apply simultaneously:

# Engineer A:
tofu apply
# Run queued: #1 - Applying...

# Engineer B (simultaneously):
tofu apply
# Run queued: #2 - Waiting for run #1 to complete...
# Runs execute in order, no race conditions

# Force-unlock a workspace if a run leaves it locked (workspace admin only)
curl -X POST \
  -H "Authorization: Bearer $TF_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/actions/force-unlock"
```

## Notification Configuration

```bash
# Configure Slack notifications for run events
curl -X POST \
  -H "Authorization: Bearer $TF_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/notification-configurations" \
  -d '{
    "data": {
      "type": "notification-configuration",
      "attributes": {
        "destination-type": "slack",
        "enabled": true,
        "name": "Slack Notifications",
        "url": "https://hooks.slack.com/services/...",
        "triggers": [
          "run:created",
          "run:planning",
          "run:needs_attention",
          "run:applying",
          "run:completed",
          "run:errored"
        ]
      }
    }
  }'
```

## Plan-Only Branches (PR Workflow)

```yaml
# .github/workflows/pr-plan.yml
# Automatically run tofu plan on pull requests

name: PR Plan

on:
  pull_request:
    paths:
      - '**.tf'
      - '**.tfvars'

jobs:
  plan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v2
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: OpenTofu Init
        run: tofu init

      - name: OpenTofu Plan
        id: plan
        run: |
          set +e
          tofu plan -no-color 2>&1 | tee /tmp/plan-output.txt
          exit_code=${PIPESTATUS[0]}
          echo "exit_code=$exit_code" >> "$GITHUB_OUTPUT"
          exit 0

      - name: Comment plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('/tmp/plan-output.txt', 'utf8');
            const truncated = plan.length > 65000 ? plan.slice(-65000) + '\n...(truncated)' : plan;
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: ['## OpenTofu Plan', '```', truncated, '```'].join('\n')
            });

      - name: Fail workflow if plan errored
        if: steps.plan.outputs.exit_code != '0'
        run: exit 1
```

## Structured Run Workflow

```bash
# Recommended team workflow:

# 1. Developer creates feature branch
git checkout -b feature/add-database

# 2. Make infrastructure changes
# edit main.tf

# 3. Create PR - GitHub Actions runs tofu plan
# Plan output posted as PR comment

# 4. Team reviews the plan in PR comments and HCP Terraform UI

# 5. PR is approved and merged to main

# 6. For auto-approved deployments, GitHub Actions runs tofu apply -auto-approve
# on main branch merge

# 7. If auto-apply is disabled, an authorized team member reviews and applies
# the run from the HCP Terraform UI
```

## Audit Trail

```bash
# HCP Terraform maintains a complete audit trail:
# - Who queued each run
# - Who approved/discarded each apply
# - What changes were made (plan output)
# - When each action occurred

# View run history via API
curl -H "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/runs?page%5Bsize%5D=20" | \
  jq '.data[] | {id: .id, status: .attributes.status, created: .attributes."created-at", created_by_id: .relationships."created-by".data.id}'
```

## Policy Enforcement (Sentinel Example)

```hcl
# Sentinel policy example: limit monthly cost increase to $500
# policies/require-cost-estimate.sentinel

import "tfrun"
import "decimal"

delta_monthly_cost = decimal.new(tfrun.cost_estimate.delta_monthly_cost)

main = rule {
    delta_monthly_cost.less_than_or_equals(500)
}
```

```bash
# Create a Sentinel policy object and attach it to an existing policy set
curl -X POST \
  -H "Authorization: Bearer $TF_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-company/policies" \
  -d '{
    "data": {
      "type": "policies",
      "attributes": {
        "name": "require-cost-estimate-approval",
        "kind": "sentinel",
        "enforcement-level": "soft-mandatory"
      },
      "relationships": {
        "policy-sets": {
          "data": [
            {"id": "polset-abc123", "type": "policy-sets"}
          ]
        }
      }
    }
  }'
# Then upload the .sentinel source to the links.upload URL returned by the API
```

## Conclusion

HCP Terraform transforms OpenTofu into a collaborative tool by centralizing plan visibility, enforcing state locking, providing role-based access control, and maintaining an audit trail of all infrastructure changes. The key workflow is: developers propose changes via pull requests with plan output in PR comments, authorized team members approve applies in HCP Terraform, and the audit trail records who approved what and when. Start with plan notifications and PR-based plan comments - these provide immediate collaboration value with minimal configuration.

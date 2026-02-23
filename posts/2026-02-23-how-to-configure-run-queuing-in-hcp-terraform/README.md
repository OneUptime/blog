# How to Configure Run Queuing in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Run Queue, Workflow Management, Automation

Description: Understand and configure how runs are queued in HCP Terraform workspaces including ordering, cancellation, and auto-apply settings.

---

Every workspace in HCP Terraform has a run queue. When multiple runs are triggered - whether from VCS pushes, API calls, or CLI commands - they line up and execute one at a time per workspace. Understanding how this queue works and how to configure it saves you from unexpected behavior and wasted time.

## How the Run Queue Works

Each workspace maintains its own queue. Only one run can be in an active state (planning or applying) at any given time within a workspace. Additional runs wait in the queue in the order they were created.

```
Workspace "app-prod" queue:
  [Active]  Run #45 - Planning (triggered by VCS push)
  [Queued]  Run #46 - Pending (triggered by API)
  [Queued]  Run #47 - Pending (triggered by CLI)
```

When Run #45 completes (or is cancelled), Run #46 moves to active and begins planning. This serialization prevents concurrent modifications to the same state file, which would cause corruption.

## Queue Behavior with Different Run Types

Not all runs are created equal. HCP Terraform handles different types differently in the queue:

### Plan-Only Runs

Speculative plans from pull requests do not block the queue for other run types. They execute in their own lane:

```bash
# Trigger a speculative (plan-only) run
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "runs",
      "attributes": {
        "message": "Speculative plan for PR review",
        "plan-only": true
      },
      "relationships": {
        "workspace": {
          "data": {
            "type": "workspaces",
            "id": "ws-abc123"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/runs"
```

### Apply Runs

Standard runs that include both plan and apply phases. These are the most common type and follow normal queue ordering:

```bash
# Trigger a standard run
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "runs",
      "attributes": {
        "message": "Deploy new configuration",
        "auto-apply": false
      },
      "relationships": {
        "workspace": {
          "data": {
            "type": "workspaces",
            "id": "ws-abc123"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/runs"
```

### Destroy Runs

Destroy runs also enter the queue and execute in order:

```bash
# Trigger a destroy run
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "runs",
      "attributes": {
        "message": "Tear down environment",
        "is-destroy": true
      },
      "relationships": {
        "workspace": {
          "data": {
            "type": "workspaces",
            "id": "ws-abc123"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/runs"
```

## Configuring Auto-Apply

Auto-apply determines whether a run proceeds from plan to apply automatically or waits for manual confirmation:

```bash
# Enable auto-apply on a workspace
curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "auto-apply": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces/app-staging"
```

With auto-apply enabled, runs flow through the queue faster because there is no human waiting step between plan and apply. This is recommended for:

- Development and staging environments
- Workspaces with good Sentinel policy coverage
- Low-risk infrastructure changes

Keep auto-apply disabled for production workspaces where you want human review of every plan.

## Per-Run Auto-Apply Override

You can override the workspace-level auto-apply setting on individual runs:

```bash
# Force auto-apply on a specific run, even if the workspace has it disabled
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "runs",
      "attributes": {
        "message": "Emergency hotfix - auto-apply",
        "auto-apply": true
      },
      "relationships": {
        "workspace": {
          "data": {
            "type": "workspaces",
            "id": "ws-abc123"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/runs"
```

This requires appropriate permissions. Use it sparingly for situations where waiting for manual approval is not practical.

## Cancelling Queued Runs

When a newer run makes an older queued run irrelevant, cancel the older one:

```bash
# Cancel a specific run
RUN_ID="run-abc123"

curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "comment": "Superseded by newer configuration changes"
  }' \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/actions/cancel"
```

You can also force-cancel a run that is stuck:

```bash
# Force cancel a run that will not stop gracefully
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/actions/force-cancel"
```

Force-cancel should be a last resort. It immediately terminates the run, which might leave resources in an inconsistent state if an apply was in progress.

## Discarding Plans

When a plan completes but you do not want to apply it, discard it to free up the queue:

```bash
# Discard a completed plan
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "comment": "Changes not needed after further review"
  }' \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/actions/discard"
```

Discarding a plan moves the workspace to the next queued run. If you leave a plan sitting in the "needs confirmation" state, it blocks the entire queue for that workspace.

## Queue Management Script

Here is a script that monitors and cleans up your run queues:

```bash
#!/bin/bash
# clean-queue.sh
# Cancel stale queued runs older than 2 hours

ORG="my-company"
MAX_AGE_SECONDS=7200  # 2 hours

# Get all pending runs
RUNS=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/$ORG/runs?filter%5Bstatus%5D=pending&page%5Bsize%5D=100")

echo "$RUNS" | jq -r '.data[] | "\(.id) \(.attributes["created-at"])"' | while read RUN_ID CREATED_AT; do
  # Calculate age of the run
  CREATED_EPOCH=$(date -d "$CREATED_AT" +%s)
  NOW_EPOCH=$(date +%s)
  AGE=$((NOW_EPOCH - CREATED_EPOCH))

  if [ "$AGE" -gt "$MAX_AGE_SECONDS" ]; then
    echo "Cancelling stale run $RUN_ID (age: ${AGE}s)"
    curl -s \
      --request POST \
      --header "Authorization: Bearer $TF_TOKEN" \
      --header "Content-Type: application/vnd.api+json" \
      --data '{"comment": "Auto-cancelled: stale queued run"}' \
      "https://app.terraform.io/api/v2/runs/$RUN_ID/actions/cancel"
  fi
done
```

## Handling Plans Waiting for Confirmation

Plans in the "needs confirmation" state block the workspace queue. If team members forget to confirm or discard plans, it causes a bottleneck:

```bash
# Find all runs waiting for confirmation
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-org/runs?filter%5Bstatus%5D=planned&page%5Bsize%5D=100" | \
  jq '.data[] | {
    id: .id,
    workspace: .relationships.workspace.data.id,
    created: .attributes["created-at"],
    message: .attributes.message
  }'
```

Set up notifications to remind team members:

```bash
# Configure Slack notifications for runs needing confirmation
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "notification-configurations",
      "attributes": {
        "destination-type": "slack",
        "enabled": true,
        "name": "plan-needs-confirmation",
        "url": "https://hooks.slack.com/services/T00/B00/xxx",
        "triggers": ["run:needs_attention"]
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/notification-configurations"
```

## Run Triggers and Queue Dependencies

Run triggers create dependencies between workspaces. When workspace A completes an apply, it can automatically trigger a run in workspace B:

```bash
# Create a run trigger: when "networking" applies, trigger "compute"
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "relationships": {
        "sourceable": {
          "data": {
            "type": "workspaces",
            "id": "ws-networking-id"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-compute-id/run-triggers"
```

Run triggers add runs to the destination workspace queue. Be careful with cascading triggers - workspace A triggers B, B triggers C - as they can create long queue chains.

## Best Practices

Keep your queues healthy with these practices:

- Enable auto-apply for non-production workspaces to prevent queue blockage
- Set up notifications for runs needing confirmation
- Cancel superseded queued runs promptly
- Monitor queue depth across your organization
- Use speculative plans (plan-only) for PR checks instead of full runs
- Avoid triggering runs unnecessarily with VCS path filters

## Summary

Run queuing in HCP Terraform ensures safe, sequential infrastructure changes within each workspace. Configure auto-apply for environments where you trust the change process, actively manage queued runs to prevent bottlenecks, and use notifications to keep team members responsive to pending confirmations. A well-managed queue means faster deployments and fewer frustrated engineers waiting for their changes to process.

# How to Monitor Run Status and History in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Monitoring, Run History, Observability, DevOps

Description: Learn how to monitor Terraform run status, track run history, set up notifications, and build dashboards for your HCP Terraform workflows.

---

Knowing what is happening across your Terraform workspaces is critical for operational awareness. When you have ten workspaces, you can check each one manually. When you have a hundred, you need a systematic approach to monitoring run status, tracking history, and getting alerted when something goes wrong.

HCP Terraform provides run status tracking out of the box, but to get real value you need to layer on notifications, API-based monitoring, and potentially a custom dashboard. This guide covers all of it.

## Understanding Run States

Every Terraform run in HCP Terraform moves through a series of states. Understanding these is fundamental to monitoring:

| State | Meaning |
|---|---|
| `pending` | Run is queued, waiting for a worker |
| `plan_queued` | Plan phase is queued |
| `planning` | Plan is actively running |
| `planned` | Plan completed, waiting for approval |
| `planned_and_finished` | Plan completed with no changes |
| `cost_estimating` | Cost estimation is running |
| `policy_checking` | Sentinel/OPA policies are being evaluated |
| `policy_override` | Policy failed, waiting for override |
| `confirmed` | Apply has been confirmed |
| `apply_queued` | Apply is queued |
| `applying` | Apply is actively running |
| `applied` | Apply completed successfully |
| `errored` | Run failed at some phase |
| `discarded` | Run was discarded by a user |
| `canceled` | Run was canceled |
| `force_canceled` | Run was force-canceled |

## Monitoring via the UI

The HCP Terraform UI provides several views for monitoring:

### Workspace Overview

Each workspace shows its current run status on the overview page. You can see:
- The current run state
- Last run time
- Number of resources managed
- Any health assessment warnings

### Run History

The **Runs** tab on each workspace shows the complete run history with:
- Run status and outcome
- Who triggered the run
- Commit message (for VCS-triggered runs)
- Resource change summary
- Timestamps for each phase

### Organization Dashboard

The organization-level dashboard gives you a bird's-eye view across all workspaces, showing runs in progress and recently completed runs.

## Monitoring via the API

For programmatic monitoring, the API is your primary tool.

### Get Current Run for a Workspace

```bash
# Get the current run for a workspace
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/current-run" \
  | jq '{
    id: .data.id,
    status: .data.attributes.status,
    message: .data.attributes.message,
    created: .data.attributes["created-at"],
    has_changes: .data.attributes["has-changes"],
    additions: .data.attributes["resource-additions"],
    changes: .data.attributes["resource-changes"],
    destructions: .data.attributes["resource-destructions"]
  }'
```

### List Recent Runs

```bash
# Get the last 10 runs for a workspace
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/runs?page[size]=10" \
  | jq '.data[] | {
    id: .id,
    status: .attributes.status,
    message: .attributes.message,
    created: .attributes["created-at"],
    source: .attributes.source,
    additions: .attributes["resource-additions"],
    changes: .attributes["resource-changes"],
    destructions: .attributes["resource-destructions"]
  }'
```

### Get Plan and Apply Logs

```bash
# Get the plan log for a specific run
RUN_ID="run-xxxxxxxxxxxxxxxx"

# First get the plan ID
PLAN_ID=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/runs/${RUN_ID}" \
  | jq -r '.data.relationships.plan.data.id')

# Then get the plan log URL
LOG_URL=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/plans/${PLAN_ID}" \
  | jq -r '.data.attributes["log-read-url"]')

# Download the log
curl -s "$LOG_URL"
```

## Setting Up Notifications

HCP Terraform supports several notification destinations for run events.

### Slack Notifications

```hcl
# Comprehensive Slack notification setup
resource "tfe_notification_configuration" "slack_all" {
  name             = "Slack - All Run Events"
  enabled          = true
  destination_type = "slack"
  url              = var.slack_webhook_url
  workspace_id     = tfe_workspace.production.id

  triggers = [
    "run:created",          # New run started
    "run:planning",         # Plan phase started
    "run:needs_attention",  # Run needs approval or has policy override
    "run:applying",         # Apply phase started
    "run:completed",        # Run completed successfully
    "run:errored",          # Run failed
  ]
}

# Minimal notifications for non-critical workspaces
resource "tfe_notification_configuration" "slack_errors_only" {
  name             = "Slack - Errors Only"
  enabled          = true
  destination_type = "slack"
  url              = var.slack_webhook_url
  workspace_id     = tfe_workspace.staging.id

  triggers = [
    "run:errored",
    "run:needs_attention",
  ]
}
```

### Webhook Notifications

For custom integrations (PagerDuty, custom dashboards, etc.):

```hcl
# Generic webhook for custom processing
resource "tfe_notification_configuration" "webhook" {
  name             = "Custom Monitoring Webhook"
  enabled          = true
  destination_type = "generic"
  url              = "https://monitoring.example.com/terraform/webhook"
  token            = var.webhook_auth_token
  workspace_id     = tfe_workspace.production.id

  triggers = [
    "run:completed",
    "run:errored",
    "run:needs_attention",
  ]
}
```

The webhook payload contains:

```json
{
  "payload_version": 1,
  "notification_configuration_id": "nc-xxxxxxxx",
  "run_url": "https://app.terraform.io/app/org/workspaces/ws/runs/run-xxx",
  "run_id": "run-xxxxxxxx",
  "run_message": "Queued manually",
  "run_created_at": "2026-02-23T10:00:00+00:00",
  "run_created_by": "user@example.com",
  "workspace_id": "ws-xxxxxxxx",
  "workspace_name": "production-infrastructure",
  "organization_name": "your-org",
  "notifications": [
    {
      "message": "Run completed",
      "trigger": "run:completed",
      "run_status": "applied"
    }
  ]
}
```

### Email Notifications

```hcl
# Email notifications to specific team members
resource "tfe_notification_configuration" "email" {
  name             = "Email - Production Alerts"
  enabled          = true
  destination_type = "email"
  workspace_id     = tfe_workspace.production.id

  email_user_ids = [
    tfe_organization_membership.admin1.user_id,
    tfe_organization_membership.admin2.user_id,
  ]

  triggers = [
    "run:errored",
    "run:needs_attention",
  ]
}
```

## Building a Custom Monitoring Dashboard

Here is a Python script that generates a monitoring report across all workspaces:

```python
# monitor.py - HCP Terraform run monitoring dashboard
import requests
import os
from datetime import datetime, timedelta, timezone

TFC_TOKEN = os.environ["TFC_TOKEN"]
TFC_ORG = os.environ["TFC_ORG"]
BASE_URL = "https://app.terraform.io/api/v2"
HEADERS = {"Authorization": f"Bearer {TFC_TOKEN}"}

def get_workspaces():
    """Fetch all workspaces."""
    workspaces = []
    page = 1
    while True:
        resp = requests.get(
            f"{BASE_URL}/organizations/{TFC_ORG}/workspaces",
            headers=HEADERS,
            params={"page[number]": page, "page[size]": 100}
        )
        data = resp.json()
        workspaces.extend(data["data"])
        if data["meta"]["pagination"]["next-page"] is None:
            break
        page += 1
    return workspaces

def get_recent_runs(workspace_id, limit=5):
    """Get recent runs for a workspace."""
    resp = requests.get(
        f"{BASE_URL}/workspaces/{workspace_id}/runs",
        headers=HEADERS,
        params={"page[size]": limit}
    )
    return resp.json()["data"]

def check_workspace_health(workspaces):
    """Check health status across all workspaces."""
    issues = []

    for ws in workspaces:
        ws_name = ws["attributes"]["name"]
        ws_id = ws["id"]

        runs = get_recent_runs(ws_id, limit=1)

        if not runs:
            issues.append({
                "workspace": ws_name,
                "issue": "No runs found",
                "severity": "warning"
            })
            continue

        latest_run = runs[0]
        status = latest_run["attributes"]["status"]

        # Check for failed runs
        if status == "errored":
            issues.append({
                "workspace": ws_name,
                "issue": f"Latest run errored: {latest_run['attributes']['message']}",
                "severity": "critical",
                "run_id": latest_run["id"]
            })

        # Check for runs waiting for approval
        elif status == "planned":
            created = latest_run["attributes"]["created-at"]
            issues.append({
                "workspace": ws_name,
                "issue": f"Run waiting for approval since {created}",
                "severity": "attention",
                "run_id": latest_run["id"]
            })

        # Check for policy overrides needed
        elif status == "policy_override":
            issues.append({
                "workspace": ws_name,
                "issue": "Policy override required",
                "severity": "attention",
                "run_id": latest_run["id"]
            })

    return issues

# Run the monitor
workspaces = get_workspaces()
print(f"Monitoring {len(workspaces)} workspaces in {TFC_ORG}")
print("=" * 70)

issues = check_workspace_health(workspaces)

if not issues:
    print("All workspaces healthy - no issues detected.")
else:
    # Group by severity
    for severity in ["critical", "attention", "warning"]:
        severity_issues = [i for i in issues if i["severity"] == severity]
        if severity_issues:
            print(f"\n{severity.upper()} ({len(severity_issues)}):")
            for issue in severity_issues:
                print(f"  [{issue['workspace']}] {issue['issue']}")
```

## Tracking Run Metrics Over Time

For long-term tracking, store run data and analyze trends:

```bash
#!/bin/bash
# collect-metrics.sh - Collect run metrics for all workspaces
# Run this on a cron schedule to build historical data

OUTPUT_FILE="run-metrics-$(date +%Y%m%d-%H%M%S).json"

curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces?page[size]=100" \
  | jq '[.data[] | {
    workspace: .attributes.name,
    current_run_status: .attributes["current-run"]?.["status"] // "none",
    resource_count: .attributes["resource-count"],
    tags: .attributes["tag-names"],
    updated_at: .attributes["updated-at"]
  }]' > "$OUTPUT_FILE"

echo "Metrics collected: $OUTPUT_FILE"
```

## Alerting on Stale Workspaces

Detect workspaces that have not had a successful run in a while:

```bash
#!/bin/bash
# stale-workspace-check.sh - Find workspaces with no recent successful runs

DAYS_THRESHOLD=30
CUTOFF_DATE=$(date -v-${DAYS_THRESHOLD}d +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -d "-${DAYS_THRESHOLD} days" +%Y-%m-%dT%H:%M:%S)

echo "Checking for workspaces with no successful run since ${CUTOFF_DATE}..."

WORKSPACES=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces?page[size]=100" \
  | jq -r '.data[] | .id + "|" + .attributes.name + "|" + (.attributes["updated-at"] // "never")')

echo ""
echo "Stale workspaces (no activity in ${DAYS_THRESHOLD} days):"
echo "---"

while IFS='|' read -r WS_ID WS_NAME UPDATED_AT; do
  if [[ "$UPDATED_AT" < "$CUTOFF_DATE" ]]; then
    echo "  ${WS_NAME} (last updated: ${UPDATED_AT})"
  fi
done <<< "$WORKSPACES"
```

## Integrating with External Monitoring

### Prometheus Metrics

Create an exporter that exposes HCP Terraform metrics:

```python
# tfc_exporter.py - Prometheus exporter for HCP Terraform
from prometheus_client import start_http_server, Gauge
import requests
import os
import time

TFC_TOKEN = os.environ["TFC_TOKEN"]
TFC_ORG = os.environ["TFC_ORG"]
HEADERS = {"Authorization": f"Bearer {TFC_TOKEN}"}

# Define metrics
workspace_resource_count = Gauge(
    "tfc_workspace_resource_count",
    "Number of resources managed by workspace",
    ["workspace", "organization"]
)

workspace_run_status = Gauge(
    "tfc_workspace_run_errored",
    "Whether the latest run errored (1=errored, 0=ok)",
    ["workspace", "organization"]
)

def collect_metrics():
    """Collect metrics from all workspaces."""
    resp = requests.get(
        f"https://app.terraform.io/api/v2/organizations/{TFC_ORG}/workspaces",
        headers=HEADERS,
        params={"page[size]": 100}
    )
    for ws in resp.json()["data"]:
        name = ws["attributes"]["name"]
        resource_count = ws["attributes"].get("resource-count", 0)
        workspace_resource_count.labels(
            workspace=name, organization=TFC_ORG
        ).set(resource_count)

if __name__ == "__main__":
    start_http_server(9090)
    while True:
        collect_metrics()
        time.sleep(300)  # Collect every 5 minutes
```

## Summary

Monitoring your HCP Terraform runs is about building layers - the UI for quick checks, notifications for real-time awareness, and API-based monitoring for comprehensive coverage. Start with Slack notifications for errors and attention-required runs, then add a periodic health check script, and eventually build a proper dashboard if your scale demands it. The goal is to never be surprised by a failed run or a workspace stuck waiting for approval.

For related topics, see our guides on [workspace health checks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspace-health-checks-in-hcp-terraform/view) and [drift detection](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-drift-detection-in-hcp-terraform/view).

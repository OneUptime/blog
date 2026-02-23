# How to Use Structured Run Output in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Structured Output, Run Output, Monitoring

Description: Learn how to use structured run output in HCP Terraform for better plan visibility, change tracking, and integration with external tools.

---

Terraform's default plan output is a wall of text that gets harder to parse as your infrastructure grows. Structured run output in HCP Terraform transforms this into organized, machine-readable data that is easier for both humans and tools to consume. This feature gives you clearer change summaries, better drift detection visibility, and the ability to integrate plan results into external systems.

## What Structured Run Output Is

Structured run output replaces the traditional text-based plan output with a formatted view that breaks changes down by resource, shows clear add/change/destroy counts, and provides detailed diffs for each resource attribute. In the HCP Terraform UI, this renders as an interactive, collapsible view of your planned changes.

The raw data is also available as JSON through the API, which means you can build custom dashboards, approval workflows, and audit systems on top of it.

## Viewing Structured Output in the UI

When you trigger a run in HCP Terraform, the plan output automatically renders in structured format in the web interface. You see:

- A summary bar showing resources to add, change, and destroy
- A list of affected resources, each expandable to show attribute-level changes
- Drift detection results showing resources that changed outside of Terraform
- Output values that will be produced

No configuration is needed to see structured output in the UI - it is enabled by default for all workspaces.

## Accessing Structured Output via API

The real power of structured output comes from programmatic access. You can retrieve the plan details as JSON:

```bash
# Get the plan for a specific run
RUN_ID="run-abc123"

# First, get the plan ID
PLAN_ID=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/plan" | \
  jq -r '.data.id')

# Get the JSON plan output
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/plans/$PLAN_ID/json-output" | \
  jq '.data.attributes'
```

The JSON output follows the same schema as `terraform show -json`, making it compatible with existing tools.

## Understanding the JSON Plan Structure

The structured output contains several key sections:

```bash
# Download the full JSON plan
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/plans/$PLAN_ID/json-output" -o plan.json

# View resource changes
cat plan.json | jq '.resource_changes[] | {
  address: .address,
  action: .change.actions,
  type: .type,
  name: .name
}'
```

```json
{
  "resource_changes": [
    {
      "address": "aws_instance.app",
      "type": "aws_instance",
      "name": "app",
      "change": {
        "actions": ["update"],
        "before": {
          "instance_type": "t3.micro",
          "tags": {"Name": "my-app"}
        },
        "after": {
          "instance_type": "t3.small",
          "tags": {"Name": "my-app-v2"}
        }
      }
    }
  ],
  "output_changes": {
    "app_url": {
      "actions": ["update"],
      "before": "http://old-url.example.com",
      "after": "http://new-url.example.com"
    }
  }
}
```

## Building a Custom Approval Workflow

Use structured output to build approval workflows that check specific conditions:

```bash
#!/bin/bash
# approval-check.sh
# Analyze a plan and approve/reject based on criteria

RUN_ID=$1

# Get the plan JSON output
PLAN_ID=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/plan" | \
  jq -r '.data.id')

PLAN_JSON=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/plans/$PLAN_ID/json-output")

# Count destructive changes
DESTROY_COUNT=$(echo "$PLAN_JSON" | \
  jq '[.resource_changes[] | select(.change.actions | contains(["delete"]))] | length')

# Count total changes
TOTAL_CHANGES=$(echo "$PLAN_JSON" | \
  jq '.resource_changes | length')

echo "Total changes: $TOTAL_CHANGES"
echo "Destructive changes: $DESTROY_COUNT"

# Reject if too many resources are being destroyed
if [ "$DESTROY_COUNT" -gt 5 ]; then
  echo "REJECTED: Too many destructive changes ($DESTROY_COUNT)"
  # Add a comment to the run
  curl -s \
    --request POST \
    --header "Authorization: Bearer $TF_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --data "{
      \"data\": {
        \"type\": \"comments\",
        \"attributes\": {
          \"body\": \"Auto-rejected: $DESTROY_COUNT resources would be destroyed. Manual review required.\"
        }
      }
    }" \
    "https://app.terraform.io/api/v2/runs/$RUN_ID/comments"
  exit 1
fi

echo "APPROVED: Changes look safe"
```

## Drift Detection in Structured Output

HCP Terraform detects drift - changes made outside of Terraform - and reports them in the structured output. This appears as resource changes with a `before` state that differs from the last known Terraform state:

```bash
# Check for drift in a plan
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/plans/$PLAN_ID/json-output" | \
  jq '.resource_drift // [] | .[] | {
    address: .address,
    type: .type,
    change_actions: .change.actions
  }'
```

The `resource_drift` array in the JSON output lists all resources where the actual infrastructure state differs from what Terraform expected.

## Integrating with Notification Systems

Send structured plan summaries to Slack, Teams, or other notification channels:

```bash
#!/bin/bash
# notify-plan.sh
# Send a plan summary to Slack

RUN_ID=$1
WORKSPACE_NAME=$2
SLACK_WEBHOOK="https://hooks.slack.com/services/T00/B00/xxx"

# Get plan details
PLAN_ID=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/plan" | \
  jq -r '.data.id')

PLAN_JSON=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/plans/$PLAN_ID/json-output")

# Extract summary
ADD=$(echo "$PLAN_JSON" | jq '[.resource_changes[] | select(.change.actions == ["create"])] | length')
CHANGE=$(echo "$PLAN_JSON" | jq '[.resource_changes[] | select(.change.actions == ["update"])] | length')
DESTROY=$(echo "$PLAN_JSON" | jq '[.resource_changes[] | select(.change.actions == ["delete"])] | length')

# Build Slack message
curl -s \
  --request POST \
  --header "Content-Type: application/json" \
  --data "{
    \"text\": \"Terraform Plan for *${WORKSPACE_NAME}*\n+${ADD} to add, ~${CHANGE} to change, -${DESTROY} to destroy\nRun: https://app.terraform.io/app/my-org/workspaces/${WORKSPACE_NAME}/runs/${RUN_ID}\"
  }" \
  "$SLACK_WEBHOOK"
```

## Cost Estimation in Structured Output

HCP Terraform includes cost estimation data in the structured output for supported resources:

```bash
# Get cost estimation for a run
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/cost-estimate" | \
  jq '{
    monthly_cost: .data.attributes["proposed-monthly-cost"],
    delta: .data.attributes["delta-monthly-cost"],
    prior_cost: .data.attributes["prior-monthly-cost"]
  }'
```

This lets you build cost guardrails into your approval process.

## CLI Structured Output

When using the CLI workflow, you can get structured output locally:

```bash
# Get JSON plan output from CLI
terraform plan -out=tfplan
terraform show -json tfplan > plan.json

# Parse the JSON locally
cat plan.json | jq '.resource_changes[] | {
  address: .address,
  actions: .change.actions
}'
```

The JSON schema is the same whether you get it from the CLI or the API, so your parsing tools work in both contexts.

## Building a Plan Comparison Tool

Compare plans across runs to understand how changes evolved:

```bash
#!/bin/bash
# compare-plans.sh
# Compare resource changes between two runs

RUN_A=$1
RUN_B=$2

get_changes() {
  local RUN_ID=$1
  PLAN_ID=$(curl -s \
    --header "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/runs/$RUN_ID/plan" | \
    jq -r '.data.id')

  curl -s \
    --header "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/plans/$PLAN_ID/json-output" | \
    jq '[.resource_changes[] | .address] | sort'
}

echo "Changes in Run A ($RUN_A):"
get_changes "$RUN_A"

echo ""
echo "Changes in Run B ($RUN_B):"
get_changes "$RUN_B"
```

## Best Practices

When working with structured run output:

- Use the JSON API for automated processing instead of parsing text output
- Build approval gates that check for destructive changes
- Send plan summaries to team communication channels
- Track cost estimates over time to catch budget issues early
- Monitor drift detection results to identify manual changes
- Store plan JSON for audit and compliance requirements

## Summary

Structured run output turns Terraform plans from opaque text into actionable data. Use the HCP Terraform UI for visual review and the API for building automated workflows around your infrastructure changes. The JSON plan format gives you everything you need to build custom approval processes, notification systems, and audit trails on top of your Terraform workflows.

# How to Stream Logs from Cloud Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloud Backend, Logging, Terraform Cloud, Monitoring

Description: Learn how to stream and access run logs from the Terraform Cloud backend in OpenTofu, including real-time streaming, log retrieval via API, and log integration with external systems.

## Introduction

When using a cloud backend with remote execution, `tofu plan` and `tofu apply` output streams back to your terminal in real time. The same logs are also stored in HCP Terraform (formerly Terraform Cloud) and accessible via API, making it possible to integrate run logs with external monitoring systems, audit tools, and notification pipelines.

## Real-Time Log Streaming

```bash
# Logs stream automatically to terminal during remote execution

tofu plan

# Output:
# Running plan in HCP Terraform. Output will stream here. Waiting for the plan to start...
#
# Terraform v1.7.0
# on linux_amd64
# Preparing the remote plan...
#
# Terraform used the selected providers to generate the following execution plan.
# Resource actions are indicated with the following symbols:
#   + create
#   ~ update in-place
#
# Terraform will perform the following actions:
# ...
# Plan: 2 to add, 1 to change, 0 to destroy.
#
# To perform exactly these actions, run the following command to apply:
#   tofu apply

# The run URL is printed during the remote run:
# Run URL: https://app.terraform.io/app/my-company/workspaces/production/runs/run-abc123
```

## Controlling Log Verbosity

```bash
# Enable debug logging in the local OpenTofu CLI
export TF_LOG=DEBUG
tofu plan  # Shows verbose local CLI output including API calls

# For remote worker logs, set TF_LOG as an environment variable
# in the cloud workspace.

# Available log levels
# TRACE   - Most verbose
# DEBUG   - Detailed debugging
# INFO    - Standard information
# WARN    - Warnings only
# ERROR   - Errors only

# Write local OpenTofu debug logs to a file
export TF_LOG=INFO
export TF_LOG_PATH=/tmp/opentofu-plan-debug.log

# Capture streamed plan/apply output in CI/CD
tofu apply 2>&1 | tee /tmp/apply-output.txt
```

## Retrieving Logs via API

```bash
# Get the run ID from the last plan
RUN_OPERATIONS="plan_only,plan_and_apply,save_plan,refresh_only,destroy,empty_apply,action_only"

RUN_ID=$(curl -s \
  -H "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/runs?page%5Bsize%5D=1&filter%5Boperation%5D=$RUN_OPERATIONS" | \
  jq -r '.data[0].id')

echo "Run ID: $RUN_ID"

# Get the plan ID from the run
PLAN_ID=$(curl -s \
  -H "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/runs/$RUN_ID" | \
  jq -r '.data.relationships.plan.data.id')

# Get the plan object's pre-authenticated log URL
PLAN_LOG_URL=$(curl -s \
  -H "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/plans/$PLAN_ID" | \
  jq -r '.data.attributes."log-read-url"')

# Retrieve plan logs
curl -s "$PLAN_LOG_URL"
```

## Polling Logs via API

```bash
#!/bin/bash
# poll-run-logs.sh - Poll an HCP Terraform run and retrieve available plan/apply logs

RUN_ID="${1:?Usage: $0 <run-id>}"

# Poll run status while the run is in progress
while true; do
  RUN_JSON=$(curl -s \
    -H "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/runs/$RUN_ID")

  RUN_STATUS=$(echo "$RUN_JSON" | jq -r '.data.attributes.status')

  echo "Run status: $RUN_STATUS"

  case "$RUN_STATUS" in
    "planned"|"planned_and_finished"|"planned_and_saved"|"policy_soft_failed"|"applied"|"errored"|"canceled"|"force_canceled"|"discarded")
      echo "Run reached log retrieval status: $RUN_STATUS"
      break
      ;;
  esac

  sleep 5
done

PLAN_ID=$(echo "$RUN_JSON" | jq -r '.data.relationships.plan.data.id // empty')
APPLY_ID=$(echo "$RUN_JSON" | jq -r '.data.relationships.apply.data.id // empty')

if [ -n "$PLAN_ID" ]; then
  PLAN_LOG_URL=$(curl -s \
    -H "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/plans/$PLAN_ID" | \
    jq -r '.data.attributes."log-read-url" // empty')

  if [ -n "$PLAN_LOG_URL" ]; then
    echo "=== Plan Output ==="
    curl -s "$PLAN_LOG_URL"
  fi
fi

if [ -n "$APPLY_ID" ]; then
  APPLY_LOG_URL=$(curl -s \
    -H "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/applies/$APPLY_ID" | \
    jq -r '.data.attributes."log-read-url" // empty')

  if [ -n "$APPLY_LOG_URL" ]; then
    echo "=== Apply Output ==="
    curl -s "$APPLY_LOG_URL"
  fi
fi
```

## GitHub Actions Log Integration

```yaml
# .github/workflows/deploy.yml
- name: OpenTofu Apply
  id: apply
  run: |
    set +e
    tofu apply -auto-approve -no-color 2>&1 | tee /tmp/apply-output.txt
    exit_code=${PIPESTATUS[0]}
    set -e
    echo "exit_code=$exit_code" >> "$GITHUB_OUTPUT"
    exit "$exit_code"

- name: Upload apply logs as artifact
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: opentofu-apply-logs
    path: /tmp/apply-output.txt
    retention-days: 30

- name: Post apply summary
  if: always()
  run: |
    echo "## OpenTofu Apply Summary" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
    tail -50 /tmp/apply-output.txt >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
```

## Forwarding Logs to External Systems

```bash
#!/bin/bash
# forward-logs-to-splunk.sh - Forward HCP Terraform run logs to Splunk

ORG="my-company"
RUN_OPERATIONS="plan_only,plan_and_apply,save_plan,refresh_only,destroy,empty_apply,action_only"
SPLUNK_HEC_URL="https://splunk.internal.company.com:8088/services/collector/event"
SPLUNK_TOKEN="your-hec-token"

# Get recent runs
RUNS=$(curl -s \
  -H "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/$ORG/runs?page%5Bsize%5D=10&filter%5Boperation%5D=$RUN_OPERATIONS" | \
  jq -r '.data[] | @base64')

for RUN_B64 in $RUNS; do
  RUN=$(echo "$RUN_B64" | base64 -d)
  RUN_ID=$(echo "$RUN" | jq -r '.id')
  RUN_STATUS=$(echo "$RUN" | jq -r '.attributes.status')
  WORKSPACE=$(echo "$RUN" | jq -r '.relationships.workspace.data.id')
  CREATED=$(echo "$RUN" | jq -r '.attributes."created-at"')

  # Get plan log
  PLAN_ID=$(curl -s \
    -H "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/runs/$RUN_ID" | \
    jq -r '.data.relationships.plan.data.id')

  if [ -z "$PLAN_ID" ] || [ "$PLAN_ID" = "null" ]; then
    continue
  fi

  PLAN_LOG_URL=$(curl -s \
    -H "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/plans/$PLAN_ID" | \
    jq -r '.data.attributes."log-read-url" // empty')

  if [ -z "$PLAN_LOG_URL" ]; then
    continue
  fi

  PLAN_LOG=$(curl -s "$PLAN_LOG_URL" | head -c 10000)  # Limit log size

  # Forward to Splunk HEC
  curl -s -X POST \
    -H "Authorization: Splunk $SPLUNK_TOKEN" \
    -H "Content-Type: application/json" \
    "$SPLUNK_HEC_URL" \
    -d "{
      \"event\": {
        \"run_id\": \"$RUN_ID\",
        \"workspace\": \"$WORKSPACE\",
        \"status\": \"$RUN_STATUS\",
        \"created_at\": \"$CREATED\",
        \"log_excerpt\": $(echo "$PLAN_LOG" | jq -Rs .)
      },
      \"sourcetype\": \"opentofu:run\"
    }"
done
```

## Run Event Webhook

```bash
# HCP Terraform can send webhooks for run events
# Configure notification webhook to receive run event data

curl -X POST \
  -H "Authorization: Bearer $TF_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/notification-configurations" \
  -d '{
    "data": {
      "type": "notification-configuration",
      "attributes": {
        "destination-type": "generic",
        "enabled": true,
        "name": "Run Event Webhook",
        "url": "https://run-events.internal.company.com/terraform-events",
        "token": "webhook-secret-for-verification",
        "triggers": [
          "run:created",
          "run:planning",
          "run:applying",
          "run:completed",
          "run:errored"
        ]
      }
    }
  }'
```

## Conclusion

Cloud backends that support remote execution stream run logs to the local terminal automatically. The same logs are accessible via API by fetching the plan or apply object's `log-read-url` - enabling integration with external log management systems like Splunk, DataDog, or ELK. For CI/CD, capture output with `tee` and upload as artifacts for historical reference. Webhook notifications provide event-driven triggers for log retrieval without polling for run status.

# How to Use Terraform Enterprise API for Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, API, Automation, CI/CD, DevOps

Description: A practical guide to automating Terraform Enterprise workflows using the TFE API, covering workspace management, run triggers, variable management, and integration patterns.

---

The Terraform Enterprise web UI is fine for clicking through a few workspaces, but it does not scale. When you manage hundreds of workspaces, onboard new teams regularly, or integrate TFE into CI/CD pipelines, you need the API. The TFE API is comprehensive - nearly everything you can do in the UI has an API equivalent, and some things are only possible through the API.

This guide covers the most useful API operations for automating your TFE workflows, with practical examples you can adapt.

## Authentication

Every API request needs an authentication token. TFE supports several token types:

```bash
# User token - tied to your personal account
# Generate at: https://tfe.example.com/app/settings/tokens

# Team token - scoped to a team's permissions
# Generate at: Organization > Team > Settings > API Token

# Organization token - for organization-level operations
# Generate at: Organization > Settings > API Token

# Set the token as an environment variable
export TFE_TOKEN="your-api-token-here"
export TFE_URL="https://tfe.example.com"

# Test authentication
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  "${TFE_URL}/api/v2/account/details" | jq '.data.attributes.username'
```

## Managing Workspaces

### Create a Workspace

```bash
# Create a new workspace
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/organizations/my-org/workspaces" \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "name": "networking-prod-us-east-1",
        "description": "Production networking in us-east-1",
        "terraform-version": "1.8.5",
        "working-directory": "environments/prod/networking",
        "auto-apply": false,
        "execution-mode": "remote",
        "tag-names": ["production", "networking", "us-east-1"]
      }
    }
  }' | jq '.data.id'
```

### List Workspaces with Filtering

```bash
# List all workspaces with a specific tag
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  "${TFE_URL}/api/v2/organizations/my-org/workspaces?search[tags]=production&page[size]=100" | \
  jq '.data[] | {name: .attributes.name, id: .id, updated: .attributes["updated-at"]}'

# Search workspaces by name
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  "${TFE_URL}/api/v2/organizations/my-org/workspaces?search[name]=networking" | \
  jq '.data[] | .attributes.name'
```

### Bulk Workspace Operations

```bash
#!/bin/bash
# bulk-update-workspaces.sh
# Update Terraform version across all production workspaces

NEW_VERSION="1.8.5"

# Get all production workspaces
WORKSPACES=$(curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  "${TFE_URL}/api/v2/organizations/my-org/workspaces?search[tags]=production&page[size]=100" | \
  jq -r '.data[] | .id')

for WS_ID in ${WORKSPACES}; do
  echo "Updating workspace ${WS_ID} to Terraform ${NEW_VERSION}..."

  curl -s \
    --header "Authorization: Bearer ${TFE_TOKEN}" \
    --header "Content-Type: application/vnd.api+json" \
    --request PATCH \
    "${TFE_URL}/api/v2/workspaces/${WS_ID}" \
    --data "{
      \"data\": {
        \"type\": \"workspaces\",
        \"attributes\": {
          \"terraform-version\": \"${NEW_VERSION}\"
        }
      }
    }" | jq '.data.attributes.name + " -> " + .data.attributes["terraform-version"]'
done
```

## Managing Variables

```bash
# Set a workspace variable
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}/vars" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "aws_region",
        "value": "us-east-1",
        "description": "AWS region for this workspace",
        "category": "terraform",
        "hcl": false,
        "sensitive": false
      }
    }
  }'

# Set a sensitive environment variable (e.g., AWS credentials)
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}/vars" \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "AWS_ACCESS_KEY_ID",
        "value": "AKIA...",
        "category": "env",
        "sensitive": true
      }
    }
  }'

# Set a variable set (shared across multiple workspaces)
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/organizations/my-org/varsets" \
  --data '{
    "data": {
      "type": "varsets",
      "attributes": {
        "name": "aws-credentials-prod",
        "description": "AWS credentials for production workspaces",
        "global": false
      },
      "relationships": {
        "workspaces": {
          "data": [
            {"id": "ws-abc123", "type": "workspaces"},
            {"id": "ws-def456", "type": "workspaces"}
          ]
        }
      }
    }
  }'
```

## Triggering and Managing Runs

### Trigger a Plan

```bash
# Trigger a plan run
RUN_ID=$(curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/runs" \
  --data "{
    \"data\": {
      \"type\": \"runs\",
      \"attributes\": {
        \"message\": \"Triggered via API - deploying networking changes\",
        \"auto-apply\": false,
        \"is-destroy\": false
      },
      \"relationships\": {
        \"workspace\": {
          \"data\": {
            \"type\": \"workspaces\",
            \"id\": \"${WS_ID}\"
          }
        }
      }
    }
  }" | jq -r '.data.id')

echo "Run triggered: ${RUN_ID}"
```

### Wait for Plan to Complete

```bash
#!/bin/bash
# wait-for-plan.sh - Poll a run until it reaches a terminal state

RUN_ID="$1"
TIMEOUT=600  # 10 minutes
ELAPSED=0
INTERVAL=10

while [ ${ELAPSED} -lt ${TIMEOUT} ]; do
  STATUS=$(curl -s \
    --header "Authorization: Bearer ${TFE_TOKEN}" \
    "${TFE_URL}/api/v2/runs/${RUN_ID}" | jq -r '.data.attributes.status')

  echo "[$(date '+%H:%M:%S')] Run status: ${STATUS}"

  case "${STATUS}" in
    "planned")
      echo "Plan complete. Ready for approval."
      exit 0
      ;;
    "applied")
      echo "Run applied successfully."
      exit 0
      ;;
    "errored"|"canceled"|"force_canceled"|"discarded")
      echo "Run ended with status: ${STATUS}"
      exit 1
      ;;
  esac

  sleep ${INTERVAL}
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo "Timeout waiting for run to complete"
exit 1
```

### Apply a Confirmed Plan

```bash
# After reviewing the plan, apply it
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/runs/${RUN_ID}/actions/apply" \
  --data '{
    "comment": "Approved - changes reviewed by platform team"
  }'
```

## CI/CD Integration

### GitHub Actions Integration

```yaml
# .github/workflows/terraform.yml
name: Terraform via TFE API
on:
  push:
    branches: [main]
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Upload configuration and trigger run
        env:
          TFE_TOKEN: ${{ secrets.TFE_TOKEN }}
          TFE_URL: https://tfe.example.com
          TFE_ORG: my-org
          TFE_WORKSPACE: networking-prod
        run: |
          # Get workspace ID
          WS_ID=$(curl -s \
            -H "Authorization: Bearer ${TFE_TOKEN}" \
            "${TFE_URL}/api/v2/organizations/${TFE_ORG}/workspaces/${TFE_WORKSPACE}" | \
            jq -r '.data.id')

          # Create a configuration version
          CV_RESPONSE=$(curl -s \
            -H "Authorization: Bearer ${TFE_TOKEN}" \
            -H "Content-Type: application/vnd.api+json" \
            -X POST \
            "${TFE_URL}/api/v2/workspaces/${WS_ID}/configuration-versions" \
            -d '{"data":{"type":"configuration-versions","attributes":{"auto-queue-runs":true}}}')

          UPLOAD_URL=$(echo "${CV_RESPONSE}" | jq -r '.data.attributes["upload-url"]')
          CV_ID=$(echo "${CV_RESPONSE}" | jq -r '.data.id')

          # Package and upload the Terraform configuration
          tar czf config.tar.gz -C terraform .
          curl -s \
            -H "Content-Type: application/octet-stream" \
            -X PUT \
            "${UPLOAD_URL}" \
            --data-binary @config.tar.gz

          echo "Configuration uploaded. Run will start automatically."
          echo "cv_id=${CV_ID}" >> $GITHUB_OUTPUT
```

## Workspace Onboarding Script

```bash
#!/bin/bash
# onboard-workspace.sh
# Automate new workspace creation with all settings

WORKSPACE_NAME="$1"
ENVIRONMENT="$2"    # dev, staging, prod
VCS_REPO="$3"       # org/repo-name
WORKING_DIR="$4"    # environments/prod

# Set Terraform version based on environment
case "${ENVIRONMENT}" in
  prod)    TF_VERSION="1.8.5"; AUTO_APPLY=false ;;
  staging) TF_VERSION="1.8.5"; AUTO_APPLY=true ;;
  dev)     TF_VERSION="1.9.8"; AUTO_APPLY=true ;;
esac

# Create the workspace
WS_RESPONSE=$(curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/organizations/my-org/workspaces" \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"name\": \"${WORKSPACE_NAME}\",
        \"terraform-version\": \"${TF_VERSION}\",
        \"working-directory\": \"${WORKING_DIR}\",
        \"auto-apply\": ${AUTO_APPLY},
        \"tag-names\": [\"${ENVIRONMENT}\", \"automated\"],
        \"vcs-repo\": {
          \"identifier\": \"${VCS_REPO}\",
          \"oauth-token-id\": \"ot-abc123\",
          \"branch\": \"main\"
        }
      }
    }
  }")

WS_ID=$(echo "${WS_RESPONSE}" | jq -r '.data.id')
echo "Created workspace: ${WORKSPACE_NAME} (${WS_ID})"

# Attach the environment-specific variable set
VARSET_ID="varset-${ENVIRONMENT}-aws"
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/varsets/${VARSET_ID}/relationships/workspaces" \
  --data "{
    \"data\": [{\"id\": \"${WS_ID}\", \"type\": \"workspaces\"}]
  }"

echo "Workspace onboarding complete: ${WORKSPACE_NAME}"
```

## Rate Limiting

The TFE API has rate limits. Handle them properly:

```bash
# Check rate limit headers in the response
RESPONSE=$(curl -s -D - \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  "${TFE_URL}/api/v2/organizations/my-org/workspaces?page[size]=20")

# Look for rate limit headers:
# X-RateLimit-Limit: 30
# X-RateLimit-Remaining: 28
# X-RateLimit-Reset: 1708700000

# Add a retry wrapper for API calls
api_call() {
  local MAX_RETRIES=3
  local RETRY=0

  while [ ${RETRY} -lt ${MAX_RETRIES} ]; do
    RESPONSE=$(curl -s -w "\n%{http_code}" "$@")
    HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
    BODY=$(echo "${RESPONSE}" | head -n -1)

    if [ "${HTTP_CODE}" = "429" ]; then
      RETRY=$((RETRY + 1))
      echo "Rate limited. Retrying in $((RETRY * 5)) seconds..." >&2
      sleep $((RETRY * 5))
    else
      echo "${BODY}"
      return 0
    fi
  done

  echo "Max retries exceeded" >&2
  return 1
}
```

## Summary

The TFE API is the backbone of any scalable Terraform Enterprise workflow. Use it to automate workspace creation, manage variables across environments, trigger runs from CI/CD pipelines, and build self-service platforms for your development teams. Start with the basics - creating workspaces and triggering runs - and build up to more complex automation patterns as your needs grow. The API follows JSON:API conventions consistently, so once you learn the patterns for one resource type, the rest follow naturally.

For more on TFE administration, see [How to Manage Admin Settings in Terraform Enterprise](https://oneuptime.com/blog/post/2026-02-23-manage-admin-settings-terraform-enterprise/view).

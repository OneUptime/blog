# How to Use the HCP Terraform API for Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, API, Automation, DevOps, Infrastructure as Code

Description: Learn how to use the HCP Terraform API to automate workspace management, trigger runs, and build custom integrations programmatically.

---

The HCP Terraform UI is fine for small teams, but once you start managing dozens or hundreds of workspaces, you need automation. The HCP Terraform API lets you do everything the UI can do - and more - through simple HTTP requests. You can create workspaces, trigger runs, manage variables, and build entire self-service platforms on top of it.

This guide covers the most useful API endpoints and shows practical examples for common automation tasks.

## API Basics

The HCP Terraform API is a JSON:API-compliant REST API. Every request needs:

- **Base URL**: `https://app.terraform.io/api/v2`
- **Authentication**: Bearer token in the `Authorization` header
- **Content Type**: `application/vnd.api+json` for requests with a body

Here is the basic structure of an API call:

```bash
# Basic API call structure
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request GET \
  https://app.terraform.io/api/v2/organizations/your-org/workspaces
```

For all the examples below, set your token as an environment variable:

```bash
export TFC_TOKEN="your-api-token-here"
export TFC_ORG="your-organization-name"
```

## Workspace Management

### Creating Workspaces

Automating workspace creation is one of the most common tasks:

```bash
# Create a new workspace
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "name": "production-vpc",
        "description": "Production VPC infrastructure",
        "auto-apply": false,
        "terraform-version": "1.7.0",
        "working-directory": "infrastructure/vpc",
        "execution-mode": "remote",
        "tag-names": ["production", "networking", "aws"]
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces"
```

### Listing Workspaces with Filtering

```bash
# List workspaces with tag filter
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces?search[tags]=production"

# List workspaces with name search
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces?search[name]=vpc"
```

### Updating Workspace Settings

```bash
# Update workspace settings
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "auto-apply": true,
        "terraform-version": "1.8.0"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}"
```

## Managing Variables

Variables are critical for workspace configuration. The API lets you manage both Terraform variables and environment variables:

```bash
# Add a Terraform variable to a workspace
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "instance_type",
        "value": "t3.medium",
        "description": "EC2 instance type for the application",
        "category": "terraform",
        "hcl": false,
        "sensitive": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars"
```

```bash
# Add a sensitive environment variable (like AWS credentials)
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
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
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars"
```

### Bulk Variable Management

Here is a script that sets up variables for a new workspace from a JSON configuration:

```bash
#!/bin/bash
# bulk-vars.sh - Set multiple variables at once

WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"
VARS_FILE="workspace-vars.json"

# workspace-vars.json format:
# [
#   {"key": "region", "value": "us-east-1", "category": "terraform", "sensitive": false},
#   {"key": "environment", "value": "production", "category": "terraform", "sensitive": false},
#   {"key": "AWS_SECRET_ACCESS_KEY", "value": "...", "category": "env", "sensitive": true}
# ]

# Read and iterate over variables
jq -c '.[]' "$VARS_FILE" | while read -r var; do
  KEY=$(echo "$var" | jq -r '.key')
  VALUE=$(echo "$var" | jq -r '.value')
  CATEGORY=$(echo "$var" | jq -r '.category')
  SENSITIVE=$(echo "$var" | jq -r '.sensitive')

  echo "Setting variable: $KEY"

  curl -s \
    --header "Authorization: Bearer $TFC_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data "{
      \"data\": {
        \"type\": \"vars\",
        \"attributes\": {
          \"key\": \"$KEY\",
          \"value\": \"$VALUE\",
          \"category\": \"$CATEGORY\",
          \"sensitive\": $SENSITIVE
        }
      }
    }" \
    "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars" > /dev/null

done

echo "All variables set."
```

## Triggering and Managing Runs

### Starting a Run

```bash
# Trigger a new run
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data "{
    \"data\": {
      \"type\": \"runs\",
      \"attributes\": {
        \"message\": \"Triggered via API - deploying v2.1.0\",
        \"is-destroy\": false,
        \"auto-apply\": false
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

### Checking Run Status

```bash
# Get run status
RUN_ID="run-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/runs/${RUN_ID}" \
  | jq '{
    status: .data.attributes.status,
    message: .data.attributes.message,
    created_at: .data.attributes["created-at"],
    has_changes: .data.attributes["has-changes"],
    resource_additions: .data.attributes["resource-additions"],
    resource_changes: .data.attributes["resource-changes"],
    resource_destructions: .data.attributes["resource-destructions"]
  }'
```

### Waiting for a Run to Complete

```bash
#!/bin/bash
# wait-for-run.sh - Poll until a run reaches a terminal state

RUN_ID="$1"
TIMEOUT=600  # 10 minutes
INTERVAL=10  # Check every 10 seconds
ELAPSED=0

echo "Waiting for run ${RUN_ID} to complete..."

while [ $ELAPSED -lt $TIMEOUT ]; do
  STATUS=$(curl -s \
    --header "Authorization: Bearer $TFC_TOKEN" \
    "https://app.terraform.io/api/v2/runs/${RUN_ID}" \
    | jq -r '.data.attributes.status')

  echo "Status: $STATUS (${ELAPSED}s elapsed)"

  case $STATUS in
    "applied"|"planned_and_finished"|"discarded"|"errored"|"canceled"|"force_canceled")
      echo "Run completed with status: $STATUS"
      exit 0
      ;;
    "planned")
      echo "Run is planned and waiting for approval"
      exit 0
      ;;
  esac

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo "Timeout waiting for run to complete"
exit 1
```

### Applying a Planned Run

```bash
# Apply a run that is waiting for confirmation
RUN_ID="run-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "comment": "Approved by automation script"
  }' \
  "https://app.terraform.io/api/v2/runs/${RUN_ID}/actions/apply"
```

## Building a Workspace Factory

Here is a more complete example - a script that creates a fully configured workspace:

```bash
#!/bin/bash
# create-workspace.sh - Create and configure a complete workspace

WORKSPACE_NAME="$1"
ENVIRONMENT="$2"
VCS_REPO="$3"

# Step 1: Create the workspace
echo "Creating workspace: ${WORKSPACE_NAME}"
WORKSPACE_RESPONSE=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"name\": \"${WORKSPACE_NAME}\",
        \"auto-apply\": false,
        \"terraform-version\": \"1.7.0\",
        \"tag-names\": [\"${ENVIRONMENT}\", \"managed-by-api\"]
      }
    }
  }" \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces")

WORKSPACE_ID=$(echo "$WORKSPACE_RESPONSE" | jq -r '.data.id')
echo "Workspace created: ${WORKSPACE_ID}"

# Step 2: Set environment variables
for VAR_NAME in "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "AWS_DEFAULT_REGION"; do
  VAR_VALUE="${!VAR_NAME}"
  SENSITIVE="true"
  if [ "$VAR_NAME" = "AWS_DEFAULT_REGION" ]; then
    SENSITIVE="false"
  fi

  curl -s \
    --header "Authorization: Bearer $TFC_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    --data "{
      \"data\": {
        \"type\": \"vars\",
        \"attributes\": {
          \"key\": \"${VAR_NAME}\",
          \"value\": \"${VAR_VALUE}\",
          \"category\": \"env\",
          \"sensitive\": ${SENSITIVE}
        }
      }
    }" \
    "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars" > /dev/null
done

# Step 3: Set Terraform variables
curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data "{
    \"data\": {
      \"type\": \"vars\",
      \"attributes\": {
        \"key\": \"environment\",
        \"value\": \"${ENVIRONMENT}\",
        \"category\": \"terraform\",
        \"sensitive\": false
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars" > /dev/null

echo "Workspace ${WORKSPACE_NAME} is fully configured."
```

## Using Python for API Automation

For more complex automation, Python is often easier than bash:

```python
# tfc_client.py - Simple HCP Terraform API client
import requests
import os
import time

class TFCClient:
    def __init__(self, token, org):
        self.token = token
        self.org = org
        self.base_url = "https://app.terraform.io/api/v2"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/vnd.api+json"
        }

    def create_workspace(self, name, **kwargs):
        """Create a new workspace."""
        payload = {
            "data": {
                "type": "workspaces",
                "attributes": {
                    "name": name,
                    "auto-apply": kwargs.get("auto_apply", False),
                    "terraform-version": kwargs.get("tf_version", "1.7.0"),
                    "tag-names": kwargs.get("tags", []),
                }
            }
        }
        resp = requests.post(
            f"{self.base_url}/organizations/{self.org}/workspaces",
            json=payload,
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json()["data"]

    def trigger_run(self, workspace_id, message="API triggered run"):
        """Trigger a run on a workspace."""
        payload = {
            "data": {
                "type": "runs",
                "attributes": {"message": message},
                "relationships": {
                    "workspace": {
                        "data": {"type": "workspaces", "id": workspace_id}
                    }
                }
            }
        }
        resp = requests.post(
            f"{self.base_url}/runs",
            json=payload,
            headers=self.headers
        )
        resp.raise_for_status()
        return resp.json()["data"]

    def wait_for_run(self, run_id, timeout=600):
        """Wait for a run to reach a terminal state."""
        terminal_states = {
            "applied", "planned_and_finished", "discarded",
            "errored", "canceled", "force_canceled", "planned"
        }
        elapsed = 0
        while elapsed < timeout:
            resp = requests.get(
                f"{self.base_url}/runs/{run_id}",
                headers=self.headers
            )
            status = resp.json()["data"]["attributes"]["status"]
            if status in terminal_states:
                return status
            time.sleep(10)
            elapsed += 10
        raise TimeoutError(f"Run {run_id} did not complete within {timeout}s")


# Usage example
if __name__ == "__main__":
    client = TFCClient(
        token=os.environ["TFC_TOKEN"],
        org=os.environ["TFC_ORG"]
    )

    # Create a workspace and trigger a run
    ws = client.create_workspace("api-demo", tags=["demo", "api"])
    run = client.trigger_run(ws["id"], message="Initial deployment")
    status = client.wait_for_run(run["id"])
    print(f"Run completed with status: {status}")
```

## Pagination

The API paginates results. Make sure your automation handles this:

```bash
# Fetch all workspaces with pagination
PAGE=1
while true; do
  RESPONSE=$(curl -s \
    --header "Authorization: Bearer $TFC_TOKEN" \
    "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces?page[number]=${PAGE}&page[size]=100")

  # Process current page
  echo "$RESPONSE" | jq -r '.data[].attributes.name'

  # Check if there is a next page
  NEXT=$(echo "$RESPONSE" | jq -r '.meta.pagination["next-page"]')
  if [ "$NEXT" = "null" ]; then
    break
  fi
  PAGE=$NEXT
done
```

## Summary

The HCP Terraform API is the foundation for any serious automation around your Terraform workflows. Start with simple scripts for creating workspaces and setting variables, and build up to more sophisticated tooling as your needs grow. The key takeaway is to wrap the API calls in reusable functions or libraries so you are not duplicating code across scripts.

For more on API authentication, see our guide on [API tokens in HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-api-tokens-in-hcp-terraform/view). For CI/CD integration examples, check out [using HCP Terraform with GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-github-actions/view).

# How to Configure API-Driven Workflow in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, API, Automation, CI/CD, DevOps

Description: Learn how to use the HCP Terraform API to trigger plans and applies programmatically, enabling custom automation pipelines and integration with external systems.

---

The API-driven workflow in HCP Terraform gives you complete programmatic control over Terraform runs. Instead of pushing to a VCS repository or running CLI commands, you upload configuration, trigger plans, and confirm applies through HTTP API calls. This is the workflow for teams that need to integrate Terraform into custom automation platforms, build self-service portals, or orchestrate infrastructure changes from systems that are not Git or the Terraform CLI.

This guide covers the full API-driven lifecycle from uploading configuration to confirming applies.

## When to Use the API-Driven Workflow

The API-driven workflow fits when:

- You have a custom deployment platform or internal tool
- Infrastructure changes are triggered by external events (tickets, approval systems, chatbots)
- You need to chain Terraform runs with other automation steps
- You are building a self-service infrastructure provisioning portal
- Your CI/CD system needs fine-grained control over the Terraform lifecycle

## Authentication

All API calls require a Bearer token. Use an organization token, team token, or user token:

```bash
# Set your API token
export TFC_TOKEN="your-api-token-here"

# All API calls include this header
# Authorization: Bearer $TFC_TOKEN
```

Create a team token for CI/CD systems rather than using a personal user token. Team tokens inherit the team's permissions.

## Step 1: Create a Workspace for API-Driven Runs

Create a workspace without a VCS connection:

```bash
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "name": "api-managed-infrastructure",
        "description": "Workspace managed via API",
        "auto-apply": false,
        "terraform-version": "1.7.0",
        "execution-mode": "remote"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/acme-infrastructure/workspaces"
```

Save the workspace ID from the response - you will need it for subsequent calls.

## Step 2: Set Variables

Configure workspace variables for credentials and configuration:

```bash
# Set AWS credentials as environment variables
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
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"

# Set a Terraform variable
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "environment",
        "value": "production",
        "category": "terraform",
        "sensitive": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/vars"
```

## Step 3: Create a Configuration Version

A configuration version is a snapshot of your Terraform code. First, create the version to get an upload URL:

```bash
# Create a configuration version
RESPONSE=$(curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "configuration-versions",
      "attributes": {
        "auto-queue-runs": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/ws-WORKSPACE_ID/configuration-versions")

# Extract the upload URL from the response
UPLOAD_URL=$(echo $RESPONSE | jq -r '.data.attributes."upload-url"')
CONFIG_VERSION_ID=$(echo $RESPONSE | jq -r '.data.id')

echo "Upload URL: $UPLOAD_URL"
echo "Config Version: $CONFIG_VERSION_ID"
```

## Step 4: Upload the Configuration

Package your Terraform files as a tar.gz and upload them:

```bash
# Package the Terraform configuration
# Include all .tf files and .tfvars files
cd /path/to/terraform/config
tar -czf config.tar.gz *.tf *.tfvars 2>/dev/null || tar -czf config.tar.gz *.tf

# Upload to the URL from step 3
curl \
  --header "Content-Type: application/octet-stream" \
  --request PUT \
  --data-binary @config.tar.gz \
  "$UPLOAD_URL"
```

If `auto-queue-runs` was set to `true` in step 3, a run starts automatically after the upload completes.

## Step 5: Monitor the Run

If you set `auto-queue-runs` to `false`, create a run manually:

```bash
# Create a run
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "runs",
      "attributes": {
        "message": "Triggered from deployment pipeline",
        "is-destroy": false
      },
      "relationships": {
        "workspace": {
          "data": {
            "type": "workspaces",
            "id": "ws-WORKSPACE_ID"
          }
        },
        "configuration-version": {
          "data": {
            "type": "configuration-versions",
            "id": "'"$CONFIG_VERSION_ID"'"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/runs"
```

Poll the run status:

```bash
# Check run status
RUN_ID="run-abc123"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/runs/$RUN_ID" | jq '.data.attributes.status'

# Possible statuses:
# "pending" - Waiting to start
# "plan_queued" - In the plan queue
# "planning" - Plan is running
# "planned" - Plan finished, waiting for confirmation
# "confirmed" - Confirmed, waiting to apply
# "apply_queued" - In the apply queue
# "applying" - Apply is running
# "applied" - Apply completed successfully
# "errored" - Run failed
# "discarded" - Run was discarded
# "canceled" - Run was canceled
```

## Step 6: Confirm the Apply

If auto-apply is disabled, you need to confirm the run:

```bash
# Confirm the apply
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "comment": "Approved by deployment pipeline after passing all checks"
  }' \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/actions/apply"
```

## Step 7: Get the Plan Output

Retrieve the plan log for reporting:

```bash
# Get the plan for this run
PLAN_ID=$(curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/runs/$RUN_ID/plan" | jq -r '.data.id')

# Get the plan log output
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/plans/$PLAN_ID/log" \
  --location
```

## Complete Automation Script

Here is a complete script that ties all the steps together:

```bash
#!/bin/bash
# deploy.sh - Full API-driven Terraform deployment

set -euo pipefail

# Configuration
ORG="acme-infrastructure"
WORKSPACE="api-managed-infrastructure"
API_URL="https://app.terraform.io/api/v2"
CONFIG_DIR="${1:-.}"

# Get workspace ID
echo "Looking up workspace..."
WORKSPACE_ID=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "$API_URL/organizations/$ORG/workspaces/$WORKSPACE" | jq -r '.data.id')

echo "Workspace ID: $WORKSPACE_ID"

# Create configuration version
echo "Creating configuration version..."
CV_RESPONSE=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{"data":{"type":"configuration-versions","attributes":{"auto-queue-runs":false}}}' \
  "$API_URL/workspaces/$WORKSPACE_ID/configuration-versions")

UPLOAD_URL=$(echo $CV_RESPONSE | jq -r '.data.attributes."upload-url"')
CV_ID=$(echo $CV_RESPONSE | jq -r '.data.id')

# Package and upload configuration
echo "Uploading configuration..."
cd "$CONFIG_DIR"
tar -czf /tmp/config.tar.gz .
curl -s \
  --header "Content-Type: application/octet-stream" \
  --request PUT \
  --data-binary @/tmp/config.tar.gz \
  "$UPLOAD_URL"

# Wait for upload to process
sleep 5

# Create a run
echo "Creating run..."
RUN_RESPONSE=$(curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data":{
      "type":"runs",
      "attributes":{"message":"API deployment"},
      "relationships":{
        "workspace":{"data":{"type":"workspaces","id":"'"$WORKSPACE_ID"'"}},
        "configuration-version":{"data":{"type":"configuration-versions","id":"'"$CV_ID"'"}}
      }
    }
  }' \
  "$API_URL/runs")

RUN_ID=$(echo $RUN_RESPONSE | jq -r '.data.id')
echo "Run ID: $RUN_ID"
echo "View at: https://app.terraform.io/app/$ORG/workspaces/$WORKSPACE/runs/$RUN_ID"

# Poll for plan completion
echo "Waiting for plan..."
while true; do
  STATUS=$(curl -s \
    --header "Authorization: Bearer $TFC_TOKEN" \
    "$API_URL/runs/$RUN_ID" | jq -r '.data.attributes.status')

  echo "  Status: $STATUS"

  case $STATUS in
    "planned")
      echo "Plan completed. Confirming apply..."
      curl -s \
        --header "Authorization: Bearer $TFC_TOKEN" \
        --header "Content-Type: application/vnd.api+json" \
        --request POST \
        --data '{"comment":"Auto-approved by deploy script"}' \
        "$API_URL/runs/$RUN_ID/actions/apply"
      ;;
    "applied")
      echo "Apply completed successfully."
      exit 0
      ;;
    "errored"|"canceled"|"discarded")
      echo "Run failed with status: $STATUS"
      exit 1
      ;;
  esac

  sleep 10
done
```

## Using Python for API Automation

For more complex automation, use Python:

```python
import os
import time
import tarfile
import tempfile
import requests

class TerraformCloud:
    def __init__(self, token, org):
        self.token = token
        self.org = org
        self.base_url = "https://app.terraform.io/api/v2"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/vnd.api+json",
        }

    def get_workspace_id(self, name):
        """Get workspace ID by name."""
        resp = requests.get(
            f"{self.base_url}/organizations/{self.org}/workspaces/{name}",
            headers=self.headers,
        )
        resp.raise_for_status()
        return resp.json()["data"]["id"]

    def upload_config(self, workspace_id, config_dir):
        """Upload a configuration directory to a workspace."""
        # Create configuration version
        resp = requests.post(
            f"{self.base_url}/workspaces/{workspace_id}/configuration-versions",
            headers=self.headers,
            json={
                "data": {
                    "type": "configuration-versions",
                    "attributes": {"auto-queue-runs": False},
                }
            },
        )
        resp.raise_for_status()
        data = resp.json()["data"]
        upload_url = data["attributes"]["upload-url"]
        cv_id = data["id"]

        # Create tar.gz of the config directory
        with tempfile.NamedTemporaryFile(suffix=".tar.gz") as tmp:
            with tarfile.open(tmp.name, "w:gz") as tar:
                tar.add(config_dir, arcname=".")
            with open(tmp.name, "rb") as f:
                requests.put(
                    upload_url,
                    data=f,
                    headers={"Content-Type": "application/octet-stream"},
                )

        return cv_id

    def create_run(self, workspace_id, cv_id, message="API run"):
        """Create a new run."""
        resp = requests.post(
            f"{self.base_url}/runs",
            headers=self.headers,
            json={
                "data": {
                    "type": "runs",
                    "attributes": {"message": message},
                    "relationships": {
                        "workspace": {
                            "data": {"type": "workspaces", "id": workspace_id}
                        },
                        "configuration-version": {
                            "data": {"type": "configuration-versions", "id": cv_id}
                        },
                    },
                }
            },
        )
        resp.raise_for_status()
        return resp.json()["data"]["id"]

    def wait_for_run(self, run_id, auto_approve=False):
        """Wait for a run to complete."""
        while True:
            resp = requests.get(
                f"{self.base_url}/runs/{run_id}",
                headers=self.headers,
            )
            status = resp.json()["data"]["attributes"]["status"]
            print(f"Run status: {status}")

            if status == "planned" and auto_approve:
                self.confirm_apply(run_id)
            elif status == "applied":
                return True
            elif status in ("errored", "canceled", "discarded"):
                return False

            time.sleep(10)

    def confirm_apply(self, run_id):
        """Confirm an apply."""
        requests.post(
            f"{self.base_url}/runs/{run_id}/actions/apply",
            headers=self.headers,
            json={"comment": "Auto-approved"},
        )


# Usage
tfc = TerraformCloud(os.environ["TFC_TOKEN"], "acme-infrastructure")
ws_id = tfc.get_workspace_id("api-managed-infrastructure")
cv_id = tfc.upload_config(ws_id, "./terraform")
run_id = tfc.create_run(ws_id, cv_id, "Deployment from CI pipeline")
success = tfc.wait_for_run(run_id, auto_approve=True)
```

## Wrapping Up

The API-driven workflow gives you full control over the Terraform lifecycle. Upload configuration, trigger runs, inspect plans, and confirm applies - all through HTTP calls. This makes it possible to build custom deployment tools, self-service portals, and sophisticated CI/CD integrations that go beyond what VCS-driven or CLI-driven workflows offer. Start with the bash script for simple automation and move to a Python or Go client library for more complex orchestration.

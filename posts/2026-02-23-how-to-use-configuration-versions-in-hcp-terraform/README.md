# How to Use Configuration Versions in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Configuration Versions, API, Automation

Description: Learn how configuration versions work in HCP Terraform and how to upload and manage them for API-driven and automated workflows.

---

Configuration versions are a core concept in HCP Terraform that most people never interact with directly. When you push code to a VCS-connected workspace or run `terraform plan` via the CLI, HCP Terraform creates a configuration version behind the scenes. It is a snapshot of your Terraform files at a specific point in time. Understanding configuration versions is essential when you need to build custom automation, trigger runs programmatically, or debug why a run used unexpected code.

## What Is a Configuration Version

A configuration version is an immutable package of Terraform configuration files uploaded to HCP Terraform. Every run is associated with a configuration version. When you trigger a run, HCP Terraform uses the configuration version to know which `.tf` files to execute.

In VCS-driven workflows, HCP Terraform creates configuration versions automatically from your repository commits. In API-driven workflows, you create and upload configuration versions yourself.

## How Configuration Versions Are Created

There are three paths to creating a configuration version:

1. **VCS-driven:** HCP Terraform downloads your code from the connected repository at the specified commit
2. **CLI-driven:** The `terraform plan` and `terraform apply` commands upload your local files
3. **API-driven:** You create a configuration version, upload a tarball of your files, and trigger a run

The third option is what gives you full programmatic control.

## Creating a Configuration Version via API

Here is the complete workflow for uploading Terraform code and triggering a run through the API:

### Step 1: Create the Configuration Version

```bash
# Create a new configuration version
WORKSPACE_ID="ws-abc123"

RESPONSE=$(curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "configuration-versions",
      "attributes": {
        "auto-queue-runs": true,
        "speculative": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/configuration-versions")

# Extract the upload URL and configuration version ID
UPLOAD_URL=$(echo "$RESPONSE" | jq -r '.data.attributes["upload-url"]')
CV_ID=$(echo "$RESPONSE" | jq -r '.data.id')

echo "Configuration Version: $CV_ID"
echo "Upload URL: $UPLOAD_URL"
```

### Step 2: Package Your Terraform Files

```bash
# Create a tarball of your Terraform configuration
# Include only .tf files and necessary supporting files
cd /path/to/terraform/code

tar -czf /tmp/config.tar.gz \
  --exclude='.terraform' \
  --exclude='.git' \
  --exclude='*.tfstate' \
  .
```

### Step 3: Upload the Configuration

```bash
# Upload the tarball to the upload URL
curl -s \
  --request PUT \
  --header "Content-Type: application/octet-stream" \
  --data-binary @/tmp/config.tar.gz \
  "$UPLOAD_URL"
```

### Step 4: Monitor the Run

If `auto-queue-runs` was set to `true`, a run starts automatically after the upload. Monitor it:

```bash
# Check the configuration version status
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/configuration-versions/$CV_ID" | \
  jq '{
    id: .data.id,
    status: .data.attributes.status,
    source: .data.attributes.source
  }'

# List runs for this configuration version
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/configuration-versions/$CV_ID/runs" | \
  jq '.data[] | {id: .id, status: .attributes.status}'
```

## Configuration Version Attributes

When creating a configuration version, you can set several attributes:

```bash
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "configuration-versions",
      "attributes": {
        "auto-queue-runs": true,
        "speculative": false,
        "provisional": false
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/configuration-versions"
```

- **auto-queue-runs:** When `true`, a run starts immediately after upload. When `false`, you trigger the run manually.
- **speculative:** When `true`, the run is plan-only (like a PR check). No apply is possible.
- **provisional:** When `true`, the configuration version is provisional and will not be used until a run explicitly references it.

## Listing Configuration Versions

View the history of configuration versions for a workspace:

```bash
# List recent configuration versions
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/configuration-versions?page%5Bsize%5D=10" | \
  jq '.data[] | {
    id: .id,
    status: .attributes.status,
    source: .attributes.source,
    created: .attributes["created-at"],
    speculative: .attributes.speculative
  }'
```

The `source` field tells you how the configuration version was created:

- `tfe-api` - Created via API
- `tfe-ui` - Created via UI
- `bitbucket` / `github` / `gitlab` - Created from VCS
- `terraform-cli` - Created from CLI workflow

## Downloading Configuration Files

You can download the files from a configuration version to inspect what code was used in a specific run:

```bash
# Get the download URL
DOWNLOAD_URL=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/configuration-versions/$CV_ID/download" \
  -w '%{redirect_url}' -o /dev/null)

# Download and extract
curl -sL "$DOWNLOAD_URL" -o config-download.tar.gz
mkdir -p config-review
tar -xzf config-download.tar.gz -C config-review
ls config-review/
```

This is invaluable for debugging. If a run produced unexpected results, download the exact configuration version it used and compare it to what you expected.

## Building a CI/CD Pipeline with Configuration Versions

Here is a complete example of an API-driven pipeline:

```bash
#!/bin/bash
# deploy.sh - Upload configuration and trigger a run

set -euo pipefail

WORKSPACE_ID="ws-abc123"
CONFIG_DIR="./terraform"
MESSAGE="Deploy from CI - build #${BUILD_NUMBER:-manual}"

# Step 1: Create configuration version
echo "Creating configuration version..."
CV_RESPONSE=$(curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"configuration-versions\",
      \"attributes\": {
        \"auto-queue-runs\": false,
        \"speculative\": false
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/configuration-versions")

UPLOAD_URL=$(echo "$CV_RESPONSE" | jq -r '.data.attributes["upload-url"]')
CV_ID=$(echo "$CV_RESPONSE" | jq -r '.data.id')

# Step 2: Package and upload
echo "Uploading configuration..."
cd "$CONFIG_DIR"
tar -czf /tmp/config.tar.gz --exclude='.terraform' --exclude='.git' .
curl -s --request PUT \
  --header "Content-Type: application/octet-stream" \
  --data-binary @/tmp/config.tar.gz \
  "$UPLOAD_URL"

# Step 3: Wait for upload to process
echo "Waiting for configuration to process..."
for i in $(seq 1 30); do
  STATUS=$(curl -s \
    --header "Authorization: Bearer $TF_TOKEN" \
    "https://app.terraform.io/api/v2/configuration-versions/$CV_ID" | \
    jq -r '.data.attributes.status')

  if [ "$STATUS" = "uploaded" ]; then
    echo "Configuration uploaded successfully"
    break
  fi
  sleep 2
done

# Step 4: Create a run
echo "Triggering run..."
RUN_RESPONSE=$(curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"runs\",
      \"attributes\": {
        \"message\": \"$MESSAGE\"
      },
      \"relationships\": {
        \"workspace\": {
          \"data\": {
            \"type\": \"workspaces\",
            \"id\": \"$WORKSPACE_ID\"
          }
        },
        \"configuration-version\": {
          \"data\": {
            \"type\": \"configuration-versions\",
            \"id\": \"$CV_ID\"
          }
        }
      }
    }
  }" \
  "https://app.terraform.io/api/v2/runs")

RUN_ID=$(echo "$RUN_RESPONSE" | jq -r '.data.id')
echo "Run created: $RUN_ID"
echo "View at: https://app.terraform.io/app/my-org/workspaces/my-workspace/runs/$RUN_ID"
```

## Configuration Version States

Configuration versions move through these states:

- `pending` - Just created, waiting for upload
- `uploading` - Upload in progress
- `uploaded` - Upload complete, ready for runs
- `archived` - Older version that has been archived
- `errored` - Upload failed

```bash
# Check the state of a configuration version
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/configuration-versions/$CV_ID" | \
  jq '.data.attributes.status'
```

## Best Practices

When working with configuration versions:

- Always exclude `.terraform/`, `.git/`, and state files from your upload tarball
- Set `auto-queue-runs` to `false` if you want to control exactly when the run starts
- Use speculative configuration versions for PR-like checks in API-driven workflows
- Download configuration versions for audit and debugging purposes
- Keep your uploaded tarballs small - only include files Terraform needs

## Summary

Configuration versions are the mechanism by which HCP Terraform receives your Terraform code. Most of the time, VCS integrations and CLI workflows handle them transparently. When you need programmatic control - custom CI/CD pipelines, specialized automation, or debugging - the configuration version API gives you full control over what code runs and when.

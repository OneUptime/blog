# How to Use Remote Execution with Cloud Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Cloud Backend, Remote Execution, Terraform Cloud, CI/CD

Description: Learn how to use remote execution with the OpenTofu cloud backend to run plans and applies in Terraform Cloud's managed infrastructure with streamed output to your terminal.

## Introduction

With the cloud backend configured for HCP Terraform, `tofu plan` and `tofu apply` queue remote runs rather than executing on your local machine. Your configuration files are uploaded, the run executes in HCP Terraform's managed environment, workspace variables are available to that run, and output streams back to your terminal in real time. This provides consistent execution environments and centralized credential management.

## Configuring Remote Execution

```hcl
# main.tf - remote execution is the default for cloud backend

terraform {
  cloud {
    hostname     = "app.terraform.io"
    organization = "my-company"

    workspaces {
      name = "production-infrastructure"
    }
  }
}
```

```bash
# Authenticate OpenTofu to HCP Terraform / Terraform Cloud
tofu login app.terraform.io

# Initialize after adding or changing the cloud block
tofu init

# HCP Terraform workspace execution mode must resolve to Remote

# Set in workspace UI: Settings → General → Execution Mode → Remote

# Or via API:
curl -X PATCH \
  -H "Authorization: Bearer $TF_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID" \
  -d '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "execution-mode": "remote"
      }
    }
  }'
```

## Running Plans Remotely

```bash
# Standard plan - uploads config and runs in HCP Terraform
tofu plan

# Output shows remote execution:
# Running plan in HCP Terraform. Output will stream here.
# Waiting for the plan to start...
# Terraform v1.7.0
# on linux_amd64
#
# Initializing plugins and modules...
# ...
# Plan: 3 to add, 1 to change, 0 to destroy.

# Save plan output for apply
tofu plan -out=plan.tfplan  # Note: tfplan files from remote runs are pointers, not local files
```

## Running Applies Remotely

```bash
# Apply with approval in HCP Terraform (for workspaces not linked to a VCS repository)
tofu apply
# HCP Terraform runs the plan, streams output, and prompts for approval

# Auto-approve (use with caution, skips the approval prompt)
tofu apply -auto-approve

# Apply a saved plan
tofu apply plan.tfplan
```

## Workspace Variables for Remote Execution

```bash
# Set cloud credentials as workspace variables for remote execution
# If you store provider credentials in the workspace, they do not need to be present locally

# Set via API
set_workspace_var() {
  local KEY="$1"
  local VALUE="$2"
  local CATEGORY="${3:-env}"
  local SENSITIVE="${4:-true}"

  curl -s -X POST \
    -H "Authorization: Bearer $TF_TOKEN" \
    -H "Content-Type: application/vnd.api+json" \
    "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars" \
    -d "{
      \"data\": {
        \"type\": \"vars\",
        \"attributes\": {
          \"key\": \"$KEY\",
          \"value\": \"$VALUE\",
          \"category\": \"$CATEGORY\",
          \"sensitive\": $SENSITIVE
        }
      }
    }"
}

# Set AWS credentials in the workspace
set_workspace_var "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY_ID" "env" true
set_workspace_var "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_ACCESS_KEY" "env" true
set_workspace_var "AWS_DEFAULT_REGION" "us-east-1" "env" false
```

## Streaming Output

```bash
# Remote execution streams output in real time
tofu plan

# Typical output stream:
# Running plan in HCP Terraform. Output will stream here. Waiting for the plan to start...
#
# Terraform v1.7.0
# on linux_amd64
# Preparing the remote plan...
# Counting objects: 8, done.
#
# Terraform used the selected providers to generate the following execution plan.
# ...
# Plan: 2 to add, 0 to change, 0 to destroy.

# View run in browser
# After running: a URL to the run in HCP Terraform is printed
# https://app.terraform.io/app/my-company/workspaces/production-infrastructure/runs/run-abc123
```

## Workspace Auto-Apply

```bash
# Configure workspace auto-apply for UI/API/VCS-driven runs
# CLI-driven runs still need `tofu apply -auto-approve`
curl -X PATCH \
  -H "Authorization: Bearer $TF_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID" \
  -d '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "auto-apply": true
      }
    }
  }'
```

## CI/CD with Remote Execution

```yaml
# .github/workflows/deploy.yml
# Remote execution means the actual plan/apply runs in HCP Terraform
# GitHub Actions just triggers and monitors the run

name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: '1.7.0'
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: OpenTofu Init
        run: tofu init

      - name: OpenTofu Plan (runs in HCP Terraform)
        run: tofu plan -no-color
        env:
          TF_INPUT: false

      - name: OpenTofu Apply (runs in HCP Terraform)
        run: tofu apply -auto-approve -no-color
        env:
          TF_INPUT: false
```

## Run Output and Exit Codes

```bash
# Remote execution exit codes match local execution:
# 0 = success (plan: no changes; apply: success)
# 1 = error
# 2 = plan: changes present (with -detailed-exitcode)

# Capture exit code in scripts
tofu plan -detailed-exitcode
EXIT_CODE=$?

case $EXIT_CODE in
  0) echo "No changes" ;;
  1) echo "Error" ; exit 1 ;;
  2) echo "Changes pending - running apply" ; tofu apply -auto-approve ;;
esac
```

## Conclusion

Remote execution with the cloud backend uploads your configuration to HCP Terraform, queues runs on managed infrastructure, and streams output back to your terminal. A key benefit is credential isolation: AWS/Azure/GCP credentials can live in HCP Terraform workspace variables instead of developer machines or CI/CD systems. All runs are logged, with output available in the HCP Terraform UI for auditing.

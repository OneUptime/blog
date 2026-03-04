# How to Handle Workspace Selection in Automation Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, Automation, CI/CD, Scripting, DevOps

Description: Learn reliable patterns for selecting and managing Terraform workspaces in automation scripts, CI/CD pipelines, and deployment workflows.

---

When you run Terraform interactively, workspace selection is straightforward - you just run `terraform workspace select dev`. But in automation scripts, CI/CD pipelines, and deployment workflows, you need more robust patterns. What happens if the workspace does not exist yet? What if two jobs try to create the same workspace simultaneously? What if someone accidentally runs the pipeline against the wrong workspace? This post covers the patterns that make workspace selection reliable in automated contexts.

## The Basic Pattern: Select or Create

The most fundamental pattern is "select the workspace if it exists, create it if it does not":

```bash
#!/bin/bash
# select-or-create-workspace.sh

WORKSPACE=$1

if [ -z "$WORKSPACE" ]; then
  echo "ERROR: Workspace name required"
  exit 1
fi

# Try to select the workspace, create it if it does not exist
terraform workspace select "$WORKSPACE" 2>/dev/null || \
  terraform workspace new "$WORKSPACE"
```

This works, but it is not quite robust enough for production use. Let us build on it.

## Using the TF_WORKSPACE Environment Variable

Terraform supports the `TF_WORKSPACE` environment variable, which automatically selects a workspace without needing to run `terraform workspace select`:

```bash
# Set the workspace via environment variable
export TF_WORKSPACE=prod

# Now all terraform commands use the prod workspace
terraform plan   # uses prod workspace
terraform apply  # uses prod workspace

# This is cleaner for CI/CD because you set it once
```

However, `TF_WORKSPACE` has an important limitation: if the workspace does not exist, Terraform will fail. It does not create missing workspaces automatically.

```bash
# This will fail if the workspace does not exist
export TF_WORKSPACE=new-feature
terraform plan
# Error: Workspace "new-feature" doesn't exist.
```

So for automation, you typically need a setup step first:

```bash
#!/bin/bash
# ci-workspace-setup.sh

WORKSPACE=${TF_WORKSPACE:-$1}

if [ -z "$WORKSPACE" ]; then
  echo "ERROR: Set TF_WORKSPACE or pass workspace name as argument"
  exit 1
fi

# Initialize Terraform first
terraform init

# Create the workspace if it does not exist
if ! terraform workspace list | grep -q "^\s*${WORKSPACE}\$"; then
  # Unset TF_WORKSPACE temporarily to create the workspace
  unset TF_WORKSPACE
  terraform workspace new "$WORKSPACE"
fi

# Set the workspace for subsequent commands
export TF_WORKSPACE="$WORKSPACE"
echo "Workspace set to: $WORKSPACE"
```

## CI/CD Pipeline Patterns

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    environment: ${{ matrix.environment }}

    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        run: terraform init

      - name: Setup Workspace
        run: |
          # Create workspace if needed
          terraform workspace select ${{ matrix.environment }} 2>/dev/null || \
            terraform workspace new ${{ matrix.environment }}

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        env:
          TF_WORKSPACE: ${{ matrix.environment }}

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && matrix.environment != 'prod'
        run: terraform apply -auto-approve tfplan
        env:
          TF_WORKSPACE: ${{ matrix.environment }}

      # Production requires manual approval
      - name: Terraform Apply (Production)
        if: github.ref == 'refs/heads/main' && matrix.environment == 'prod'
        run: terraform apply -auto-approve tfplan
        env:
          TF_WORKSPACE: ${{ matrix.environment }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - init
  - plan
  - apply

variables:
  TF_ROOT: ${CI_PROJECT_DIR}/terraform

.terraform_base:
  image: hashicorp/terraform:1.7
  before_script:
    - cd ${TF_ROOT}
    - terraform init
    - terraform workspace select ${TF_WORKSPACE} 2>/dev/null || terraform workspace new ${TF_WORKSPACE}

plan:dev:
  extends: .terraform_base
  stage: plan
  variables:
    TF_WORKSPACE: dev
  script:
    - terraform plan -out=dev.tfplan
  artifacts:
    paths:
      - ${TF_ROOT}/dev.tfplan

apply:dev:
  extends: .terraform_base
  stage: apply
  variables:
    TF_WORKSPACE: dev
  script:
    - terraform apply -auto-approve dev.tfplan
  dependencies:
    - plan:dev
  only:
    - main

plan:prod:
  extends: .terraform_base
  stage: plan
  variables:
    TF_WORKSPACE: prod
  script:
    - terraform plan -out=prod.tfplan
  artifacts:
    paths:
      - ${TF_ROOT}/prod.tfplan

apply:prod:
  extends: .terraform_base
  stage: apply
  variables:
    TF_WORKSPACE: prod
  script:
    - terraform apply -auto-approve prod.tfplan
  dependencies:
    - plan:prod
  when: manual
  only:
    - main
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    parameters {
        choice(
            name: 'WORKSPACE',
            choices: ['dev', 'staging', 'prod'],
            description: 'Target workspace'
        )
        booleanParam(
            name: 'AUTO_APPROVE',
            defaultValue: false,
            description: 'Auto-approve the apply step'
        )
    }

    environment {
        TF_WORKSPACE = "${params.WORKSPACE}"
        AWS_ACCESS_KEY_ID = credentials('aws-access-key')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-key')
    }

    stages {
        stage('Init') {
            steps {
                sh '''
                    terraform init
                    terraform workspace select ${TF_WORKSPACE} 2>/dev/null || \
                        terraform workspace new ${TF_WORKSPACE}
                '''
            }
        }

        stage('Plan') {
            steps {
                sh 'terraform plan -out=tfplan'
            }
        }

        stage('Apply') {
            when {
                expression { params.AUTO_APPROVE || params.WORKSPACE != 'prod' }
            }
            steps {
                sh 'terraform apply -auto-approve tfplan'
            }
        }

        stage('Apply (Manual Approval)') {
            when {
                expression { !params.AUTO_APPROVE && params.WORKSPACE == 'prod' }
            }
            steps {
                input message: 'Apply to production?', ok: 'Apply'
                sh 'terraform apply -auto-approve tfplan'
            }
        }
    }
}
```

## Safety Checks for Workspace Selection

In automation, you want safety checks that prevent accidental deployments to the wrong environment:

```bash
#!/bin/bash
# safe-workspace-select.sh
# Selects a workspace with safety validations

set -e

WORKSPACE=$1
BRANCH=${2:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")}

# Validation: workspace name must be provided
if [ -z "$WORKSPACE" ]; then
  echo "ERROR: Workspace name is required"
  exit 1
fi

# Validation: prevent prod deployments from non-main branches
if [ "$WORKSPACE" = "prod" ] && [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
  echo "ERROR: Production deployments are only allowed from the main branch"
  echo "Current branch: $BRANCH"
  exit 1
fi

# Validation: workspace name must match expected pattern
if ! echo "$WORKSPACE" | grep -qE '^(dev|staging|prod|test-[a-z0-9-]+)$'; then
  echo "ERROR: Invalid workspace name: $WORKSPACE"
  echo "Allowed patterns: dev, staging, prod, test-*"
  exit 1
fi

# Select the workspace
terraform workspace select "$WORKSPACE" 2>/dev/null || \
  terraform workspace new "$WORKSPACE"

# Verify we are in the right workspace
CURRENT=$(terraform workspace show)
if [ "$CURRENT" != "$WORKSPACE" ]; then
  echo "ERROR: Failed to select workspace $WORKSPACE (currently in $CURRENT)"
  exit 1
fi

echo "Successfully selected workspace: $WORKSPACE"
```

## Handling Concurrent Workspace Operations

When multiple CI jobs might try to create the same workspace simultaneously:

```bash
#!/bin/bash
# concurrent-safe-workspace.sh
# Handles race conditions when multiple jobs create workspaces

set -e

WORKSPACE=$1
MAX_RETRIES=5
RETRY_DELAY=3

for i in $(seq 1 $MAX_RETRIES); do
  # Try to select the workspace
  if terraform workspace select "$WORKSPACE" 2>/dev/null; then
    echo "Workspace $WORKSPACE selected."
    exit 0
  fi

  # Try to create it
  if terraform workspace new "$WORKSPACE" 2>/dev/null; then
    echo "Workspace $WORKSPACE created."
    exit 0
  fi

  # If both failed, another process might be creating it right now
  echo "Attempt $i failed. Retrying in ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
done

echo "ERROR: Could not select or create workspace $WORKSPACE after $MAX_RETRIES attempts"
exit 1
```

## Wrapper Script for All Terraform Operations

Wrap all Terraform commands with workspace validation:

```bash
#!/bin/bash
# tf.sh - Wrapper script for Terraform with workspace management
# Usage: ./tf.sh <workspace> <command> [args...]

set -e

WORKSPACE=$1
shift
COMMAND=$1
shift

# Validate inputs
if [ -z "$WORKSPACE" ] || [ -z "$COMMAND" ]; then
  echo "Usage: $0 <workspace> <terraform-command> [args...]"
  echo "Example: $0 dev plan"
  echo "Example: $0 prod apply -auto-approve"
  exit 1
fi

# Initialize if needed
if [ ! -d ".terraform" ]; then
  echo "Initializing Terraform..."
  terraform init
fi

# Select workspace
terraform workspace select "$WORKSPACE" 2>/dev/null || \
  terraform workspace new "$WORKSPACE"

# Verify workspace
CURRENT=$(terraform workspace show)
echo "Workspace: $CURRENT"
echo "Command: terraform $COMMAND $*"
echo ""

# Production safety check for destructive commands
if [ "$CURRENT" = "prod" ]; then
  case "$COMMAND" in
    destroy|apply)
      if [[ "$*" != *"-auto-approve"* ]]; then
        echo "Production $COMMAND requires confirmation."
      fi
      ;;
  esac
fi

# Run the command
terraform "$COMMAND" "$@"
```

Usage:

```bash
# Plan in dev
./tf.sh dev plan

# Apply in staging
./tf.sh staging apply

# Destroy test workspace
./tf.sh test-feature-x destroy -auto-approve
```

## Reporting Workspace Selection in Logs

For audit trails, always log which workspace was selected and by whom:

```bash
#!/bin/bash
# log-workspace-operation.sh

WORKSPACE=$(terraform workspace show)
USER=${CI_COMMIT_AUTHOR:-$(whoami)}
PIPELINE=${CI_PIPELINE_ID:-"local"}
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "=== Terraform Operation ==="
echo "Timestamp: $TIMESTAMP"
echo "Workspace: $WORKSPACE"
echo "User: $USER"
echo "Pipeline: $PIPELINE"
echo "Command: terraform $*"
echo "=========================="
```

## Summary

Reliable workspace selection in automation comes down to a few key patterns: always handle the case where a workspace does not exist yet, validate workspace names against expected patterns, add safety checks for production, handle concurrent access gracefully, and log everything for audit purposes. Whether you use `TF_WORKSPACE`, `terraform workspace select`, or a wrapper script, the goal is the same - make sure every automated run targets the right workspace every time. For more on workspace management, see our guide on [workspace naming conventions](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-naming-in-terraform-workspace/view).

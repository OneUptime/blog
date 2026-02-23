# How to Use Terraform Cloud CLI in CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Cloud, CI/CD, CLI, DevOps, Infrastructure as Code

Description: Integrate Terraform Cloud CLI-driven workflows into your CI/CD pipelines for remote plan and apply operations, workspace management, and team collaboration.

---

Terraform Cloud can run your plans and applies remotely, even when triggered from a CI/CD pipeline. Instead of running Terraform directly on your CI runner, the CLI sends your code to Terraform Cloud, which executes the operations on its own infrastructure. This gives you Terraform Cloud features like remote state, Sentinel policies, and cost estimation while keeping your existing CI/CD workflow.

This post covers how to set up CLI-driven Terraform Cloud workflows in CI/CD pipelines.

## CLI-Driven vs. VCS-Driven

Terraform Cloud supports two workflow models:

- **VCS-driven**: Terraform Cloud connects directly to your repo and triggers runs on commits. No CI/CD pipeline needed.
- **CLI-driven**: Your CI/CD pipeline runs `terraform plan` and `terraform apply`, but the actual execution happens on Terraform Cloud workers.

CLI-driven gives you more control because you can add custom steps (security scanning, cost checks, notifications) around the Terraform commands.

## Setting Up the Backend

Configure your Terraform to use the Terraform Cloud backend:

```hcl
# backend.tf
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      name = "production-infra"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.35"
    }
  }
}
```

For multiple environments, use workspace tags:

```hcl
# backend.tf - dynamic workspace selection
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      tags = ["app:web", "component:networking"]
    }
  }
}
```

## GitHub Actions Integration

```yaml
# .github/workflows/terraform-cloud.yml
name: Terraform Cloud CLI
on:
  pull_request:
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  plan:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Setup Terraform with TFC credentials
      - uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: Terraform Init
        working-directory: infrastructure
        run: terraform init

      # Plan runs remotely on Terraform Cloud
      - name: Terraform Plan
        working-directory: infrastructure
        run: |
          # The plan executes on TFC workers, output streams to CI
          terraform plan -no-color 2>&1 | tee plan-output.txt

      - name: Post Plan to PR
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            let output = fs.readFileSync('infrastructure/plan-output.txt', 'utf8');

            // Extract just the plan portion (TFC adds wrapper text)
            const planStart = output.indexOf('Terraform will perform');
            if (planStart > -1) {
              output = output.substring(planStart);
            }

            // Truncate if needed
            if (output.length > 60000) {
              output = output.substring(0, 60000) + '\n... truncated ...';
            }

            const body = `## Terraform Cloud Plan

            <details>
            <summary>Show Plan Output</summary>

            \`\`\`
            ${output}
            \`\`\`

            </details>`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body
            });

  apply:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    concurrency:
      group: terraform-cloud-apply
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: Terraform Init
        working-directory: infrastructure
        run: terraform init

      # Apply runs remotely on Terraform Cloud
      - name: Terraform Apply
        working-directory: infrastructure
        run: terraform apply -auto-approve -no-color
```

## Setting Variables in Terraform Cloud

Terraform Cloud workspaces have their own variable storage. Set them via the API or CLI:

```yaml
# Set workspace variables via API before running
- name: Set TFC Variables
  run: |
    # Set a Terraform variable
    curl -s \
      --header "Authorization: Bearer ${{ secrets.TF_API_TOKEN }}" \
      --header "Content-Type: application/vnd.api+json" \
      --request POST \
      "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars" \
      --data '{
        "data": {
          "type": "vars",
          "attributes": {
            "key": "image_tag",
            "value": "${{ github.sha }}",
            "category": "terraform",
            "hcl": false,
            "sensitive": false
          }
        }
      }'
```

Or use the `TF_VAR_` environment variable prefix:

```yaml
- name: Terraform Plan
  working-directory: infrastructure
  env:
    TF_VAR_image_tag: ${{ github.sha }}
    TF_VAR_environment: production
  run: terraform plan -no-color
```

## Workspace Management with CLI

Create and manage workspaces programmatically:

```bash
#!/bin/bash
# scripts/create-workspace.sh
# Create a new TFC workspace for a feature environment

WORKSPACE_NAME="$1"
ORG="my-org"

# Create workspace via API
curl -s \
  --header "Authorization: Bearer ${TF_API_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "https://app.terraform.io/api/v2/organizations/${ORG}/workspaces" \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"name\": \"${WORKSPACE_NAME}\",
        \"execution-mode\": \"remote\",
        \"auto-apply\": false,
        \"terraform-version\": \"1.7.4\",
        \"tag-names\": [\"ephemeral\", \"ci-created\"]
      }
    }
  }"
```

## Handling TFC Run Statuses

Terraform Cloud runs go through several statuses. Your CI pipeline needs to handle them:

```yaml
- name: Terraform Plan with Status Check
  working-directory: infrastructure
  run: |
    # Start the plan
    terraform plan -no-color 2>&1 | tee plan-output.txt
    EXIT_CODE=$?

    # Check for policy check failures (Sentinel)
    if grep -q "Sentinel Result: false" plan-output.txt; then
      echo "Sentinel policy check failed"
      exit 1
    fi

    # Check for cost estimation warnings
    if grep -q "Cost Estimation" plan-output.txt; then
      COST_LINE=$(grep "Cost Estimation" plan-output.txt)
      echo "Cost estimate: $COST_LINE"
    fi

    exit $EXIT_CODE
```

## GitLab CI Integration

```yaml
# .gitlab-ci.yml
variables:
  TF_CLI_CONFIG_FILE: "$CI_PROJECT_DIR/.terraformrc"

before_script:
  # Create TFC credentials file
  - |
    cat > .terraformrc << EOF
    credentials "app.terraform.io" {
      token = "${TF_API_TOKEN}"
    }
    EOF

stages:
  - plan
  - apply

plan:
  stage: plan
  image: hashicorp/terraform:1.7.4
  script:
    - cd infrastructure
    - terraform init
    - terraform plan -no-color
  rules:
    - if: $CI_MERGE_REQUEST_ID

apply:
  stage: apply
  image: hashicorp/terraform:1.7.4
  script:
    - cd infrastructure
    - terraform init
    - terraform apply -auto-approve -no-color
  environment:
    name: production
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Speculative Plans

Terraform Cloud supports speculative plans that don't lock state - perfect for PRs:

```yaml
- name: Speculative Plan
  working-directory: infrastructure
  run: |
    # Speculative plans are automatically used for CLI-driven
    # workspaces when you don't use -out flag
    terraform plan -no-color
    # This creates a speculative plan that:
    # - Doesn't lock the workspace
    # - Can't be applied
    # - Shows what would change
```

## Migrating from Local to TFC Backend

When moving an existing project to Terraform Cloud:

```yaml
# One-time migration workflow
- name: Migrate to Terraform Cloud
  run: |
    cd infrastructure

    # Initialize with current backend
    terraform init

    # Update backend config to use TFC
    # (edit backend.tf to use cloud {} block)

    # Re-initialize with migration
    terraform init -migrate-state

    # Verify state was transferred
    terraform plan -no-color
```

## Cost and Performance Considerations

Terraform Cloud free tier includes 500 managed resources. For larger deployments:

```yaml
# Monitor resource count in CI
- name: Check Resource Count
  run: |
    RESOURCE_COUNT=$(terraform state list | wc -l)
    echo "Managed resources: $RESOURCE_COUNT"

    if [ "$RESOURCE_COUNT" -gt 450 ]; then
      echo "WARNING: Approaching free tier limit (500 resources)"
      echo "Consider splitting into multiple workspaces"
    fi
```

## Summary

Using Terraform Cloud CLI in CI/CD pipelines gives you:

1. Remote execution - plans and applies run on TFC infrastructure
2. Built-in features - state management, Sentinel policies, cost estimation
3. CLI-driven flexibility - add custom CI steps around Terraform commands
4. Speculative plans - non-blocking plans for PRs
5. Team collaboration - run history, approval workflows in TFC UI

Set it up by configuring the `cloud {}` backend block and providing a TFC API token to your CI pipeline. The Terraform commands work the same way - the difference is where they execute. For setting up the full CI/CD workflow, see [Terraform CI/CD with pull request workflows](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pull-request-workflows/view).

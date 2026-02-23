# How to Use HCP Terraform with GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, GitHub Actions, CI/CD, Automation, DevOps

Description: Learn how to integrate HCP Terraform with GitHub Actions for automated Terraform plans on pull requests and applies on merge.

---

GitHub Actions and HCP Terraform complement each other well. GitHub Actions handles the CI/CD pipeline orchestration, while HCP Terraform manages state, runs Terraform operations, and enforces policies. Together, they give you a fully automated infrastructure deployment pipeline with pull request previews and merge-triggered deploys.

This guide covers the different integration approaches, from the simplest setup to more advanced patterns.

## Integration Approaches

There are two main ways to integrate GitHub Actions with HCP Terraform:

1. **VCS-driven workflow**: HCP Terraform watches your repository directly. GitHub Actions adds extra steps (testing, linting) around the Terraform runs.
2. **API-driven workflow**: GitHub Actions triggers everything through the HCP Terraform API or CLI. You have full control over the pipeline.

## Approach 1: CLI-Driven with GitHub Actions

This is the most common and flexible approach. GitHub Actions runs `terraform plan` and `terraform apply`, which execute remotely on HCP Terraform.

### Basic Setup

First, store your HCP Terraform API token as a GitHub Actions secret:

1. Go to your GitHub repository **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Name: `TF_API_TOKEN`
4. Value: Your HCP Terraform team or user API token

### Workflow for Pull Requests (Plan Only)

```yaml
# .github/workflows/terraform-plan.yml
name: Terraform Plan

on:
  pull_request:
    branches: [main]
    paths:
      - 'infrastructure/**'
      - '.github/workflows/terraform-*.yml'

jobs:
  plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write  # Needed to comment on PRs
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}
          terraform_version: "1.7.0"

      - name: Terraform Format Check
        id: fmt
        run: terraform fmt -check -recursive
        working-directory: infrastructure
        continue-on-error: true

      - name: Terraform Init
        id: init
        run: terraform init
        working-directory: infrastructure

      - name: Terraform Validate
        id: validate
        run: terraform validate -no-color
        working-directory: infrastructure

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color
        working-directory: infrastructure
        continue-on-error: true

      - name: Comment Plan Output on PR
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        env:
          PLAN: "${{ steps.plan.outputs.stdout }}"
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const output = `#### Terraform Format: \`${{ steps.fmt.outcome }}\`
            #### Terraform Init: \`${{ steps.init.outcome }}\`
            #### Terraform Validate: \`${{ steps.validate.outcome }}\`
            #### Terraform Plan: \`${{ steps.plan.outcome }}\`

            <details><summary>Show Plan Output</summary>

            \`\`\`
            ${process.env.PLAN}
            \`\`\`

            </details>

            *Pushed by: @${{ github.actor }}, Action: \`${{ github.event_name }}\`*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

      - name: Plan Status
        if: steps.plan.outcome == 'failure'
        run: exit 1
```

### Workflow for Merges (Apply)

```yaml
# .github/workflows/terraform-apply.yml
name: Terraform Apply

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

jobs:
  apply:
    name: Terraform Apply
    runs-on: ubuntu-latest
    environment: production  # Requires environment approval in GitHub

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}
          terraform_version: "1.7.0"

      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: infrastructure
```

### Terraform Configuration

Your Terraform configuration uses the `cloud` block:

```hcl
# infrastructure/main.tf
terraform {
  cloud {
    organization = "your-org"

    workspaces {
      name = "app-production"
    }
  }

  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Approach 2: API-Driven Workflow

For more control, trigger runs directly via the HCP Terraform API:

```yaml
# .github/workflows/terraform-api.yml
name: Terraform API Workflow

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

jobs:
  deploy:
    name: Deploy Infrastructure
    runs-on: ubuntu-latest
    env:
      TFC_TOKEN: ${{ secrets.TF_API_TOKEN }}
      TFC_ORG: "your-org"
      TFC_WORKSPACE: "app-production"

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Get Workspace ID
        id: workspace
        run: |
          WORKSPACE_ID=$(curl -s \
            --header "Authorization: Bearer $TFC_TOKEN" \
            "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/workspaces/${TFC_WORKSPACE}" \
            | jq -r '.data.id')
          echo "id=$WORKSPACE_ID" >> $GITHUB_OUTPUT

      - name: Create Configuration Version
        id: config
        run: |
          # Create a configuration version
          RESPONSE=$(curl -s \
            --header "Authorization: Bearer $TFC_TOKEN" \
            --header "Content-Type: application/vnd.api+json" \
            --request POST \
            --data '{
              "data": {
                "type": "configuration-versions",
                "attributes": {
                  "auto-queue-runs": false
                }
              }
            }' \
            "https://app.terraform.io/api/v2/workspaces/${{ steps.workspace.outputs.id }}/configuration-versions")

          UPLOAD_URL=$(echo "$RESPONSE" | jq -r '.data.attributes["upload-url"]')
          CONFIG_ID=$(echo "$RESPONSE" | jq -r '.data.id')
          echo "upload_url=$UPLOAD_URL" >> $GITHUB_OUTPUT
          echo "config_id=$CONFIG_ID" >> $GITHUB_OUTPUT

      - name: Upload Configuration
        run: |
          # Package the configuration
          tar -czf config.tar.gz -C infrastructure .

          # Upload to HCP Terraform
          curl -s \
            --header "Content-Type: application/octet-stream" \
            --request PUT \
            --data-binary @config.tar.gz \
            "${{ steps.config.outputs.upload_url }}"

      - name: Create Run
        id: run
        run: |
          RUN_RESPONSE=$(curl -s \
            --header "Authorization: Bearer $TFC_TOKEN" \
            --header "Content-Type: application/vnd.api+json" \
            --request POST \
            --data '{
              "data": {
                "type": "runs",
                "attributes": {
                  "message": "Triggered by GitHub Actions - ${{ github.sha }}"
                },
                "relationships": {
                  "workspace": {
                    "data": {
                      "type": "workspaces",
                      "id": "${{ steps.workspace.outputs.id }}"
                    }
                  },
                  "configuration-version": {
                    "data": {
                      "type": "configuration-versions",
                      "id": "${{ steps.config.outputs.config_id }}"
                    }
                  }
                }
              }
            }' \
            "https://app.terraform.io/api/v2/runs")

          RUN_ID=$(echo "$RUN_RESPONSE" | jq -r '.data.id')
          echo "run_id=$RUN_ID" >> $GITHUB_OUTPUT
          echo "Run created: $RUN_ID"

      - name: Wait for Run
        run: |
          RUN_ID="${{ steps.run.outputs.run_id }}"
          TIMEOUT=600
          ELAPSED=0

          while [ $ELAPSED -lt $TIMEOUT ]; do
            STATUS=$(curl -s \
              --header "Authorization: Bearer $TFC_TOKEN" \
              "https://app.terraform.io/api/v2/runs/${RUN_ID}" \
              | jq -r '.data.attributes.status')

            echo "Run status: $STATUS ($ELAPSED seconds elapsed)"

            case $STATUS in
              "applied")
                echo "Run applied successfully"
                exit 0
                ;;
              "planned_and_finished")
                echo "No changes needed"
                exit 0
                ;;
              "errored"|"canceled"|"force_canceled"|"discarded")
                echo "Run failed with status: $STATUS"
                exit 1
                ;;
            esac

            sleep 15
            ELAPSED=$((ELAPSED + 15))
          done

          echo "Timeout waiting for run"
          exit 1
```

## Multi-Environment Pipeline

Here is a pattern for deploying through environments:

```yaml
# .github/workflows/deploy-pipeline.yml
name: Infrastructure Deployment Pipeline

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

jobs:
  plan-staging:
    name: Plan Staging
    runs-on: ubuntu-latest
    outputs:
      has_changes: ${{ steps.plan.outputs.exitcode }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}
      - run: terraform init
        working-directory: infrastructure
        env:
          TF_WORKSPACE: "app-staging"
      - id: plan
        run: terraform plan -detailed-exitcode -no-color
        working-directory: infrastructure
        continue-on-error: true

  apply-staging:
    name: Apply Staging
    needs: plan-staging
    if: needs.plan-staging.outputs.has_changes == '2'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}
      - run: terraform init
        working-directory: infrastructure
        env:
          TF_WORKSPACE: "app-staging"
      - run: terraform apply -auto-approve
        working-directory: infrastructure

  plan-production:
    name: Plan Production
    needs: apply-staging
    runs-on: ubuntu-latest
    outputs:
      has_changes: ${{ steps.plan.outputs.exitcode }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}
      - run: terraform init
        working-directory: infrastructure
        env:
          TF_WORKSPACE: "app-production"
      - id: plan
        run: terraform plan -detailed-exitcode -no-color
        working-directory: infrastructure
        continue-on-error: true

  apply-production:
    name: Apply Production
    needs: plan-production
    if: needs.plan-production.outputs.has_changes == '2'
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}
      - run: terraform init
        working-directory: infrastructure
        env:
          TF_WORKSPACE: "app-production"
      - run: terraform apply -auto-approve
        working-directory: infrastructure
```

## Using the Official HCP Terraform Action

HashiCorp provides an official GitHub Action for triggering runs:

```yaml
# Using the official action
- name: Upload Configuration
  uses: hashicorp/tfc-workflows-github/actions/upload-configuration@v1.3.0
  id: upload
  with:
    workspace: app-production
    directory: infrastructure
    speculative: false

- name: Create Run
  uses: hashicorp/tfc-workflows-github/actions/create-run@v1.3.0
  id: run
  with:
    workspace: app-production
    configuration_version: ${{ steps.upload.outputs.configuration_version_id }}
    message: "Triggered by GitHub Actions run ${{ github.run_id }}"

- name: Apply Run
  uses: hashicorp/tfc-workflows-github/actions/apply-run@v1.3.0
  if: ${{ steps.run.outputs.has_changes == 'true' }}
  with:
    run: ${{ steps.run.outputs.run_id }}
    comment: "Confirmed by GitHub Actions"
```

## Security Best Practices

### Use Team Tokens, Not User Tokens

```yaml
# Store a team API token, not a personal one
env:
  TF_API_TOKEN: ${{ secrets.TFC_TEAM_TOKEN }}
```

### Use GitHub Environments for Approvals

```yaml
# Require manual approval for production
jobs:
  apply-production:
    environment:
      name: production
      url: "https://app.terraform.io/app/your-org/workspaces/app-production"
```

### Limit Token Scope

Create a dedicated team in HCP Terraform for CI/CD with only the permissions it needs:

```hcl
resource "tfe_team" "github_actions" {
  name         = "github-actions-ci"
  organization = "your-org"
}

resource "tfe_team_access" "ci_production" {
  team_id      = tfe_team.github_actions.id
  workspace_id = tfe_workspace.production.id

  permissions {
    runs              = "apply"
    variables         = "read"
    state_versions    = "none"
    workspace_locking = false
  }
}
```

## Troubleshooting

**"Error: No valid credential sources found"**: The `TF_API_TOKEN` secret is not set or is expired. Verify it in repository settings.

**Plan output not appearing in PR comments**: Make sure the workflow has `pull-requests: write` permission. Also check that `setup-terraform` has the `terraform_wrapper` enabled (it is by default).

**Runs queuing but not starting**: Another run may be in progress. HCP Terraform processes one run at a time per workspace.

## Summary

GitHub Actions and HCP Terraform together provide a robust infrastructure deployment pipeline. Use the CLI-driven approach for simplicity, or the API-driven approach when you need fine-grained control. Always post plan output on pull requests, use environment-based approvals for production, and use team tokens with minimal permissions. The result is an auditable, automated workflow where every infrastructure change goes through code review.

For other CI/CD integrations, see our guides on [HCP Terraform with GitLab CI](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-gitlab-ci/view) and [HCP Terraform with Azure DevOps](https://oneuptime.com/blog/post/2026-02-23-how-to-use-hcp-terraform-with-azure-devops/view).

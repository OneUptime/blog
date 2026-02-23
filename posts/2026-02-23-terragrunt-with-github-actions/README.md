# How to Use Terragrunt with GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, GitHub Actions, CI/CD, DevOps, Infrastructure as Code

Description: A practical guide to setting up Terragrunt in GitHub Actions with plan-on-PR, apply-on-merge workflows, OIDC authentication, and PR comment integration.

---

GitHub Actions is the most popular CI/CD platform for teams already hosting their infrastructure repos on GitHub, and it works well with Terragrunt. In this guide, we'll build a complete workflow that plans on pull requests, posts results as PR comments, and applies on merge to main.

## Prerequisites

Before setting up the workflow, you need:
- A GitHub repository with your Terragrunt configuration
- AWS (or GCP/Azure) credentials configured as GitHub secrets or OIDC
- Terraform and Terragrunt versions decided for your project

## Basic Workflow Structure

Here's a starter workflow that runs on pull requests and pushes to main:

```yaml
# .github/workflows/terragrunt.yml
name: Terragrunt

on:
  pull_request:
    branches: [main]
    paths:
      - 'infrastructure/**'    # Only trigger on infra changes
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

# Prevent concurrent runs for the same branch
concurrency:
  group: terragrunt-${{ github.ref }}
  cancel-in-progress: false    # Don't cancel in-progress applies

env:
  TF_IN_AUTOMATION: true
  TF_INPUT: false
  TERRAGRUNT_NON_INTERACTIVE: true

permissions:
  id-token: write     # Needed for OIDC
  contents: read
  pull-requests: write # Needed for PR comments

jobs:
  plan:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false  # Important for Terragrunt compatibility

      - name: Setup Terragrunt
        run: |
          # Download and install Terragrunt
          TERRAGRUNT_VERSION="0.55.0"
          curl -sL "https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_amd64" \
            -o /usr/local/bin/terragrunt
          chmod +x /usr/local/bin/terragrunt
          terragrunt --version

      - name: Configure AWS Credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - name: Terragrunt Plan
        id: plan
        working-directory: infrastructure/dev
        run: |
          terragrunt run-all plan --terragrunt-non-interactive -no-color 2>&1 | tee plan-output.txt
          echo "exit_code=${PIPESTATUS[0]}" >> "$GITHUB_OUTPUT"

      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            let output = fs.readFileSync('infrastructure/dev/plan-output.txt', 'utf8');

            // Truncate if necessary
            if (output.length > 60000) {
              output = output.substring(0, 60000) + '\n\n... (truncated)';
            }

            const body = `## Terragrunt Plan

            \`\`\`
            ${output}
            \`\`\`

            *Pushed by: @${context.actor}*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

  apply:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production    # Requires manual approval if configured
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Setup Terragrunt
        run: |
          TERRAGRUNT_VERSION="0.55.0"
          curl -sL "https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_amd64" \
            -o /usr/local/bin/terragrunt
          chmod +x /usr/local/bin/terragrunt

      - name: Configure AWS Credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

      - name: Terragrunt Apply
        working-directory: infrastructure/dev
        run: |
          terragrunt run-all apply \
            --terragrunt-non-interactive \
            -auto-approve \
            -no-color
```

## Setting Up AWS OIDC for GitHub Actions

Instead of storing AWS access keys as secrets, use OIDC federation. This gives your workflow short-lived credentials:

```hcl
# Deploy this Terraform once to set up the OIDC provider
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM role that GitHub Actions will assume
resource "aws_iam_role" "github_actions" {
  name = "GitHubActionsRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Lock down to specific repo and branch
          "token.actions.githubusercontent.com:sub" = "repo:your-org/your-repo:*"
        }
      }
    }]
  })
}

# Attach the policies your Terraform needs
resource "aws_iam_role_policy_attachment" "admin" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

## Caching Providers and Modules

Provider downloads can add minutes to every run. Use GitHub Actions cache:

```yaml
      - name: Cache Terraform Providers
        uses: actions/cache@v4
        with:
          path: |
            ~/.terraform.d/plugin-cache
            /tmp/terragrunt-cache
          key: terraform-${{ runner.os }}-${{ hashFiles('**/.terraform.lock.hcl') }}
          restore-keys: |
            terraform-${{ runner.os }}-

      - name: Set Plugin Cache
        run: |
          mkdir -p ~/.terraform.d/plugin-cache
          echo 'plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"' > ~/.terraformrc
          export TERRAGRUNT_DOWNLOAD="/tmp/terragrunt-cache"
```

## Multi-Environment Workflow

Most real setups have multiple environments. Here's how to handle that with a matrix strategy:

```yaml
jobs:
  plan:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
      fail-fast: false    # Plan all environments even if one fails
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # ... setup steps ...

      - name: Plan ${{ matrix.environment }}
        working-directory: infrastructure/${{ matrix.environment }}
        run: |
          terragrunt run-all plan \
            --terragrunt-non-interactive \
            -no-color 2>&1 | tee plan-${{ matrix.environment }}.txt

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: plan-${{ matrix.environment }}
          path: infrastructure/${{ matrix.environment }}/plan-${{ matrix.environment }}.txt
```

## Detecting Changed Modules

For large repos, running `run-all` on every PR is wasteful. Here's how to only plan changed modules:

```yaml
      - name: Get Changed Files
        id: changes
        run: |
          # Find changed directories that contain terragrunt.hcl
          CHANGED=$(git diff --name-only origin/main...HEAD | \
            xargs -I {} dirname {} | \
            sort -u | \
            while read dir; do
              if [ -f "$dir/terragrunt.hcl" ]; then
                echo "$dir"
              fi
            done)
          echo "modules<<EOF" >> "$GITHUB_OUTPUT"
          echo "$CHANGED" >> "$GITHUB_OUTPUT"
          echo "EOF" >> "$GITHUB_OUTPUT"

      - name: Plan Changed Modules
        run: |
          while IFS= read -r module; do
            if [ -n "$module" ]; then
              echo "Planning: $module"
              cd "$module"
              terragrunt plan --terragrunt-non-interactive -no-color
              cd "$GITHUB_WORKSPACE"
            fi
          done <<< "${{ steps.changes.outputs.modules }}"
```

## Using Saved Plans

For extra safety, save the plan file and use it during apply to make sure exactly what was reviewed gets applied:

```yaml
  plan:
    runs-on: ubuntu-latest
    steps:
      # ... setup ...
      - name: Plan and Save
        working-directory: infrastructure/dev
        run: |
          terragrunt run-all plan \
            --terragrunt-non-interactive \
            -out=tfplan

      - name: Upload Plan Artifact
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: infrastructure/dev/**/tfplan
          retention-days: 1

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production
    steps:
      # ... setup ...
      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: terraform-plan
          path: infrastructure/dev

      - name: Apply Saved Plan
        working-directory: infrastructure/dev
        run: |
          terragrunt run-all apply \
            --terragrunt-non-interactive \
            tfplan
```

## Handling Secrets

If your Terragrunt configuration needs secrets (like database passwords), pass them through environment variables:

```yaml
      - name: Apply
        working-directory: infrastructure/dev
        env:
          TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}
          TF_VAR_api_key: ${{ secrets.API_KEY }}
        run: |
          terragrunt run-all apply \
            --terragrunt-non-interactive \
            -auto-approve
```

## Workflow Dispatch for Manual Runs

Sometimes you need to run Terragrunt manually, for a specific module or with a destroy:

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [dev, staging, prod]
      action:
        description: 'Terraform action'
        required: true
        type: choice
        options: [plan, apply, destroy]
      module_path:
        description: 'Specific module path (optional)'
        required: false

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      # ... setup ...
      - name: Run Terragrunt
        working-directory: infrastructure/${{ inputs.environment }}/${{ inputs.module_path }}
        run: |
          if [ "${{ inputs.action }}" == "destroy" ]; then
            terragrunt run-all destroy --terragrunt-non-interactive -auto-approve
          elif [ "${{ inputs.action }}" == "apply" ]; then
            terragrunt run-all apply --terragrunt-non-interactive -auto-approve
          else
            terragrunt run-all plan --terragrunt-non-interactive
          fi
```

## Summary

GitHub Actions and Terragrunt work well together once you've sorted out authentication (use OIDC), caching (plugin cache directory), and the plan-review-apply workflow. The concurrency controls in GitHub Actions prevent parallel applies from conflicting, and environment protection rules give you the approval gates you need for production. For the GitLab equivalent of this setup, see our [Terragrunt with GitLab CI guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-gitlab-ci/view).

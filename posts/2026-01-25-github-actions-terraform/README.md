# How to Run Terraform with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Terraform, Infrastructure as Code, CI/CD, DevOps, Cloud

Description: Learn how to automate Terraform deployments with GitHub Actions. This guide covers plan and apply workflows, state management, PR comments, security scanning, and patterns for safe infrastructure changes.

---

Running Terraform manually from laptops creates inconsistency and risk. GitHub Actions brings the same CI/CD benefits to infrastructure that you expect for application code: automated testing, peer review, and audit trails. This guide shows you how to build Terraform workflows that keep infrastructure changes safe and predictable.

## Basic Terraform Workflow

Start with a workflow that runs plan on PRs and apply on merge:

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  TF_VERSION: '1.7.0'
  WORKING_DIR: './terraform'

jobs:
  terraform:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      pull-requests: write

    defaults:
      run:
        working-directory: ${{ env.WORKING_DIR }}

    steps:
      - uses: actions/checkout@v4

      # Set up Terraform
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      # Initialize Terraform
      - name: Terraform Init
        run: terraform init

      # Validate configuration
      - name: Terraform Validate
        run: terraform validate

      # Check formatting
      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      # Plan
      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        continue-on-error: true

      # Apply only on main branch
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply -auto-approve tfplan
```

## PR Comments with Plan Output

Post the plan output as a comment on pull requests:

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: '1.7.0'

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color
        working-directory: ./terraform
        continue-on-error: true

      # Post plan as PR comment
      - name: Comment Plan on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const output = `#### Terraform Plan 📖

            <details><summary>Show Plan</summary>

            \`\`\`terraform
            ${{ steps.plan.outputs.stdout }}
            \`\`\`

            </details>

            *Pushed by: @${{ github.actor }}, Action: \`${{ github.event_name }}\`*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

      # Fail if plan failed
      - name: Check Plan Status
        if: steps.plan.outcome == 'failure'
        run: exit 1
```

## Remote State with S3

Configure backend state storage in S3:

```hcl
# terraform/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

Workflow with OIDC authentication to AWS:

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest

    permissions:
      id-token: write
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      # Authenticate to AWS via OIDC
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-deploy
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: '1.7.0'

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        working-directory: ./terraform

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve tfplan
        working-directory: ./terraform
```

## Multi-Environment Setup

Manage staging and production with workspaces or directories:

### Using Workspaces

```yaml
name: Terraform Multi-Environment

on:
  push:
    branches: [main, staging]

jobs:
  terraform:
    runs-on: ubuntu-latest

    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Determine environment
        id: env
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
          fi

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ steps.env.outputs.environment == 'production' && secrets.PROD_ROLE_ARN || secrets.STAGING_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform

      - name: Select Workspace
        run: terraform workspace select ${{ steps.env.outputs.environment }} || terraform workspace new ${{ steps.env.outputs.environment }}
        working-directory: ./terraform

      - name: Terraform Apply
        run: terraform apply -auto-approve -var-file="${{ steps.env.outputs.environment }}.tfvars"
        working-directory: ./terraform
```

### Using Directory Structure

```
terraform/
  modules/
    vpc/
    eks/
  environments/
    staging/
      main.tf
      variables.tf
    production/
      main.tf
      variables.tf
```

```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        environment: [staging, production]

    environment: ${{ matrix.environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform/environments/${{ matrix.environment }}

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: ./terraform/environments/${{ matrix.environment }}
```

## Security Scanning

Scan Terraform code for security issues:

```yaml
jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Checkov security scanner
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: ./terraform
          framework: terraform
          output_format: sarif
          output_file_path: checkov-results.sarif

      # Upload results to GitHub Security
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: checkov-results.sarif

      # tfsec scanner
      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          working_directory: ./terraform
          soft_fail: false

  terraform:
    needs: security
    runs-on: ubuntu-latest
    # Continue only if security checks pass
    steps:
      # ... terraform steps
```

## Drift Detection

Schedule periodic drift checks:

```yaml
name: Terraform Drift Detection

on:
  schedule:
    # Run daily at 8 AM UTC
    - cron: '0 8 * * *'
  workflow_dispatch:

jobs:
  drift:
    runs-on: ubuntu-latest

    permissions:
      id-token: write
      contents: read
      issues: write

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-readonly
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform

      - name: Check for Drift
        id: drift
        run: |
          terraform plan -detailed-exitcode -out=tfplan 2>&1 | tee plan-output.txt
          EXIT_CODE=${PIPESTATUS[0]}
          echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT
          # Exit code 2 means changes detected
          if [ $EXIT_CODE -eq 2 ]; then
            echo "drift_detected=true" >> $GITHUB_OUTPUT
          else
            echo "drift_detected=false" >> $GITHUB_OUTPUT
          fi
        working-directory: ./terraform
        continue-on-error: true

      - name: Create Issue on Drift
        if: steps.drift.outputs.drift_detected == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('./terraform/plan-output.txt', 'utf8');

            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Terraform Drift Detected',
              body: `Infrastructure drift was detected during scheduled check.

              <details>
              <summary>Plan Output</summary>

              \`\`\`
              ${plan.substring(0, 60000)}
              \`\`\`
              </details>

              Please review and either:
              1. Apply Terraform to fix drift
              2. Update Terraform configuration to match reality
              `,
              labels: ['infrastructure', 'drift']
            });
```

## Plan Approval Workflow

Require manual approval before applying:

```yaml
name: Terraform with Approval

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest

    outputs:
      plan-exit-code: ${{ steps.plan.outputs.exitcode }}

    permissions:
      id-token: write
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-plan
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform

      - name: Terraform Plan
        id: plan
        run: |
          terraform plan -detailed-exitcode -out=tfplan
          echo "exitcode=$?" >> $GITHUB_OUTPUT
        working-directory: ./terraform
        continue-on-error: true

      # Save plan for apply job
      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: ./terraform/tfplan

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main' && needs.plan.outputs.plan-exit-code == '2'
    runs-on: ubuntu-latest

    # Require approval
    environment: production

    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-apply
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        working-directory: ./terraform

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: ./terraform

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
        working-directory: ./terraform
```

## Cost Estimation

Add cost estimation to PRs:

```yaml
- name: Setup Infracost
  uses: infracost/actions/setup@v3
  with:
    api-key: ${{ secrets.INFRACOST_API_KEY }}

- name: Generate Cost Estimate
  run: |
    infracost breakdown --path=./terraform \
      --format=json \
      --out-file=/tmp/infracost.json

- name: Post Cost Comment
  uses: infracost/actions/comment@v1
  with:
    path: /tmp/infracost.json
    behavior: update
```

## Handling Secrets in Terraform

Pass secrets securely:

```yaml
- name: Terraform Apply
  run: terraform apply -auto-approve
  working-directory: ./terraform
  env:
    # Pass secrets as environment variables
    TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}
    TF_VAR_api_key: ${{ secrets.API_KEY }}
```

Or use AWS Secrets Manager / Parameter Store in your Terraform:

```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/db-password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

## Concurrency Control

Prevent concurrent Terraform runs:

```yaml
name: Terraform

on:
  push:
    branches: [main]

concurrency:
  group: terraform-production
  cancel-in-progress: false

jobs:
  terraform:
    runs-on: ubuntu-latest
    # ... rest of job
```

This ensures only one Terraform workflow runs at a time, preventing state conflicts.

## Monorepo with Multiple States

Handle multiple Terraform configurations:

```yaml
name: Terraform

on:
  push:
    branches: [main]
    paths:
      - 'terraform/**'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.detect.outputs.matrix }}

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Detect changed directories
        id: detect
        run: |
          CHANGED=$(git diff --name-only HEAD~1 HEAD | grep '^terraform/' | cut -d'/' -f2 | sort -u | jq -R -s -c 'split("\n") | map(select(. != ""))')
          echo "matrix={\"directory\":$CHANGED}" >> $GITHUB_OUTPUT

  terraform:
    needs: detect-changes
    if: needs.detect-changes.outputs.matrix != '{"directory":[]}'
    runs-on: ubuntu-latest

    strategy:
      matrix: ${{ fromJson(needs.detect-changes.outputs.matrix) }}
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Apply
        run: |
          cd terraform/${{ matrix.directory }}
          terraform init
          terraform apply -auto-approve
```

---

Automating Terraform with GitHub Actions brings consistency and safety to infrastructure changes. Start with a basic plan-and-apply workflow, add PR comments for visibility, and include security scanning before the problems reach production. The combination of code review for Terraform changes and environment protection rules for applies creates a deployment process that is both fast and safe.

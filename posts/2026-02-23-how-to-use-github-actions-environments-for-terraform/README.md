# How to Use GitHub Actions Environments for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub Actions, Environments, CI/CD, DevOps, Infrastructure as Code, Approvals

Description: Configure GitHub Actions environments for Terraform deployments with approval gates, environment-specific secrets, and promotion workflows across dev, staging, and production.

---

GitHub Actions environments provide deployment protection rules, environment-specific secrets, and approval gates. When combined with Terraform, they give you a proper promotion workflow - changes deploy to dev first, then staging with automatic approval, and finally production with manual approval from designated reviewers.

This is a significant improvement over workflows that either deploy everywhere at once or rely on separate branches for each environment. With environments, you get a single workflow that progresses through environments safely.

## Setting Up Environments in GitHub

Before writing workflows, create environments in your repository settings. Go to Settings, then Environments, and create three environments:

**dev**: No protection rules. Changes deploy automatically.

**staging**: Optional wait timer (e.g., 5 minutes after dev succeeds).

**production**: Required reviewers. Add your team leads or platform engineers as required reviewers.

Each environment can have its own secrets and variables. This keeps production AWS credentials separate from dev credentials.

## Environment-Specific Secrets

In each environment, add the secrets Terraform needs:

For **dev**:
- `AWS_ACCESS_KEY_ID` - dev account credentials
- `AWS_SECRET_ACCESS_KEY` - dev account credentials
- `TF_VAR_environment` - "dev"

For **staging**:
- `AWS_ACCESS_KEY_ID` - staging account credentials
- `AWS_SECRET_ACCESS_KEY` - staging account credentials
- `TF_VAR_environment` - "staging"

For **production**:
- `AWS_ACCESS_KEY_ID` - production account credentials
- `AWS_SECRET_ACCESS_KEY` - production account credentials
- `TF_VAR_environment` - "production"

This way the same workflow step uses different credentials depending on which environment it runs in.

## Basic Environment Workflow

Here is a workflow that plans on PRs and applies through environments on merge:

```yaml
# .github/workflows/terraform.yml
name: Terraform Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write
  id-token: write

jobs:
  # Plan runs on every PR and push to main
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init -backend-config="environments/${{ matrix.environment }}/backend.hcl"
        working-directory: terraform

      - name: Terraform Plan
        run: terraform plan -var-file="environments/${{ matrix.environment }}/terraform.tfvars" -no-color -input=false
        working-directory: terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  # Deploy to dev - no approval needed
  deploy-dev:
    needs: plan
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init -backend-config="environments/dev/backend.hcl"
        working-directory: terraform

      - name: Terraform Apply
        run: terraform apply -var-file="environments/dev/terraform.tfvars" -auto-approve -input=false
        working-directory: terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  # Deploy to staging - after dev succeeds
  deploy-staging:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init -backend-config="environments/staging/backend.hcl"
        working-directory: terraform

      - name: Terraform Apply
        run: terraform apply -var-file="environments/staging/terraform.tfvars" -auto-approve -input=false
        working-directory: terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  # Deploy to production - requires manual approval
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init -backend-config="environments/production/backend.hcl"
        working-directory: terraform

      - name: Terraform Apply
        run: terraform apply -var-file="environments/production/terraform.tfvars" -auto-approve -input=false
        working-directory: terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

When this runs, the workflow pauses at the production stage and waits for a designated reviewer to approve in the GitHub UI.

## Plan Before Apply with Artifacts

A better pattern generates the plan once and applies the exact same plan. This prevents drift between plan and apply:

```yaml
jobs:
  plan-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production-plan
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"
          terraform_wrapper: false

      - name: Terraform Init
        run: terraform init -backend-config="environments/production/backend.hcl"
        working-directory: terraform

      - name: Terraform Plan
        run: terraform plan -var-file="environments/production/terraform.tfvars" -out=tfplan -input=false
        working-directory: terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      # Save the plan file as an artifact
      - name: Upload plan
        uses: actions/upload-artifact@v4
        with:
          name: production-plan
          path: terraform/tfplan
          retention-days: 1

  apply-production:
    needs: plan-production
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"
          terraform_wrapper: false

      # Download the saved plan
      - name: Download plan
        uses: actions/download-artifact@v4
        with:
          name: production-plan
          path: terraform

      - name: Terraform Init
        run: terraform init -backend-config="environments/production/backend.hcl"
        working-directory: terraform

      # Apply the exact plan that was reviewed
      - name: Terraform Apply
        run: terraform apply -input=false tfplan
        working-directory: terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Using Environment Variables

Environments support both secrets and plaintext variables. Use variables for non-sensitive configuration:

```yaml
# In the environment settings, define variables:
# dev: REGION=us-east-1, INSTANCE_COUNT=1
# staging: REGION=us-east-1, INSTANCE_COUNT=2
# production: REGION=us-east-1, INSTANCE_COUNT=3

- name: Terraform Apply
  run: |
    terraform apply -auto-approve -input=false \
      -var="region=${{ vars.REGION }}" \
      -var="instance_count=${{ vars.INSTANCE_COUNT }}"
  working-directory: terraform
```

## Deployment Branches

You can restrict which branches can deploy to an environment. In the environment settings:

- **dev**: Allow all branches
- **staging**: Allow only `main` and `release/*` branches
- **production**: Allow only `main` branch

This prevents feature branches from accidentally deploying to production.

## Wait Timers

Add a wait timer to production to give your team time to verify staging before production deployment starts:

In the environment settings for production, set a wait timer of 15-30 minutes. The workflow will pause for the specified time after the previous job completes before prompting for approval.

## Environment Protection Rules and Concurrency

Use concurrency to prevent multiple deployments to the same environment:

```yaml
deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    concurrency:
      group: terraform-production
      cancel-in-progress: false
    steps:
      # ... deployment steps
```

The `cancel-in-progress: false` setting ensures that a running deployment is not cancelled by a newer one. Instead, the newer deployment waits.

## Viewing Deployment History

GitHub tracks all deployments to each environment. Go to your repository's Environments tab to see the deployment history, including who approved each production deployment and when it ran. This creates an audit trail without any extra tooling.

## Conclusion

GitHub Actions environments give Terraform workflows the deployment controls that infrastructure changes demand. The combination of environment-specific secrets, required reviewers for production, and deployment branch restrictions creates a safe promotion pipeline. Start with three environments (dev, staging, production), add required reviewers to production, and use plan artifacts to ensure what you reviewed is exactly what gets applied.

For more on securing Terraform secrets, see our guide on [storing Terraform secrets in GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-how-to-store-terraform-secrets-in-github-actions/view).

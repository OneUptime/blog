# How to Set Up Terraform CI/CD with GitHub Actions for AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, GitHub Actions, CI/CD, DevOps

Description: Build a complete Terraform CI/CD pipeline with GitHub Actions for AWS deployments, including plan on PR, apply on merge, OIDC authentication, and approval workflows.

---

Running Terraform from your laptop works for experiments, but for anything that matters, you need a CI/CD pipeline. GitHub Actions is a natural fit if your code lives on GitHub. You get plan output on pull requests, automatic apply on merge, and a full audit trail of every infrastructure change.

This guide walks through building a production-grade Terraform pipeline with GitHub Actions - from basic plan/apply to OIDC authentication and manual approval gates.

## Basic Pipeline Structure

The typical flow is: plan on pull request, review the output, merge, then apply.

```mermaid
graph LR
    A[PR Created] --> B[terraform plan]
    B --> C[Post Plan to PR]
    C --> D[Review & Approve]
    D --> E[Merge to main]
    E --> F[terraform apply]
```

## Project Structure

Organize your Terraform project for CI/CD.

```
infrastructure/
  environments/
    dev/
      main.tf
      terraform.tfvars
      backend.tf
    production/
      main.tf
      terraform.tfvars
      backend.tf
  modules/
    vpc/
    ecs/
    rds/
  .github/
    workflows/
      terraform-plan.yml
      terraform-apply.yml
```

## Step 1: Authentication with OIDC

OIDC federation is the recommended way to authenticate GitHub Actions with AWS. No long-lived credentials needed.

First, set up the OIDC provider in AWS (one-time setup).

```hcl
# This goes in a bootstrap Terraform config or is done manually
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_actions_terraform" {
  name = "GitHubActionsTerraform"

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
          "token.actions.githubusercontent.com:sub" = "repo:myorg/infrastructure:*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "github_terraform" {
  role       = aws_iam_role.github_actions_terraform.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

## Step 2: Plan Workflow (Runs on PRs)

This workflow runs `terraform plan` on every pull request and posts the output as a comment.

```yaml
# .github/workflows/terraform-plan.yml
name: Terraform Plan

on:
  pull_request:
    branches: [main]
    paths:
      - 'environments/**'
      - 'modules/**'

permissions:
  id-token: write      # OIDC authentication
  contents: read       # Read repository
  pull-requests: write  # Comment on PRs

jobs:
  plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, production]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsTerraform
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        id: init
        run: terraform init -no-color
        working-directory: environments/${{ matrix.environment }}

      - name: Terraform Validate
        id: validate
        run: terraform validate -no-color
        working-directory: environments/${{ matrix.environment }}

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        working-directory: environments/${{ matrix.environment }}
        continue-on-error: true

      - name: Comment Plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            const plan = `${{ steps.plan.outputs.stdout }}`;
            const truncated = plan.length > 60000
              ? plan.substring(0, 60000) + '\n\n... (truncated)'
              : plan;

            const body = `### Terraform Plan - ${{ matrix.environment }}
            \`\`\`
            ${truncated}
            \`\`\`
            *Plan exit code: ${{ steps.plan.outcome }}*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

      - name: Fail if plan failed
        if: steps.plan.outcome == 'failure'
        run: exit 1
```

## Step 3: Apply Workflow (Runs on Merge)

This workflow runs `terraform apply` when changes are merged to main.

```yaml
# .github/workflows/terraform-apply.yml
name: Terraform Apply

on:
  push:
    branches: [main]
    paths:
      - 'environments/**'
      - 'modules/**'

permissions:
  id-token: write
  contents: read

jobs:
  apply-dev:
    name: Apply Dev
    runs-on: ubuntu-latest
    environment: dev  # GitHub environment for tracking

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsTerraform
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        run: terraform init
        working-directory: environments/dev

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: environments/dev

  apply-production:
    name: Apply Production
    needs: apply-dev  # Wait for dev to succeed
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsTerraform
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        run: terraform init
        working-directory: environments/production

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: environments/production
```

## Setting Up GitHub Environments

Go to your repository Settings > Environments and create environments.

For the `production` environment:
1. Enable "Required reviewers" and add team members
2. Optionally restrict to the `main` branch
3. Add any environment-specific secrets

This creates a manual approval gate - production deployments wait for a reviewer to approve before proceeding.

## Handling Terraform State Locking

Concurrent pipeline runs can corrupt state. Use DynamoDB locking (see our guide on [Terraform state with S3 backend](https://oneuptime.com/blog/post/2026-02-12-terraform-state-with-s3-backend-and-dynamodb-locking/view)) and configure concurrency limits in GitHub Actions.

```yaml
# Add to your workflow to prevent concurrent runs
concurrency:
  group: terraform-${{ github.ref }}-${{ matrix.environment }}
  cancel-in-progress: false  # Don't cancel running applies!
```

The `cancel-in-progress: false` is critical. You never want to cancel a running `terraform apply` - it could leave your infrastructure in an inconsistent state.

## Adding Terraform Format Check

Enforce consistent formatting in PRs.

```yaml
- name: Terraform Format Check
  id: fmt
  run: terraform fmt -check -recursive
  working-directory: environments/${{ matrix.environment }}
  continue-on-error: true

- name: Comment Format Issues
  if: steps.fmt.outcome == 'failure'
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '### Terraform Format Check Failed\nPlease run `terraform fmt -recursive` and commit the changes.'
      });
```

## Caching Terraform Providers

Speed up your pipeline by caching provider downloads.

```yaml
- name: Cache Terraform providers
  uses: actions/cache@v4
  with:
    path: environments/${{ matrix.environment }}/.terraform/providers
    key: terraform-providers-${{ hashFiles('environments/${{ matrix.environment }}/.terraform.lock.hcl') }}
    restore-keys: |
      terraform-providers-
```

## Notifications

Send Slack notifications for deployment results.

```yaml
- name: Notify Slack on Success
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Terraform apply succeeded for ${{ matrix.environment }}",
        "blocks": [{
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*Terraform Apply Succeeded*\nEnvironment: `${{ matrix.environment }}`\nCommit: `${{ github.sha }}`"
          }
        }]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Security Considerations

Limit which branches can trigger applies. Only `main` should run `terraform apply`.

Restrict OIDC trust to specific branches if needed.

```hcl
# Only allow main branch to assume the role
Condition = {
  StringEquals = {
    "token.actions.githubusercontent.com:sub" = "repo:myorg/infrastructure:ref:refs/heads/main"
  }
}
```

Review plan output carefully. The PR comment shows exactly what will change - make sure reviewers actually read it.

Use separate roles for plan and apply if you want plan to be read-only.

## Monitoring Deployments

After apply, validate that your infrastructure is healthy. Consider adding a post-deployment check that verifies your services are responding. A monitoring tool like [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) can alert you immediately if a deployment breaks something.

## Wrapping Up

A well-built Terraform CI/CD pipeline with GitHub Actions gives you automated planning on PRs, manual approval for production, audit trails for every change, and no credentials lying around thanks to OIDC. Start with the basic plan/apply workflow and add features like formatting checks, caching, and Slack notifications as your team grows.

For the GitLab equivalent, check out our guide on [Terraform CI/CD with GitLab CI](https://oneuptime.com/blog/post/2026-02-12-terraform-cicd-gitlab-ci-for-aws/view).

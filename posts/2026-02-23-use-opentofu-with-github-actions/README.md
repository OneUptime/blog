# How to Use OpenTofu with GitHub Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, GitHub Actions, CI/CD, Infrastructure as Code, DevOps

Description: Step-by-step guide to setting up OpenTofu with GitHub Actions for automated infrastructure deployment, including OIDC authentication, plan reviews on PRs, and production apply workflows.

---

GitHub Actions is one of the most popular CI/CD platforms for infrastructure automation. It integrates tightly with your Git workflow, supports OIDC for cloud authentication, and has a growing ecosystem of reusable actions. This guide shows you how to build a production-ready OpenTofu pipeline with GitHub Actions.

## Basic Workflow Setup

Start with a simple workflow that runs plan on pull requests and apply on merge to main:

```yaml
# .github/workflows/opentofu.yml
name: OpenTofu

on:
  pull_request:
    branches: [main]
    paths:
      - '**.tf'
      - '**.tfvars'
      - '.github/workflows/opentofu.yml'
  push:
    branches: [main]
    paths:
      - '**.tf'
      - '**.tfvars'

permissions:
  contents: read
  pull-requests: write
  id-token: write

env:
  TOFU_VERSION: "1.8.0"
  WORKING_DIR: "infrastructure"

jobs:
  plan:
    name: Plan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: ${{ env.TOFU_VERSION }}

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Init
        working-directory: ${{ env.WORKING_DIR }}
        run: tofu init

      - name: Plan
        id: plan
        working-directory: ${{ env.WORKING_DIR }}
        run: |
          tofu plan -no-color -out=plan.bin 2>&1 | tee plan-output.txt
          tofu show -no-color plan.bin > plan-readable.txt

      - name: Comment Plan on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('${{ env.WORKING_DIR }}/plan-readable.txt', 'utf8');
            const truncated = plan.length > 60000
              ? plan.substring(0, 60000) + '\n\n... (truncated)'
              : plan;

            const body = `## OpenTofu Plan

            \`\`\`
            ${truncated}
            \`\`\`

            *Pushed by: @${{ github.actor }}*`;

            // Find existing comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const botComment = comments.find(c =>
              c.body.includes('## OpenTofu Plan')
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body,
              });
            }

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: plan
          path: ${{ env.WORKING_DIR }}/plan.bin

  apply:
    name: Apply
    needs: plan
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: ${{ env.TOFU_VERSION }}

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: plan
          path: ${{ env.WORKING_DIR }}

      - name: Init
        working-directory: ${{ env.WORKING_DIR }}
        run: tofu init

      - name: Apply
        working-directory: ${{ env.WORKING_DIR }}
        run: tofu apply -auto-approve plan.bin
```

## Setting Up OIDC Authentication

OIDC eliminates the need for long-lived AWS credentials. Here is how to set it up.

### Create the IAM Role

```hcl
# github-oidc.tf
# Run this manually or in a separate pipeline to bootstrap

data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_actions" {
  name = "github-actions-opentofu"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
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
            "token.actions.githubusercontent.com:sub" = "repo:myorg/myrepo:*"
          }
        }
      }
    ]
  })
}

# Attach the permissions your OpenTofu code needs
resource "aws_iam_role_policy_attachment" "admin" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "role_arn" {
  value = aws_iam_role.github_actions.arn
}
```

### Configure the GitHub Secret

```bash
# Store the role ARN as a GitHub secret
gh secret set AWS_ROLE_ARN --body "arn:aws:iam::123456789012:role/github-actions-opentofu"
```

## Multi-Environment Workflow

For staging and production deployments:

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  plan:
    name: Plan (${{ matrix.environment }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: ${{ github.event_name == 'workflow_dispatch' && fromJson(format('["{0}"]', github.event.inputs.environment)) || fromJson('["staging"]') }}

    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.8.0"

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets[format('AWS_ROLE_ARN_{0}', matrix.environment)] }}
          aws-region: us-east-1

      - name: Init
        run: tofu init -backend-config="environments/${{ matrix.environment }}/backend.hcl"

      - name: Plan
        run: |
          tofu plan \
            -var-file="environments/${{ matrix.environment }}/terraform.tfvars" \
            -out=plan.bin

      - uses: actions/upload-artifact@v4
        with:
          name: plan-${{ matrix.environment }}
          path: plan.bin

  apply-staging:
    name: Apply to Staging
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.8.0"
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_staging }}
          aws-region: us-east-1
      - uses: actions/download-artifact@v4
        with:
          name: plan-staging
      - run: tofu init -backend-config="environments/staging/backend.hcl"
      - run: tofu apply -auto-approve plan.bin

  apply-production:
    name: Apply to Production
    needs: apply-staging
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.8.0"
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_production }}
          aws-region: us-east-1
      - run: tofu init -backend-config="environments/production/backend.hcl"
      - name: Plan Production
        run: |
          tofu plan \
            -var-file="environments/production/terraform.tfvars" \
            -out=plan.bin
      - run: tofu apply -auto-approve plan.bin
```

## Caching for Faster Builds

Cache OpenTofu plugins between workflow runs:

```yaml
- name: Cache OpenTofu Plugins
  uses: actions/cache@v4
  with:
    path: |
      ~/.terraform.d/plugin-cache
      ${{ env.WORKING_DIR }}/.terraform
    key: tofu-${{ runner.os }}-${{ hashFiles('**/.terraform.lock.hcl') }}
    restore-keys: |
      tofu-${{ runner.os }}-

- name: Init
  working-directory: ${{ env.WORKING_DIR }}
  run: tofu init
  env:
    TF_PLUGIN_CACHE_DIR: ~/.terraform.d/plugin-cache
```

## Drift Detection Schedule

Set up a scheduled workflow to detect infrastructure drift:

```yaml
# .github/workflows/drift-detection.yml
name: Drift Detection

on:
  schedule:
    - cron: '0 8 * * 1-5'  # Weekdays at 8 AM UTC

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Init
        run: tofu init

      - name: Check for Drift
        id: drift
        run: |
          tofu plan -detailed-exitcode -no-color > drift.txt 2>&1 || true
          EXIT_CODE=${PIPESTATUS[0]}
          echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT

      - name: Create Issue on Drift
        if: steps.drift.outputs.exit_code == '2'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const drift = fs.readFileSync('drift.txt', 'utf8');
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Infrastructure Drift Detected',
              body: `## Drift Report\n\n\`\`\`\n${drift}\n\`\`\``,
              labels: ['infrastructure', 'drift'],
            });
```

## Setting Up GitHub Environments

Configure environments for approval workflows:

```bash
# Use GitHub CLI to set up environments
# Production environment with required reviewers
gh api repos/myorg/myrepo/environments/production \
  --method PUT \
  --field 'reviewers=[{"type":"User","id":12345}]' \
  --field 'deployment_branch_policy={"protected_branches":true,"custom_branch_policies":false}'
```

GitHub Actions is a natural fit for OpenTofu pipelines. The combination of OIDC authentication, environment approvals, and artifact passing between jobs gives you a secure, auditable deployment pipeline with minimal setup.

For GitLab users, see [How to Use OpenTofu with GitLab CI](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-with-gitlab-ci/view).

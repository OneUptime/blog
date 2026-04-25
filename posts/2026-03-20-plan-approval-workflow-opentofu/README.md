# How to Build a Custom Plan Approval Workflow for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CI/CD, Plan Approval, GitHub Action, DevOps, Infrastructure as Code

Description: Learn how to build a plan approval workflow for OpenTofu that requires human review before applying infrastructure changes in production.

## Introduction

Applying infrastructure changes without review is risky. A plan approval workflow publishes the `tofu plan` output, waits for human approval, then applies only after explicit sign-off. This guide implements an approval workflow using GitHub Actions environments and pull request comments.

## GitHub Actions Workflow with Environments

```yaml
# .github/workflows/opentofu-approval.yml

name: OpenTofu Plan and Apply

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  plan:
    name: Plan – ${{ matrix.environment }}
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, prod]

    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.9.0"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: OpenTofu Init
        run: tofu init
        working-directory: environments/${{ matrix.environment }}

      - name: OpenTofu Plan
        id: plan
        shell: bash
        run: |
          tofu plan -no-color -out=tfplan 2>&1 | tee plan_output.txt
          echo "summary=$(grep '^Plan:' plan_output.txt || echo 'No changes.')" >> "$GITHUB_OUTPUT"
        working-directory: environments/${{ matrix.environment }}

      - name: Post Plan to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const planOutput = fs.readFileSync('environments/${{ matrix.environment }}/plan_output.txt', 'utf8');
            const body = `## OpenTofu Plan – \`${{ matrix.environment }}\`\n\n```\n${planOutput.slice(0, 65000)}\n```\n\n**Summary:** ${{ steps.plan.outputs.summary }}`;
            await github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body
            });

      - name: Upload plan artifact
        uses: actions/upload-artifact@v4
        with:
          name: tfplan-${{ matrix.environment }}
          path: environments/${{ matrix.environment }}/tfplan
          retention-days: 1

  apply-staging:
    name: Apply – staging
    needs: plan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    # Staging environment – no manual approval required
    environment:
      name: staging

    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.9.0"
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - uses: actions/download-artifact@v4
        with:
          name: tfplan-staging
          path: environments/staging
      - name: Apply
        run: |
          tofu init
          tofu apply tfplan
        working-directory: environments/staging

  apply-prod:
    name: Apply – prod
    needs: apply-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    # Production environment – requires manual approval in GitHub
    # Configure the 'production' environment in repository settings with required reviewers
    environment:
      name: production

    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.9.0"
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_PROD_ROLE_ARN }}
          aws-region: us-east-1
      - uses: actions/download-artifact@v4
        with:
          name: tfplan-prod
          path: environments/prod
      - name: Apply
        run: |
          tofu init
          tofu apply tfplan
        working-directory: environments/prod
```

## Configuring GitHub Environments

In your repository settings:
1. Go to **Settings > Environments**
2. Create a `production` environment
3. Add **Required reviewers** (your senior engineers or team leads)
4. Optionally add **Deployment branches** to restrict to `main` only

On GitHub Free, GitHub Pro, and GitHub Team, required reviewers are only available for public repositories.

When the `apply-prod` job runs, GitHub will pause and notify the required reviewers, who can inspect the pull request comment or download the saved plan artifact and review it with `tofu show` before approving or rejecting the deployment. Because saved plan files can contain sensitive data in cleartext, keep artifact retention short and limit who can access workflow artifacts.

## Sending Plan Summary to Slack for Review

```bash
#!/bin/bash
# scripts/post-plan-for-review.sh

PLAN_FILE="$1"
ENVIRONMENT="$2"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

PLAN_SUMMARY=$(tofu show -no-color -plan="$PLAN_FILE" | grep -E "^Plan:|^No changes" | head -1)

curl -s -X POST "$SLACK_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"*OpenTofu Plan Ready for Review* :mag:\",
    \"attachments\": [{
      \"color\": \"warning\",
      \"fields\": [
        {\"title\": \"Environment\", \"value\": \"${ENVIRONMENT}\", \"short\": true},
        {\"title\": \"Plan Summary\", \"value\": \"${PLAN_SUMMARY}\", \"short\": true}
      ],
      \"footer\": \"Review and approve in GitHub Actions\"
    }]
  }"
```

## Summary

A plan approval workflow gives your team visibility into proposed infrastructure changes and prevents accidental applies to production. GitHub Actions environments with required reviewers provide a simple, built-in approval mechanism that pauses deployment until authorized team members sign off.

# How to Implement GitOps Workflows with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitOps, CI/CD, Infrastructure as Code, GitHub Action, Pull Requests, Automation

Description: Learn how to implement a complete GitOps workflow for OpenTofu where all infrastructure changes go through pull requests with automated plan, apply, and drift detection.

---

GitOps means the Git repository is the single source of truth for infrastructure state. All changes happen through pull requests - never through direct console or CLI access. OpenTofu, combined with CI/CD automation, makes this workflow practical and auditable.

## GitOps Principles Applied to Infrastructure

```mermaid
graph LR
    A[Developer] -->|Opens PR| B[Git Repository]
    B -->|Triggers| C[CI: tofu plan]
    C -->|Posts plan| B
    D[Reviewer] -->|Approves PR| B
    B -->|Merge triggers| E[CD: tofu apply]
    E --> F[Cloud Infrastructure]
    G[Drift Detection] -->|Scheduled plan| F
    G -->|Reports drift| B
```

## GitHub Actions: Pull Request Plan

```yaml
# .github/workflows/plan.yml

name: Infrastructure Plan
on:
  pull_request:
    paths:
      - 'infrastructure/**'
      - '**.tf'
      - '**.tfvars'

permissions:
  contents: read
  pull-requests: write
  id-token: write

jobs:
  plan:
    name: Plan Infrastructure Changes
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_PLAN_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "~1.11.0"
          tofu_wrapper: false

      - name: Initialize OpenTofu
        run: tofu init
        working-directory: infrastructure

      - name: Run Plan
        id: plan
        run: |
          tofu plan -no-color -out=tfplan 2>&1 | tee plan_output.txt
          exit_code=${PIPESTATUS[0]}
          echo "exit_code=$exit_code" >> "$GITHUB_OUTPUT"
          if [ "$exit_code" -ne 0 ]; then
            exit "$exit_code"
          fi
        working-directory: infrastructure

      - name: Post Plan to PR
        if: always() && steps.plan.outcome != 'skipped'
        uses: actions/github-script@v9
        with:
          script: |
            const fs = require('fs');
            const planOutput = fs.readFileSync('infrastructure/plan_output.txt', 'utf8');
            const maxLength = 65000;
            const truncated = planOutput.length > maxLength
              ? planOutput.substring(0, maxLength) + '\n\n... (truncated)'
              : planOutput;

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: [
                '## OpenTofu Plan',
                '```',
                truncated,
                '```'
              ].join('\n')
            });
```

## GitHub Actions: Apply on Merge

```yaml
# .github/workflows/apply.yml
name: Infrastructure Apply
on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'
      - '**.tf'

permissions:
  contents: read
  id-token: write

jobs:
  apply:
    name: Apply Infrastructure Changes
    runs-on: ubuntu-latest
    environment: production  # Requires environment approval

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_APPLY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "~1.11.0"
          tofu_wrapper: false

      - name: Initialize OpenTofu
        run: tofu init
        working-directory: infrastructure

      - name: Apply
        run: tofu apply -auto-approve
        working-directory: infrastructure
```

## Scheduled Drift Detection

```yaml
# .github/workflows/drift-detection.yml
name: Drift Detection
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

permissions:
  contents: read
  issues: write
  id-token: write

jobs:
  detect-drift:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_PLAN_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "~1.11.0"
          tofu_wrapper: false

      - name: Initialize
        run: tofu init
        working-directory: infrastructure

      - name: Detect Drift
        id: drift
        run: |
          tofu plan -detailed-exitcode -no-color 2>&1 | tee drift_output.txt
          exit_code=${PIPESTATUS[0]}
          echo "exit_code=$exit_code" >> "$GITHUB_OUTPUT"
          if [ "$exit_code" -eq 1 ]; then
            exit 1
          fi
        working-directory: infrastructure

      - name: Alert on Drift
        if: steps.drift.outputs.exit_code == '2'
        uses: actions/github-script@v9
        with:
          script: |
            // Create a GitHub issue for detected drift
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ Infrastructure Drift Detected',
              body: 'Infrastructure state has drifted from the OpenTofu configuration. Run `tofu plan` to see changes.',
              labels: ['infrastructure', 'drift']
            });
```

## Best Practices

- Separate plan and apply roles with different IAM permissions - the plan role usually needs read access to managed resources plus access to the remote state backend and lock table.
- Require at least one approval on infrastructure PRs before merge triggers apply.
- Use GitHub Environments with protection rules for the apply workflow to add a human approval gate.
- Run drift detection on a schedule (not just on push) to catch out-of-band changes made via console or CLI.
- Store `tofu plan` output as an artifact or GitHub check so reviewers can inspect the proposed changes before merge.

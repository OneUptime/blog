# How to Use OpenTofu with Digger for PR Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Digger, PR Automation, GitHub Action, GitOps

Description: Learn how to configure Digger to automate OpenTofu plan and apply operations in GitHub Actions pull requests, enabling GitOps workflows without a dedicated Terraform server.

## Introduction

Digger runs OpenTofu operations inside GitHub Actions, using your existing CI/CD infrastructure instead of a dedicated Terraform backend server. This makes it lightweight to adopt and easy to customize with standard GitHub Actions steps.

## Repository Setup

```yaml
# .github/workflows/digger.yml

name: Digger OpenTofu

on:
  pull_request:
    branches: [main]
  issue_comment:
    types: [created]
  push:
    branches: [main]

jobs:
  digger:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      id-token: write  # For OIDC AWS authentication

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-tofu
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: 1.7.0

      - name: Run Digger
        uses: diggerhq/digger@v0.6.144
        with:
          setup-aws: false  # Already configured above
          aws-role-to-assume: arn:aws:iam::123456789:role/github-actions-tofu
          aws-region: us-east-1
        env:
          GITHUB_CONTEXT: ${{ toJson(github) }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Digger Configuration File

```yaml
# digger.yml
projects:
  - name: prod-networking
    dir: environments/prod/networking
    opentofu: true

    # Trigger plan when files in these paths change
    include_patterns:
      - "modules/**"

    # Approval required before apply
    apply_requirements: [mergeable, approved]

  - name: prod-app
    dir: environments/prod/app
    opentofu: true
    apply_requirements: [mergeable, approved]

  - name: dev-all
    dir: environments/dev
    opentofu: true
    # Default apply_requirements is [mergeable] - no approval required
```

## Adding Pre-Plan Checks

Custom commands are added through workflow `steps`. Reference a named workflow from the project, then define the workflow under the top-level `workflows` key:

```yaml
# digger.yml with custom workflow steps
projects:
  - name: prod-app
    dir: environments/prod/app
    workflow: with-checks

workflows:
  with-checks:
    plan:
      steps:
        - init
        - run: |
            echo "Running security scan..."
            checkov -d . --framework terraform --quiet
        - plan
    apply:
      steps:
        - init
        - apply
        - run: |
            echo "Running smoke tests..."
            ./scripts/smoke-test.sh
```

## PR Comment Triggers

With Digger configured, use PR comments to trigger operations:

```bash
# In a PR comment:
digger plan          # Run plan for all projects in PR
digger plan -p prod-networking  # Plan specific project
digger apply -p prod-networking  # Apply specific project (requires approval)
digger unlock        # Remove plan lock
```

## Using Digger Cloud for State Locking

Digger Cloud is configured through inputs on the GitHub Action, not in `digger.yml`:

```yaml
      - name: Run Digger
        uses: diggerhq/digger@v0.6.144
        with:
          setup-aws: false
          aws-role-to-assume: arn:aws:iam::123456789:role/github-actions-tofu
          aws-region: us-east-1
          digger-hostname: https://cloud.digger.dev
          digger-organisation: my-org
          digger-token: ${{ secrets.DIGGER_TOKEN }}
        env:
          GITHUB_CONTEXT: ${{ toJson(github) }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Conclusion

Digger provides Atlantis-like PR automation without requiring a dedicated server - it runs entirely within GitHub Actions. The `digger.yml` configuration defines projects and their dependencies, and the GitHub Actions workflow handles execution. This makes Digger particularly easy to adopt for teams already using GitHub Actions.

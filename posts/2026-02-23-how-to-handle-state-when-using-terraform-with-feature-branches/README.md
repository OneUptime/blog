# How to Handle State When Using Terraform with Feature Branches

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Git, Feature Branches, CI/CD, DevOps, Infrastructure as Code

Description: Learn how to manage Terraform state across feature branches without conflicts, including workspace strategies, ephemeral environments, and branch-based state isolation patterns.

---

Feature branches are standard practice for application development, but they create unique challenges for Terraform. Unlike application code, Terraform state is a shared, mutable artifact. Two feature branches modifying the same infrastructure can create conflicting states that are painful to reconcile.

This guide covers practical patterns for handling Terraform state in feature branch workflows, from simple workspace-based isolation to fully automated ephemeral environments.

## The Feature Branch Problem

Here is what goes wrong with a naive approach:

1. Engineer A creates branch `feature-a` and adds an S3 bucket.
2. Engineer B creates branch `feature-b` and adds a Lambda function.
3. Both run `terraform apply` against the same state file.
4. Engineer A's apply succeeds and writes state.
5. Engineer B's apply reads stale state, applies, and overwrites A's changes.
6. The S3 bucket is now orphaned - it exists in AWS but not in state.

Even with state locking, the problem persists at a higher level. Both engineers can apply successfully at different times, but when their branches merge, the Terraform configuration and state may be inconsistent.

## Pattern 1: Feature Branch Workspaces

Create a separate workspace for each feature branch. This gives each branch its own isolated state:

```bash
#!/bin/bash
# create-branch-workspace.sh - Create a workspace for the current branch

BRANCH=$(git branch --show-current)
WORKSPACE=$(echo "$BRANCH" | tr '/' '-' | tr '[:upper:]' '[:lower:]')

# Create the workspace if it does not exist
terraform workspace new "$WORKSPACE" 2>/dev/null || terraform workspace select "$WORKSPACE"

echo "Using workspace: $WORKSPACE"
```

In your Terraform configuration, use the workspace name to namespace resources:

```hcl
# main.tf - Namespace resources by workspace
locals {
  # Use "default" for main branch, workspace name for feature branches
  env_prefix = terraform.workspace == "default" ? "main" : terraform.workspace
}

resource "aws_s3_bucket" "data" {
  bucket = "myapp-${local.env_prefix}-data"
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name   = "app-${local.env_prefix}"
    Branch = terraform.workspace
  }
}
```

CI/CD pipeline integration:

```yaml
# .github/workflows/terraform-feature.yml
name: Terraform Feature Branch

on:
  pull_request:
    paths:
      - 'infrastructure/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Setup Workspace
        run: |
          WORKSPACE=$(echo "${{ github.head_ref }}" | tr '/' '-' | tr '[:upper:]' '[:lower:]')
          terraform init
          terraform workspace new "$WORKSPACE" 2>/dev/null || terraform workspace select "$WORKSPACE"

      - name: Terraform Plan
        run: terraform plan -no-color
```

## Pattern 2: Ephemeral Environments

For full isolation, spin up a complete environment per branch with its own state file:

```hcl
# backend.tf - Dynamic backend key based on branch
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "feature-envs/PLACEHOLDER/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

```bash
# Initialize with branch-specific state key
BRANCH=$(git branch --show-current | tr '/' '-')
terraform init -reconfigure \
  -backend-config="key=feature-envs/${BRANCH}/terraform.tfstate"
```

Automate creation and teardown:

```yaml
# .github/workflows/ephemeral-env.yml
name: Ephemeral Environment

on:
  pull_request:
    types: [opened, synchronize]
  pull_request_target:
    types: [closed]

jobs:
  deploy:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Deploy Ephemeral Environment
        env:
          BRANCH: ${{ github.head_ref }}
        run: |
          BRANCH_SLUG=$(echo "$BRANCH" | tr '/' '-' | tr '[:upper:]' '[:lower:]')
          terraform init -reconfigure \
            -backend-config="key=feature-envs/${BRANCH_SLUG}/terraform.tfstate"
          terraform apply -auto-approve \
            -var="environment=${BRANCH_SLUG}"

      - name: Comment PR with Environment URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: 'Ephemeral environment deployed. Access at: https://${{ env.BRANCH_SLUG }}.dev.example.com'
            })

  destroy:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Destroy Ephemeral Environment
        env:
          BRANCH: ${{ github.head_ref }}
        run: |
          BRANCH_SLUG=$(echo "$BRANCH" | tr '/' '-' | tr '[:upper:]' '[:lower:]')
          terraform init -reconfigure \
            -backend-config="key=feature-envs/${BRANCH_SLUG}/terraform.tfstate"
          terraform destroy -auto-approve \
            -var="environment=${BRANCH_SLUG}"

          # Clean up the state file
          aws s3 rm "s3://myorg-terraform-state/feature-envs/${BRANCH_SLUG}/terraform.tfstate"
```

## Pattern 3: Plan-Only on Feature Branches

The simplest approach is to only run `terraform plan` on feature branches and reserve `terraform apply` for the main branch:

```yaml
# .github/workflows/terraform.yml
name: Terraform

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
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -no-color
        # Plan runs against the shared state but does not modify it

  apply:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    concurrency:
      group: terraform-apply
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Apply
        run: terraform apply -auto-approve -lock-timeout=300s
```

This pattern works well when:
- Feature branches only change configuration, not state.
- You want the plan output in pull request reviews.
- Only one branch (main) ever modifies state.

## Handling Merge Conflicts in State

When two branches modify the same infrastructure and merge sequentially, the second merge may produce unexpected plan output:

```bash
# After merging feature-a which added an S3 bucket:
# State now includes the S3 bucket

# Merging feature-b which added a Lambda function:
# If feature-b was planned against the pre-feature-a state,
# the plan might show the S3 bucket for destruction

# Solution: Always re-plan after merging
git checkout main
git pull
terraform plan  # Re-plan with the latest state and configuration
```

Automate this check:

```yaml
# .github/workflows/post-merge-check.yml
name: Post-Merge Terraform Check

on:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        id: plan
        run: |
          terraform init
          terraform plan -detailed-exitcode -no-color
        continue-on-error: true

      - name: Alert on Unexpected Changes
        if: steps.plan.outcome == 'failure'
        run: |
          echo "WARNING: Unexpected changes detected after merge"
          echo "Review the plan output and apply manually if needed"
```

## Cleaning Up Stale Branch State

Feature branches get abandoned. The state files they created do not clean themselves up:

```bash
#!/bin/bash
# cleanup-branch-states.sh - Remove state files for merged/deleted branches

set -euo pipefail

STATE_BUCKET="myorg-terraform-state"
STATE_PREFIX="feature-envs/"

# List all feature branch state files
echo "Looking for feature branch state files..."
BRANCH_STATES=$(aws s3 ls "s3://${STATE_BUCKET}/${STATE_PREFIX}" --recursive | \
  awk '{print $4}' | \
  grep terraform.tfstate | \
  sed "s|${STATE_PREFIX}||" | \
  sed 's|/terraform.tfstate||')

# Check which branches still exist
for branch_slug in $BRANCH_STATES; do
  # Try to find the branch in the remote
  if ! git branch -r | grep -q "$branch_slug"; then
    echo "Stale state found for deleted branch: $branch_slug"

    # Destroy resources first if they exist
    terraform init -reconfigure \
      -backend-config="key=${STATE_PREFIX}${branch_slug}/terraform.tfstate"

    RESOURCE_COUNT=$(terraform state list 2>/dev/null | wc -l)
    if [ "$RESOURCE_COUNT" -gt 0 ]; then
      echo "  Destroying $RESOURCE_COUNT resources..."
      terraform destroy -auto-approve -var="environment=${branch_slug}"
    fi

    # Remove the state file
    aws s3 rm "s3://${STATE_BUCKET}/${STATE_PREFIX}${branch_slug}/terraform.tfstate"
    echo "  Cleaned up state for $branch_slug"
  fi
done
```

Schedule this to run weekly to catch abandoned branches:

```yaml
# .github/workflows/cleanup.yml
name: Cleanup Stale Branch States
on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - run: ./scripts/cleanup-branch-states.sh
```

## Choosing the Right Pattern

| Pattern | Isolation | Complexity | Cost | Best For |
|---------|-----------|------------|------|----------|
| Plan-only branches | None | Low | None | Small teams, simple infra |
| Workspaces | Partial | Medium | Resources per branch | Medium teams |
| Ephemeral environments | Full | High | Full env per branch | Large teams, microservices |

## Best Practices

1. **Never apply from feature branches to shared state.** Use plan-only or isolated workspaces.
2. **Automate cleanup** of branch-specific state and resources when branches are deleted.
3. **Re-plan after merging** to catch conflicts between branches that modified the same infrastructure.
4. **Use concurrency controls** on the main branch to prevent parallel applies.
5. **Namespace all resources** in branch workspaces to avoid naming conflicts.
6. **Set TTLs on ephemeral environments** so forgotten branches do not run up costs.
7. **Review plan output in pull requests** so reviewers understand the infrastructure impact.

Feature branch workflows and Terraform state require thoughtful design. Pick the pattern that matches your team's size and complexity, and automate the lifecycle so nothing gets left behind.

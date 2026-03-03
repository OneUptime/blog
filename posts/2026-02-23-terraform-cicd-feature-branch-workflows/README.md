# How to Implement Terraform CI/CD with Feature Branch Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Git, DevOps, Feature Branches, Infrastructure as Code

Description: Learn how to set up Terraform CI/CD pipelines that work with feature branch workflows including isolated planning, workspace management, and safe merge strategies.

---

Feature branch workflows let developers work on infrastructure changes in isolation before merging to main. But unlike application code, Terraform talks to real infrastructure and shared state. Running `terraform apply` from a feature branch can cause conflicts, state corruption, or unintended changes in production.

This post covers how to make feature branches work safely with Terraform CI/CD.

## The Feature Branch Challenge

With application code, feature branches are straightforward - each branch is isolated until merge. With Terraform, things get complicated:

- There is only one state file for each environment
- Two branches modifying the same resources create conflicts
- Applying from a feature branch can modify production state
- State locks prevent parallel operations

The solution is to plan on feature branches but only apply on main.

## Basic Feature Branch Pipeline

```yaml
# .github/workflows/terraform.yml
name: Terraform Feature Branch Workflow
on:
  pull_request:
    branches: [main]
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  # Plan runs on feature branches (PRs)
  plan:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: infrastructure
        run: terraform init

      - name: Terraform Plan
        working-directory: infrastructure
        run: |
          echo "## Feature Branch Plan" >> "$GITHUB_STEP_SUMMARY"
          echo "Branch: ${{ github.head_ref }}" >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"

          terraform plan -no-color -out=tfplan 2>&1 | tee plan.txt

          echo '```' >> "$GITHUB_STEP_SUMMARY"
          tail -20 plan.txt >> "$GITHUB_STEP_SUMMARY"
          echo '```' >> "$GITHUB_STEP_SUMMARY"

  # Apply only runs on main after merge
  apply:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    concurrency:
      group: terraform-apply
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: infrastructure
        run: terraform init

      - name: Terraform Apply
        working-directory: infrastructure
        run: terraform apply -auto-approve -no-color
```

## Feature Branch Workspaces for Isolated Testing

Sometimes you want to actually apply feature branch changes to test them without affecting the main environment. Use Terraform workspaces to create isolated environments:

```yaml
# .github/workflows/feature-workspace.yml
name: Feature Branch Environment
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
    paths: ['infrastructure/**']

jobs:
  # Create or update feature branch environment
  deploy-feature:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup Feature Workspace
        working-directory: infrastructure
        run: |
          terraform init

          # Create a workspace named after the branch
          WORKSPACE="feature-$(echo '${{ github.head_ref }}' | tr '/' '-' | tr '[:upper:]' '[:lower:]' | cut -c1-30)"
          terraform workspace select "$WORKSPACE" || terraform workspace new "$WORKSPACE"

          echo "Using workspace: $WORKSPACE"

      - name: Apply Feature Environment
        working-directory: infrastructure
        run: |
          # Apply with feature-specific variables
          terraform apply -auto-approve \
            -var="environment=feature" \
            -var="instance_count=1" \
            -no-color

  # Destroy feature environment when PR is closed
  cleanup-feature:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Destroy Feature Environment
        working-directory: infrastructure
        run: |
          terraform init

          WORKSPACE="feature-$(echo '${{ github.head_ref }}' | tr '/' '-' | tr '[:upper:]' '[:lower:]' | cut -c1-30)"

          terraform workspace select "$WORKSPACE"
          terraform destroy -auto-approve -no-color

          # Clean up the workspace
          terraform workspace select default
          terraform workspace delete "$WORKSPACE"
```

Make your Terraform config aware of the workspace:

```hcl
# main.tf
locals {
  # Use workspace to determine environment settings
  is_feature = terraform.workspace != "default"
  env_name   = local.is_feature ? terraform.workspace : var.environment

  # Scale down for feature environments
  instance_type  = local.is_feature ? "t3.micro" : "t3.large"
  instance_count = local.is_feature ? 1 : var.instance_count
}

resource "aws_instance" "app" {
  count         = local.instance_count
  instance_type = local.instance_type
  ami           = var.ami_id

  tags = {
    Name        = "${local.env_name}-app-${count.index}"
    Environment = local.env_name
    Temporary   = local.is_feature ? "true" : "false"
  }
}
```

## Handling Merge Conflicts in Terraform

When two feature branches modify the same Terraform resources, the second one to merge will see different plan output than what was reviewed. Handle this by re-planning after merge:

```yaml
apply:
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  environment: production
  steps:
    - uses: actions/checkout@v4
    - uses: hashicorp/setup-terraform@v3

    - name: Terraform Init
      working-directory: infrastructure
      run: terraform init

    # Always re-plan on main to catch conflicts
    - name: Re-plan on Main
      working-directory: infrastructure
      run: |
        terraform plan -out=tfplan -detailed-exitcode -no-color 2>&1 | tee plan.txt
        EXIT_CODE=${PIPESTATUS[0]}

        if [ $EXIT_CODE -eq 0 ]; then
          echo "No changes to apply"
          exit 0
        elif [ $EXIT_CODE -eq 2 ]; then
          echo "Changes detected, applying..."
        else
          echo "Plan failed"
          exit 1
        fi

    - name: Terraform Apply
      working-directory: infrastructure
      run: terraform apply -auto-approve tfplan
```

## Branch Naming Conventions

Establish naming conventions that your pipeline can parse:

```text
# Feature branches
feature/add-rds-instance
feature/update-vpc-cidr
feature/enable-cloudfront

# Infrastructure-specific prefixes
infra/networking-update
infra/database-scaling
```

Use these in your pipeline to add context:

```yaml
- name: Categorize Change
  run: |
    BRANCH="${{ github.head_ref }}"

    if [[ "$BRANCH" == infra/networking* ]]; then
      echo "category=networking" >> "$GITHUB_OUTPUT"
    elif [[ "$BRANCH" == infra/database* ]]; then
      echo "category=database" >> "$GITHUB_OUTPUT"
    else
      echo "category=general" >> "$GITHUB_OUTPUT"
    fi
```

## Stale Branch Protection

Feature branches that sit too long accumulate drift. Add a staleness check:

```yaml
- name: Check Branch Freshness
  run: |
    # How many commits behind main?
    BEHIND=$(git rev-list --count HEAD..origin/main)

    if [ "$BEHIND" -gt 20 ]; then
      echo "WARNING: Branch is $BEHIND commits behind main."
      echo "Please rebase before merging to ensure plan accuracy."
      echo "::warning::Branch is $BEHIND commits behind main"
    fi
```

## Serializing Applies After Multiple Merges

When several PRs merge close together, queue the applies:

```yaml
apply:
  concurrency:
    group: terraform-apply-${{ github.workflow }}
    cancel-in-progress: false  # Queue instead of cancelling
  steps:
    - name: Terraform Apply
      run: |
        # Retry with backoff if state is locked
        for i in 1 2 3 4 5; do
          terraform apply -auto-approve && break
          echo "Attempt $i failed, waiting..."
          sleep $((i * 30))
        done
```

## Summary

Feature branch workflows with Terraform work well when you follow these rules:

1. Plan on feature branches, apply only on main
2. Use workspaces for isolated feature environments that need actual infrastructure
3. Always re-plan on main before applying to catch conflicts
4. Clean up feature workspaces when PRs close
5. Use concurrency controls to serialize applies
6. Check branch freshness to avoid stale plans

The key insight is that feature branches give you safe experimentation space for plans, but applies should always happen from a single source of truth. For the complete PR workflow, check out [Terraform CI/CD with pull request workflows](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pull-request-workflows/view).

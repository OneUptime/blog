# How to Run Terraform Without Interactive Prompts Using -auto-approve

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, Infrastructure as Code, Automation, CI/CD

Description: Learn how to use the Terraform -auto-approve flag to skip interactive confirmation prompts, along with best practices for safe automation in CI/CD pipelines.

---

Every time you run `terraform apply` or `terraform destroy`, Terraform pauses and asks you to type "yes" to confirm. That is great when you are working interactively, but it completely breaks automated pipelines. You cannot have a CI/CD job sitting there waiting for someone to type "yes" into a terminal that nobody is watching.

The `-auto-approve` flag tells Terraform to skip that confirmation prompt and proceed immediately. This post covers how to use it, when to use it, and - just as importantly - when not to.

## Basic Usage

The `-auto-approve` flag works with both `apply` and `destroy`:

```bash
# Apply changes without confirmation
terraform apply -auto-approve

# Destroy infrastructure without confirmation
terraform destroy -auto-approve
```

That is it. No prompt, no waiting. Terraform executes immediately.

You can combine `-auto-approve` with other flags:

```bash
# Apply with specific variable values
terraform apply -auto-approve -var="instance_type=t3.large"

# Apply with a variable file
terraform apply -auto-approve -var-file="production.tfvars"

# Apply targeting specific resources
terraform apply -auto-approve -target=aws_instance.web
```

## Using -auto-approve with Saved Plans

Here is where things get interesting. If you pass a saved plan file to `terraform apply`, it already skips the interactive prompt because the plan was reviewed when it was generated:

```bash
# This already skips the prompt - no -auto-approve needed
terraform plan -out=tfplan
terraform apply tfplan
```

The saved plan approach is actually safer than `-auto-approve` because:

1. The plan is generated at a known point in time
2. You (or your pipeline) can review the plan before applying
3. Terraform will refuse to apply the plan if the state has changed since it was generated

So if you are choosing between `terraform apply -auto-approve` and `terraform apply tfplan`, the saved plan approach is almost always better.

## CI/CD Pipeline Examples

### GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform Apply

on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      # Review step - check for destructive changes
      - name: Check Plan
        run: |
          # Count resources being destroyed
          DESTROYS=$(terraform show -json tfplan | jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length')
          if [ "$DESTROYS" -gt 0 ]; then
            echo "::error::Plan includes $DESTROYS resource deletions. Manual approval required."
            exit 1
          fi

      # Apply using saved plan (no -auto-approve needed)
      - name: Terraform Apply
        run: terraform apply tfplan
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - plan
  - apply

terraform_plan:
  stage: plan
  script:
    - terraform init
    - terraform plan -out=tfplan
  artifacts:
    paths:
      - tfplan
      - .terraform.lock.hcl

terraform_apply:
  stage: apply
  script:
    # Using saved plan - inherently safe
    - terraform init
    - terraform apply tfplan
  dependencies:
    - terraform_plan
  # Only apply on main branch
  only:
    - main
  # Require manual trigger for production
  when: manual
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Init') {
            steps {
                sh 'terraform init'
            }
        }

        stage('Plan') {
            steps {
                sh 'terraform plan -out=tfplan'
                // Archive the plan for review
                archiveArtifacts artifacts: 'tfplan'
            }
        }

        stage('Approve') {
            // Manual approval gate
            steps {
                input message: 'Review the plan and approve to proceed'
            }
        }

        stage('Apply') {
            steps {
                // Using saved plan
                sh 'terraform apply tfplan'
            }
        }
    }
}
```

## When -auto-approve Is Actually Appropriate

Despite the emphasis on saved plans, there are legitimate cases for `-auto-approve`:

### Development Environments

When you are iterating quickly on a development environment, the confirmation prompt is just friction:

```bash
# Quick iteration in dev
terraform apply -auto-approve -var-file="dev.tfvars"
```

### Ephemeral Test Environments

For environments that are created and destroyed as part of a test run:

```bash
#!/bin/bash
# integration-test.sh - Create infra, run tests, tear down

# Create the test environment
terraform apply -auto-approve -var="env=test-$(date +%s)"

# Run integration tests
./run-tests.sh

# Clean up regardless of test result
terraform destroy -auto-approve
```

### Terraform Workspaces for Dev

```bash
#!/bin/bash
# dev-cycle.sh - Quick dev environment refresh

WORKSPACE="dev-$(whoami)"

terraform workspace select "$WORKSPACE" || terraform workspace new "$WORKSPACE"

# Destroy and recreate from scratch
terraform destroy -auto-approve
terraform apply -auto-approve -var-file="dev.tfvars"

echo "Dev environment ready!"
```

## When NOT to Use -auto-approve

Let me be direct about this: never use `-auto-approve` in production pipelines without additional safeguards. Here is why and what to do instead.

### Production Applies

```bash
# BAD - no review, no safety net
terraform apply -auto-approve -var-file="production.tfvars"

# GOOD - plan first, review, then apply
terraform plan -out=tfplan -var-file="production.tfvars"
# Review the plan (manually or with automated checks)
terraform apply tfplan
```

### Destroy Operations in Shared Environments

```bash
# DANGEROUS - destroys everything with no confirmation
terraform destroy -auto-approve

# SAFER - at minimum, review what will be destroyed
terraform plan -destroy -out=destroy-plan
terraform show destroy-plan
# Only then apply the destroy plan
terraform apply destroy-plan
```

## Building Safety Into Automated Pipelines

If you must use `-auto-approve`, add safety layers around it:

```bash
#!/bin/bash
# safe-apply.sh - Apply with safety checks

set -e

# Safety check 1: Verify we are in the right workspace
CURRENT_WORKSPACE=$(terraform workspace show)
EXPECTED_WORKSPACE=${1:-"default"}

if [ "$CURRENT_WORKSPACE" != "$EXPECTED_WORKSPACE" ]; then
  echo "ERROR: Expected workspace '$EXPECTED_WORKSPACE' but got '$CURRENT_WORKSPACE'"
  exit 1
fi

# Safety check 2: Run plan first and check for issues
terraform plan -out=tfplan -detailed-exitcode
PLAN_EXIT=$?

case $PLAN_EXIT in
  0)
    echo "No changes needed."
    exit 0
    ;;
  1)
    echo "ERROR: Plan failed."
    exit 1
    ;;
  2)
    echo "Changes detected. Reviewing..."
    ;;
esac

# Safety check 3: Count destructive changes
DESTROYS=$(terraform show -json tfplan | jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length')
CREATES=$(terraform show -json tfplan | jq '[.resource_changes[] | select(.change.actions[] == "create")] | length')
UPDATES=$(terraform show -json tfplan | jq '[.resource_changes[] | select(.change.actions[] == "update")] | length')

echo "Plan summary: +$CREATES ~$UPDATES -$DESTROYS"

# Safety check 4: Block if too many destroys
MAX_DESTROYS=${MAX_ALLOWED_DESTROYS:-5}
if [ "$DESTROYS" -gt "$MAX_DESTROYS" ]; then
  echo "ERROR: Plan would destroy $DESTROYS resources (max allowed: $MAX_DESTROYS)"
  echo "If this is intentional, set MAX_ALLOWED_DESTROYS=$DESTROYS"
  exit 1
fi

# All checks passed - apply using the saved plan
terraform apply tfplan
echo "Apply completed successfully."
```

## Environment Variables for Non-Interactive Mode

Beyond `-auto-approve`, Terraform has environment variables that help in non-interactive contexts:

```bash
# Disable color output (useful for CI logs)
export TF_CLI_ARGS="-no-color"

# Set input to false to fail instead of prompting for missing variables
export TF_INPUT=false

# Combine with -auto-approve for fully non-interactive operation
terraform apply -auto-approve -input=false
```

The `TF_INPUT=false` setting is important. Without it, if Terraform needs a variable that was not provided, it will prompt for it interactively. With `TF_INPUT=false`, it fails immediately with a clear error instead of hanging.

```bash
# Fully non-interactive Terraform execution
export TF_INPUT=false

terraform init -backend-config="bucket=my-state-bucket"
terraform plan -out=tfplan
terraform apply tfplan
```

## Summary

The `-auto-approve` flag is a straightforward tool for skipping Terraform's confirmation prompt. Use it freely in development and testing. For production and shared environments, prefer the saved plan approach - `terraform plan -out=tfplan` followed by `terraform apply tfplan` - which gives you the same non-interactive behavior with the added safety of plan review.

The key takeaway is that automation does not mean removing all safety checks. It means replacing interactive checks with automated ones. Build those safety layers into your scripts and pipelines, and you will get the speed of automation without the risk of unreviewed changes hitting production.

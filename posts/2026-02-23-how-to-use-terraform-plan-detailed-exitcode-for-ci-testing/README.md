# How to Use terraform plan -detailed-exitcode for CI Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Testing, DevOps, Automation

Description: Learn how to use the -detailed-exitcode flag with terraform plan to build reliable CI pipelines that detect infrastructure drift and validate changes automatically.

---

Most CI systems decide pass or fail based on exit codes. Terraform's `plan` command normally returns 0 for success and 1 for errors, which does not tell you whether the plan includes actual changes. The `-detailed-exitcode` flag fixes this by returning three distinct exit codes, making it the foundation of any serious Terraform CI pipeline.

## What -detailed-exitcode Does

By default, `terraform plan` returns:
- **0** - success (regardless of whether changes exist)
- **1** - error

With `-detailed-exitcode`, you get three exit codes:
- **0** - success, no changes needed (infrastructure matches configuration)
- **1** - error (syntax issue, provider failure, etc.)
- **2** - success, changes are pending (infrastructure will be modified)

This distinction is critical. Exit code 2 tells your CI system that the plan succeeded but the infrastructure needs updating. You can branch your pipeline logic based on this.

## Basic Usage

```bash
# Run plan with detailed exit codes
terraform plan -detailed-exitcode

# The exit code tells you what happened
echo $?
# 0 = no changes, 1 = error, 2 = changes pending
```

Combine it with `-out` to save the plan for later application:

```bash
terraform plan -detailed-exitcode -out=tfplan
EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "No changes needed"
    ;;
  1)
    echo "Plan failed with errors"
    exit 1
    ;;
  2)
    echo "Changes detected - review required"
    ;;
esac
```

## Drift Detection in CI

One of the best uses for `-detailed-exitcode` is detecting configuration drift. Run a scheduled pipeline that checks whether your deployed infrastructure matches your Terraform state:

```bash
#!/bin/bash
# drift-check.sh
# Runs as a scheduled CI job to detect infrastructure drift

set -e

# Initialize without modifying backend
terraform init -input=false

# Refresh state to get current infrastructure
terraform refresh -input=false

# Plan with detailed exit code
terraform plan -detailed-exitcode -input=false -out=tfplan
EXIT_CODE=$?

if [ $EXIT_CODE -eq 2 ]; then
  echo "DRIFT DETECTED: Infrastructure has drifted from configuration"

  # Show what changed
  terraform show tfplan

  # Send a notification (Slack example)
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Infrastructure drift detected in production. Run terraform plan to review."}' \
    "$SLACK_WEBHOOK_URL"

  exit 1
elif [ $EXIT_CODE -eq 1 ]; then
  echo "ERROR: Plan failed"
  exit 1
else
  echo "OK: No drift detected"
fi
```

## GitHub Actions Integration

Here is a complete GitHub Actions workflow that uses `-detailed-exitcode` to control pipeline behavior:

```yaml
# .github/workflows/terraform.yml
name: Terraform CI

on:
  pull_request:
    paths:
      - 'terraform/**'
  push:
    branches:
      - main
    paths:
      - 'terraform/**'

env:
  TF_WORKING_DIR: terraform
  TF_VERSION: 1.7.0

jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      has_changes: ${{ steps.plan.outputs.has_changes }}
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
          # Disable the wrapper to get raw exit codes
          terraform_wrapper: false

      - name: Terraform Init
        working-directory: ${{ env.TF_WORKING_DIR }}
        run: terraform init -input=false

      - name: Terraform Plan
        id: plan
        working-directory: ${{ env.TF_WORKING_DIR }}
        run: |
          terraform plan -detailed-exitcode -input=false -out=tfplan 2>&1 | tee plan_output.txt
          EXIT_CODE=${PIPESTATUS[0]}

          if [ $EXIT_CODE -eq 0 ]; then
            echo "has_changes=false" >> $GITHUB_OUTPUT
            echo "No infrastructure changes detected"
          elif [ $EXIT_CODE -eq 2 ]; then
            echo "has_changes=true" >> $GITHUB_OUTPUT
            echo "Infrastructure changes detected"
          else
            echo "Plan failed"
            exit 1
          fi

      - name: Comment PR with Plan
        if: github.event_name == 'pull_request' && steps.plan.outputs.has_changes == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const output = fs.readFileSync('${{ env.TF_WORKING_DIR }}/plan_output.txt', 'utf8');

            // Truncate if too long for a comment
            const maxLength = 60000;
            const truncated = output.length > maxLength
              ? output.substring(0, maxLength) + '\n\n... (truncated)'
              : output;

            const body = `## Terraform Plan\n\nChanges detected.\n\n\`\`\`\n${truncated}\n\`\`\``;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main' && needs.plan.outputs.has_changes == 'true'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}
          terraform_wrapper: false

      - name: Terraform Init
        working-directory: ${{ env.TF_WORKING_DIR }}
        run: terraform init -input=false

      - name: Terraform Apply
        working-directory: ${{ env.TF_WORKING_DIR }}
        run: terraform apply -auto-approve -input=false
```

Notice the `terraform_wrapper: false` setting. The HashiCorp setup action includes a wrapper that can interfere with exit codes. Disabling it gives you the raw exit codes from Terraform.

## GitLab CI Integration

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - plan
  - apply

variables:
  TF_DIR: terraform

validate:
  stage: validate
  image: hashicorp/terraform:1.7.0
  script:
    - cd $TF_DIR
    - terraform init -backend=false
    - terraform validate
    - terraform fmt -check

plan:
  stage: plan
  image: hashicorp/terraform:1.7.0
  script:
    - cd $TF_DIR
    - terraform init -input=false
    - |
      # Run plan and capture exit code
      set +e
      terraform plan -detailed-exitcode -input=false -out=tfplan
      EXIT_CODE=$?
      set -e

      if [ $EXIT_CODE -eq 1 ]; then
        echo "Plan failed"
        exit 1
      elif [ $EXIT_CODE -eq 0 ]; then
        echo "NO_CHANGES" > plan_status.txt
      else
        echo "HAS_CHANGES" > plan_status.txt
      fi
  artifacts:
    paths:
      - $TF_DIR/tfplan
      - $TF_DIR/plan_status.txt
    expire_in: 1 hour

apply:
  stage: apply
  image: hashicorp/terraform:1.7.0
  script:
    - cd $TF_DIR
    - |
      if [ "$(cat plan_status.txt)" = "NO_CHANGES" ]; then
        echo "No changes to apply"
        exit 0
      fi
    - terraform init -input=false
    - terraform apply -input=false tfplan
  dependencies:
    - plan
  when: manual
  only:
    - main
```

## Handling Exit Codes in Bash Scripts

When using `set -e` (which causes the script to exit on any non-zero exit code), you need to handle exit code 2 carefully since it is non-zero but not an error:

```bash
#!/bin/bash
# Safe handling of detailed exit codes with set -e

set -e

terraform init -input=false

# Temporarily disable exit-on-error to capture exit code 2
set +e
terraform plan -detailed-exitcode -input=false -out=tfplan
PLAN_EXIT=$?
set -e

# Now handle each case
if [ $PLAN_EXIT -eq 1 ]; then
  echo "Plan encountered an error"
  exit 1
fi

if [ $PLAN_EXIT -eq 2 ]; then
  echo "Changes detected in plan"
  # Continue with apply or review logic
  terraform apply tfplan
fi

if [ $PLAN_EXIT -eq 0 ]; then
  echo "Infrastructure is up to date"
fi
```

## Multi-Environment Pipeline

For organizations managing multiple environments, you can use `-detailed-exitcode` to run plans for all environments and only trigger applies where changes exist:

```bash
#!/bin/bash
# multi-env-plan.sh
# Plans all environments and reports which ones have changes

ENVIRONMENTS=("dev" "staging" "production")
CHANGED_ENVS=()

for env in "${ENVIRONMENTS[@]}"; do
  echo "Planning: $env"

  terraform init -input=false \
    -backend-config="environments/${env}/backend.hcl" \
    -reconfigure

  set +e
  terraform plan \
    -detailed-exitcode \
    -input=false \
    -var-file="environments/${env}/terraform.tfvars" \
    -out="tfplan-${env}"
  EXIT_CODE=$?
  set -e

  case $EXIT_CODE in
    0) echo "  $env: No changes" ;;
    1) echo "  $env: ERROR"; exit 1 ;;
    2) echo "  $env: Changes pending"; CHANGED_ENVS+=("$env") ;;
  esac
done

# Report results
if [ ${#CHANGED_ENVS[@]} -eq 0 ]; then
  echo "All environments are up to date"
else
  echo "Environments with pending changes:"
  for env in "${CHANGED_ENVS[@]}"; do
    echo "  - $env"
  done
fi
```

## Combining with Other Flags

The `-detailed-exitcode` flag works well with other plan flags:

```bash
# Target specific resources and check for changes
terraform plan -detailed-exitcode -target=module.networking

# Destroy plan with detailed exit code
terraform plan -detailed-exitcode -destroy

# Use with variable files
terraform plan -detailed-exitcode -var-file=prod.tfvars -out=tfplan
```

## Gotchas

A few things to be aware of:

1. **Piping changes exit codes.** If you pipe the plan output through `tee` or `grep`, you need to use `${PIPESTATUS[0]}` in bash to get the original exit code, not `$?`.

2. **The terraform wrapper.** Some CI tools (like the HashiCorp GitHub Action) wrap the terraform binary. This wrapper can swallow the exit codes. Always disable it when you need raw exit codes.

3. **Refresh-only mode.** In Terraform 1.x, you can run `terraform plan -refresh-only -detailed-exitcode` to check for drift without generating a change plan.

4. **Parallel plans.** If you run multiple plans in parallel, make sure each one uses a separate working directory or plan file to avoid conflicts.

## Summary

The `-detailed-exitcode` flag transforms `terraform plan` from a review tool into a decision-making mechanism for your CI pipeline. Exit code 0 means no action needed, exit code 1 means something is wrong, and exit code 2 means changes are waiting to be applied. Build your pipeline logic around these three states for reliable, automated infrastructure management.

For related reading, see [How to Test Terraform Plans Before Applying](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-plans-before-applying/view) and [How to Set Up Pre-Commit Hooks for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-pre-commit-hooks-for-terraform/view).

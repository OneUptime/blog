# How to Use the -auto-approve Flag in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, CI/CD

Description: Learn how to use the -auto-approve flag in OpenTofu to skip the interactive confirmation prompt, and understand when to use it safely in CI/CD pipelines.

## Introduction

The `-auto-approve` flag skips the interactive "yes/no" confirmation prompt in `tofu apply` and `tofu destroy`. It's commonly used in automated pipelines when `tofu apply` is creating a new plan or when running `tofu destroy`, but must be used carefully in production environments.

## Basic Usage

```bash
# Apply without confirmation

tofu apply -auto-approve

# Destroy without confirmation
tofu destroy -auto-approve
```

Without `-auto-approve`:
```hcl
Do you want to perform these actions?
  OpenTofu will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value:
```

With `-auto-approve`, this prompt is skipped entirely.

## Safe Usage Pattern

Always plan before an automated apply:

```bash
# Step 1: Create and review the plan
tofu plan -out=deployment.tfplan

# Step 2: Human reviews the plan (in CI: stored as artifact)
# ...review happens here...

# Step 3: Apply the pre-reviewed plan
# Saved plan files do not prompt for approval
tofu apply deployment.tfplan
```

## CI/CD Usage

```yaml
# GitHub Actions: safe plan-and-apply pattern
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Set Up OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: Init
        run: tofu init -input=false

      - name: Plan
        run: tofu plan -out=plan.tfplan

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: plan.tfplan

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production  # Can require manual approval in GitHub when protection rules are configured
    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Set Up OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: Init
        run: tofu init -input=false

      - name: Download Plan
        uses: actions/download-artifact@v5
        with:
          name: tfplan
          path: .

      - name: Apply (Saved plan files do not prompt for approval)
        run: tofu apply plan.tfplan
```

## Combining with Other Flags

```bash
# Apply saved plan without prompts
tofu apply plan.tfplan

# Apply with variables, no prompts
tofu apply -auto-approve -var-file=prod.tfvars

# Refresh-only without prompts
tofu apply -refresh-only -auto-approve
```

## When to Use -auto-approve

**Appropriate use cases:**
- CI/CD pipelines with proper plan review gates
- Non-interactive applies that generate a plan at runtime
- Non-production automated environments
- One-time setup scripts for scratch environments

**Inappropriate use cases:**
- Direct production applies without plan review
- When a human hasn't reviewed the changes
- During incident response (slow down and review)

## Environment-Based Safety

```bash
#!/bin/bash
# smart-apply.sh

ENVIRONMENT="${1}"

if [ "$ENVIRONMENT" = "production" ]; then
  echo "Production deployment - requiring manual review..."
  tofu plan -out=prod.tfplan
  tofu show prod.tfplan
  echo "Type 'yes' to apply to production:"
  read -r CONFIRM
  [ "$CONFIRM" = "yes" ] && tofu apply prod.tfplan
else
  echo "Non-production deployment - auto-approving..."
  tofu apply -auto-approve -var="environment=${ENVIRONMENT}"
fi
```

## Conclusion

`-auto-approve` is useful for CI/CD automation but should never replace human review for production changes. The safe pattern is to create a plan, have a human review it (or use a CI environment approval gate), then apply the pre-reviewed plan file. Saved plan files do not prompt for approval, so `-auto-approve` is unnecessary in that final step. This gives you automation without sacrificing the safety of human review.

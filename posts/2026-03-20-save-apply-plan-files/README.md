# How to Save and Apply Plan Files in OpenTofu - Save Apply

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to save OpenTofu plan files with -out, review them, and apply them exactly to ensure what you reviewed is what gets deployed.

## Introduction

Saving plan files (`tofu plan -out`) and applying them later (`tofu apply planfile`) is one of the most important safety practices in OpenTofu. It ensures that OpenTofu applies the exact plan you reviewed instead of creating a new plan at deployment time; if the saved plan is no longer usable because the backend state changed, you need to re-plan.

## Saving a Plan

```bash
# Save plan to a file

tofu plan -out=changes.tfplan

# With variables
tofu plan -var-file=production.tfvars -out=prod-changes.tfplan

# Workspace-specific
tofu workspace select production
tofu plan -var-file=production.tfvars -out=production-$(date +%Y%m%d).tfplan
```

## Reviewing a Saved Plan

```bash
# Human-readable review
tofu show changes.tfplan

# JSON for automated analysis
tofu show -json changes.tfplan

# Extract key metrics
tofu show -json changes.tfplan | jq '
  .resource_changes |
  group_by(.change.actions | join(",")) |
  map({action: (.[0].change.actions | join(",")), count: length})
'
```

## Applying a Saved Plan

```bash
# Apply the saved plan exactly
tofu apply changes.tfplan

# No confirmation prompt needed for saved plans
# (the review is the confirmation)
```

## Plan File Format

Saved plan files are opaque binary files (not plain text JSON). By default, they can contain sensitive values in cleartext; they are encrypted only if you've configured OpenTofu plan encryption:

```bash
# Don't try to cat or parse plan files directly
file changes.tfplan
# Output identifies it as data/opaque binary, not JSON text

# Use tofu show to read them
tofu show changes.tfplan
```

## Plan Validity Window

A saved plan is tied to the state snapshot, backend configuration, plan options, and non-ephemeral input values captured at plan time. Re-plan if any of these are no longer true:
1. The backend state has not been updated by another OpenTofu operation since planning
2. The backend configuration, credentials, and encryption settings captured in the plan are still usable
3. Any ephemeral variables used during planning are supplied again during apply

If state changes after planning:

```bash
# Plan becomes stale if the backend state changes
tofu apply outdated.tfplan
# OpenTofu reports that the saved plan is stale
# You need to re-plan
```

## CI/CD Workflow with Plan Files

```yaml
# GitHub Actions: Plan → Review → Apply
jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      has-changes: ${{ steps.check.outputs.has-changes }}
    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_wrapper: false

      - name: Init
        run: tofu init -input=false

      - name: Plan
        id: plan
        run: |
          set +e
          tofu plan -input=false -out=plan.tfplan -detailed-exitcode
          exitcode=$?
          set -e

          echo "exitcode=$exitcode" >> "$GITHUB_OUTPUT"

          if [ "$exitcode" -eq 1 ]; then
            exit 1
          elif [ "$exitcode" -ne 0 ] && [ "$exitcode" -ne 2 ]; then
            exit "$exitcode"
          fi

      - name: Check for Changes
        id: check
        run: |
          echo "has-changes=${{ steps.plan.outputs.exitcode == '2' }}" >> "$GITHUB_OUTPUT"

      - name: Upload Plan
        if: steps.plan.outputs.exitcode == '2'
        uses: actions/upload-artifact@v4
        with:
          name: tfplan-${{ github.sha }}
          path: plan.tfplan
          retention-days: 7

  apply:
    needs: plan
    if: needs.plan.outputs.has-changes == 'true' && github.ref == 'refs/heads/main'
    environment: production  # Use environment protection rules for approval
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_wrapper: false

      - name: Init
        run: tofu init -input=false

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan-${{ github.sha }}

      - name: Apply
        run: tofu apply -input=false plan.tfplan
```

## Naming Plan Files

Use descriptive, timestamped names:

```bash
# Include timestamp and environment
tofu plan -out="prod-$(date +%Y%m%d-%H%M%S).tfplan"

# Include PR or commit reference
tofu plan -out="pr-123-changes.tfplan"

# Include workspace
tofu plan -out="${TF_WORKSPACE}-$(date +%Y%m%d).tfplan"
```

## Conclusion

Saving and applying plan files is the gold standard for safe infrastructure deployments. The two-step workflow (plan → review → apply plan file) ensures that what you approved is exactly what gets deployed, without generating a different plan between review and execution. Implement this pattern in all production CI/CD pipelines for maximum safety and auditability.

# How to Avoid Running tofu apply Without a Saved Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Best Practice, Plan, Safety, CI/CD, Infrastructure as Code

Description: Learn why applying without a saved plan is risky and how to enforce plan-then-apply workflows in your team and CI/CD pipelines.

## Introduction

Running `tofu apply` without a saved plan file means OpenTofu generates and applies a new plan in one step - giving you no opportunity to verify what will happen before it happens. Between when you ran `tofu plan` and when you run `tofu apply`, someone else might have changed the configuration, or the cloud API might return different results. A saved plan file makes `tofu apply` use the exact actions captured in the reviewed plan instead of generating a new one at apply time.

## The Risk: Plan Drift Between Review and Apply

What can change between an unsaved plan and apply.

```text
Timeline without saved plan:
09:00 - You run: tofu plan  → shows: 1 resource to create
09:01 - Colleague merges a change that adds: destroy production database
09:02 - You run: tofu apply → applies BOTH your change AND the destroy

With a saved plan:
09:00 - You run: tofu plan -out=plan.tfplan  → saves exact plan
09:01 - Colleague merges change
09:02 - You run: tofu apply plan.tfplan
        → applies ONLY what was in the saved plan from 09:00
        → colleague's changes are NOT in the apply
```

## The Correct Workflow

Always use the three-step plan-review-apply workflow.

```bash
# Step 1: Create a named plan file

tofu plan -out=reviewed.tfplan

# Step 2: Show the plan in human-readable format and review it
tofu show reviewed.tfplan

# Or get JSON output for automated analysis
tofu show -json reviewed.tfplan | jq '.resource_changes[]'

# Step 3: Apply the exact saved plan
tofu apply reviewed.tfplan
# No confirmation prompt needed - the plan was already reviewed
```

## CI/CD: Enforce Plan Files

Enforce the workflow in GitHub Actions with plan artifact passing.

```yaml
# .github/workflows/opentofu.yml
jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      plan-changed: ${{ steps.plan.outputs.changed }}
    steps:
      - uses: actions/checkout@v4

      - name: Init OpenTofu
        run: tofu init -input=false

      - name: Run tofu plan
        id: plan
        run: |
          set +e
          tofu plan -input=false -out=plan.tfplan -detailed-exitcode
          exitcode=$?
          echo "changed=$exitcode" >> "$GITHUB_OUTPUT"
          if [ "$exitcode" -eq 1 ]; then
            exit 1
          fi
          exit 0

      - name: Upload plan artifact
        if: steps.plan.outputs.changed == '2'
        uses: actions/upload-artifact@v4
        with:
          name: tofu-plan
          path: plan.tfplan
          retention-days: 1  # plans expire quickly

  apply:
    needs: plan
    if: needs.plan.outputs.plan-changed == '2'  # only if there are changes
    runs-on: ubuntu-latest
    environment: production  # can require manual approval if required reviewers are configured
    steps:
      - uses: actions/checkout@v4

      - name: Init OpenTofu
        run: tofu init -input=false

      - name: Download plan artifact
        uses: actions/download-artifact@v4
        with:
          name: tofu-plan

      - name: Apply saved plan
        run: tofu apply plan.tfplan  # applies ONLY the reviewed plan
```

## Atlantis Workflow with Saved Plans

Atlantis automatically enforces the plan-then-apply pattern.

```yaml
# atlantis.yaml
version: 3

projects:
  - name: production
    dir: environments/prod
    terraform_distribution: opentofu
    workflow: safe-apply

workflows:
  safe-apply:
    plan:
      steps:
        - init
        - plan
    apply:
      steps:
        - apply
```

## Making Plans Expirable

Saved plans become stale if too much time passes - enforce freshness.

```bash
#!/bin/bash
# scripts/apply-with-freshness-check.sh

PLAN_FILE="plan.tfplan"
MAX_AGE_MINUTES=60

if [ ! -f "$PLAN_FILE" ]; then
  echo "Error: No plan file found. Run tofu plan -out=$PLAN_FILE first."
  exit 1
fi

# Check plan age
PLAN_AGE_MINUTES=$(( ($(date +%s) - $(stat -c %Y "$PLAN_FILE")) / 60 ))

if [ "$PLAN_AGE_MINUTES" -gt "$MAX_AGE_MINUTES" ]; then
  echo "Error: Plan file is ${PLAN_AGE_MINUTES} minutes old (max: ${MAX_AGE_MINUTES})"
  echo "Please re-run tofu plan to generate a fresh plan."
  exit 1
fi

echo "Plan is ${PLAN_AGE_MINUTES} minutes old. Applying..."
tofu apply "$PLAN_FILE"
```

## Summary

Always use `tofu plan -out=plan.tfplan` followed by `tofu apply plan.tfplan` in any environment where the plan was reviewed. The saved plan file is an opaque artifact that captures the exact actions OpenTofu decided on at plan time, and applying it tells OpenTofu to use that saved plan instead of generating a new one from whatever configuration is present later. Enforce this pattern in CI/CD by passing plan files as artifacts between pipeline stages and requiring manual approval before the apply stage.

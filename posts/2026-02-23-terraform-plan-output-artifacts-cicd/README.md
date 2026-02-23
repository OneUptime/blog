# How to Use Terraform Plan Output Artifacts in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, DevOps, Automation, Infrastructure as Code

Description: Learn how to save, transfer, and consume Terraform plan output artifacts in CI/CD pipelines for safe and auditable infrastructure deployments.

---

One of the most important patterns in Terraform CI/CD is the plan-then-apply workflow: generate a plan in one step (or job), save it as an artifact, and apply that exact plan later. This ensures that what gets applied is exactly what was reviewed, not whatever Terraform recalculates at apply time.

Getting this right requires understanding how Terraform plan files work and how to move them between pipeline stages reliably.

## Why Plan Artifacts Matter

Without saving plan artifacts, a common anti-pattern emerges:

```yaml
# Bad: Plan and apply are separate calculations
- run: terraform plan   # Shows 3 changes
# ... time passes, someone merges another PR ...
- run: terraform apply -auto-approve  # Might apply 5 changes now
```

Between the plan and apply steps, the infrastructure or code could change. By saving the plan binary and applying it directly, you guarantee consistency.

## Generating Plan Output Files

Terraform's `-out` flag saves the plan to a binary file:

```bash
# Generate a saved plan file
terraform plan -out=tfplan

# The file is binary - not human readable
file tfplan
# tfplan: data
```

For human-readable output, capture both:

```yaml
# .github/workflows/terraform.yml
- name: Terraform Plan
  id: plan
  run: |
    # Save binary plan for apply
    terraform plan -out=tfplan -no-color 2>&1 | tee plan-text-output.txt

    # Also generate JSON output for programmatic consumption
    terraform show -json tfplan > plan.json

    # Generate a concise summary
    terraform show tfplan -no-color | tail -20 > plan-summary.txt
```

## The JSON Plan Format

The JSON plan output is incredibly useful for automation. It contains structured data about every change Terraform will make:

```bash
# Convert binary plan to JSON
terraform show -json tfplan > plan.json
```

The JSON structure looks like this:

```json
{
  "format_version": "1.2",
  "terraform_version": "1.7.4",
  "planned_values": { },
  "resource_changes": [
    {
      "address": "aws_instance.web",
      "mode": "managed",
      "type": "aws_instance",
      "name": "web",
      "change": {
        "actions": ["update"],
        "before": { "instance_type": "t3.small" },
        "after": { "instance_type": "t3.medium" }
      }
    }
  ]
}
```

You can parse this to build custom checks:

```bash
#!/bin/bash
# check-plan.sh - Validate plan contents before apply

PLAN_JSON="plan.json"

# Count destructive actions
DESTROYS=$(jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length' "$PLAN_JSON")
CREATES=$(jq '[.resource_changes[] | select(.change.actions[] == "create")] | length' "$PLAN_JSON")

echo "Plan summary: $CREATES creates, $DESTROYS destroys"

# Block if too many resources being destroyed
if [ "$DESTROYS" -gt 5 ]; then
  echo "ERROR: Plan destroys $DESTROYS resources. Manual approval required."
  exit 1
fi

# Check for specific dangerous changes
DANGEROUS=$(jq '[.resource_changes[] | select(
  .type == "aws_db_instance" and
  (.change.actions[] == "delete")
)] | length' "$PLAN_JSON")

if [ "$DANGEROUS" -gt 0 ]; then
  echo "ERROR: Plan includes database deletion. Requires manual review."
  exit 1
fi
```

## Storing Artifacts Between Pipeline Stages

### GitHub Actions

```yaml
name: Terraform Deploy
on:
  push:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: |
          terraform plan -out=tfplan -no-color 2>&1 | tee plan-output.txt
          terraform show -json tfplan > plan.json

      # Upload plan files as artifacts
      - name: Upload Plan Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: |
            tfplan
            plan-output.txt
            plan.json
            .terraform.lock.hcl
          retention-days: 5

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      # Download the exact plan from the plan stage
      - name: Download Plan Artifacts
        uses: actions/download-artifact@v4
        with:
          name: terraform-plan

      - name: Terraform Init
        run: terraform init

      # Apply the saved plan - no recalculation
      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - plan
  - apply

plan:
  stage: plan
  image: hashicorp/terraform:1.7.4
  script:
    - terraform init
    - terraform plan -out=tfplan -no-color | tee plan-output.txt
    - terraform show -json tfplan > plan.json
  artifacts:
    paths:
      - tfplan
      - plan-output.txt
      - plan.json
      - .terraform/
      - .terraform.lock.hcl
    expire_in: 1 week

apply:
  stage: apply
  image: hashicorp/terraform:1.7.4
  dependencies:
    - plan
  script:
    - terraform init
    - terraform apply -auto-approve tfplan
  environment:
    name: production
  when: manual  # Require manual trigger
  only:
    - main
```

## Artifact Integrity Verification

Plan artifacts should be verified before apply to make sure they haven't been tampered with:

```yaml
# Generate checksum during plan
- name: Generate Plan Checksum
  run: |
    sha256sum tfplan > tfplan.sha256
    echo "Plan checksum: $(cat tfplan.sha256)"

- name: Upload Artifacts
  uses: actions/upload-artifact@v4
  with:
    name: terraform-plan
    path: |
      tfplan
      tfplan.sha256

# Verify during apply
- name: Verify Plan Integrity
  run: |
    sha256sum -c tfplan.sha256
    echo "Plan integrity verified"
```

## Handling Plan Staleness

A saved plan can become stale if infrastructure changes between plan and apply. Terraform handles this gracefully - it will refuse to apply a plan if the state has changed in a way that would make the plan invalid.

But you should also add your own staleness checks:

```yaml
- name: Check Plan Age
  run: |
    # Get plan creation time from artifact metadata
    PLAN_AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y tfplan)) / 3600 ))

    if [ "$PLAN_AGE_HOURS" -gt 24 ]; then
      echo "ERROR: Plan is $PLAN_AGE_HOURS hours old. Please re-run plan."
      exit 1
    fi

    echo "Plan age: ${PLAN_AGE_HOURS}h (within 24h limit)"
```

## Using Plan Artifacts for Cost Estimation

The JSON plan is perfect for feeding into cost estimation tools:

```yaml
- name: Cost Estimation
  run: |
    # Use Infracost to estimate costs from the plan
    infracost breakdown \
      --path plan.json \
      --format json \
      --out-file cost-estimate.json

    # Extract monthly cost change
    COST_DIFF=$(jq '.diffTotalMonthlyCost' cost-estimate.json)
    echo "Monthly cost change: \$$COST_DIFF"

    # Fail if cost increase exceeds threshold
    if (( $(echo "$COST_DIFF > 500" | bc -l) )); then
      echo "WARNING: Cost increase exceeds $500/month threshold"
      exit 1
    fi
```

## Plan Artifact Cleanup

Don't let old plan artifacts accumulate. They contain sensitive infrastructure details:

```yaml
# Set short retention periods
- uses: actions/upload-artifact@v4
  with:
    name: terraform-plan
    path: tfplan
    retention-days: 3  # Delete after 3 days

# Or clean up explicitly after apply
- name: Cleanup Artifacts
  if: always()
  uses: geekyeggo/delete-artifact@v4
  with:
    name: terraform-plan
```

## Summary

Using Terraform plan artifacts correctly involves these steps:

1. Save the binary plan with `-out=tfplan` during the plan stage
2. Generate JSON output with `terraform show -json` for programmatic analysis
3. Upload both formats as pipeline artifacts
4. Download and verify artifacts in the apply stage
5. Apply the exact saved plan, not a recalculated one
6. Add integrity checks, staleness guards, and cost estimation
7. Clean up artifacts after use to avoid leaking infrastructure details

This pattern is the foundation of safe Terraform CI/CD. Every apply should use a reviewed, saved plan - no exceptions. For more on building robust Terraform CI/CD pipelines, see [Terraform CI/CD with pull request workflows](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pull-request-workflows/view).

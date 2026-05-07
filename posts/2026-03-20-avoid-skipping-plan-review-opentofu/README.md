# How to Avoid Skipping Plan Review Before Apply in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Plan Review, Best Practice, Safety, Infrastructure as Code

Description: Learn why reviewing the OpenTofu plan before every apply is critical, and how to build workflows that enforce this practice even under time pressure.

## Introduction

Skipping plan review is one of the most dangerous practices in infrastructure management. A plan shows the changes OpenTofu plans to make to your infrastructure before it does anything. Running `tofu apply -auto-approve` without reviewing the plan has caused production outages, accidental data deletion, and security incidents at organizations of all sizes.

## Why Plan Review Matters

The plan can reveal destructive actions you didn't intend.

```bash
# Running this without review is dangerous

tofu apply -auto-approve  # DANGEROUS in production

# What the plan might have shown you:
#   # aws_rds_cluster.main must be replaced
# -/+ resource "aws_rds_cluster" "main" {
#     ~ cluster_identifier = "myapp-prod-db" -> "myapp-prod-db-v2"  # forces replacement!
#       id                 = "myapp-prod-db"
#     }
#
# Plan: 0 to add, 0 to change, 1 to destroy, 1 to add.
#
# Warning: This will DELETE your production database and create a new one!
```

## Always Save and Apply Plan Files in Production

Use a saved plan file to ensure apply matches exactly what you reviewed.

```bash
# Step 1: Create and save the plan
tofu plan -out=reviewed-plan.tfplan

# Step 2: Show and review the plan (human-readable)
tofu show reviewed-plan.tfplan

# Step 3: Only after reviewing, apply the saved plan
tofu apply reviewed-plan.tfplan
# This applies EXACTLY what you reviewed, nothing more
```

## Enforce Plan Review in CI/CD

Build approval gates into your pipeline.

```yaml
# .github/workflows/opentofu.yml
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
      - run: tofu init -input=false
      - run: tofu plan -out=plan.tfplan
      - uses: actions/upload-artifact@v4
        with:
          name: plan
          path: plan.tfplan

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production  # can require manual approval when protection rules are configured
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
      - run: tofu init -input=false
      - uses: actions/download-artifact@v4
        with:
          name: plan
      - run: tofu apply plan.tfplan  # applies saved plan
```

## Add Plan Output to Pull Requests

Make plan review part of the code review process.

````yaml
permissions:
  pull-requests: write

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
      - run: tofu init -input=false

      - name: OpenTofu plan
        id: plan
        run: tofu plan -no-color -out=plan.tfplan

      - name: Comment plan on PR
        uses: actions/github-script@v9
        if: github.event_name == 'pull_request'
        env:
          PLAN: ${{ steps.plan.outputs.stdout }}
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const planOutput = `## OpenTofu Plan

            \`\`\`
            ${process.env.PLAN}
            \`\`\`
            `;
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: planOutput
            });
````

## Watch for Destructive Change Signals

Certain plan outputs demand extra scrutiny before applying.

```text
HIGH RISK signals in plan output:
✗ "-/+" (destroy and recreate) on databases, load balancers, EKS clusters
✗ "-" (destroy) on any production resource
✗ Large number of unexpected changes
✗ "known after apply" on resource IDs being used by other resources
✗ "forces replacement" on any long-running resource

LOW RISK in plan output:
✓ "+" (create) new resources
✓ "~" (update) tag changes only
✓ Data source reads
```

## Emergency Plan Review Checklist

Before applying in any environment, answer these questions.

```hcl
Before every tofu apply in production:
□ Did I run tofu plan and read the output?
□ Are all changes expected based on what I changed in code?
□ Are there any -/+ (replacement) operations?
□ Are there any - (destroy) operations?
□ Is the resource count reasonable?
□ Have I checked for "forces replacement" attributes?
□ Is this apply in the correct environment/workspace?
```

## Summary

Never skip plan review. Always use `tofu plan -out=plan.tfplan` followed by `tofu show plan.tfplan`, then `tofu apply plan.tfplan` to ensure what you apply matches exactly what you reviewed. Build approval gates into CI/CD pipelines for production environments, and make plan output visible in pull requests to enable peer review of infrastructure changes. The few minutes spent reviewing a plan is always worth it compared to recovering from an unexpected database deletion.

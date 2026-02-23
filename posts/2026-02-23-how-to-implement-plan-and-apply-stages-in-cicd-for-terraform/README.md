# How to Implement Plan and Apply Stages in CI/CD for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, GitHub Actions, GitLab CI, DevOps, Infrastructure as Code

Description: Learn how to properly separate Terraform plan and apply stages in CI/CD pipelines, pass plan artifacts between stages, and implement safe deployment workflows.

---

The most important pattern in Terraform CI/CD is separating plan from apply. Running `terraform plan` on every pull request lets your team review exactly what will change before anything touches production. Then, after merge, the apply step executes that same plan. Getting this right is the difference between a CI/CD pipeline you trust and one that keeps you up at night.

## Why Separate Plan and Apply

Running `terraform apply` directly without a saved plan is dangerous in CI/CD. Between the time you review changes and the time apply runs, someone else might have merged a different change. The resources Terraform plans to create or destroy could be different from what you reviewed.

By saving the plan output as an artifact and applying that exact plan file, you guarantee what was reviewed is what gets applied. No surprises.

## The Basic Pattern

Here is the flow:

1. Developer opens a pull request
2. CI runs `terraform plan` and saves the output
3. Team reviews the plan output in the PR
4. After approval and merge, CI runs `terraform apply` with the saved plan
5. If the plan is stale (state changed since plan was generated), the apply fails safely

## GitHub Actions Implementation

```yaml
# .github/workflows/terraform-plan.yml
# Runs on pull requests to show what will change
name: Terraform Plan

on:
  pull_request:
    branches: [main]
    paths:
      - "terraform/**"  # Only trigger when Terraform files change

permissions:
  contents: read
  pull-requests: write  # Needed to post plan as PR comment

jobs:
  plan:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: terraform

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false  # Disable wrapper to get clean output

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init -no-color

      - name: Terraform Validate
        run: terraform validate -no-color

      - name: Terraform Plan
        id: plan
        run: |
          # Save binary plan for later apply
          terraform plan -no-color -out=tfplan 2>&1 | tee plan-output.txt

          # Store exit code
          echo "exitcode=${PIPESTATUS[0]}" >> $GITHUB_OUTPUT

      - name: Upload Plan Artifact
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: terraform/tfplan
          retention-days: 5

      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const planOutput = fs.readFileSync('terraform/plan-output.txt', 'utf8');

            // Truncate if too long for a PR comment
            const maxLength = 60000;
            const truncated = planOutput.length > maxLength
              ? planOutput.substring(0, maxLength) + '\n\n... (truncated)'
              : planOutput;

            const body = `### Terraform Plan Output

            \`\`\`
            ${truncated}
            \`\`\`

            *Plan generated from commit ${context.sha.substring(0, 8)}*`;

            // Find existing comment to update
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const botComment = comments.data.find(c =>
              c.body.includes('### Terraform Plan Output')
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body,
              });
            }
```

```yaml
# .github/workflows/terraform-apply.yml
# Runs after merge to main
name: Terraform Apply

on:
  push:
    branches: [main]
    paths:
      - "terraform/**"

permissions:
  contents: read

jobs:
  apply:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: terraform

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init -no-color

      - name: Terraform Apply
        run: |
          # Run a fresh plan and apply in one step
          # The saved plan from PR may be stale after merge
          terraform apply -no-color -auto-approve
```

## The Stale Plan Problem

There is a tension in the plan-and-apply pattern. If you save the plan from the PR and try to apply it after merge, the plan may be stale because:

- Another PR was merged first, changing the state
- Someone made a manual change to the infrastructure
- A dependent resource was modified outside Terraform

When you apply a stale plan file, Terraform will detect the mismatch and fail. This is actually the safe behavior. You have two options for dealing with this:

**Option A: Fresh plan on apply** - Run a new plan and apply it directly on merge. You lose the "apply exactly what was reviewed" guarantee, but you avoid stale plan issues.

**Option B: Saved plan with retry** - Try to apply the saved plan. If it fails due to staleness, run a fresh plan-and-apply. Log the difference for audit purposes.

```yaml
# Option B implementation
- name: Apply with fallback
  run: |
    # Try the saved plan first
    if terraform apply -no-color tfplan 2>&1; then
      echo "Saved plan applied successfully"
    else
      echo "Saved plan was stale, running fresh apply"
      terraform plan -no-color -out=fresh-plan
      terraform apply -no-color fresh-plan
    fi
```

## GitLab CI Implementation

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - plan
  - apply

variables:
  TF_ROOT: "terraform"
  TF_VERSION: "1.7.0"

# Base template for all Terraform jobs
.terraform-base:
  image: hashicorp/terraform:${TF_VERSION}
  before_script:
    - cd ${TF_ROOT}
    - terraform init -no-color

# Validate syntax and formatting
validate:
  extends: .terraform-base
  stage: validate
  script:
    - terraform validate -no-color
    - terraform fmt -check -recursive -no-color
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

# Generate plan on merge requests
plan:
  extends: .terraform-base
  stage: plan
  script:
    - terraform plan -no-color -out=tfplan
    - terraform show -no-color tfplan > plan.txt
  artifacts:
    paths:
      - ${TF_ROOT}/tfplan
      - ${TF_ROOT}/plan.txt
    expire_in: 7 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"

# Apply only on main branch after manual trigger
apply:
  extends: .terraform-base
  stage: apply
  script:
    - terraform apply -no-color -auto-approve tfplan
  dependencies:
    - plan
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual  # Requires manual click to apply
```

## Handling Plan Output in CI

The raw `terraform plan` output can be overwhelming. Here are some tips for making it more readable:

```bash
# Generate a compact summary of changes
terraform plan -no-color -out=tfplan | grep -E "^(Plan:|  #|  \+|  -|  ~)"

# Use terraform show for JSON output you can parse programmatically
terraform show -json tfplan > plan.json

# Extract just the resource changes
jq '.resource_changes[] | {address: .address, action: .change.actions[0]}' plan.json
```

## Environment-Specific Plans

When managing multiple environments, each needs its own plan:

```yaml
# GitHub Actions matrix for multiple environments
jobs:
  plan:
    strategy:
      matrix:
        environment: [dev, staging, production]

    steps:
      - name: Terraform Plan - ${{ matrix.environment }}
        run: |
          terraform workspace select ${{ matrix.environment }}
          terraform plan \
            -var-file="envs/${{ matrix.environment }}.tfvars" \
            -out="${{ matrix.environment }}.tfplan"
```

## Safety Checks Before Apply

Add guards to prevent accidental destruction:

```bash
# Count resources being destroyed
DESTROY_COUNT=$(terraform show -json tfplan | jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length')

if [ "$DESTROY_COUNT" -gt 5 ]; then
  echo "WARNING: Plan wants to destroy $DESTROY_COUNT resources"
  echo "This exceeds the safety threshold of 5. Aborting."
  exit 1
fi
```

## Summary

Separating plan and apply stages is foundational to safe Terraform CI/CD. The plan stage gives your team visibility into what will change, while the apply stage executes those changes in a controlled manner. Whether you choose to pass saved plans between stages or run fresh plans on apply depends on your team's tolerance for stale plan issues versus the desire for exact reproducibility. Either way, never skip the review step.

For more on approval workflows, check out our guide on [manual approval gates for Terraform apply](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-manual-approval-gates-for-terraform-apply/view).

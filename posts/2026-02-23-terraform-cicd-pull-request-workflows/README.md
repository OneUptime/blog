# How to Implement Terraform CI/CD with Pull Request Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, GitHub, Pull Requests, DevOps, Infrastructure as Code

Description: Build a complete Terraform CI/CD workflow around pull requests with automated plans, review gates, approval requirements, and safe apply-on-merge patterns.

---

Pull request workflows are the backbone of safe Terraform CI/CD. The idea is simple: every infrastructure change goes through a PR, gets a plan posted as a comment, requires human review, and only applies after merge. This gives you the same code review rigor for infrastructure that you have for application code.

Here is how to build this workflow end to end.

## The Core Workflow

The lifecycle of a Terraform change through PRs looks like this:

1. Developer creates a branch and modifies `.tf` files
2. PR is opened, triggering an automatic `terraform plan`
3. Plan output is posted as a PR comment
4. Reviewer examines the plan alongside the code diff
5. PR is approved and merged to main
6. Merge triggers `terraform apply` using the saved plan

## GitHub Actions Implementation

```yaml
# .github/workflows/terraform-pr.yml
name: Terraform PR Workflow
on:
  pull_request:
    branches: [main]
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

permissions:
  contents: read
  pull-requests: write
  id-token: write

env:
  TF_DIR: infrastructure
  TF_VERSION: "1.7.4"

jobs:
  # Run on every PR push
  plan:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: ${{ env.TF_DIR }}
        run: terraform init

      - name: Terraform Format Check
        working-directory: ${{ env.TF_DIR }}
        run: terraform fmt -check -recursive

      - name: Terraform Validate
        working-directory: ${{ env.TF_DIR }}
        run: terraform validate

      - name: Terraform Plan
        id: plan
        working-directory: ${{ env.TF_DIR }}
        run: |
          terraform plan -out=tfplan -no-color -detailed-exitcode 2>&1 | tee plan-output.txt
          EXIT_CODE=${PIPESTATUS[0]}

          # Exit code 2 means changes detected
          if [ $EXIT_CODE -eq 0 ]; then
            echo "has_changes=false" >> "$GITHUB_OUTPUT"
          elif [ $EXIT_CODE -eq 2 ]; then
            echo "has_changes=true" >> "$GITHUB_OUTPUT"
          else
            exit $EXIT_CODE
          fi
        continue-on-error: true

      # Post plan as PR comment
      - name: Post Plan Comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const planOutput = fs.readFileSync(
              '${{ env.TF_DIR }}/plan-output.txt', 'utf8'
            );
            const hasChanges = '${{ steps.plan.outputs.has_changes }}' === 'true';

            // Truncate long output
            let displayPlan = planOutput;
            if (displayPlan.length > 60000) {
              const lines = displayPlan.split('\n');
              const summary = lines.slice(-10).join('\n');
              displayPlan = displayPlan.substring(0, 55000) +
                '\n\n... output truncated ...\n\n' + summary;
            }

            const body = `## Terraform Plan Results

            ${hasChanges ? '**Changes detected** - review the plan below.' : 'No changes detected.'}

            <details>
            <summary>Show full plan output</summary>

            \`\`\`hcl
            ${displayPlan}
            \`\`\`

            </details>

            *Pushed by @${{ github.actor }} - Commit: \`${{ github.sha }}\`*`;

            // Update existing comment or create new one
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const marker = '## Terraform Plan Results';
            const existing = comments.find(c => c.body.includes(marker));

            const params = {
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body,
            };

            if (existing) {
              await github.rest.issues.updateComment({
                ...params,
                comment_id: existing.id,
              });
            } else {
              await github.rest.issues.createComment({
                ...params,
                issue_number: context.issue.number,
              });
            }

      # Save plan artifact for apply stage
      - name: Upload Plan
        if: steps.plan.outputs.has_changes == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: ${{ env.TF_DIR }}/tfplan
          retention-days: 5

  # Run only on merge to main
  apply:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: ${{ env.TF_DIR }}
        run: terraform init

      - name: Terraform Apply
        working-directory: ${{ env.TF_DIR }}
        run: |
          # Re-plan and apply since we can't carry artifacts across workflows
          terraform apply -auto-approve -no-color
```

## Branch Protection Rules

Set up branch protection to enforce the review workflow:

```bash
# Using GitHub CLI to configure branch protection
gh api repos/:owner/:repo/branches/main/protection -X PUT \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["plan"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "required_linear_history": true
}
EOF
```

## CODEOWNERS for Infrastructure Review

Require specific team members to review infrastructure changes:

```
# .github/CODEOWNERS
# Infrastructure changes require platform team review
/infrastructure/ @myorg/platform-team

# Database changes require DBA review
/infrastructure/database/ @myorg/dba-team

# Networking changes require network team review
/infrastructure/networking/ @myorg/network-team
```

## Handling Multiple Terraform Directories

When your infrastructure is split across directories, plan each one independently:

```yaml
jobs:
  detect:
    runs-on: ubuntu-latest
    outputs:
      dirs: ${{ steps.find.outputs.dirs }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Find changed Terraform dirs
        id: find
        run: |
          DIRS=$(git diff --name-only origin/main...HEAD | \
            grep '\.tf$' | \
            xargs -I {} dirname {} | \
            sort -u | \
            jq -R -s -c 'split("\n") | map(select(. != ""))')
          echo "dirs=$DIRS" >> "$GITHUB_OUTPUT"

  plan:
    needs: detect
    if: needs.detect.outputs.dirs != '[]'
    strategy:
      matrix:
        dir: ${{ fromJson(needs.detect.outputs.dirs) }}
      fail-fast: false
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Plan ${{ matrix.dir }}
        working-directory: ${{ matrix.dir }}
        run: |
          terraform init
          terraform plan -out=tfplan -no-color 2>&1 | tee plan-output.txt
```

## Preventing Concurrent Applies

When multiple PRs merge in quick succession, you need to prevent concurrent applies that could corrupt state:

```yaml
# Use concurrency groups to serialize applies
apply:
  if: github.event_name == 'push'
  runs-on: ubuntu-latest
  concurrency:
    group: terraform-apply-production
    cancel-in-progress: false  # Queue, don't cancel
  steps:
    - name: Terraform Apply
      run: terraform apply -auto-approve
```

## Adding Required Plan Review Labels

Add a label-based gate so reviewers must explicitly confirm they reviewed the plan:

```yaml
- name: Check Plan Reviewed Label
  if: github.event_name == 'pull_request'
  run: |
    LABELS=$(gh pr view ${{ github.event.pull_request.number }} --json labels -q '.labels[].name')
    if echo "$LABELS" | grep -q "plan-reviewed"; then
      echo "Plan has been reviewed"
    else
      echo "ERROR: Add 'plan-reviewed' label after reviewing the plan"
      exit 1
    fi
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Drift Detection

Schedule periodic plans to detect drift between your code and actual infrastructure:

```yaml
# .github/workflows/drift-detection.yml
name: Drift Detection
on:
  schedule:
    - cron: '0 8 * * 1-5'  # Weekdays at 8am

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for Drift
        working-directory: infrastructure
        run: |
          terraform init
          terraform plan -detailed-exitcode -no-color 2>&1 | tee drift-output.txt
          EXIT_CODE=${PIPESTATUS[0]}

          if [ $EXIT_CODE -eq 2 ]; then
            echo "DRIFT DETECTED - creating issue"
            gh issue create \
              --title "Infrastructure drift detected $(date +%Y-%m-%d)" \
              --body "$(cat drift-output.txt)" \
              --label "drift,infrastructure"
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Summary

A solid PR-based Terraform workflow includes these components:

1. Automatic plan on every PR that touches `.tf` files
2. Plan output posted as a PR comment for easy review
3. Branch protection requiring plan success and human approval
4. CODEOWNERS to route reviews to the right teams
5. Apply triggered only on merge to main
6. Concurrency controls to prevent parallel applies
7. Drift detection on a schedule to catch manual changes

This workflow catches problems before they reach production and creates an audit trail of every infrastructure change. For adding security checks to this pipeline, see [Terraform CI/CD security best practices](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-security-best-practices/view).

# How to Run Terraform Plan as a Pull Request Check

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, CI/CD, GitHub Actions, DevOps

Description: Set up automated Terraform plan checks on pull requests using GitHub Actions to catch infrastructure issues before they hit production.

---

Running `terraform plan` locally before merging a PR is something every team does - or at least should do. But relying on developers to remember that step isn't exactly reliable. Automating it as a pull request check gives you a safety net. Every infrastructure change gets a plan output right in the PR, visible to the whole team.

This guide covers setting up Terraform plan as an automated PR check using GitHub Actions, though the concepts apply to other CI systems too.

## Why Automate Terraform Plan?

Manual plan reviews have gaps. Someone might forget to run the plan. They might run it against the wrong workspace. Or they might have stale local state that gives misleading output. An automated check eliminates all of that.

With an automated plan, every PR gets:

- A consistent plan run against the correct state
- Plan output posted as a PR comment for easy review
- A pass/fail check that blocks merging on errors
- A clear record of what changes will be applied

## The GitHub Actions Workflow

Here's a complete workflow that runs Terraform plan on PRs and posts the output as a comment.

```yaml
# .github/workflows/terraform-plan.yml
name: Terraform Plan

on:
  pull_request:
    branches: [main]
    paths:
      - 'terraform/**'  # Only trigger for Terraform file changes

permissions:
  contents: read
  pull-requests: write
  id-token: write  # Needed for OIDC authentication

jobs:
  terraform-plan:
    name: Terraform Plan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111111111111:role/terraform-ci
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: true  # Enables capturing output

      - name: Terraform Init
        id: init
        run: terraform init -no-color
        working-directory: terraform/

      - name: Terraform Validate
        id: validate
        run: terraform validate -no-color
        working-directory: terraform/

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        working-directory: terraform/
        continue-on-error: true

      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const output = `#### Terraform Init: \`${{ steps.init.outcome }}\`
            #### Terraform Validate: \`${{ steps.validate.outcome }}\`
            #### Terraform Plan: \`${{ steps.plan.outcome }}\`

            <details><summary>Show Plan Output</summary>

            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\`

            </details>

            *Triggered by @${{ github.actor }}, commit: ${{ github.sha }}*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

      - name: Fail on Plan Error
        if: steps.plan.outcome == 'failure'
        run: exit 1
```

Let me break down the key pieces.

## OIDC Authentication

The workflow uses OIDC federation to authenticate with AWS. This is the recommended approach - no static credentials stored as GitHub secrets.

You'll need an IAM role that trusts GitHub's OIDC provider:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:*"
        }
      }
    }
  ]
}
```

## Path Filtering

The `paths` filter in the workflow trigger is important. You don't want Terraform plans running on every PR - only those that touch infrastructure code:

```yaml
on:
  pull_request:
    branches: [main]
    paths:
      - 'terraform/**'
      - '.github/workflows/terraform-plan.yml'
```

Including the workflow file itself in the paths means changes to the CI pipeline also trigger a test run.

## Handling Multiple Terraform Directories

Many projects have separate Terraform configurations for different components. A matrix strategy handles this cleanly.

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      directories: ${{ steps.dirs.outputs.directories }}
    steps:
      - uses: actions/checkout@v4
      - name: Find changed directories
        id: dirs
        run: |
          # Find Terraform directories with changes
          dirs=$(git diff --name-only origin/main...HEAD | \
            grep '\.tf$' | \
            xargs -I {} dirname {} | \
            sort -u | \
            jq -R -s -c 'split("\n") | map(select(length > 0))')
          echo "directories=$dirs" >> $GITHUB_OUTPUT

  terraform-plan:
    needs: detect-changes
    if: needs.detect-changes.outputs.directories != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        directory: ${{ fromJson(needs.detect-changes.outputs.directories) }}
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init -no-color
        working-directory: ${{ matrix.directory }}

      - name: Terraform Plan
        run: terraform plan -no-color
        working-directory: ${{ matrix.directory }}
```

## Storing Plan Files for Apply

A nice pattern is saving the plan file as an artifact. When the PR merges, a separate workflow can apply that exact plan - no drift between plan and apply.

```yaml
      - name: Terraform Plan
        run: terraform plan -no-color -out=tfplan
        working-directory: terraform/

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan-${{ github.event.pull_request.number }}
          path: terraform/tfplan
          retention-days: 7
```

## Required Status Checks

After the workflow is running, configure it as a required check in your repository settings. Go to Settings, then Branches, then Branch protection rules. Add the Terraform Plan job as a required status check. This prevents merging any PR that has a failed plan.

## Handling Sensitive Output

Terraform plans can contain sensitive values. To avoid leaking them in PR comments, use the `sensitive` flag in your outputs:

```hcl
# Mark outputs as sensitive so they don't appear in plan
output "database_password" {
  value     = random_password.db.result
  sensitive = true
}
```

You can also filter the plan output in your workflow:

```yaml
      - name: Sanitize Plan Output
        id: sanitized
        run: |
          # Remove lines that might contain secrets
          plan_output=$(echo "${{ steps.plan.outputs.stdout }}" | \
            sed '/password/d; /secret/d; /token/d')
          echo "plan=$plan_output" >> $GITHUB_OUTPUT
```

## Cost Estimation

Adding cost estimation to your PR checks is a great addition. Infracost integrates nicely:

```yaml
      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - name: Run Infracost
        run: |
          infracost breakdown --path terraform/ \
            --format json --out-file /tmp/infracost.json

      - name: Post Infracost Comment
        uses: infracost/actions/comment@v3
        with:
          path: /tmp/infracost.json
          behavior: update
```

This adds a cost breakdown to every PR, so reviewers can see the financial impact of infrastructure changes.

## Locking and State

When multiple PRs modify the same Terraform state, plan output can be misleading. The plan for PR-A might not account for changes in PR-B. A few strategies help here:

- Use separate state files for independent components
- Run plans sequentially using concurrency groups
- Re-run plans after rebasing on main

```yaml
# Ensure only one plan runs at a time for the same state
concurrency:
  group: terraform-plan-${{ github.base_ref }}
  cancel-in-progress: true
```

For broader CI/CD security scanning, see how to [use Checkov for Terraform security scanning](https://oneuptime.com/blog/post/2026-02-12-checkov-terraform-security-scanning/view).

## Notifications

Besides PR comments, you might want Slack notifications for failed plans:

```yaml
      - name: Notify on Failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Terraform plan failed on PR #${{ github.event.pull_request.number }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Summary

Automating Terraform plan as a PR check takes maybe 30 minutes to set up and saves hours of manual review work. You get consistent plans, visible output for the team, and a hard gate against broken infrastructure changes. Combined with OIDC authentication and cost estimation, it becomes a solid foundation for infrastructure change management.

The key is treating infrastructure code with the same rigor as application code - automated checks, peer review, and controlled deployments.

# How to Add Terraform Plan Comments to Pull Requests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitHub Actions, Pull Requests, CI/CD, Code Review, DevOps, Infrastructure as Code

Description: Automatically post Terraform plan output as pull request comments in GitHub Actions so reviewers can see infrastructure changes without running plans locally.

---

When someone opens a pull request that modifies Terraform code, the reviewer needs to know what infrastructure changes the code will produce. Without automated plan output in the PR, reviewers either run `terraform plan` locally (which requires credentials and state access) or review the code changes blindly and hope for the best.

Posting Terraform plan output directly into pull request comments solves this. Every PR shows exactly what will be created, modified, or destroyed. This post covers several approaches, from a simple script to a polished solution with collapsible sections, status indicators, and comment updates.

## The Simple Approach

The most basic implementation captures the plan output and posts it as a comment:

```yaml
# .github/workflows/terraform-plan.yml
name: Terraform Plan

on:
  pull_request:
    paths:
      - 'terraform/**'
      - '.github/workflows/terraform-plan.yml'

permissions:
  contents: read
  pull-requests: write

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init
        working-directory: terraform

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -input=false
        working-directory: terraform
        continue-on-error: true

      - name: Post plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const plan = `${{ steps.plan.outputs.stdout }}`;
            const body = `### Terraform Plan\n\`\`\`\n${plan}\n\`\`\``;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body,
            });
```

This works, but it has problems. Every push to the PR creates a new comment, flooding the conversation. Long plan output can exceed GitHub's comment size limit. And there is no visual indication of whether the plan succeeded or failed.

## The Better Approach: Update Existing Comments

Instead of creating a new comment on every push, find and update the existing one:

```yaml
name: Terraform Plan

on:
  pull_request:
    paths:
      - 'terraform/**'

permissions:
  contents: read
  pull-requests: write

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        id: init
        run: terraform init -no-color
        working-directory: terraform

      - name: Terraform Validate
        id: validate
        run: terraform validate -no-color
        working-directory: terraform

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -input=false -detailed-exitcode
        working-directory: terraform
        continue-on-error: true

      - name: Post plan comment
        uses: actions/github-script@v7
        env:
          PLAN_OUTPUT: ${{ steps.plan.outputs.stdout }}
          PLAN_EXIT_CODE: ${{ steps.plan.outputs.exitcode }}
        with:
          script: |
            // Determine plan status
            const exitCode = process.env.PLAN_EXIT_CODE;
            let statusEmoji, statusText;
            if (exitCode === '0') {
              statusEmoji = '';
              statusText = 'No changes';
            } else if (exitCode === '2') {
              statusEmoji = '';
              statusText = 'Changes detected';
            } else {
              statusEmoji = '';
              statusText = 'Plan failed';
            }

            // Truncate long output
            let planOutput = process.env.PLAN_OUTPUT || 'No output captured';
            const MAX_LENGTH = 60000;
            if (planOutput.length > MAX_LENGTH) {
              planOutput = planOutput.substring(0, MAX_LENGTH) +
                '\n\n... Output truncated. View full plan in Actions logs.';
            }

            // Build the comment body
            const body = `## Terraform Plan - ${statusText}

            | Step | Status |
            |------|--------|
            | Init | \`${{ steps.init.outcome }}\` |
            | Validate | \`${{ steps.validate.outcome }}\` |
            | Plan | \`${{ steps.plan.outcome }}\` |

            <details>
            <summary>Show Plan Output</summary>

            \`\`\`hcl
            ${planOutput}
            \`\`\`

            </details>

            *Updated: ${new Date().toISOString()}*
            *Commit: \`${context.sha.substring(0, 8)}\`*`;

            // Find existing bot comment
            const COMMENT_MARKER = '## Terraform Plan -';
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const existingComment = comments.find(c =>
              c.body.startsWith(COMMENT_MARKER)
            );

            if (existingComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existingComment.id,
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

## Handling Multiple Terraform Directories

Many repositories have multiple Terraform configurations (for example, separate directories for networking, compute, and databases). Post a separate plan for each:

```yaml
name: Terraform Plan - Multi Directory

on:
  pull_request:
    paths:
      - 'infrastructure/**'

permissions:
  contents: read
  pull-requests: write

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      directories: ${{ steps.dirs.outputs.directories }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Find changed Terraform directories
        id: dirs
        run: |
          # Find directories with changed .tf files
          DIRS=$(git diff --name-only origin/main...HEAD \
            | grep '\.tf$' \
            | xargs -I{} dirname {} \
            | sort -u \
            | jq -R -s -c 'split("\n") | map(select(length > 0))')
          echo "directories=$DIRS" >> $GITHUB_OUTPUT

  plan:
    needs: detect-changes
    if: needs.detect-changes.outputs.directories != '[]'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        directory: ${{ fromJson(needs.detect-changes.outputs.directories) }}
      fail-fast: false
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.5"

      - name: Terraform Init
        run: terraform init -no-color
        working-directory: ${{ matrix.directory }}

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -input=false
        working-directory: ${{ matrix.directory }}
        continue-on-error: true

      - name: Post plan comment
        uses: actions/github-script@v7
        env:
          PLAN_OUTPUT: ${{ steps.plan.outputs.stdout }}
          DIRECTORY: ${{ matrix.directory }}
        with:
          script: |
            const dir = process.env.DIRECTORY;
            let plan = process.env.PLAN_OUTPUT || 'No output';
            if (plan.length > 50000) {
              plan = plan.substring(0, 50000) + '\n... truncated';
            }

            const marker = `<!-- tf-plan-${dir} -->`;
            const body = `${marker}
            ## Terraform Plan: \`${dir}\`

            <details>
            <summary>Show Plan</summary>

            \`\`\`hcl
            ${plan}
            \`\`\`

            </details>

            *Commit: \`${context.sha.substring(0, 8)}\`*`;

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const existing = comments.find(c => c.body.includes(marker));

            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
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

## Handling Sensitive Output

Terraform plans can contain sensitive values like passwords, API keys, or database connection strings. By default, Terraform masks these in plan output, but you should add an extra layer of protection:

```yaml
- name: Terraform Plan
  id: plan
  run: |
    # Run plan and capture output
    terraform plan -no-color -input=false 2>&1 | tee plan_output.txt

    # Remove any lines that might contain sensitive data
    # This is a safety net - Terraform should already mask these
    sed -i 's/password.*=.*/password = [REDACTED]/gi' plan_output.txt
    sed -i 's/secret.*=.*/secret = [REDACTED]/gi' plan_output.txt
    sed -i 's/api_key.*=.*/api_key = [REDACTED]/gi' plan_output.txt

    echo "plan_output=$(cat plan_output.txt)" >> $GITHUB_OUTPUT
  working-directory: terraform
  continue-on-error: true
```

## Using Third-Party Actions

If you do not want to write your own comment logic, several community actions handle this:

```yaml
# Using the terraform-pr-commenter action
- name: Post plan to PR
  uses: robburger/terraform-pr-commenter@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    commenter_type: plan
    commenter_input: ${{ format('{0}{1}', steps.plan.outputs.stdout, steps.plan.outputs.stderr) }}
    commenter_exitcode: ${{ steps.plan.outputs.exitcode }}
```

These actions handle comment formatting, updating existing comments, and truncation automatically. The trade-off is less control over the comment format.

## Adding a Plan Summary

For large plans, it helps to include a summary at the top showing the resource count:

```yaml
- name: Terraform Plan
  id: plan
  run: |
    terraform plan -no-color -input=false -out=tfplan 2>&1 | tee plan_raw.txt
    terraform show -no-color tfplan | tee plan_output.txt

    # Extract the summary line
    SUMMARY=$(grep -E "Plan:|No changes" plan_output.txt | tail -1)
    echo "summary=$SUMMARY" >> $GITHUB_OUTPUT
  working-directory: terraform
  continue-on-error: true

- name: Post plan comment
  uses: actions/github-script@v7
  env:
    PLAN_OUTPUT: ${{ steps.plan.outputs.stdout }}
    PLAN_SUMMARY: ${{ steps.plan.outputs.summary }}
  with:
    script: |
      const summary = process.env.PLAN_SUMMARY || 'Summary not available';
      const plan = process.env.PLAN_OUTPUT || 'No output';

      const body = `## Terraform Plan

      **Summary:** ${summary}

      <details>
      <summary>Full Plan Output</summary>

      \`\`\`hcl
      ${plan.substring(0, 60000)}
      \`\`\`

      </details>`;

      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: body,
      });
```

## Failing the Check on Destructive Changes

You might want the workflow to fail (or at least warn) when the plan includes resource destruction:

```yaml
- name: Check for destructive changes
  if: steps.plan.outputs.exitcode == '2'
  run: |
    # Check if the plan includes any resource destruction
    if echo "${{ steps.plan.outputs.stdout }}" | grep -q "will be destroyed"; then
      echo "WARNING: This plan includes resource destruction!"
      echo "destructive=true" >> $GITHUB_OUTPUT
    fi
```

## Conclusion

Automated plan comments transform the Terraform review process. Reviewers see the exact impact of code changes without needing local credentials or state access. Start with a simple comment that posts the full plan output, then iterate to add features like comment updates, collapsible sections, and multi-directory support. The goal is to give every reviewer the same visibility that the person writing the code has.

For setting up the Terraform action itself, see our guide on [the hashicorp/setup-terraform action](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-hashicorp-setup-terraform-github-action/view).

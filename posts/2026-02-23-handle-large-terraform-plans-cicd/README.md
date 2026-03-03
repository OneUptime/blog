# How to Handle Large Terraform Plans in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, DevOps, Performance, Infrastructure as Code

Description: Strategies for managing large Terraform plans in CI/CD pipelines including plan splitting, parallel execution, targeted plans, and output management techniques.

---

When your Terraform codebase grows, plan times balloon. What started as a 30-second plan becomes a 15-minute ordeal that blocks your entire pipeline. Large plans also produce massive output that's hard to review and can hit CI/CD platform limits for comment sizes on pull requests.

This post covers practical strategies for handling large Terraform plans without losing your mind or your pipeline reliability.

## Why Large Plans Are a Problem

A Terraform plan refreshes every resource in your state before calculating changes. If you have 500 resources, that's 500 API calls to your cloud provider just to check current state. This creates several issues:

- Slow feedback loops for developers waiting on PRs
- API rate limiting from cloud providers
- Pipeline timeouts
- PR comments exceeding platform character limits
- Difficulty reviewing massive diffs

## Split Your State

The most effective solution is breaking your monolith into smaller, focused state files. Each state file should represent a logical boundary.

```text
# Directory structure for split states
infrastructure/
  networking/        # VPCs, subnets, route tables
    main.tf
    backend.tf
  compute/           # EC2, ASGs, load balancers
    main.tf
    backend.tf
  database/          # RDS, ElastiCache
    main.tf
    backend.tf
  monitoring/        # CloudWatch, alerts
    main.tf
    backend.tf
```

Each directory gets its own backend configuration:

```hcl
# infrastructure/networking/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "networking/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

Share data between states using `terraform_remote_state` or data sources:

```hcl
# infrastructure/compute/data.tf
# Read outputs from the networking state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use networking outputs in compute resources
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  # Reference the VPC output from networking state
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}
```

## Run Plans Only for Changed Directories

Don't plan everything on every commit. Detect which Terraform directories changed and only plan those.

```yaml
# .github/workflows/terraform.yml
name: Terraform Plan
on:
  pull_request:
    paths: ['infrastructure/**']

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      directories: ${{ steps.changes.outputs.directories }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Find which Terraform directories have changes
      - name: Detect changed directories
        id: changes
        run: |
          # Get list of changed files
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD)

          # Extract unique Terraform directories
          DIRS=$(echo "$CHANGED_FILES" | \
            grep '\.tf$' | \
            xargs -I {} dirname {} | \
            sort -u | \
            jq -R -s -c 'split("\n") | map(select(. != ""))')

          echo "directories=$DIRS" >> "$GITHUB_OUTPUT"
          echo "Changed directories: $DIRS"

  plan:
    needs: detect-changes
    if: needs.detect-changes.outputs.directories != '[]'
    runs-on: ubuntu-latest
    strategy:
      # Run plans in parallel for each changed directory
      matrix:
        directory: ${{ fromJson(needs.detect-changes.outputs.directories) }}
      fail-fast: false
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        working-directory: ${{ matrix.directory }}
        run: |
          terraform init
          terraform plan -out=tfplan -no-color 2>&1 | tee plan-output.txt
```

## Use Targeted Plans for Quick Feedback

When you know exactly what you're changing, use `-target` to plan only specific resources during development. This gives much faster feedback.

```yaml
# Quick targeted plan for specific resources
- name: Targeted Plan
  run: |
    # Only plan specific resources that changed
    terraform plan \
      -target=module.api_gateway \
      -target=aws_lambda_function.handler \
      -out=tfplan \
      -no-color
```

Just make sure your final pipeline runs a full plan before apply. Targeted plans can miss dependency changes.

## Handle Large Plan Output

Large plans generate output that can overwhelm PR comments. GitHub has a 65,536 character limit for PR comments. Here is a strategy to handle that:

```yaml
# .github/workflows/terraform.yml
- name: Post Plan to PR
  uses: actions/github-script@v7
  if: github.event_name == 'pull_request'
  with:
    script: |
      const fs = require('fs');
      let planOutput = fs.readFileSync('plan-output.txt', 'utf8');

      // Truncate if too long for PR comment
      const MAX_LENGTH = 60000;
      let truncated = false;

      if (planOutput.length > MAX_LENGTH) {
        truncated = true;
        // Keep the summary at the end (plan: X to add, Y to change, Z to destroy)
        const lines = planOutput.split('\n');
        const summaryLines = lines.slice(-5).join('\n');
        planOutput = planOutput.substring(0, MAX_LENGTH - 500) +
          '\n\n... (truncated) ...\n\n' + summaryLines;
      }

      const body = `### Terraform Plan - \`${{ matrix.directory }}\`

      ${truncated ? '> Plan output was truncated. See CI logs for full output.\n' : ''}

      <details>
      <summary>Show Plan (click to expand)</summary>

      \`\`\`
      ${planOutput}
      \`\`\`

      </details>`;

      // Find existing comment to update instead of creating new ones
      const { data: comments } = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
      });

      const botComment = comments.find(c =>
        c.body.includes(`Terraform Plan - \`${{ matrix.directory }}\``)
      );

      if (botComment) {
        await github.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: botComment.id,
          body: body
        });
      } else {
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.issue.number,
          body: body
        });
      }
```

## Save Plan Artifacts

For very large plans, save the full output as a pipeline artifact instead of trying to fit it in a comment:

```yaml
# Upload full plan output as artifact
- name: Upload Plan Output
  uses: actions/upload-artifact@v4
  with:
    name: plan-${{ matrix.directory }}
    path: |
      ${{ matrix.directory }}/plan-output.txt
      ${{ matrix.directory }}/tfplan
    retention-days: 7
```

## Increase Parallelism

Terraform makes API calls to refresh state sequentially by default. Increase the parallelism flag:

```yaml
- name: Terraform Plan
  run: |
    # Default parallelism is 10, increase for faster plans
    terraform plan -parallelism=30 -out=tfplan -no-color
```

Be careful not to set this too high or you will hit cloud provider API rate limits. 20-30 is usually a good sweet spot.

## Use Refresh-Only When Appropriate

If you're troubleshooting drift without making changes, a refresh-only plan is faster:

```bash
# Only refresh state, don't calculate changes
terraform plan -refresh-only -out=tfplan
```

## Pipeline Timeout Configuration

Set appropriate timeouts so large plans don't hang indefinitely:

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # Kill if plan takes longer than 30 minutes
    steps:
      - name: Terraform Plan
        timeout-minutes: 20  # Step-level timeout
        run: terraform plan -out=tfplan -no-color
```

## Summary

Handling large Terraform plans comes down to a few key strategies:

1. Split your monolith into smaller state files along logical boundaries
2. Only plan directories that actually changed
3. Run plans in parallel across directories
4. Truncate plan output for PR comments, save full output as artifacts
5. Increase Terraform parallelism to speed up refresh cycles
6. Set appropriate timeouts to catch runaway plans

Start with state splitting - it gives you the biggest return. From there, add change detection and parallel execution to keep your pipeline fast as your infrastructure grows. For tips on optimizing your pipeline further, check out [optimizing Terraform CI/CD pipeline performance](https://oneuptime.com/blog/post/2026-02-23-optimize-terraform-cicd-pipeline-performance/view).

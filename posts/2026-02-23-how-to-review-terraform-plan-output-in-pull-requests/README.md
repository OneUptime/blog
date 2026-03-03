# How to Review Terraform Plan Output in Pull Requests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Code Review, Pull Requests, DevOps, Infrastructure as Code

Description: Master the art of reviewing Terraform plan output in pull requests to catch risky infrastructure changes before they reach production environments.

---

Reviewing Terraform plan output is one of the most critical skills for any infrastructure engineer. The plan shows you exactly what Terraform intends to do before it does it. When this output appears in a pull request, reviewers have a chance to catch destructive changes, unexpected resource modifications, and configuration drift before anything touches production.

Yet many teams treat plan review as a rubber stamp. They glance at the summary line, see "3 to add, 1 to change, 0 to destroy," and approve without digging deeper. This guide teaches you how to review Terraform plan output effectively and build processes that make reviews thorough and efficient.

## Understanding the Plan Output Structure

Terraform plan output follows a consistent structure. Understanding this structure is the first step to effective review.

```text
# Example plan output structure
Terraform will perform the following actions:

  # aws_instance.web will be created
  + resource "aws_instance" "web" {
      + ami                    = "ami-0c55b159cbfafe1f0"
      + instance_type          = "t3.medium"
      + vpc_security_group_ids = [
          + "sg-0a1b2c3d4e5f6g7h8",
        ]
      + tags = {
          + "Name"        = "web-server"
          + "Environment" = "production"
        }
    }

  # aws_security_group.web will be updated in-place
  ~ resource "aws_security_group" "web" {
        id   = "sg-0a1b2c3d4e5f6g7h8"
        name = "web-sg"
      ~ ingress {
          ~ cidr_blocks = [
              - "10.0.0.0/8",
              + "0.0.0.0/0",
            ]
        }
    }

Plan: 1 to add, 1 to change, 0 to destroy.
```

The symbols tell you the type of change. A `+` means a new resource or attribute. A `-` means removal. A `~` means modification in place. A `-/+` means the resource must be destroyed and recreated.

## Setting Up Plan Output in Pull Requests

Before you can review plans in PRs, you need to post them there. Here is a robust approach that handles large outputs:

```yaml
# .github/workflows/terraform-plan.yml
name: Terraform Plan Review

on:
  pull_request:
    paths:
      - '**/*.tf'
      - '**/*.tfvars'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        run: terraform init
        working-directory: environments/production

      - name: Terraform Plan
        id: plan
        run: |
          # Save plan to file for later use
          terraform plan -no-color -out=tfplan 2>&1 | tee plan_output.txt
          # Create a summary for the PR comment
          terraform show -no-color tfplan > plan_details.txt
        working-directory: environments/production
        continue-on-error: true

      - name: Post Plan to PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync(
              'environments/production/plan_output.txt', 'utf8'
            );

            // Truncate if too long for a PR comment
            const maxLength = 60000;
            const truncated = plan.length > maxLength
              ? plan.substring(0, maxLength) + '\n... (truncated)'
              : plan;

            const body = `## Terraform Plan Output
            <details>
            <summary>Click to expand full plan</summary>

            \`\`\`hcl
            ${truncated}
            \`\`\`
            </details>

            **Plan Summary:** Check the bottom of the plan output above.
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

Using the `<details>` HTML tag keeps the PR comment collapsed by default, preventing long plans from cluttering the conversation.

## What to Look for During Review

When reviewing a Terraform plan, focus on these critical areas in order of importance.

### Destructive Changes

The most dangerous operations are destroys and recreations. Look for the `-/+` symbol, which means Terraform will delete a resource and create a new one. This can cause downtime.

```text
# DANGER: This resource will be destroyed and recreated
-/+ resource "aws_db_instance" "main" {
      ~ id                = "mydb" -> (known after apply)
      ~ endpoint          = "mydb.abc123.us-east-1.rds.amazonaws.com" -> (known after apply)
        name              = "production-db"
      ~ engine_version    = "13.4" -> "14.1"  # Forces replacement
    }
```

A database replacement means data loss unless you have taken precautions. Always verify whether the change truly requires replacement or if an in-place update is possible.

### Security-Sensitive Changes

Watch for changes to security groups, IAM policies, encryption settings, and network configurations:

```text
# RED FLAG: Opening security group to the world
~ resource "aws_security_group_rule" "api" {
    ~ cidr_blocks = [
        - "10.0.0.0/8",
        + "0.0.0.0/0",     # This opens access to everyone
      ]
  }

# RED FLAG: Overly permissive IAM policy
+ resource "aws_iam_policy" "admin" {
    + policy = jsonencode({
        Statement = [{
          Effect   = "Allow"
          Action   = "*"        # Full admin access
          Resource = "*"
        }]
      })
  }
```

Any change to CIDR blocks, IAM actions, or encryption flags should receive extra scrutiny.

### Unexpected Changes

Sometimes a plan shows changes you did not intend. This often happens due to provider upgrades, state drift, or implicit dependencies:

```text
# Unexpected change - nobody modified this resource
~ resource "aws_lambda_function" "processor" {
    ~ last_modified     = "2024-01-15" -> (known after apply)
    ~ source_code_hash  = "abc123" -> "def456"
  }
```

If you see changes to resources that should not be affected by the PR, investigate before approving.

## Building a Review Checklist

Create a structured checklist that reviewers follow for every plan:

```markdown
## Terraform Plan Review Checklist

### Safety
- [ ] No unexpected resource destructions
- [ ] No force-replacement operations on stateful resources
- [ ] Plan matches the stated intent of the PR

### Security
- [ ] No security groups opened to 0.0.0.0/0
- [ ] No overly permissive IAM policies
- [ ] Encryption enabled on new storage resources
- [ ] No secrets or credentials in plain text

### Cost
- [ ] Instance types are appropriate for the workload
- [ ] No unexpected resource additions
- [ ] Storage sizes are reasonable

### Operations
- [ ] Changes can be rolled back if needed
- [ ] No changes to shared resources without coordination
- [ ] Tagging follows organizational standards
```

Add this checklist to your pull request template so reviewers see it with every PR.

## Handling Large Plan Outputs

Large plans with hundreds of changes are difficult to review. Break them down using targeted plans:

```bash
# Plan only specific resources
terraform plan -target=module.networking -no-color

# Plan with a specific variable file
terraform plan -var-file=production.tfvars -no-color
```

You can also use tools that parse plan output into more readable formats:

```bash
# Use terraform show with JSON output for programmatic analysis
terraform show -json tfplan > plan.json

# Parse the JSON to extract key changes
cat plan.json | jq '.resource_changes[] |
  select(.change.actions != ["no-op"]) |
  {address, actions: .change.actions}'
```

This JSON output can be processed by custom scripts that highlight only the most important changes.

## Automating Risk Assessment

Build automation that categorizes changes by risk level:

```python
# scripts/assess_plan_risk.py
import json
import sys

# Load the plan JSON
with open(sys.argv[1]) as f:
    plan = json.load(f)

high_risk = []
medium_risk = []
low_risk = []

for change in plan.get('resource_changes', []):
    actions = change['change']['actions']
    resource_type = change['type']

    # High risk: deletions of stateful resources
    if 'delete' in actions and resource_type in [
        'aws_db_instance', 'aws_s3_bucket',
        'aws_efs_file_system', 'aws_elasticache_cluster'
    ]:
        high_risk.append(change['address'])

    # Medium risk: modifications to security resources
    elif 'update' in actions and resource_type in [
        'aws_security_group', 'aws_iam_policy',
        'aws_iam_role', 'aws_kms_key'
    ]:
        medium_risk.append(change['address'])

    # Low risk: tag-only changes, additions
    else:
        low_risk.append(change['address'])

# Output the risk assessment
print(f"HIGH RISK ({len(high_risk)}): {high_risk}")
print(f"MEDIUM RISK ({len(medium_risk)}): {medium_risk}")
print(f"LOW RISK ({len(low_risk)}): {low_risk}")
```

Integrate this script into your CI pipeline so that high-risk plans are flagged automatically.

## Monitoring Plan Failures

Track plan failures over time to identify patterns. If plans frequently fail due to state drift or provider issues, that signals an underlying problem. Tools like [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-pull-request-workflows/view) can monitor your CI pipelines and alert you when plan failure rates spike.

## Best Practices for Plan Review

Always compare the plan against the PR description. If the PR says "add a new EC2 instance" but the plan shows security group changes, ask why. The plan should match the stated intent.

Review plans in the context of the broader system. A change to a load balancer target group might seem benign, but if it removes a healthy instance from rotation, it could cause an outage.

Never approve a plan you do not fully understand. If a change uses a resource type or provider feature you are unfamiliar with, take the time to read the documentation. The few minutes spent understanding the change can prevent hours of incident response.

Terraform plan review is a skill that improves with practice. The more plans you review, the faster you will spot issues and the more confident you will be in approving safe changes.

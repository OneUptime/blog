# How to Use tofu plan to Preview Changes - Tofu Preview Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use tofu plan to preview infrastructure changes before applying them, understand the plan output, and save plans for later review and application.

## Introduction

`tofu plan` creates an execution plan showing what changes OpenTofu will make to your infrastructure. It's the most important safety mechanism in OpenTofu - always run plan and review it before applying changes to production.

## Basic Usage

```bash
# Preview changes

tofu plan

# Example output:
# OpenTofu will perform the following actions:
#
#   # aws_instance.web will be created
#   + resource "aws_instance" "web" {
#       + ami           = "ami-0c55b159cbfafe1f0"
#       + instance_type = "t3.micro"
#       + id            = (known after apply)
#       + tags          = {
#           + "Name" = "web-server"
#         }
#     }
#
# Plan: 1 to add, 0 to change, 0 to destroy.
```

## Reading the Plan Output

The plan uses symbols to indicate the type of change:

- `+` - Resource will be **created**
- `-` - Resource will be **destroyed**
- `~` - Resource will be **modified in place**
- `-/+` - Resource will be **destroyed and recreated**
- `<= ` - Data source will be **read**

```bash
# Example: modify in place
~  aws_instance.web (in-place update)
  ~ instance_type = "t3.micro" -> "t3.small"  # Just resize

# Example: destroy and recreate (replacement)
-/+  aws_instance.web (replace)
  ~ ami = "ami-old" -> "ami-new"  # Requires replacement
  + id = (known after apply)
```

## Saving a Plan File

```bash
# Save the plan to a file
tofu plan -out=changes.tfplan

# Apply the saved plan exactly
tofu apply changes.tfplan

# Benefits:
# - OpenTofu applies the saved plan you reviewed
# - No automatic re-planning between review and apply
# - Can be passed between CI stages
```

## Using Variables with Plan

```bash
# Provide variables
tofu plan -var="instance_type=t3.large"

# Use a variable file
tofu plan -var-file=production.tfvars

# Multiple variable sources
tofu plan \
  -var-file=common.tfvars \
  -var-file=production.tfvars \
  -var="override_value=custom"
```

## Targeting Specific Resources

```bash
# Plan only for a specific resource
tofu plan -target=aws_instance.web

# Plan for a module
tofu plan -target=module.networking

# Multiple targets
tofu plan -target=aws_instance.web -target=aws_security_group.web
```

## Understanding Plan Output Options

```bash
# Standard plan output
tofu plan

# Compact warning output
tofu plan -compact-warnings

# JSON UI output for machine processing
tofu plan -json

# Use detailed exit codes in CI
tofu plan -detailed-exitcode
# Exit code:
# 0 = No changes
# 1 = Error
# 2 = Changes detected
```

## Plan Summary Statistics

The plan ends with a summary:

```text
Plan: 3 to add, 1 to change, 0 to destroy.
```

Always check:
- How many resources will be **destroyed** (especially in production)
- Whether any destroy+create replacements are unexpected
- If the plan matches your intent

## Refresh Behavior

```bash
# Plan with refresh (default) - queries actual infrastructure
tofu plan

# Plan without refresh - faster but may miss drift
tofu plan -refresh=false

# Plan to only refresh state (no infrastructure changes)
tofu plan -refresh-only
```

## Comparing Plans

```bash
# Show a saved plan's content
tofu show -plan=changes.tfplan

# Show plan as JSON for programmatic analysis
tofu show -json -plan=changes.tfplan | jq '.resource_changes[] | {address: .address, action: .change.actions}'

# Count changes by type
tofu show -json -plan=changes.tfplan | jq '
  .resource_changes |
  group_by(.change.actions[0]) |
  map({action: .[0].change.actions[0], count: length})
'
```

## Plan in CI/CD

```yaml
# GitHub Actions: post plan to PR
- name: Plan
  id: plan
  shell: bash
  run: tofu plan -no-color -out=tfplan 2>&1 | tee plan_output.txt

- name: Comment PR
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const plan = fs.readFileSync('plan_output.txt', 'utf8');
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `## OpenTofu Plan\n\`\`\`\n${plan}\n\`\`\``
      });
```

## Conclusion

`tofu plan` is your primary tool for understanding what changes will be made before committing to them. Always save plans with `-out` when deploying to production environments so OpenTofu applies the saved plan you reviewed. Pay special attention to resource destructions and replacements, and use the exit code (`-detailed-exitcode`) in CI/CD to detect when changes are present.

# How to Refresh State to Match Real Infrastructure in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to use tofu refresh and tofu apply -refresh-only to synchronize your OpenTofu state file with the actual state of your cloud infrastructure.

## Introduction

OpenTofu's state file is a snapshot of your infrastructure at a point in time. When infrastructure changes outside of OpenTofu - through the cloud console, APIs, or other tools - the state file becomes stale. The refresh operation queries the real infrastructure and updates the state file to reflect reality.

## The Two Refresh Approaches

OpenTofu offers two ways to refresh state:

1. **`tofu apply -refresh-only`** (recommended): Creates a plan showing what state changes would occur, then asks for confirmation before updating
2. **`tofu refresh`** (deprecated): Effectively runs `tofu apply -refresh-only -auto-approve`, so it immediately updates state without confirmation

## Using tofu apply -refresh-only (Recommended)

```bash
# Preview what refresh would change

tofu plan -refresh-only

# Example output:
# Note: Objects have changed outside of OpenTofu
#
#  # aws_instance.web has changed
#  ~ resource "aws_instance" "web" {
#      ~ instance_type = "t3.micro" -> "t3.small"
#    }
#
# This is a refresh-only plan, so OpenTofu will not take any actions
# to undo these. If you were expecting these changes, you can apply this plan.

# Apply the refresh (update state to match reality)
tofu apply -refresh-only
```

This two-step approach lets you review what changed before committing the state update.

## Using tofu refresh (Deprecated)

```bash
# Immediately refresh state without preview
tofu refresh

# The state file is updated to match infrastructure
# No confirmation required
```

The `tofu refresh` command is deprecated. It is effectively an alias for `tofu apply -refresh-only -auto-approve`, so it updates state immediately without a review step. Prefer `tofu apply -refresh-only`.

## When to Refresh State

Refresh state when:
- You've made manual changes in the cloud console that you want to keep
- Another tool (e.g., AWS Auto Scaling) modified resources
- You want to verify that state accurately reflects reality before a destructive operation
- Debugging unexpected plan output

## Automatic Refresh During plan and apply

By default, OpenTofu refreshes state at the start of every `plan` and `apply`:

```bash
# Refresh happens automatically (default behavior)
tofu plan

# Disable auto-refresh for faster plans when you know nothing changed externally
tofu plan -refresh=false
```

## Selective Refresh with -target

You can refresh only specific resources:

```bash
# Refresh only a specific resource
tofu apply -refresh-only -target=aws_instance.web

# Refresh only a module
tofu apply -refresh-only -target=module.compute
```

Use `-target` sparingly; OpenTofu recommends resource targeting only for exceptional circumstances, not routine operations.

## Refreshing with Variables

If your configuration uses variables, provide them during refresh:

```bash
# Refresh with variable file
tofu apply -refresh-only -var-file=prod.tfvars

# Or with individual variables
tofu apply -refresh-only -var="region=us-east-1"
```

## Understanding What Refresh Does

The refresh operation:
1. Reads every resource in state via provider API calls
2. Compares the real attributes with those stored in state
3. Updates state to reflect the current real-world values

It does NOT:
- Create, modify, or destroy any infrastructure
- Change your configuration files
- Apply any plan

## Handling Resources That No Longer Exist

If refresh discovers a resource was deleted externally:

```bash
tofu apply -refresh-only

# Output:
#  - aws_instance.old_server (deleted outside of OpenTofu)
#
# This will remove the resource from state.
# Apply? yes
```

After refresh, the resource is removed from state. If you still have the resource block in your configuration, the next `tofu plan` will show it needs to be created.

## Post-Refresh Validation

After refreshing, always run a plan to verify the state of affairs:

```bash
# After refresh, run a clean plan
tofu plan

# Ideally this shows no changes if you've accepted all external modifications
# If it shows changes, your configuration and reality still differ
```

## Conclusion

Regularly refreshing your OpenTofu state ensures it accurately reflects your infrastructure. Use `tofu apply -refresh-only` as the preferred approach - it gives you visibility into state changes before committing them. In pipelines, keep refresh enabled on critical plans or use refresh-only plans in drift-detection workflows to catch drift early. Combined with drift detection, refresh-only operations form a powerful tool for maintaining state accuracy.

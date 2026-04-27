# How to Refresh State to Match Real Infrastructure in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State

Description: Learn how to use tofu refresh and plan-time refresh to synchronize OpenTofu state with the actual state of real infrastructure.

## Introduction

`tofu refresh` queries the provider APIs for all managed resources and updates the state file with the current real-world values. This detects drift - differences between what state records and what actually exists. Understanding when and how to use refresh is essential for accurate planning.

## How Refresh Works

By default, `tofu plan` runs a refresh step before comparing configuration to state:

```hcl
tofu plan
  → Refresh state (query all resources from API)
  → Compare refreshed state to configuration
  → Show diff (additions, changes, deletions)
```

## tofu refresh Command

```bash
# Refresh state without planning or applying

tofu refresh

# Output shows detected drift:
# aws_security_group.app: Refreshing state... [id=sg-0abc123]
# aws_instance.web: Refreshing state... [id=i-abc123def]
```

After refresh, the state file is updated to reflect current reality. The next `tofu plan` compares your configuration against this refreshed state.

## Refresh During Plan

Control refresh behavior with the `-refresh` flag:

```bash
# Default: refresh before planning (recommended)
tofu plan

# Skip refresh (fast, but may miss drift)
tofu plan -refresh=false

# Explicitly enable refresh (this is the default behavior)
tofu plan -refresh=true
```

## tofu apply -refresh-only

Introduced to replace `tofu refresh`, this command applies only the drift changes to state without making infrastructure changes:

```bash
# Update state to match reality without changing infrastructure
tofu apply -refresh-only

# Preview what refresh-only would change
tofu plan -refresh-only
```

This is safer than `tofu refresh` because it shows what will change in state before committing.

## When to Use Each Approach

| Command | Updates State | Changes Infrastructure | Use When |
|---|---|---|---|
| `tofu plan` | Yes (in memory) | No | Normal planning |
| `tofu refresh` | Yes | No | Detect drift (deprecated) |
| `tofu apply -refresh-only` | Yes | No | Safely update state after drift |
| `tofu plan -refresh=false` | No | No | Quick planning, trust state |

## Handling Deleted Resources

If a resource was deleted outside OpenTofu, refresh detects it:

```bash
tofu apply -refresh-only

# Plan shows:
# - aws_instance.obsolete  (will be removed from state - already deleted)

# Apply removes the deleted resource from state
# Next plan: OpenTofu will try to create it (unless you remove the config block)
```

## Performance: Skipping Refresh

For large configurations, refresh adds significant time. Skip it when you trust state is accurate:

```bash
# Fast plan for configurations you trust haven't drifted
tofu plan -refresh=false

# Apply with refresh disabled
tofu apply -refresh=false
```

## Refresh with Targeting

```bash
# Refresh only a specific resource
tofu apply -refresh-only -target=aws_instance.web

# Useful for investigating specific drift
```

## Conclusion

Refresh synchronizes OpenTofu's state with real infrastructure. Use `tofu apply -refresh-only` as the modern, safe approach to update state after detected drift. Skip refresh with `-refresh=false` in performance-sensitive CI/CD pipelines where you trust state accuracy. Regular refresh-only runs help detect and address drift before it causes planning surprises.

# How to Use -refresh=false Flag in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Performance, DevOps, CLI

Description: Learn when and how to use the -refresh=false flag in Terraform to skip state refresh during plan and apply operations for faster execution.

---

Every time you run `terraform plan` or `terraform apply`, Terraform queries your cloud provider's APIs to check the current state of every resource it manages. For small configurations with a handful of resources, this takes seconds. For large configurations with hundreds or thousands of resources, it can take minutes.

The `-refresh=false` flag tells Terraform to skip that refresh step and trust whatever is already in the state file. This can dramatically speed up your workflow, but it comes with tradeoffs you need to understand.

## What Happens During Normal Refresh

By default, when you run `terraform plan`, Terraform goes through these steps:

1. Read the state file from the backend.
2. Read the configuration from `.tf` files.
3. **Refresh**: Query the cloud provider API for every resource in the state to check its current status.
4. Compare the refreshed state against the configuration.
5. Generate a plan showing what needs to change.

Step 3 is where the time goes. Each resource requires at least one API call, sometimes more. If you have 500 resources across AWS, that's at minimum 500 API calls, each with latency.

## Using -refresh=false

```bash
# Run plan without refreshing state from the cloud provider
terraform plan -refresh=false

# Run apply without refreshing state
terraform apply -refresh=false
```

With this flag, Terraform skips step 3 entirely. It uses whatever state data it already has and compares that directly against your configuration. This means:

- Plans complete much faster.
- You make fewer API calls (helps with rate limiting).
- But Terraform doesn't know about changes made outside of Terraform.

## When to Use -refresh=false

### Fast Iteration During Development

When you're actively developing Terraform configuration and running plans frequently, you probably don't need a full refresh every time. You know nobody else is changing the infrastructure, and you just want to see the effect of your configuration changes.

```bash
# Quick iteration cycle - skip refresh for speed
terraform plan -refresh=false
# Make changes to .tf files
terraform plan -refresh=false
# Make more changes
terraform plan -refresh=false
# Do a full refresh before actually applying
terraform plan
terraform apply
```

### Large State Files

If your state has hundreds of resources, a full refresh can take 5-10 minutes. During active development, that adds up fast.

```bash
# Time the difference
time terraform plan              # With refresh: 4m 32s
time terraform plan -refresh=false  # Without refresh: 12s
```

### Targeting Specific Resources

When you're using `-target` to work on specific resources, refreshing the entire state is wasteful:

```bash
# Only planning changes to one resource - no need to refresh everything
terraform plan -refresh=false -target=aws_instance.web_server
```

### Working Offline or With Limited Connectivity

If you're on a slow connection or want to work partially offline, `-refresh=false` lets you plan against the cached state:

```bash
# Plan against cached state when connectivity is limited
terraform plan -refresh=false
```

### Rate Limit Avoidance

Cloud providers have API rate limits. If you're hitting them during large refreshes, skipping the refresh helps:

```bash
# Avoid rate limiting on providers with strict API limits
terraform plan -refresh=false
```

## When NOT to Use -refresh=false

### Before Applying to Production

Never apply to production with `-refresh=false` unless you've done a full refresh recently. You need to know the current state of your infrastructure before making changes:

```bash
# BAD - applying without knowing current state
terraform apply -refresh=false -auto-approve

# GOOD - full refresh before production apply
terraform plan  # Full refresh happens here
terraform apply
```

### After Manual Changes

If someone changed infrastructure outside Terraform (through the console, CLI, or another tool), you need a full refresh to pick up those changes:

```bash
# Someone changed security group rules in the AWS console
# Do NOT skip refresh - you need to see what changed
terraform plan  # Full refresh shows the manual changes
```

### In CI/CD Pipelines

Your CI/CD pipeline should almost always use a full refresh to catch drift:

```bash
# CI/CD pipeline - always refresh
terraform plan -out=plan.tfplan
terraform apply plan.tfplan
```

The exception is if you have a separate drift detection job that runs periodically, and your apply pipeline can safely rely on the last known state.

### After Long Idle Periods

If nobody has run Terraform against an environment for days or weeks, the state is likely stale:

```bash
# After a long break, always do a full refresh
terraform apply -refresh-only  # Update state first
terraform plan                  # Then plan with current state
```

## Combining -refresh=false with -refresh-only

A good workflow for large configurations is to separate the refresh step from the plan step:

```bash
# Step 1: Refresh the state (updates state file only)
terraform apply -refresh-only -auto-approve

# Step 2: Plan against the freshly refreshed state without refreshing again
terraform plan -refresh=false -out=plan.tfplan

# Step 3: Apply the plan
terraform apply plan.tfplan
```

This way you get accurate state data without paying the refresh cost twice (once during plan, once during apply).

## The -refresh=false Flag with import

You can also use `-refresh=false` with `terraform plan` after importing resources:

```bash
# Import a resource
terraform import aws_instance.web i-0abc123def456

# Plan without refreshing - useful to verify the import matched your config
terraform plan -refresh=false
```

## Performance Comparison

Here's a real-world example showing the impact:

```bash
# Configuration with 200+ AWS resources

# Full plan with refresh
$ time terraform plan
# real    3m 47s
# user    0m 12s
# sys     0m 3s

# Plan without refresh
$ time terraform plan -refresh=false
# real    0m 8s
# user    0m 5s
# sys     0m 1s
```

That's a 28x speedup. For rapid development cycles where you're running plan dozens of times, this saves a lot of time.

## Using -refresh=false in Terraform Cloud

In Terraform Cloud, you can configure the refresh behavior per workspace:

```hcl
# In Terraform Cloud, you can set auto-apply and refresh settings
# through the API or UI, not directly in configuration
```

From the Terraform Cloud UI, go to your workspace settings and configure whether plans should auto-refresh. You can also trigger refresh-only runs through the API.

## State Staleness Risks

When you skip refresh, your state might be stale. Here's what can go wrong:

**Phantom resources**: A resource was deleted outside Terraform, but the state still shows it. Your plan shows no changes, but the apply will fail because the resource doesn't exist.

**Configuration conflicts**: Someone changed a resource attribute outside Terraform. Your plan shows no changes, but when Terraform tries to set the attribute during apply, it might conflict with the manual change.

**Version mismatches**: A resource was updated outside Terraform, changing attributes that affect other resources. Your plan might be based on outdated attribute values.

The bottom line: `-refresh=false` is safe for development and iteration. For anything that involves applying changes to real infrastructure, do a full refresh first.

## A Practical Workflow

Here's a workflow that balances speed and safety:

```bash
# Morning: start with a full refresh
terraform apply -refresh-only -auto-approve

# During development: skip refresh for speed
terraform plan -refresh=false
# ... make changes ...
terraform plan -refresh=false
# ... make more changes ...
terraform plan -refresh=false

# Before applying: do one final full refresh
terraform plan -out=plan.tfplan
terraform apply plan.tfplan
```

## Wrapping Up

The `-refresh=false` flag is a productivity tool for Terraform development. It lets you skip expensive API calls when you know the state is current, dramatically speeding up your plan cycles. But it's a shortcut, not a replacement for proper state refresh. Always do a full refresh before applying changes to real infrastructure, and never use it as a crutch to avoid confronting drift.

For more on Terraform state operations, see our posts on [refreshing state without applying changes](https://oneuptime.com/blog/post/2026-02-23-refresh-terraform-state-without-applying/view) and [optimizing Terraform state performance](https://oneuptime.com/blog/post/2026-02-23-optimize-terraform-state-performance/view).

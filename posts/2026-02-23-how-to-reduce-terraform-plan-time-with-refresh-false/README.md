# How to Reduce Terraform Plan Time with -refresh=false

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Performance, DevOps, Infrastructure as Code, Optimization

Description: Cut Terraform plan execution time dramatically by using -refresh=false to skip state refresh, with guidance on when it is safe and when to avoid it.

---

The biggest time sink in `terraform plan` is the refresh phase. During refresh, Terraform makes an API call for every resource in your state to check its current status. With 500 resources, that is 500+ API calls, and each one takes time. The `-refresh=false` flag tells Terraform to skip all of those API calls and trust that the state file is already up to date.

This can reduce plan time from minutes to seconds. But it comes with trade-offs you need to understand before using it.

## How Refresh Works

By default, `terraform plan` refreshes every resource:

```text
$ terraform plan
aws_vpc.main: Refreshing state... [id=vpc-abc123]
aws_subnet.private[0]: Refreshing state... [id=subnet-def456]
aws_subnet.private[1]: Refreshing state... [id=subnet-ghi789]
aws_security_group.web: Refreshing state... [id=sg-jkl012]
... (hundreds more)
```

Each "Refreshing state" line is an API call to AWS (or whatever provider you are using). These calls check whether the real resource still matches what Terraform has recorded in the state file.

## Using -refresh=false

```bash
# Skip the refresh phase entirely
terraform plan -refresh=false

# Works with apply too
terraform apply -refresh=false
```

### Performance Comparison

```bash
# With refresh (default) - 500 resource state
$ time terraform plan
...
Plan: 2 to add, 1 to change, 0 to destroy.
real    7m42.123s

# Without refresh - same state
$ time terraform plan -refresh=false
...
Plan: 2 to add, 1 to change, 0 to destroy.
real    0m8.456s
```

That is nearly a 60x speedup for a state with 500 resources.

## When -refresh=false Is Safe

### During Development Iteration

When you are editing Terraform code and want fast feedback on whether your changes are syntactically correct and produce the expected plan:

```bash
# Fast iteration cycle
vim main.tf
terraform plan -refresh=false
# Fix issues, repeat
vim main.tf
terraform plan -refresh=false
```

This is the primary use case. You know you have not made any manual changes to the infrastructure, and you just want to see how your code changes affect the plan.

### After a Recent Full Refresh

If you just ran a full plan or refresh, the state is current:

```bash
# Do a full refresh first
terraform refresh

# Now you can safely skip refresh for a while
terraform plan -refresh=false
terraform plan -refresh=false -target=module.app
terraform plan -refresh=false -var="instance_type=t3.large"
```

### In CI/CD for Syntax/Plan Validation

For pull request checks where you want fast feedback on the plan structure (not drift detection):

```yaml
# GitHub Actions - fast PR check
- name: Quick Plan Check
  run: terraform plan -refresh=false -no-color
  # Full refresh happens on merge to main
```

### When Combined with -target

If you are targeting specific resources, skipping refresh on the rest of the state is usually safe:

```bash
# Only care about the Lambda function you are editing
terraform plan -refresh=false -target=aws_lambda_function.processor
```

## When -refresh=false Is NOT Safe

### Before Production Applies

Never apply to production without a refresh. You need to detect drift:

```bash
# ALWAYS do a full refresh before production applies
terraform plan -out=prod.plan   # Full refresh
terraform apply prod.plan
```

### When Others Have Access to the Infrastructure

If multiple people or systems can modify your infrastructure, the state can become stale:

```bash
# Someone else might have changed a security group
# Skip refresh = you won't know about it
terraform plan -refresh=false  # DANGEROUS in this scenario
```

### After a Failed Apply

If a previous apply failed partway through, the state might not match reality:

```bash
# After a failed apply, always do a full refresh
terraform refresh
terraform plan  # Full refresh to reconcile state
```

### For Drift Detection

If you are running scheduled drift detection, the entire point is to refresh:

```bash
# Drift detection MUST refresh
terraform plan -detailed-exitcode  # Full refresh required
```

## Using -refresh-only for Targeted Refresh

Terraform 1.1+ introduced `-refresh-only` mode, which updates the state without planning any changes:

```bash
# Update state to match reality, without planning changes
terraform apply -refresh-only

# You can also review what the refresh found
terraform plan -refresh-only
```

This is useful for periodically syncing your state with reality:

```bash
# Workflow: periodic refresh + fast plans
# Step 1: Refresh state (do this on a schedule or before a session)
terraform apply -refresh-only -auto-approve

# Step 2: Fast plans throughout the day
terraform plan -refresh=false
terraform plan -refresh=false -target=module.api
terraform plan -refresh=false -var="scaling_max=10"
```

## Combining with Other Optimizations

Stack `-refresh=false` with other performance flags for maximum speed:

```bash
# Maximum speed for development iteration
terraform plan \
  -refresh=false \
  -target=module.application \
  -parallelism=30

# Fast apply for a specific change (development only)
terraform apply \
  -refresh=false \
  -target=aws_lambda_function.processor \
  -auto-approve
```

## CI/CD Strategy: Two-Phase Planning

Use a two-phase approach in CI/CD to get fast feedback and safe applies:

```yaml
# Phase 1: Fast check on pull request
pull-request-check:
  steps:
    - name: Quick Validation
      run: |
        terraform init
        terraform validate
        terraform plan -refresh=false -no-color

# Phase 2: Full plan and apply on merge
deploy:
  steps:
    - name: Full Plan with Refresh
      run: |
        terraform init
        terraform plan -out=deploy.plan

    - name: Apply
      run: terraform apply deploy.plan
```

## Environment Variable Configuration

Set default behavior through environment variables:

```bash
# For development environments
export TF_CLI_ARGS_plan="-refresh=false"

# This makes every terraform plan skip refresh by default
# Override when needed:
terraform plan -refresh=true  # Explicit refresh

# For CI/CD, set different defaults per stage
# PR checks: skip refresh
# Deploy: refresh enabled (default)
```

## The -refresh=false and State Lock Interaction

When you skip refresh, Terraform still acquires a state lock. This means you still get protection against concurrent modifications:

```bash
# This still locks the state (prevents concurrent access)
terraform plan -refresh=false

# If you also want to skip the lock (very development only)
terraform plan -refresh=false -lock=false
```

Skipping both refresh and lock is the fastest possible plan but should only be used for local development where you are the only person working on the configuration.

## Refresh Strategies by Environment

| Environment | Refresh Strategy |
|-------------|-----------------|
| Local development | `-refresh=false` most of the time, full refresh once per session |
| PR checks | `-refresh=false` for speed |
| Staging deploy | Full refresh before apply |
| Production deploy | Full refresh, always |
| Drift detection | Full refresh (the whole point) |
| Incident response | Full refresh to understand current state |

## Summary

The `-refresh=false` flag is one of the simplest ways to speed up Terraform plan times. It is safe for development iteration, PR validation, and any situation where you know the state is current. It is not safe for production applies, drift detection, or environments where others can modify infrastructure. The best approach is a two-phase workflow: fast plans with `-refresh=false` during development and PR checks, full plans with refresh for actual deployments.

For more Terraform performance tips, see [how to speed up terraform plan with targeted planning](https://oneuptime.com/blog/post/2026-02-23-how-to-speed-up-terraform-plan-with-targeted-planning/view) and [how to optimize large Terraform state files](https://oneuptime.com/blog/post/2026-02-23-how-to-optimize-large-terraform-state-files/view).

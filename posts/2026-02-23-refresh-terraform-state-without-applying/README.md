# How to Refresh Terraform State Without Applying Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Infrastructure as Code, DevOps, Operations

Description: Learn how to refresh Terraform state to sync it with real infrastructure without making any changes, using terraform refresh and terraform apply -refresh-only.

---

Terraform's state file is supposed to reflect the actual state of your infrastructure. But the real world has a habit of drifting. Someone modifies a security group in the AWS console. An autoscaler changes instance counts. A cloud provider updates a default value. Suddenly your state file is out of date.

Refreshing the state updates Terraform's knowledge of what actually exists without changing anything. Here's how to do it properly.

## The Difference Between refresh and plan

It's worth clarifying what "refresh" means in Terraform:

- **Refresh**: Terraform queries your cloud provider's APIs to get the current state of every resource it manages, then updates the state file to match reality.
- **Plan**: Terraform compares the refreshed state against your configuration to determine what changes need to be made.

A refresh only updates the state file. It doesn't modify any infrastructure, and it doesn't show you what Terraform would change if you ran apply. That's what plan is for.

## The Old Way: terraform refresh

The `terraform refresh` command was the original way to refresh state:

```bash
# Refresh all resources in the state
terraform refresh
```

This command queries every resource in your state and updates the state file. However, there's an important caveat: `terraform refresh` is now considered a legacy command. HashiCorp recommends using `terraform apply -refresh-only` instead.

Why? Because `terraform refresh` directly modifies the state without giving you a chance to review what changed. If something unexpected shows up - like a resource that was deleted outside Terraform - the state gets updated silently.

## The Modern Way: terraform apply -refresh-only

The preferred approach is `terraform apply -refresh-only`:

```bash
# Refresh state with review - shows what will change in the state
terraform apply -refresh-only
```

This command does the same thing as `terraform refresh`, but it shows you what changes it's going to make to the state and asks for confirmation before proceeding. Here's what typical output looks like:

```text
Note: Objects have changed outside of Terraform

Terraform detected the following changes made outside of Terraform
since the last "terraform apply":

  # aws_instance.web_server has changed
  ~ resource "aws_instance" "web_server" {
        id            = "i-0abc123def456"
      ~ instance_type = "t3.micro" -> "t3.medium"
        # (10 unchanged attributes hidden)
    }

  # aws_security_group.app has changed
  ~ resource "aws_security_group" "app" {
        id   = "sg-0abc123"
      ~ ingress = [
          + {
              cidr_blocks = ["10.0.0.0/8"]
              from_port   = 8080
              to_port     = 8080
              protocol    = "tcp"
            },
        ]
    }

Would you like to update the state to reflect these detected changes?

Only 'yes' will be accepted to approve.
Enter a value:
```

This is much better than the silent update of `terraform refresh`. You can see exactly what changed and decide whether to accept the updates.

## Using -refresh-only with plan

You can also use the `-refresh-only` flag with `terraform plan` to preview what would change without actually updating the state:

```bash
# Preview state changes without updating anything
terraform plan -refresh-only
```

This is safe to run at any time. It queries your infrastructure, shows you the drift, but doesn't modify the state file. It's great for auditing and monitoring.

```bash
# Save the refresh plan for later review or apply
terraform plan -refresh-only -out=refresh.plan

# Apply the saved refresh plan
terraform apply refresh.plan
```

## Refreshing Specific Resources

If you only want to refresh specific resources rather than your entire state, use the `-target` flag:

```bash
# Refresh only a specific resource
terraform apply -refresh-only -target=aws_instance.web_server

# Refresh only resources within a module
terraform apply -refresh-only -target=module.networking

# Refresh multiple specific resources
terraform apply -refresh-only \
  -target=aws_instance.web_server \
  -target=aws_security_group.app
```

Targeting is useful when you have a large state and only need to update a few resources. It also limits the number of API calls Terraform makes, which can matter when you're dealing with rate limits.

## When to Refresh State

Common scenarios where you'll want to refresh:

**After manual changes.** If someone modified infrastructure through the cloud console, CLI, or another tool, refresh the state to pick up those changes.

```bash
# After someone manually changed an instance type in the AWS console
terraform plan -refresh-only
# Output shows: instance_type = "t3.micro" -> "t3.medium"
```

**Before a plan after a long idle period.** If nobody has run Terraform against an environment for a while, infrastructure may have drifted. Refresh first to get an accurate plan.

```bash
# Refresh state, then run a full plan
terraform apply -refresh-only -auto-approve
terraform plan
```

**After importing resources.** When you import resources, the state may not have all attributes populated. A refresh fills in the blanks.

```bash
# Import a resource, then refresh to get all attributes
terraform import aws_instance.existing i-0abc123def456
terraform apply -refresh-only
```

**For compliance auditing.** Periodic state refreshes help you detect unauthorized changes to your infrastructure.

## Auto-Approve for Automation

In CI/CD pipelines, you might want to auto-approve the refresh:

```bash
# Auto-approve the state refresh (use with caution)
terraform apply -refresh-only -auto-approve
```

Be careful with this. Auto-approving means you won't catch unexpected changes. A better approach for pipelines is to run the plan first and fail if there's unexpected drift:

```bash
#!/bin/bash
# ci-refresh-check.sh - Detect drift in CI/CD

set -euo pipefail

# Run refresh-only plan and capture output
terraform plan -refresh-only -detailed-exitcode -out=refresh.plan

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "No drift detected."
elif [ $EXIT_CODE -eq 2 ]; then
  echo "WARNING: Infrastructure drift detected!"
  terraform show refresh.plan
  # Optionally fail the pipeline
  # exit 1

  # Or auto-apply the refresh
  terraform apply refresh.plan
else
  echo "ERROR: Terraform plan failed."
  exit 1
fi
```

The `-detailed-exitcode` flag returns:
- `0` if no changes detected
- `1` if there was an error
- `2` if changes were detected

## What Refresh Doesn't Do

It's important to understand the limits of refresh:

**It doesn't modify infrastructure.** Refresh only updates the state file. Your actual cloud resources remain unchanged.

**It doesn't reconcile configuration drift.** If someone changed an instance type from `t3.micro` to `t3.medium` in the console, a refresh updates the state to say `t3.medium`. But your Terraform configuration still says `t3.micro`. The next `terraform plan` will show that Terraform wants to change it back.

**It doesn't create or destroy resources.** If someone created a new resource outside Terraform, refresh won't add it to state. You need `terraform import` for that. Similarly, if someone deleted a resource, refresh will mark it as gone in state, which may cause issues on the next plan.

**It can trigger resource recreation.** In some edge cases, if a resource was deleted outside Terraform, the refresh marks it as gone. The next plan will show Terraform wanting to recreate it. This is expected behavior but can be surprising.

## Handling Deleted Resources After Refresh

If a resource was deleted outside Terraform, refreshing will update the state to show it as gone:

```bash
# After refresh, the resource is marked as tainted or removed
terraform plan
# Output: aws_instance.web_server will be created (was deleted outside Terraform)
```

You have two choices:

1. Let Terraform recreate it by running `terraform apply`.
2. Remove it from state and configuration if it's no longer needed:

```bash
# Remove from state
terraform state rm aws_instance.web_server
# Then remove the resource block from your .tf files
```

## Refresh and State Locking

When you run a refresh, Terraform acquires a state lock (if your backend supports it). This prevents concurrent modifications. If someone else is running Terraform at the same time, you'll see a lock error:

```bash
# If the state is locked, you'll see this error
Error: Error locking state: Error acquiring the state lock:
  Lock Info:
    ID:        12345678-abcd-efgh-ijkl-123456789012
    Path:      terraform.tfstate
    Operation: OperationTypeApply
    Who:       user@hostname
    Created:   2026-02-23 14:30:00.000000 UTC
```

Wait for the other operation to finish, or if you're sure it's stale, force-unlock:

```bash
# Only use this if the lock is genuinely stale
terraform force-unlock 12345678-abcd-efgh-ijkl-123456789012
```

## Wrapping Up

Refreshing Terraform state is a routine maintenance operation that keeps your state file in sync with reality. Use `terraform apply -refresh-only` instead of the legacy `terraform refresh` command so you can review changes before they're written to state. Run refresh-only plans regularly to catch drift early, and integrate them into your CI/CD pipeline for continuous monitoring.

For more on managing state drift, see our posts on [using the -refresh=false flag](https://oneuptime.com/blog/post/2026-02-23-terraform-refresh-false-flag/view) and [auditing Terraform state changes](https://oneuptime.com/blog/post/2026-02-23-audit-terraform-state-changes/view).

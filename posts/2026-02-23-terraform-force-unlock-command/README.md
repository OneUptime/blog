# How to Use the terraform force-unlock Command

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, State Locking, CLI, Infrastructure as Code

Description: Detailed guide to using terraform force-unlock for releasing stuck state locks, including when to use it, safety precautions, backend-specific behaviors, and troubleshooting.

---

State locking is a critical safety feature in Terraform. It prevents two processes from modifying the same state simultaneously, which could lead to corruption or conflicting changes. But sometimes locks get stuck. A process crashes, a network connection drops, or a CI/CD pipeline gets killed mid-run. When that happens, you need `terraform force-unlock` to get back on track.

## How State Locking Works

Before diving into force-unlock, it helps to understand what locking does. When you run `terraform plan` or `terraform apply`, Terraform:

1. Attempts to acquire a lock on the state
2. Reads the current state
3. Performs the operation
4. Writes the updated state
5. Releases the lock

The lock prevents step 2-4 from happening simultaneously in two different processes. Each lock has a unique ID that Terraform uses to track who holds it.

## When Locks Get Stuck

Locks can get stuck in several scenarios:

- A `terraform apply` process was killed with `kill -9` (no chance to clean up)
- A CI/CD pipeline timed out or was cancelled during an operation
- A network partition occurred between Terraform and the backend
- The machine running Terraform crashed
- A remote execution environment was terminated unexpectedly

When a lock is stuck, you will see an error like this:

```text
Error: Error acquiring the state lock

Error message: ConditionalCheckFailedException: The conditional request
failed
Lock Info:
  ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Path:      terraform-state/prod/terraform.tfstate
  Operation: OperationTypeApply
  Who:       user@hostname
  Version:   1.7.0
  Created:   2026-02-23 10:30:00.123456 +0000 UTC
  Info:

Terraform acquires a state lock to protect the state from being written
by multiple users at the same time. Please resolve the issue above and try
again. For most commands, you can disable locking with the "-lock=false"
flag, but this is not recommended.
```

## Using terraform force-unlock

The syntax is straightforward:

```bash
# Force-unlock with the lock ID from the error message
terraform force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Terraform will ask for confirmation:

```text
Do you really want to force-unlock?
  Terraform will remove the lock on the remote state.
  This will allow local Terraform commands to modify this state, even though it
  may be still be in use. Only 'yes' will be accepted to confirm.

  Enter a value: yes
```

To skip the confirmation prompt (useful in automation):

```bash
# Force-unlock without confirmation prompt
terraform force-unlock -force a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

## Safety Precautions

Force-unlocking is a potentially dangerous operation. Before running it, verify these things:

### 1. Confirm No Active Operations

Make sure nobody is actually running Terraform against this state. Check with your team:

```bash
# Look at the lock info for clues
# "Who" tells you which user/machine holds the lock
# "Created" tells you when the lock was acquired
# "Operation" tells you what operation is running
```

If the lock was created recently and you are not sure if the operation is still running, wait a few minutes or check with the person listed in the "Who" field.

### 2. Check the Process

If you have access to the machine that created the lock, check if the Terraform process is still running:

```bash
# Check for running terraform processes
ps aux | grep terraform

# If on a remote CI/CD system, check the pipeline status
# through the CI/CD UI
```

### 3. Verify State Consistency

After force-unlocking, run a plan to check state consistency:

```bash
# Force unlock
terraform force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Immediately run a plan to verify state is consistent
terraform plan
```

If the plan shows unexpected changes, the previous operation might have partially completed. Review the plan carefully before applying.

## Backend-Specific Behaviors

Different backends implement locking differently, and force-unlock interacts with each one in its own way.

### S3 with DynamoDB

The lock is stored as an item in DynamoDB. Force-unlock deletes the lock item:

```bash
# What force-unlock does behind the scenes for S3/DynamoDB:
# aws dynamodb delete-item --table-name terraform-locks --key '{"LockID":{"S":"terraform-state/prod/terraform.tfstate-md5"}}'
```

You can also manually check the lock in DynamoDB:

```bash
# View the lock item
aws dynamodb get-item \
  --table-name terraform-locks \
  --key '{"LockID":{"S":"terraform-state/prod/terraform.tfstate-md5"}}'
```

### Azure Blob Storage

Azure uses blob leasing for locking. Force-unlock breaks the lease:

```bash
# What force-unlock does behind the scenes for Azure:
# az storage blob lease break --blob-name terraform.tfstate --container-name tfstate --account-name tfstateaccount
```

### Consul

Consul uses sessions for locking. Force-unlock destroys the session:

```bash
# You can also manually destroy the session
consul session destroy SESSION_ID
```

### GCS

GCS uses lock files (.tflock). Force-unlock deletes the lock file:

```bash
# You can check for lock files manually
gsutil ls gs://my-terraform-state/terraform/state/*.tflock
```

### PostgreSQL

PostgreSQL uses a locks table. Force-unlock deletes the row:

```sql
-- What force-unlock does behind the scenes
DELETE FROM locks WHERE name = 'default';
```

## What to Do After Force-Unlock

After successfully removing the lock, take these steps:

### Step 1: Run terraform plan

```bash
# Check what Terraform thinks the current state is
terraform plan
```

Review the output carefully. Look for:
- Resources that should exist but are not in state (partial apply)
- Resources in state that were meant to be destroyed
- Drift between state and actual infrastructure

### Step 2: Fix Partial Operations

If the previous operation was interrupted mid-apply, some resources might have been created while others were not. You have a few options:

```bash
# Option 1: Apply again to complete the operation
terraform apply

# Option 2: Import resources that were created but not recorded in state
terraform import aws_instance.web i-0abc123def456789

# Option 3: Remove resources from state that were destroyed but not untracked
terraform state rm aws_instance.web
```

### Step 3: Verify Infrastructure

Compare the actual infrastructure with what Terraform expects:

```bash
# Refresh state from actual infrastructure
terraform apply -refresh-only

# Check for any remaining discrepancies
terraform plan
```

## Preventing Stuck Locks

While you cannot eliminate stuck locks entirely, you can reduce their frequency:

### Use Timeouts in CI/CD

Set reasonable timeouts for Terraform operations:

```yaml
# GitHub Actions example
- name: Terraform Apply
  timeout-minutes: 30
  run: terraform apply -auto-approve
```

### Handle Signals Gracefully

In scripts, trap signals so Terraform can clean up:

```bash
#!/bin/bash
# Run Terraform with signal handling

# Trap INT and TERM signals
trap 'echo "Interrupted - Terraform will release the lock"; exit 1' INT TERM

terraform apply -auto-approve
```

### Use -lock-timeout

Instead of immediately failing when a lock is held, wait for it:

```bash
# Wait up to 5 minutes for the lock to be released
terraform apply -lock-timeout=5m
```

This handles transient lock conflicts without manual intervention.

## The Nuclear Option: -lock=false

As a last resort, you can bypass locking entirely:

```bash
# DANGEROUS: Run without acquiring a lock
terraform plan -lock=false
terraform apply -lock=false
```

This is almost never a good idea. If you find yourself doing this regularly, there is a deeper problem to fix - usually related to CI/CD pipeline configuration or team coordination.

## Summary

The `terraform force-unlock` command is a necessary escape hatch for stuck state locks. Use it carefully: always verify that no active operation holds the lock, always run `terraform plan` afterward to check state consistency, and always investigate why the lock got stuck in the first place. Prevention is better than cure - use `-lock-timeout`, graceful signal handling, and reasonable CI/CD timeouts to minimize stuck locks. For more on debugging lock issues, check out our post on [fixing Terraform state lock errors](https://oneuptime.com/blog/post/2026-02-12-fix-terraform-error-acquiring-state-lock/view).

# How to Force Unlock a Stuck State Lock in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to safely force unlock a stuck state lock in OpenTofu when a process fails and leaves the state file locked.

## Introduction

OpenTofu uses state locking to prevent concurrent operations from corrupting your infrastructure state. When two processes try to modify state simultaneously, the second one is blocked until the first completes. However, if a process crashes or is interrupted, it may leave the state file locked - preventing all future operations until the lock is released.

This guide walks you through diagnosing a stuck lock and safely removing it.

## Understanding State Locks

When you run `tofu plan`, `tofu apply`, or `tofu destroy`, OpenTofu acquires a lock on the state backend. For S3 backends, this typically uses DynamoDB. For local backends, a `.terraform.tfstate.lock.info` file is created.

A stuck lock produces an error like:

```text
Error: Error acquiring the state lock

Error message: ConditionalCheckFailedException: The conditional request failed
Lock Info:
  ID:        abc12345-1234-1234-1234-abc123456789
  Path:      s3://my-bucket/terraform.tfstate
  Operation: OperationTypeApply
  Who:       user@hostname
  Version:   1.8.0
  Created:   2026-03-20 10:00:00.000 +0000 UTC
  Info:
```

## Step 1: Verify the Lock is Actually Stuck

Before force-unlocking, confirm the process that acquired the lock is no longer running:

```bash
# Check if a tofu process is still running

ps aux | grep tofu

# Check the lock info for the operation timestamp
# If the lock was created hours ago and no tofu process is running, it's safe to unlock
```

## Step 2: Identify the Lock ID

The error message displays the Lock ID. Copy it - you'll need it to run the force-unlock command.

```text
Lock Info:
  ID:        abc12345-1234-1234-1234-abc123456789
```

## Step 3: Run tofu force-unlock

Use the `tofu force-unlock` command with the lock ID:

```bash
# Force unlock using the lock ID from the error message
tofu force-unlock abc12345-1234-1234-1234-abc123456789
```

OpenTofu will prompt you to confirm:

```hcl
Do you really want to force-unlock?
  OpenTofu will remove the lock on the remote state.
  This will allow local OpenTofu commands to modify this state, even though it
  may still be in use. Only 'yes' will be accepted to confirm.

  Enter a value: yes
```

Type `yes` to proceed.

## Step 4: Use the -force Flag to Skip Confirmation

In automation pipelines, you may want to skip the confirmation prompt:

```bash
# Force unlock without interactive confirmation
tofu force-unlock -force abc12345-1234-1234-1234-abc123456789
```

Use this flag carefully - only in scripts where you've already validated the lock is stale.

## Step 5: Verify the Lock is Released

After unlocking, verify you can run operations again:

```bash
# A simple plan should succeed if the lock is released
tofu plan
```

## Local Backend Locks

For local state files, the lock is stored in a `.terraform.tfstate.lock.info` file alongside the state:

```bash
# Manually remove a local lock file if tofu force-unlock doesn't work
rm .terraform.tfstate.lock.info

# Or use the force-unlock command with the lock ID from the JSON file
cat .terraform.tfstate.lock.info
```

The lock info JSON looks like:

```json
{
  "ID": "abc12345-1234-1234-1234-abc123456789",
  "Operation": "OperationTypeApply",
  "Info": "",
  "Who": "user@hostname",
  "Version": "1.8.0",
  "Created": "2026-03-20T10:00:00Z",
  "Path": "terraform.tfstate"
}
```

## DynamoDB Locks (S3 Backend)

When using the S3 backend with DynamoDB locking, you can also check and remove the lock directly:

```bash
# View current locks in DynamoDB
aws dynamodb scan \
  --table-name terraform-state-lock \
  --query 'Items[*].[LockID.S,Info.S]' \
  --output table

# Delete a specific lock entry
aws dynamodb delete-item \
  --table-name terraform-state-lock \
  --key '{"LockID": {"S": "my-bucket/terraform.tfstate"}}'
```

## Prevention Best Practices

```hcl
# Configure your S3 backend with proper locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"

    # Enable DynamoDB locking
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

Set up CloudWatch alarms for long-running locks to be notified before they become a problem.

## Conclusion

Force-unlocking a stuck state lock is a necessary emergency operation in OpenTofu. Always verify that no legitimate process holds the lock before using `tofu force-unlock`. For team environments, communicate clearly before performing force-unlocks to avoid state corruption. Once unlocked, run `tofu plan` to verify everything is consistent before proceeding with any infrastructure changes.

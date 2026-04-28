# How to Use tofu force-unlock to Release State Locks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI, State

Description: Learn how to use tofu force-unlock to release stuck state locks when a previous operation was interrupted and left the state locked.

## Introduction

When `tofu plan` or `tofu apply` runs, it acquires a lock on the state to prevent concurrent modifications. If the process is interrupted (killed, crashed, or lost network connection), the lock may remain. `tofu force-unlock` releases the lock manually so subsequent operations can proceed.

## When You Need force-unlock

```bash
tofu apply

# Error message indicating a lock:

# Error: Error acquiring the state lock
#
# Error message: ConditionalCheckFailedException
# Lock Info:
#   ID:        12345678-1234-1234-1234-123456789012
#   Path:      acme-tofu-state/production/terraform.tfstate
#   Operation: OperationTypeApply
#   Who:       runner@ci-machine
#   Version:   1.6.0
#   Created:   2024-01-15 10:30:00 UTC
#   Info:
```

## Basic Usage

```bash
# Use the Lock ID from the error message
tofu force-unlock 12345678-1234-1234-1234-123456789012

# Confirmation prompt:
# Do you really want to force-unlock?
#   OpenTofu will remove the lock on the remote state.
#   This will allow local OpenTofu commands to modify this state, even though it
#   may still be in use. Only 'yes' will be accepted to confirm.
# Enter a value: yes

# OpenTofu state has been successfully unlocked!
#
# The state has been unlocked, and OpenTofu commands should now be able to
# obtain a new lock on the remote state.
```

## Skip Confirmation

```bash
# Bypass the confirmation prompt
tofu force-unlock -force 12345678-1234-1234-1234-123456789012
```

## Finding the Lock ID

The lock ID appears in the error message when a lock is held. You can also look at the backend directly:

```bash
# S3 backend: check for a lock file
aws s3 ls s3://acme-tofu-state/prefix/

# DynamoDB backend: check the lock table
aws dynamodb get-item \
  --table-name terraform-lock \
  --key '{"LockID": {"S": "acme-tofu-state/prefix/terraform.tfstate"}}'
```

## Safety Considerations

Force-unlocking is safe only when you are certain no other operation is actually running. Before force-unlocking:

1. Verify the lock holder is not actively running
2. Check CI/CD pipelines for any running jobs
3. Confirm the original process is dead (not just slow)

```bash
# Check for running CI/CD pipelines before force-unlocking
# In GitHub Actions: check Actions tab for running workflows
# For DynamoDB: the lock record shows who locked it and when

aws dynamodb get-item \
  --table-name terraform-lock \
  --key '{"LockID": {"S": "acme-state/terraform.tfstate"}}' \
  | jq '.Item.Info.S | fromjson'
# Shows: who, when, and what operation holds the lock
```

## Backend-Specific Lock Locations

**DynamoDB (S3 backend):**
```text
Table: terraform-lock
Key: LockID = "bucket/prefix/terraform.tfstate"
```

**Azure Blob Storage:**
```text
Blob lease on the state file container
```

**S3 native locking:**
```text
Object: bucket/prefix/terraform.tfstate.tflock
```

**PostgreSQL:**
```text
Advisory lock on the database connection
```

## Recovery Workflow

```bash
# 1. Identify the stale lock
tofu apply
# Copy the Lock ID from the error

# 2. Verify no active process holds the lock
# (check CI logs, running processes, etc.)

# 3. Force-unlock
tofu force-unlock <LOCK_ID>

# 4. Re-run the original operation
tofu apply
```

## Conclusion

`tofu force-unlock` is a recovery tool for stale locks left by interrupted operations. Always verify that no legitimate process holds the lock before using it - forcing an unlock while another process is running can cause state corruption. The lock ID is provided in the error message when a lock is detected. After unlocking, re-run the original operation normally.

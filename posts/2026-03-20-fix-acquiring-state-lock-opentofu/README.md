# How to Fix 'Error Acquiring the State Lock' in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, State Lock, DynamoDB, Error, Infrastructure as Code

Description: Learn how to resolve the 'error acquiring the state lock' message in OpenTofu, including diagnosing active vs stale locks and safely releasing them.

## Introduction

"Error acquiring the state lock" is similar to the general state lock error but specifically refers to the lock acquisition step failing - usually due to a DynamoDB `ConditionalCheckFailedException` (AWS) or equivalent backend locking failure. This guide covers the most systematic approach to resolution.

## The Full Error

```text
Error: Error acquiring the state lock

Error message: ConditionalCheckFailedException: The conditional request failed
Lock Info:
  ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Path:      my-state-bucket/prod/app/tofu.tfstate
  Operation: OperationTypeApply
  Who:       runner@ip-10-0-1-50
  Version:   1.9.0
  Created:   2026-03-20 08:00:00 +0000 UTC
```

## Step 1: Verify No Active Operation

Before doing anything, confirm the lock holder is truly inactive:

```bash
# Is the CI job still running?

# Check your CI/CD platform (GitHub Actions, GitLab CI, Jenkins)

# Is there a local tofu process?
ps aux | grep "[t]ofu"

# Check when the lock was created - is it hours old?
# Lock.Created older than 1 hour with no active process = stale
```

## Step 2: Force Unlock (If Stale)

```bash
# Use the lock ID from the error message
tofu force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Confirm when prompted
```

## Step 3: Verify State Integrity After Unlock

After force-unlocking, verify state is not corrupted:

```bash
# List all resources in state
tofu state list

# Run a plan to confirm state matches reality
tofu plan

# If plan shows unexpected changes, investigate before applying
```

## Step 4: Manual DynamoDB Unlock

If `tofu force-unlock` fails (network issue, permissions), delete the lock item directly:

```bash
# View the current lock item
aws dynamodb get-item \
  --table-name opentofu-state-locks \
  --key '{"LockID": {"S": "my-state-bucket/prod/app/tofu.tfstate"}}' \
  --output json

# If the lock is confirmed stale, delete it
aws dynamodb delete-item \
  --table-name opentofu-state-locks \
  --key '{"LockID": {"S": "my-state-bucket/prod/app/tofu.tfstate"}}'

# Verify the lock is gone
aws dynamodb get-item \
  --table-name opentofu-state-locks \
  --key '{"LockID": {"S": "my-state-bucket/prod/app/tofu.tfstate"}}'
# Should return: {}
```

## Preventing Lock Contention

For DynamoDB-based locking, make sure your backend is configured correctly:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-state-bucket"
    key            = "prod/app/tofu.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opentofu-state-locks"
    encrypt        = true
  }
}
```

If you want OpenTofu to wait for an existing lock instead of failing immediately, use `-lock-timeout` on commands such as `tofu plan` and `tofu apply`.

In CI/CD, prevent parallel apply jobs from competing for the same lock:

```yaml
# GitHub Actions - use concurrency groups to serialize applies
concurrency:
  group: opentofu-prod-apply
  cancel-in-progress: false  # Don't cancel running applies - queue them
```

## Monitoring for Stale Locks

CloudWatch's `ConditionalCheckFailedRequests` metric can show repeated lock contention, but it does not measure lock age. To detect stale locks, inspect the DynamoDB lock item's `Info` payload and alert on the `Created` timestamp if it exceeds your expected maximum runtime.

## Conclusion

State lock acquisition failures are resolved by verifying whether the lock is active or stale, then using `tofu force-unlock` or direct DynamoDB deletion to release it. Prevent future occurrences by serializing CI/CD apply jobs with concurrency controls and monitoring for abnormally long-held locks.

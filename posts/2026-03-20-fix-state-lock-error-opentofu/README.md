# How to Fix 'Error: State Lock' in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, State Lock, Error, Infrastructure as Code, Debugging

Description: Learn how to diagnose and resolve state lock errors in OpenTofu, including how to safely force-unlock a stale lock left by a crashed process.

## Introduction

OpenTofu acquires a state lock before any plan or apply to prevent concurrent modifications that could corrupt state. The "Error acquiring the state lock" message means another process already holds the lock - or a previous process crashed without releasing it.

## Common Error Message

```text
Error: Error acquiring the state lock

Error message: ConditionalCheckFailedException: The conditional request failed
Lock Info:
  ID:        12345678-1234-1234-1234-123456789012
  Path:      my-bucket/prod/vpc/tofu.tfstate
  Operation: OperationTypePlan
  Who:       ci@github-actions
  Version:   1.9.0
  Created:   2026-03-20 10:00:00 +0000 UTC
  Info:
```

## Cause 1: Another Active Process

First, check whether another `tofu` process is genuinely running:

```bash
# Check for running tofu processes

ps aux | grep tofu

# Check CI/CD - is there a parallel pipeline run?
# Check the lock's "Who" field - is that user/machine active?
```

If a legitimate process is running, wait for it to finish.

## Cause 2: Stale Lock from a Crashed Process

If the lock is stale (process crashed without unlocking), force-unlock using the Lock ID from the error message:

```bash
# DANGER: Only do this if you are certain no other process is running
tofu force-unlock 12345678-1234-1234-1234-123456789012
```

You will be prompted to confirm:

```text
Do you really want to force-unlock?
  OpenTofu will remove the lock on the remote state.
  This will allow local OpenTofu commands to modify this state, even though it
  may still be in use. Only 'yes' will be accepted to confirm.

  Enter a value: yes
```

## For AWS S3 Backend Using DynamoDB Locking: Manual Lock Removal

If `force-unlock` does not work (e.g., the DynamoDB item is stuck):

```bash
# Find the lock item in DynamoDB
aws dynamodb get-item \
  --table-name opentofu-state-locks \
  --key '{"LockID": {"S": "my-bucket/prod/vpc/tofu.tfstate"}}' \
  --region us-east-1

# If the lock is confirmed stale, delete it manually
aws dynamodb delete-item \
  --table-name opentofu-state-locks \
  --key '{"LockID": {"S": "my-bucket/prod/vpc/tofu.tfstate"}}' \
  --region us-east-1
```

## For GCS Backend: Manual Lock Removal

```bash
# List lock files in the GCS bucket
gcloud storage ls gs://my-state-bucket/prod/vpc/

# Remove the lock file (has .tflock extension)
gcloud storage rm gs://my-state-bucket/prod/vpc/tofu.tfstate.tflock
```

## Skipping the Lock (Not Recommended)

In emergencies, you can skip locking entirely, but this risks state corruption if concurrent applies run:

```bash
# Only use in genuine emergencies
tofu apply -lock=false
```

## Preventing Stale Locks

```bash
# Retry acquiring the state lock for up to 5 minutes before returning an error
tofu plan -lock-timeout=5m
tofu apply -lock-timeout=5m
```

In CI/CD, set a job timeout:

```yaml
# Cancel the job if it runs longer than 30 minutes
timeout-minutes: 30
```

## Conclusion

State lock errors are most commonly caused by crashed CI/CD jobs that left a stale lock. Always verify no legitimate process is running before force-unlocking. For AWS S3 backends using DynamoDB locking, the DynamoDB item can be deleted manually as a last resort. Prevention through CI job timeouts and health checks reduces the frequency of stale locks.

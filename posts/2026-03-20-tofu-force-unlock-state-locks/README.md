# How to Use tofu force-unlock to Release State Locks - Tofu State Locks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to use tofu force-unlock to release stuck state locks when a previous OpenTofu operation failed and left the state file locked.

## Introduction

When an OpenTofu operation (plan, apply, or destroy) fails or is interrupted, it may leave the state file locked. The `tofu force-unlock` command releases these stuck locks so you can proceed with new operations.

## Identifying a Stuck Lock

```bash
tofu plan
# Error: Error acquiring the state lock

#
# Error message: ConditionalCheckFailedException
# Lock Info:
#   ID:        abc12345-1234-1234-1234-abc123456789
#   Path:      my-bucket/prod/terraform.tfstate
#   Operation: OperationTypeApply
#   Who:       user@hostname
#   Version:   1.8.0
#   Created:   2026-03-20 10:00:00 +0000 UTC
```

## Basic Usage

```bash
# Force unlock using the lock ID from the error message
tofu force-unlock abc12345-1234-1234-1234-abc123456789

# OpenTofu prompts for confirmation:
# Do you really want to force-unlock?
#   Enter a value: yes
```

## Skip Confirmation

```bash
# Force unlock without interactive prompt
tofu force-unlock -force abc12345-1234-1234-1234-abc123456789
```

## Backend-Specific Lock Management

### S3 + DynamoDB Backend

```bash
# View current lock in DynamoDB
aws dynamodb scan \
  --table-name terraform-state-locks \
  --query 'Items' \
  --output json

# Force unlock via OpenTofu (preferred)
tofu force-unlock <lock-id>

# Or directly remove from DynamoDB
aws dynamodb delete-item \
  --table-name terraform-state-locks \
  --key '{"LockID": {"S": "my-bucket/prod/terraform.tfstate"}}'
```

### Azure Backend

```bash
# Check for lease on the blob
az storage blob show \
  --account-name stterraformstate001 \
  --container-name tfstate \
  --name "prod/terraform.tfstate" \
  --query properties.lease.status

# Break the lease
az storage blob lease break \
  --account-name stterraformstate001 \
  --container-name tfstate \
  --blob-name "prod/terraform.tfstate"
```

### Local Backend

```bash
# Remove stale local lock metadata for the default state path
# The local backend also uses OS file locking, so stop the process first
rm .terraform.tfstate.lock.info
```

## Safety Protocol

Before force-unlocking:

```bash
# 1. Verify no OpenTofu process is running
ps aux | grep tofu

# 2. Check when the lock was created (from error message)
# If recent and you have a running process - DO NOT force unlock

# 3. Communicate with your team
# Is anyone else running tofu on this state?

# 4. Only then force unlock
tofu force-unlock -force <lock-id>
```

## Automated Stale Lock Detection

```bash
#!/bin/bash
# check-stale-locks.sh

# Check DynamoDB for locks older than 1 hour
HOUR_AGO=$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-1H '+%Y-%m-%dT%H:%M:%SZ')

aws dynamodb scan \
  --table-name terraform-state-locks \
  --query "Items[*]" \
  --output json | jq --arg cutoff "$HOUR_AGO" \
  '.[] | select(.Info.S? != null) | select((.Info.S | fromjson | .Created) < $cutoff)'
```

## Conclusion

`tofu force-unlock` is an emergency operation to be used only when you're certain the process that acquired the lock is no longer running. Always verify no legitimate operation holds the lock before force-unlocking. After releasing the lock, run `tofu plan` to verify state integrity before proceeding with any operations.

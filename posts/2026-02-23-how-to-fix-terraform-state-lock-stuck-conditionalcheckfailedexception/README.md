# How to Fix Terraform State Lock Stuck (ConditionalCheckFailedException)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, State Lock, DynamoDB, AWS

Description: How to fix a stuck Terraform state lock with ConditionalCheckFailedException when using DynamoDB for state locking on AWS.

---

You run any Terraform command and get:

```text
Error: Error acquiring the state lock

Error message: ConditionalCheckFailedException: The conditional request failed
Lock Info:
  ID:        f8e5b9a3-7c42-11ed-a1eb-0242ac120002
  Path:      my-terraform-state/prod/terraform.tfstate
  Operation: OperationTypeApply
  Who:       deployer@ci-runner-42
  Version:   1.7.4
  Created:   2026-02-22 03:15:42.987654 +0000 UTC
  Info:
```

This is one of the most common and frustrating Terraform issues when using S3 with DynamoDB for state locking. The `ConditionalCheckFailedException` specifically means DynamoDB rejected the lock acquisition because a lock already exists. And if the lock is stale (the process that created it is gone), you are stuck until you manually fix it.

Let us walk through exactly what is happening and how to resolve it safely.

## What Is Happening

When you use an S3 backend with DynamoDB locking, Terraform does the following:

1. Before any operation, it writes a lock entry to the DynamoDB table
2. If the write succeeds (no existing lock), the operation proceeds
3. When the operation finishes, Terraform deletes the lock entry
4. If another lock already exists, DynamoDB rejects the write with `ConditionalCheckFailedException`

The lock gets stuck when step 3 never happens. Common reasons:

- **CI/CD runner was killed** during an apply (OOM, timeout, spot instance termination)
- **Someone hit Ctrl+C** during a long-running operation and the cleanup did not complete
- **Network failure** during the lock release phase
- **Process crashed** (segfault, bug in provider plugin)

## Step 1: Verify the Lock Is Actually Stale

Before doing anything, confirm that no operation is actually running. Look at the lock info:

- **Who**: `deployer@ci-runner-42` - Is this runner still alive?
- **Created**: `2026-02-22 03:15:42` - Is this recent or hours/days old?
- **Operation**: `OperationTypeApply` - Was someone doing an apply?

```bash
# Check if the CI runner is still running
# For GitHub Actions, check the Actions tab
# For GitLab, check the pipeline page

# If the lock was created hours ago and the typical apply takes minutes,
# it is almost certainly stale
```

## Step 2: Inspect the Lock in DynamoDB

You can look at the lock directly in DynamoDB:

```bash
# Get the lock info from DynamoDB
aws dynamodb get-item \
  --table-name terraform-locks \
  --key '{"LockID": {"S": "my-terraform-state/prod/terraform.tfstate"}}' \
  --region us-east-1
```

This returns something like:

```json
{
  "Item": {
    "LockID": {
      "S": "my-terraform-state/prod/terraform.tfstate"
    },
    "Info": {
      "S": "{\"ID\":\"f8e5b9a3-7c42-11ed-a1eb-0242ac120002\",\"Operation\":\"OperationTypeApply\",\"Info\":\"\",\"Who\":\"deployer@ci-runner-42\",\"Version\":\"1.7.4\",\"Created\":\"2026-02-22T03:15:42.987654Z\",\"Path\":\"my-terraform-state/prod/terraform.tfstate\"}"
    },
    "Digest": {
      "S": "abc123def456"
    }
  }
}
```

The `Created` timestamp tells you exactly when the lock was acquired. If it is significantly older than your typical operation time, it is stale.

## Step 3: Force Unlock Using Terraform

The safest way to remove a stuck lock is through Terraform itself:

```bash
# Use the Lock ID from the error message
terraform force-unlock f8e5b9a3-7c42-11ed-a1eb-0242ac120002
```

Terraform will prompt for confirmation:

```text
Do you really want to force-unlock?
  Terraform will remove the lock on the remote state.
  This will allow local Terraform commands to modify this state, even though it
  may be still be in use. Only 'yes' will be accepted to confirm.

  Enter a value: yes

Terraform state has been successfully unlocked!
```

Now retry your operation:

```bash
terraform plan
```

## Step 4: If force-unlock Fails

Sometimes `terraform force-unlock` itself fails. This can happen when Terraform cannot connect to the backend or when the lock info is corrupted:

```text
Error: failed to unlock state: failed to delete lock item
```

In this case, go directly to DynamoDB:

```bash
# Delete the lock item directly from DynamoDB
aws dynamodb delete-item \
  --table-name terraform-locks \
  --key '{"LockID": {"S": "my-terraform-state/prod/terraform.tfstate"}}' \
  --region us-east-1
```

Verify it is gone:

```bash
# Confirm the lock is removed
aws dynamodb get-item \
  --table-name terraform-locks \
  --key '{"LockID": {"S": "my-terraform-state/prod/terraform.tfstate"}}' \
  --region us-east-1

# Should return empty or no Item
```

Now retry:

```bash
terraform plan
```

## Step 5: Check State File Integrity

After a stuck lock from a crashed apply, it is possible that the state file was left in a partially written state. Before proceeding, verify the state:

```bash
# Pull the state and check if it is valid JSON
terraform state pull | jq . > /dev/null
echo $?
# 0 means valid, non-zero means corrupted
```

If the state is corrupted, restore from a backup:

```bash
# List state file versions (if versioning is enabled on S3)
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/terraform.tfstate \
  --max-items 5

# Restore a previous version
aws s3api copy-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate \
  --copy-source "my-terraform-state/prod/terraform.tfstate?versionId=GOOD_VERSION_ID"
```

Then run a refresh-only apply to sync the state:

```bash
terraform apply -refresh-only
```

## Preventing Stuck Locks

### 1. Set Proper Timeouts in CI/CD

The number one cause of stuck locks is CI runners being killed mid-operation. Set appropriate timeouts:

```yaml
# GitHub Actions
jobs:
  apply:
    timeout-minutes: 60
    steps:
      - name: Terraform Apply
        run: terraform apply -auto-approve -lock-timeout=10m
        timeout-minutes: 45  # Less than job timeout
```

The key is having the step timeout be shorter than the job timeout, so Terraform has a chance to clean up before the runner is killed.

### 2. Use Signal Handling in Wrapper Scripts

If you wrap Terraform in a shell script, forward signals properly:

```bash
#!/bin/bash
# safe-terraform.sh
# Handles signals gracefully so Terraform can release the lock

cleanup() {
  echo "Caught signal, waiting for Terraform to clean up..."
  # Give Terraform a few seconds to release the lock
  wait $TF_PID
  exit $?
}

trap cleanup SIGTERM SIGINT

terraform apply -auto-approve "$@" &
TF_PID=$!
wait $TF_PID
EXIT_CODE=$?

exit $EXIT_CODE
```

### 3. Set Up Automatic Stale Lock Detection

Create a scheduled job that checks for stale locks and alerts your team:

```bash
#!/bin/bash
# check-stale-locks.sh
# Run this every 15 minutes via cron

TABLE_NAME="terraform-locks"
MAX_AGE_MINUTES=45
REGION="us-east-1"

# Scan for all lock items
LOCKS=$(aws dynamodb scan \
  --table-name "$TABLE_NAME" \
  --region "$REGION" \
  --output json 2>/dev/null)

echo "$LOCKS" | jq -c '.Items[]' 2>/dev/null | while read -r item; do
  LOCK_ID=$(echo "$item" | jq -r '.LockID.S')
  INFO=$(echo "$item" | jq -r '.Info.S')
  CREATED=$(echo "$INFO" | jq -r '.Created' 2>/dev/null)

  if [ -z "$CREATED" ] || [ "$CREATED" = "null" ]; then
    echo "WARNING: Lock without timestamp: $LOCK_ID"
    continue
  fi

  # Calculate age
  CREATED_TS=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${CREATED%%.*}" +%s 2>/dev/null)
  NOW_TS=$(date +%s)

  if [ -n "$CREATED_TS" ]; then
    AGE_MINUTES=$(( (NOW_TS - CREATED_TS) / 60 ))
    if [ "$AGE_MINUTES" -gt "$MAX_AGE_MINUTES" ]; then
      WHO=$(echo "$INFO" | jq -r '.Who' 2>/dev/null)
      OP=$(echo "$INFO" | jq -r '.Operation' 2>/dev/null)
      echo "STALE LOCK: $LOCK_ID"
      echo "  Age: ${AGE_MINUTES} minutes"
      echo "  Who: $WHO"
      echo "  Operation: $OP"

      # Send alert to your notification channel
      # curl -X POST "https://hooks.slack.com/services/..." \
      #   -d "{\"text\": \"Stale Terraform lock detected: $LOCK_ID (${AGE_MINUTES}m old by $WHO)\"}"
    fi
  fi
done
```

Integrate this with [OneUptime](https://oneuptime.com) monitoring to get immediate alerts when a lock has been held longer than expected. This way, your team can investigate and resolve the issue before someone else runs into the lock error.

### 4. Use DynamoDB with PAY_PER_REQUEST

Make sure your DynamoDB table can handle the load without throttling:

```hcl
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"  # Avoids throttling
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Purpose = "Terraform state locking"
  }
}
```

### 5. Use Concurrency Controls

Prevent multiple applies from running at the same time:

```yaml
# GitHub Actions
concurrency:
  group: terraform-prod-${{ github.workflow }}
  cancel-in-progress: false  # Never cancel running applies!

# GitLab CI
terraform-apply:
  resource_group: terraform-prod
```

## Quick Recovery Checklist

When you hit the ConditionalCheckFailedException:

1. Read the lock info from the error message
2. Check if the lock holder is still running
3. If not running, use `terraform force-unlock <LOCK_ID>`
4. If force-unlock fails, delete the DynamoDB item directly
5. Verify state file integrity with `terraform state pull | jq .`
6. If state is corrupted, restore from S3 versioning
7. Run `terraform plan` to verify everything is back to normal

The stuck lock is a safety mechanism that sometimes gets in the way. The key is having a clear process for resolving it and, more importantly, preventing it from happening in the first place through proper CI/CD configuration and monitoring.

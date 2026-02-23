# How to Fix Error Acquiring the State Lock in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, State Management, DevOps, State Lock

Description: How to diagnose and resolve the Error Acquiring the State Lock message in Terraform, including force unlock steps and prevention strategies.

---

You run a Terraform command and get this error:

```
Error: Error acquiring the state lock

Error message: ConditionalCheckFailedException: The conditional request failed
Lock Info:
  ID:        a1b2c3d4-5678-90ab-cdef-1234567890ab
  Path:      terraform-state/prod/terraform.tfstate
  Operation: OperationTypeApply
  Who:       deploy@ci-runner-7
  Version:   1.7.4
  Created:   2026-02-23 14:30:22.123456 +0000 UTC
  Info:

Terraform acquires a state lock to protect the state from being written
by multiple users at the same time. Please resolve the issue above and try
again. For most commands, you can disable locking with the "-lock=false"
flag, but this is not recommended.
```

This error means someone (or something) else is currently holding the lock on your state file. Terraform uses this lock to prevent concurrent modifications that could corrupt state. Let us go through why it happens and how to fix it safely.

## Why This Error Occurs

There are a few common scenarios:

**1. Another operation is legitimately running.** A colleague or a CI/CD pipeline is in the middle of a `terraform apply`. This is the lock doing its job.

**2. A previous operation crashed.** If `terraform apply` was interrupted (CTRL+C, killed process, CI runner timeout, network drop), the lock may not have been properly released.

**3. CI/CD pipeline overlap.** Two pipeline runs are trying to operate on the same state at the same time.

**4. Local and remote overlap.** Someone is running Terraform locally while a CI pipeline is also running.

## Step 1: Check If Something Is Actually Running

Before you do anything else, verify whether the lock holder is actually still running. The error message tells you:

- **Who** holds the lock (user@hostname)
- **When** it was created
- **What operation** is running (plan or apply)

```bash
# If it is a CI/CD runner, check if the pipeline is still active
# For GitHub Actions, check the Actions tab
# For GitLab, check the pipeline page

# If it is a person, ask them
# "Hey, are you running terraform apply right now?"
```

If the operation is still running, just wait. The lock will be released when it finishes.

## Step 2: Determine If the Lock Is Stale

If the lock was created hours ago, or the CI runner that created it no longer exists, the lock is stale and needs to be manually released.

Check the "Created" timestamp in the error message. If it was 30 minutes ago and the operation was a simple plan that should have taken seconds, the lock is almost certainly stale.

For DynamoDB-based locks, you can inspect the lock directly:

```bash
# Check the lock item in DynamoDB
aws dynamodb get-item \
  --table-name terraform-locks \
  --key '{"LockID": {"S": "terraform-state/prod/terraform.tfstate"}}' \
  --output json
```

This shows you the full lock info so you can verify when it was created and by whom.

## Step 3: Force Unlock the State

Once you are certain that no operation is running, you can force-unlock the state:

```bash
# Use the Lock ID from the error message
terraform force-unlock a1b2c3d4-5678-90ab-cdef-1234567890ab
```

Terraform will ask you to confirm:

```
Do you really want to force-unlock?
  Terraform will remove the lock on the remote state.
  This will allow local Terraform commands to modify this state, even though it
  may be still be in use. Only 'yes' will be accepted to confirm.

  Enter a value: yes
```

Type `yes` and the lock is released. Now you can run your operation:

```bash
terraform plan
```

## Step 4: If force-unlock Does Not Work

Sometimes `terraform force-unlock` itself fails. This can happen if the state file is corrupted or the backend connection has issues.

For S3 + DynamoDB, you can delete the lock directly:

```bash
# Delete the DynamoDB lock item directly
aws dynamodb delete-item \
  --table-name terraform-locks \
  --key '{"LockID": {"S": "terraform-state/prod/terraform.tfstate"}}'
```

For Azure Blob Storage, break the blob lease:

```bash
# Break the lease on the state blob
az storage blob lease break \
  --account-name tfstateaccount \
  --container-name tfstate \
  --blob-name prod.terraform.tfstate
```

For GCS, delete the lock file:

```bash
# Delete the lock file
gsutil rm gs://terraform-state/prod/terraform.tfstate.lock
```

## What NOT to Do

There are a few things you should avoid:

**Do not use `-lock=false` as a workaround.**

```bash
# Do NOT do this as a habit
terraform apply -lock=false  # Dangerous!
```

Running without locks means two people can modify state at the same time, which corrupts the state file. Use `-lock=false` only if you know for certain that you are the only one running Terraform against this state.

**Do not force-unlock while an operation is running.** If someone is genuinely in the middle of a `terraform apply` and you force-unlock, you could end up with a corrupted or incomplete state.

**Do not delete the state file to "fix" the lock.** This removes all knowledge of your infrastructure from Terraform. You would need to import everything from scratch.

## Preventing Lock Errors

Here are some practices that reduce the frequency of lock issues:

### Set Timeouts in CI/CD

```yaml
# GitHub Actions
- name: Terraform Apply
  run: terraform apply -auto-approve -lock-timeout=10m
  timeout-minutes: 30  # Kill the job if it hangs

# GitLab CI
terraform-apply:
  script:
    - terraform apply -auto-approve -lock-timeout=10m
  timeout: 30 minutes
```

Job-level timeouts ensure that if an apply hangs, the CI runner eventually kills it. The `-lock-timeout` flag gives some buffer for waiting on a legitimate lock.

### Use Concurrency Controls

Prevent multiple pipeline runs from competing for the same lock:

```yaml
# GitHub Actions concurrency
concurrency:
  group: terraform-prod
  cancel-in-progress: false  # Never cancel running applies
```

```yaml
# GitLab CI resource groups
terraform-apply:
  resource_group: terraform-prod
```

### Handle Signals Gracefully

If you are running Terraform in a wrapper script, make sure signals are forwarded so Terraform can clean up the lock:

```bash
#!/bin/bash
# run-terraform.sh

# Forward signals to terraform so it can release the lock
trap 'kill -TERM $PID' TERM INT

terraform apply -auto-approve &
PID=$!
wait $PID
EXIT_CODE=$?

exit $EXIT_CODE
```

### Set Up Stale Lock Detection

```bash
#!/bin/bash
# detect-stale-locks.sh
# Run this on a cron schedule

MAX_LOCK_AGE_SECONDS=1800  # 30 minutes

LOCKS=$(aws dynamodb scan \
  --table-name terraform-locks \
  --output json)

echo "$LOCKS" | jq -c '.Items[]' | while read -r item; do
  LOCK_INFO=$(echo "$item" | jq -r '.Info.S')
  CREATED=$(echo "$LOCK_INFO" | jq -r '.Created')

  if [ -n "$CREATED" ]; then
    LOCK_AGE=$(( $(date +%s) - $(date -d "$CREATED" +%s) ))
    if [ "$LOCK_AGE" -gt "$MAX_LOCK_AGE_SECONDS" ]; then
      LOCK_ID=$(echo "$item" | jq -r '.LockID.S')
      echo "STALE LOCK: $LOCK_ID (age: ${LOCK_AGE}s)"
      # Send alert to your monitoring system
    fi
  fi
done
```

Using a monitoring tool like [OneUptime](https://oneuptime.com), you can set up alerts for stale locks so the team is notified before anyone runs into the issue during their work.

## Summary

The "Error acquiring the state lock" message is Terraform protecting you from state corruption. When you see it: first verify whether a legitimate operation is running. If not, use `terraform force-unlock` with the lock ID from the error message. To prevent the issue from recurring, add timeouts to your CI/CD jobs, use concurrency controls to prevent overlapping runs, and monitor for stale locks. These steps will keep your Terraform workflow running smoothly even with a busy team.

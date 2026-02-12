# How to Fix Terraform 'Error acquiring the state lock'

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Infrastructure as Code, DevOps

Description: Resolve the Terraform state lock error caused by stale locks, crashed processes, concurrent runs, and DynamoDB lock table issues with safe recovery steps.

---

You run `terraform plan` or `terraform apply` and get: "Error acquiring the state lock." Terraform uses locking to prevent two people (or two CI/CD pipelines) from modifying the same state file at the same time. When you see this error, it means someone or something already holds the lock, and Terraform is waiting for it.

Most of the time, this is a stale lock from a crashed or interrupted Terraform process. Let's figure out what happened and how to safely unlock it.

## Understanding the Lock

When using a remote backend like S3 with DynamoDB locking, Terraform creates a lock entry in a DynamoDB table before making changes. The lock contains information about who created it and when:

```bash
# Check the lock in DynamoDB
aws dynamodb get-item \
    --table-name terraform-locks \
    --key '{"LockID": {"S": "my-bucket/terraform.tfstate"}}' \
    --query 'Item'
```

The lock entry typically contains:
- The lock ID (which is the state file path)
- Who created it (username/identity)
- When it was created
- A unique operation ID

## Is Someone Else Running Terraform?

Before assuming the lock is stale, verify nobody else is actively running Terraform:

```bash
# The error message shows lock info - check the "Created" timestamp
# and the "Who" field
```

The error output looks something like:

```
Error: Error acquiring the state lock

Error message: ConditionalCheckFailedException: The conditional request failed
Lock Info:
  ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Path:      my-bucket/terraform.tfstate
  Operation: OperationTypeApply
  Who:       user@hostname
  Version:   1.7.0
  Created:   2026-02-12 10:30:00.000000000 +0000 UTC
  Info:
```

If the "Created" timestamp is recent and you recognize the "Who," someone is actively running Terraform. Wait for them to finish.

## Force Unlocking a Stale Lock

If the lock is stale (the person isn't running Terraform anymore, or a CI/CD pipeline crashed), you can force unlock it:

```bash
# Force unlock using the Lock ID from the error message
terraform force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Terraform will ask you to confirm. Type `yes` only if you're sure nobody is currently running Terraform against this state.

You can skip the confirmation prompt (useful in scripts, but be careful):

```bash
# Skip confirmation - use with caution
terraform force-unlock -force a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

## Removing the Lock Directly from DynamoDB

If `terraform force-unlock` doesn't work (maybe because of backend configuration issues), you can remove the lock directly from DynamoDB:

```bash
# Delete the lock entry directly
aws dynamodb delete-item \
    --table-name terraform-locks \
    --key '{"LockID": {"S": "my-bucket/terraform.tfstate"}}'
```

Only do this if you're absolutely certain no other process is using the state. Removing a lock while someone is applying changes can corrupt your state file.

## Common Causes of Stale Locks

### CI/CD Pipeline Crashed or Timed Out

This is the most common cause. A pipeline ran `terraform apply`, but the pipeline was killed (timeout, manual cancellation, infrastructure failure) before Terraform could release the lock.

To prevent this, add lock cleanup to your CI/CD pipelines:

```yaml
# GitHub Actions example with cleanup on failure
jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Apply
        id: apply
        run: terraform apply -auto-approve
        continue-on-error: true

      - name: Cleanup lock on failure
        if: failure() && steps.apply.outcome == 'failure'
        run: |
          # Only unlock if the error was a lock issue during apply
          # Be very careful with automatic unlocking
          echo "Terraform apply failed. Check for stale locks."
```

### Ctrl+C During Apply

If you press Ctrl+C during `terraform apply`, Terraform tries to gracefully release the lock. But if you press Ctrl+C again (or kill the process), it might not get the chance.

### Network Issues

If your network connection drops during a Terraform run, the process dies without releasing the lock.

## DynamoDB Lock Table Issues

Make sure the lock table exists and is properly configured:

```bash
# Check if the lock table exists
aws dynamodb describe-table --table-name terraform-locks

# If it doesn't exist, create it
aws dynamodb create-table \
    --table-name terraform-locks \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
```

The table needs:
- A partition key named `LockID` of type String
- No sort key required
- PAY_PER_REQUEST billing works fine for lock tables

Verify your backend configuration matches:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"  # Must match the actual table name
    encrypt        = true
  }
}
```

## State File Corruption Prevention

While dealing with locks, be mindful of state file integrity. Before force-unlocking, it's wise to back up the current state:

```bash
# Download a backup of the current state
aws s3 cp s3://my-terraform-state/terraform.tfstate /tmp/terraform-state-backup.json

# Verify the state file is valid JSON
python3 -m json.tool /tmp/terraform-state-backup.json > /dev/null && echo "Valid" || echo "Corrupted"
```

If the state file got corrupted during a failed apply, you might need to restore from a previous version:

```bash
# List state file versions (requires versioning enabled on the S3 bucket)
aws s3api list-object-versions \
    --bucket my-terraform-state \
    --prefix terraform.tfstate \
    --query 'Versions[].{VersionId:VersionId,LastModified:LastModified,Size:Size}'

# Restore a specific version
aws s3api get-object \
    --bucket my-terraform-state \
    --key terraform.tfstate \
    --version-id <version-id> \
    /tmp/terraform-state-restored.json

# Upload restored state
aws s3 cp /tmp/terraform-state-restored.json \
    s3://my-terraform-state/terraform.tfstate
```

## Preventing Lock Issues

### Use S3 Versioning

Always enable versioning on your state bucket. It's your safety net:

```bash
aws s3api put-bucket-versioning \
    --bucket my-terraform-state \
    --versioning-configuration Status=Enabled
```

### Set Timeouts in CI/CD

Configure reasonable timeouts for Terraform operations:

```bash
# Set a lock timeout instead of failing immediately
terraform apply -lock-timeout=5m -auto-approve
```

The `-lock-timeout` flag tells Terraform to wait up to 5 minutes for the lock before giving up. This handles cases where two pipelines run close together.

### Use Workspaces or Separate State Files

If multiple teams work on different parts of infrastructure, split your state files to reduce contention:

```hcl
# Use separate state files per component
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "networking/terraform.tfstate"  # Component-specific path
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

For monitoring your Terraform pipelines and catching lock issues early, check out [setting up CI/CD monitoring](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) to alert on pipeline failures.

## Summary

The state lock error usually means a previous Terraform run didn't release its lock. Verify nobody else is running Terraform, then use `terraform force-unlock` with the lock ID from the error message. Always back up your state file before force-unlocking, keep S3 versioning enabled, and use `-lock-timeout` in CI/CD pipelines to handle brief contention gracefully.

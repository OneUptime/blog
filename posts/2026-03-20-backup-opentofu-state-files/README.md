# How to Back Up OpenTofu State Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management, Backup

Description: Learn how to implement robust backup strategies for OpenTofu state files to protect against data loss, corruption, and accidental deletion.

## Introduction

Your OpenTofu state file is the source of truth for your managed infrastructure. Losing it can be catastrophic - requiring manual re-import of every resource. A solid backup strategy is not optional; it's a fundamental operational requirement. This guide covers multiple backup approaches for different backend types.

## Automatic Backups: S3 Versioning

The simplest and most powerful backup mechanism for S3-backed state is object versioning:

```hcl
# Enable versioning on the S3 state bucket

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
    # mfa_delete = "Enabled"  # Optional: requires the top-level `mfa` argument
  }

  # Optional: required if `mfa_delete = "Enabled"`
  # mfa = "SERIAL MFA_CODE"
}
```

With versioning enabled, every time OpenTofu writes an updated state object, S3 creates a new version automatically. If you enable MFA Delete, also set the resource's `mfa` argument; AWS only allows MFA Delete changes to be made by the root account. You can restore any previous version at any time.

## Setting Up Lifecycle Rules for Cost Management

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "state-backup-retention"
    status = "Enabled"

    # Transition older versions to cheaper storage
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER"
    }

    # Delete very old versions
    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}
```

## Manual Backup Before Risky Operations

Always make a manual backup before destructive operations:

```bash
# Backup before a risky apply
BACKUP_FILE="state-backup-$(date +%Y%m%d-%H%M%S).tfstate"
tofu state pull > "${BACKUP_FILE}"

# Store backup in S3 with a timestamp
aws s3 cp "${BACKUP_FILE}" \
  s3://my-backup-bucket/terraform-state-backups/

# Or create a timestamped backup in the same bucket
STATE_DATE=$(date +%Y%m%d-%H%M%S)
aws s3 cp \
  s3://my-terraform-state/prod/terraform.tfstate \
  s3://my-terraform-state/backups/${STATE_DATE}-terraform.tfstate
```

## OpenTofu's Automatic Local Backup

When using the local backend, OpenTofu typically creates a `.tfstate.backup` file when it writes new state:

```bash
# With the default local state filename, you'll typically see:
ls *.tfstate*
# terraform.tfstate
# terraform.tfstate.backup  ← Previous version automatically preserved
```

This backup contains the state from before the last write when you're using local state. Always check this file before troubleshooting state issues.

## Scheduled Backup Script

Create a cron job or CI pipeline step to back up state regularly:

```bash
#!/bin/bash
# backup-state.sh - Run daily via cron or CI

BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
STATE_BUCKET="my-terraform-state"
BACKUP_BUCKET="my-terraform-backups"

# List state files that use the default terraform.tfstate name
STATES=$(aws s3 ls s3://${STATE_BUCKET}/ --recursive | grep "terraform.tfstate$" | awk '{print $4}')

for STATE_KEY in $STATES; do
  echo "Backing up: $STATE_KEY"

  # Copy with timestamp in key
  aws s3 cp \
    "s3://${STATE_BUCKET}/${STATE_KEY}" \
    "s3://${BACKUP_BUCKET}/backups/${BACKUP_DATE}/${STATE_KEY}"
done

echo "Backup complete: ${BACKUP_DATE}"
```

## Cross-Region Replication

For disaster recovery, replicate your state bucket to another region. Both source and destination buckets must already have versioning enabled, and the replication role needs the required S3 permissions:

```hcl
resource "aws_s3_bucket_replication_configuration" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-state"
    status = "Enabled"

    filter {}

    destination {
      bucket        = aws_s3_bucket.terraform_state_replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

## Restoring from Backup

```bash
# Restore a specific S3 version
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/terraform.tfstate

# Get the version ID from the output, then restore
aws s3api get-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate \
  --version-id "EXAMPLE_VERSION_ID" \
  restored-state.tfstate

# Push the restored state
tofu state push restored-state.tfstate
```

## Verifying Backup Integrity

```bash
# Validate a backup file is valid JSON
python3 -c "import json; json.load(open('backup.tfstate'))" && echo "Valid JSON"

# Check resource count matches expectations
jq '.resources | length' backup.tfstate
```

## Conclusion

Backing up OpenTofu state files is a critical operational practice. Enable S3 versioning as your baseline - it provides automatic versioning with zero additional effort. Supplement with manual pre-operation backups, lifecycle rules for cost management, and cross-region replication for disaster recovery. Regular backup testing ensures you can actually restore when needed.

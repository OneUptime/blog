# How to Automate State File Backups in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, State Management, Backup, S3, Disaster Recovery

Description: Learn how to automate OpenTofu state file backups using S3 versioning, cross-region replication, and scheduled backup scripts to protect against state corruption and accidental deletion.

## Introduction

State files are critical infrastructure. Losing a state file means OpenTofu no longer knows what it manages, and recovery requires manually re-importing every resource. Automated backups - with S3 versioning, cross-region replication, and scheduled snapshots - protect against this scenario.

## S3 Versioning as Primary Backup

Enable S3 versioning on your state bucket so every state write creates a recoverable version:

```hcl
# bootstrap/state-backend.tf

resource "aws_s3_bucket" "state" {
  bucket = "my-company-tofu-state"

  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning to keep all historical state versions
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle policy to expire old versions (keep 90 days of history)
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
  }
}
```

## Cross-Region Replication

Assuming you've already configured an aliased DR provider and the required replication IAM role, replicate state files to a second region for disaster recovery:

```hcl
resource "aws_s3_bucket_replication_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  role   = aws_iam_role.replication.arn

  depends_on = [
    aws_s3_bucket_versioning.state,
    aws_s3_bucket_versioning.state_dr,
  ]

  rule {
    id     = "replicate-to-dr"
    status = "Enabled"

    filter {}

    destination {
      bucket        = aws_s3_bucket.state_dr.arn
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket" "state_dr" {
  provider = aws.dr_region
  bucket   = "my-company-tofu-state-dr"
}

resource "aws_s3_bucket_versioning" "state_dr" {
  provider = aws.dr_region
  bucket   = aws_s3_bucket.state_dr.id
  versioning_configuration { status = "Enabled" }
}
```

## Scheduled State Snapshot Script

Create dated backups of state files stored in a fixed environment/component layout for easy point-in-time recovery:

```bash
#!/bin/bash
# backup_state_files.sh - Create dated snapshots of state files in a fixed layout

BUCKET="my-company-tofu-state"
BACKUP_BUCKET="my-company-tofu-state-backups"
DATE=$(date +%Y-%m-%d)
ENVIRONMENTS=("dev" "staging" "prod")
COMPONENTS=("networking" "security" "data" "services/api" "services/worker")

for env in "${ENVIRONMENTS[@]}"; do
  for component in "${COMPONENTS[@]}"; do
    STATE_KEY="${env}/${component}/terraform.tfstate"
    BACKUP_KEY="backups/${DATE}/${env}/${component}/terraform.tfstate"

    # Check if state file exists
    if aws s3api head-object --bucket "${BUCKET}" --key "${STATE_KEY}" >/dev/null 2>&1; then
      echo "Backing up: ${STATE_KEY}"
      aws s3 cp \
        "s3://${BUCKET}/${STATE_KEY}" \
        "s3://${BACKUP_BUCKET}/${BACKUP_KEY}" \
        --sse AES256
    fi
  done
done

echo "Backup complete for date: $DATE"
```

## Restoring from Backup

```bash
# List available versions in S3
aws s3api list-object-versions \
  --bucket my-company-tofu-state \
  --prefix prod/networking/terraform.tfstate \
  --query 'Versions[?IsLatest==`false`].[VersionId,LastModified]' \
  --output table

# Restore a specific version
VERSION_ID="abc123def456"
aws s3api get-object \
  --bucket my-company-tofu-state \
  --key prod/networking/terraform.tfstate \
  --version-id "$VERSION_ID" \
  /tmp/restore.tfstate

# Push the restored state (with extreme caution!)
tofu state push /tmp/restore.tfstate
```

## State Backup Notification

```hcl
# Schedule a daily stale-state check.
# A separate target such as Lambda must inspect object age and send the alert.
resource "aws_cloudwatch_event_rule" "stale_state_check" {
  name                = "check-stale-state"
  schedule_expression = "rate(1 day)"
}
```

## Conclusion

S3 versioning provides the primary safety net for state backups with zero operational overhead. Cross-region replication handles regional disasters. Scheduled snapshots to a separate bucket provide an additional restore point that's immune to accidental bucket deletion. Always test your recovery procedure by restoring a non-production state file before you need it in a real emergency.

# How to Back Up OpenTofu State Files - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State

Description: Learn how to back up OpenTofu state files using backend versioning, automated backups, and manual snapshot strategies to protect against state corruption or loss.

## Introduction

State file loss or corruption is one of the most serious incidents in infrastructure management - it can make OpenTofu unable to track existing resources, potentially leading to duplicate resource creation or inability to update infrastructure. A robust backup strategy prevents this.

## Automatic Backups: Local State

For local state (`terraform.tfstate`), OpenTofu automatically creates a backup before each write:

```bash
# After every apply, this file is created/updated

ls -la terraform.tfstate.backup
```

The `.backup` file is the state as it was before the last operation. Keep it until the next successful operation.

## Backend Versioning: S3

Enable S3 bucket versioning to keep a full history of state changes:

```hcl
# Enable versioning on the state bucket
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

Restore a previous version:

```bash
# List state versions
aws s3api list-object-versions \
  --bucket my-tofu-state \
  --prefix production/terraform.tfstate

# Restore a specific version
aws s3api copy-object \
  --bucket my-tofu-state \
  --copy-source "my-tofu-state/production/terraform.tfstate?versionId=abc123" \
  --key production/terraform.tfstate
```

## Backend Versioning: GCS

```hcl
resource "google_storage_bucket" "state" {
  name          = "my-tofu-state"
  location      = "US"

  versioning {
    enabled = true
  }
}
```

## Manual Snapshot Before Risky Operations

Before major changes, take a manual snapshot:

```bash
# Snapshot current state
tofu state pull > "state-backup-$(date +%Y%m%d-%H%M%S).json"

# Store in a separate location
aws s3 cp "state-backup-$(date +%Y%m%d-%H%M%S).json" \
  s3://my-state-backups/manual-snapshots/

# Verify the snapshot
jq '.resources | length' state-backup-*.json
```

## Automated Backup Script

```bash
#!/bin/bash
# backup-state.sh - run before major infrastructure changes

set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/secure/state-backups"
BACKUP_FILE="${BACKUP_DIR}/terraform.tfstate.${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"
tofu state pull > "$BACKUP_FILE"

echo "State backed up to: $BACKUP_FILE"
echo "Resource count: $(jq '.resources | length' "$BACKUP_FILE")"
```

## Restoring from Backup

```bash
# Verify the backup is valid JSON
jq . state-backup-20260320-120000.json > /dev/null && echo "Valid JSON"

# Check resource count matches expectations
jq '.resources | length' state-backup-20260320-120000.json

# Push the backup to the remote backend
tofu state push state-backup-20260320-120000.json
```

## Point-in-Time Recovery with S3 Versioning

```bash
# Get all state versions with timestamps
aws s3api list-object-versions \
  --bucket my-tofu-state \
  --prefix prod/terraform.tfstate \
  --query 'Versions[*].{VersionId: VersionId, LastModified: LastModified}' \
  --output table

# Download state from a specific point in time
aws s3api get-object \
  --bucket my-tofu-state \
  --key prod/terraform.tfstate \
  --version-id VERSION_ID \
  state-at-point-in-time.json
```

## Backup Retention Policy

```hcl
# S3 lifecycle rule: keep 90 days of state versions
resource "aws_s3_bucket_lifecycle_configuration" "state_retention" {
  bucket = aws_s3_bucket.state.id

  rule {
    id     = "state-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

## Conclusion

State backup is non-negotiable. Enable S3 or GCS versioning for automatic history, take manual snapshots before significant changes, and test your restore procedure before you need it. A 90-day retention window gives adequate recovery time for most scenarios while managing storage costs.

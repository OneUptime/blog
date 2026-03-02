# How to Set Up Automated Terraform State Backups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Backup, Infrastructure as Code, DevOps, Disaster Recovery

Description: Learn how to set up automated backups for your Terraform state files using S3 versioning, GCS snapshots, and custom scripts to prevent data loss and enable quick recovery.

---

Your Terraform state file is the single most important artifact in your infrastructure-as-code workflow. If you lose it, Terraform loses track of every resource it manages. You are left manually reconciling cloud resources with configuration files, which is painful and error-prone. Automated state backups protect you from accidental deletions, corruption, and backend failures.

This guide walks through setting up automated state backups using multiple approaches, from built-in backend features to custom backup scripts and CI/CD pipelines.

## Why State Backups Matter

Terraform state contains the mapping between your HCL configuration and real cloud resources. Without it:

- Terraform cannot determine what needs to be created, updated, or destroyed.
- Running `terraform plan` will show every resource as "new."
- Manual cleanup of orphaned resources becomes necessary.
- Sensitive outputs and resource attributes are lost.

Even with remote backends, things can go wrong. Someone might accidentally run `terraform state rm` on the wrong resource. A misconfigured migration might wipe the state. Backend storage could experience an outage. Backups give you a safety net.

## Using S3 Versioning for State Backups

If you use AWS S3 as your backend, enabling versioning is the simplest form of automated backup. Every time Terraform writes a new state file, S3 keeps the previous version.

```hcl
# backend.tf - Configure S3 backend with versioning support
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

Enable versioning on the S3 bucket itself:

```hcl
# state-bucket.tf - Create the state bucket with versioning
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state"

  # Prevent accidental deletion of this bucket
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Keep old versions for 90 days before cleaning up
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

To restore a previous version, use the AWS CLI:

```bash
# List all versions of the state file
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/infrastructure/terraform.tfstate

# Restore a specific version by copying it over the current one
aws s3api copy-object \
  --bucket my-terraform-state \
  --copy-source "my-terraform-state/prod/infrastructure/terraform.tfstate?versionId=ABC123" \
  --key prod/infrastructure/terraform.tfstate
```

## Using GCS Versioning for State Backups

Google Cloud Storage offers similar versioning capabilities:

```hcl
# backend.tf - GCS backend configuration
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod/infrastructure"
  }
}
```

```hcl
# state-bucket.tf - GCS bucket with versioning
resource "google_storage_bucket" "terraform_state" {
  name     = "my-terraform-state"
  location = "US"

  versioning {
    enabled = true
  }

  # Automatically delete old versions after 90 days
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 30
      with_state         = "ARCHIVED"
    }
  }
}
```

## Custom Backup Script

For more control, write a backup script that runs before each Terraform operation. This works with any backend.

```bash
#!/bin/bash
# backup-state.sh - Back up Terraform state before operations

set -euo pipefail

# Configuration
BACKUP_DIR="./state-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_BACKUPS=50

# Create backup directory if it does not exist
mkdir -p "$BACKUP_DIR"

# Pull the current state
echo "Pulling current state..."
terraform state pull > "$BACKUP_DIR/terraform.tfstate.$TIMESTAMP"

# Verify the backup is valid JSON
if ! jq empty "$BACKUP_DIR/terraform.tfstate.$TIMESTAMP" 2>/dev/null; then
  echo "ERROR: Backup file is not valid JSON. Aborting."
  rm -f "$BACKUP_DIR/terraform.tfstate.$TIMESTAMP"
  exit 1
fi

echo "State backed up to $BACKUP_DIR/terraform.tfstate.$TIMESTAMP"

# Rotate old backups - keep only the most recent ones
cd "$BACKUP_DIR"
ls -t terraform.tfstate.* | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm --

echo "Backup complete. $(ls terraform.tfstate.* | wc -l) backups on disk."
```

## Cross-Region Backup Replication

For critical production infrastructure, replicate state backups to another region:

```hcl
# replication.tf - Cross-region state backup replication
resource "aws_s3_bucket" "state_backup_replica" {
  provider = aws.backup_region
  bucket   = "my-terraform-state-replica"
}

resource "aws_s3_bucket_versioning" "state_backup_replica" {
  provider = aws.backup_region
  bucket   = aws_s3_bucket.state_backup_replica.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Set up replication from primary to replica
resource "aws_s3_bucket_replication_configuration" "state_replication" {
  bucket = aws_s3_bucket.terraform_state.id
  role   = aws_iam_role.replication_role.arn

  rule {
    id     = "replicate-state"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.state_backup_replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

## CI/CD Pipeline Integration

Integrate state backups into your CI/CD pipeline so they happen automatically before every apply:

```yaml
# .github/workflows/terraform.yml
name: Terraform Apply with Backup

on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      # Back up state before any changes
      - name: Backup State
        run: |
          terraform state pull > state-backup.json
          # Upload as artifact for retention
          echo "State serial: $(jq .serial state-backup.json)"

      - name: Upload State Backup
        uses: actions/upload-artifact@v4
        with:
          name: "state-backup-${{ github.sha }}"
          path: state-backup.json
          retention-days: 30

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        run: terraform apply tfplan
```

## Monitoring Backup Health

Set up alerts to catch backup failures early:

```hcl
# monitoring.tf - Alert when state backups are stale
resource "aws_cloudwatch_metric_alarm" "state_backup_stale" {
  alarm_name          = "terraform-state-backup-stale"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfObjects"
  namespace           = "AWS/S3"
  period              = 86400  # Check daily
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "No new state file versions in the last 24 hours"

  dimensions = {
    BucketName  = "my-terraform-state"
    StorageType = "AllStorageTypes"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Restoring from Backups

When you need to restore state from a backup, follow these steps carefully:

```bash
# Step 1: Pull the current (possibly corrupted) state and save it
terraform state pull > current-state-corrupted.json

# Step 2: Identify the correct backup to restore
# For S3 versioned backups:
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/infrastructure/terraform.tfstate \
  --max-items 10

# Step 3: Push the backup state
# Make sure to increment the serial number to avoid conflicts
terraform state push state-backup.json

# Step 4: Verify the restored state
terraform plan
```

Always run `terraform plan` after restoring to verify that the state matches your actual infrastructure. If there are drifts, investigate each one before running apply.

## Best Practices

1. **Enable versioning on your backend bucket.** This is the bare minimum for any production setup.
2. **Set up cross-region replication** for critical infrastructure state.
3. **Automate backups in CI/CD** so they happen consistently without human intervention.
4. **Test your restore process** periodically. A backup you have never tested is a backup you cannot trust.
5. **Monitor backup freshness** to catch failures early.
6. **Keep backups for at least 30 days.** Some issues take time to surface.
7. **Never store backups in the same location as the primary state.** A single point of failure defeats the purpose.

Automated state backups are one of those things you set up once and forget about - until the day they save you from a serious incident. Take the time to implement them properly, and your future self will thank you.

For more on Terraform state management, check out our guide on [configuring remote state backends](https://oneuptime.com/blog/post/2026-02-02-terraform-remote-state-backends/view).

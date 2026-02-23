# How to Configure Terraform State for Disaster Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Disaster Recovery, State Management, Infrastructure as Code, DevOps, Backup

Description: Learn how to configure your Terraform state infrastructure for disaster recovery with cross-region replication, automated backups, and tested recovery procedures.

---

Your Terraform state file is a critical piece of your infrastructure. If the backend storing it goes down or the file gets corrupted, you cannot manage any of the resources Terraform tracks. A disaster recovery plan for Terraform state ensures you can recover quickly from regional outages, accidental deletions, and backend failures.

This guide covers how to design a resilient state storage architecture, automate backups, and practice recovery procedures so you are ready when something goes wrong.

## Understanding the Risk

Without disaster recovery for Terraform state:

- A regional cloud outage makes your state inaccessible. You cannot run `terraform plan` or `terraform apply`.
- Accidental deletion of the state file orphans all managed resources.
- State corruption from a failed migration or race condition blocks all operations.
- A compromised storage account could lead to state tampering.

The goal is to have multiple copies of state in different locations, with automated processes to keep them in sync and tested procedures to fail over when needed.

## Cross-Region Replication on AWS

The foundation of state disaster recovery on AWS is S3 cross-region replication:

```hcl
# primary-state-bucket.tf - Primary state storage in us-east-1
provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

# Primary state bucket
resource "aws_s3_bucket" "state_primary" {
  provider = aws.primary
  bucket   = "myorg-terraform-state-primary"
}

resource "aws_s3_bucket_versioning" "state_primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.state_primary.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state_primary" {
  provider = aws.primary
  bucket   = aws_s3_bucket.state_primary.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# DR replica bucket
resource "aws_s3_bucket" "state_dr" {
  provider = aws.dr
  bucket   = "myorg-terraform-state-dr"
}

resource "aws_s3_bucket_versioning" "state_dr" {
  provider = aws.dr
  bucket   = aws_s3_bucket.state_dr.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Replication configuration
resource "aws_s3_bucket_replication_configuration" "state_replication" {
  provider = aws.primary
  bucket   = aws_s3_bucket.state_primary.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all-state"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.state_dr.arn
      storage_class = "STANDARD"

      # Replicate encrypted objects
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.dr_state_key.arn
      }
    }

    # Replicate delete markers too
    delete_marker_replication {
      status = "Enabled"
    }
  }
}
```

## DynamoDB Global Tables for Lock Replication

If you use DynamoDB for state locking, set up a global table so locks work in both regions:

```hcl
# lock-table.tf - Global DynamoDB table for locking
resource "aws_dynamodb_table" "terraform_locks" {
  provider     = aws.primary
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Enable global table replication to the DR region
  replica {
    region_name = "us-west-2"
  }
}
```

With global tables, the lock table is available in both regions. When you fail over to the DR region, locking continues to work without reconfiguration.

## Multi-Region Backend Configuration

Prepare backend configurations for both the primary and DR regions:

```hcl
# backend-configs/primary.hcl
bucket         = "myorg-terraform-state-primary"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-state-locks"
```

```hcl
# backend-configs/dr.hcl
bucket         = "myorg-terraform-state-dr"
region         = "us-west-2"
encrypt        = true
dynamodb_table = "terraform-state-locks"
```

During normal operations:

```bash
terraform init -backend-config=backend-configs/primary.hcl
```

During a disaster recovery event:

```bash
terraform init -reconfigure -backend-config=backend-configs/dr.hcl
```

## GCS Cross-Region Setup

For Google Cloud, use dual-region or multi-region buckets:

```hcl
# gcs-state.tf - Multi-region state bucket
resource "google_storage_bucket" "state" {
  name     = "myorg-terraform-state"
  location = "US"  # Multi-region location

  versioning {
    enabled = true
  }

  # Keep 90 days of versions for recovery
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 90
      with_state         = "ARCHIVED"
    }
  }
}
```

GCS multi-region buckets automatically replicate data across multiple regions within the geographic area. For cross-continent replication, set up a separate bucket with a transfer job:

```hcl
# gcs-replication.tf - Cross-continent state replication
resource "google_storage_bucket" "state_dr" {
  name     = "myorg-terraform-state-dr"
  location = "EU"

  versioning {
    enabled = true
  }
}

resource "google_storage_transfer_job" "state_replication" {
  description = "Replicate Terraform state to DR region"

  transfer_spec {
    gcs_data_source {
      bucket_name = google_storage_bucket.state.name
    }
    gcs_data_sink {
      bucket_name = google_storage_bucket.state_dr.name
    }
  }

  schedule {
    schedule_start_date {
      year  = 2026
      month = 1
      day   = 1
    }
    start_time_of_day {
      hours   = 0
      minutes = 0
      seconds = 0
      nanos   = 0
    }
    repeat_interval = "3600s"  # Every hour
  }
}
```

## Automated Recovery Testing

A disaster recovery plan is only as good as your last test. Automate regular DR drills:

```bash
#!/bin/bash
# dr-drill.sh - Test disaster recovery failover

set -euo pipefail

echo "=== Terraform State DR Drill ==="
echo "Started at $(date)"

# Step 1: Pull state from primary
echo "Pulling state from primary backend..."
terraform init -reconfigure -backend-config=backend-configs/primary.hcl
PRIMARY_SERIAL=$(terraform state pull | jq '.serial')
PRIMARY_RESOURCES=$(terraform state list | wc -l)
echo "Primary state: serial=$PRIMARY_SERIAL, resources=$PRIMARY_RESOURCES"

# Step 2: Switch to DR backend
echo "Switching to DR backend..."
terraform init -reconfigure -backend-config=backend-configs/dr.hcl
DR_SERIAL=$(terraform state pull | jq '.serial')
DR_RESOURCES=$(terraform state list | wc -l)
echo "DR state: serial=$DR_SERIAL, resources=$DR_RESOURCES"

# Step 3: Verify consistency
if [ "$PRIMARY_RESOURCES" != "$DR_RESOURCES" ]; then
  echo "ERROR: Resource count mismatch. Primary=$PRIMARY_RESOURCES, DR=$DR_RESOURCES"
  exit 1
fi

# Step 4: Run plan from DR backend
echo "Running plan from DR backend..."
PLAN_OUTPUT=$(terraform plan -no-color 2>&1)
if echo "$PLAN_OUTPUT" | grep -q "No changes"; then
  echo "SUCCESS: DR backend shows no changes. Failover would work."
else
  echo "WARNING: DR backend shows changes. Replication may be lagging."
  echo "$PLAN_OUTPUT"
fi

# Step 5: Switch back to primary
echo "Switching back to primary backend..."
terraform init -reconfigure -backend-config=backend-configs/primary.hcl

echo "=== DR Drill Complete ==="
```

Schedule this to run weekly:

```yaml
# .github/workflows/dr-drill.yml
name: Terraform DR Drill

on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM

jobs:
  dr-drill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Run DR Drill
        run: ./scripts/dr-drill.sh

      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d '{"text":"Terraform DR drill FAILED. Check the pipeline."}'
```

## Recovery Procedures

Document your failover procedure and keep it accessible outside of your primary region:

```bash
#!/bin/bash
# failover.sh - Execute disaster recovery failover

set -euo pipefail

echo "=== TERRAFORM STATE FAILOVER ==="
echo "This script switches Terraform to the DR backend."
echo "Only run this during an actual disaster recovery event."
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Switch to DR backend
terraform init -reconfigure -backend-config=backend-configs/dr.hcl

# Verify state is accessible
terraform state list > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Successfully connected to DR backend."
  echo "Resource count: $(terraform state list | wc -l)"
else
  echo "ERROR: Cannot access DR backend state."
  exit 1
fi

# Run a plan to verify
terraform plan -no-color

echo ""
echo "=== Failover Complete ==="
echo "You are now operating from the DR backend."
echo "Update CI/CD pipelines to use backend-configs/dr.hcl"
echo "Notify the team of the failover."
```

## Monitoring State Health

Set up monitoring to detect state issues before they become emergencies:

```hcl
# monitoring.tf - CloudWatch alarm for replication lag
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "terraform-state-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Maximum"
  threshold           = 900  # 15 minutes
  alarm_description   = "Terraform state replication is lagging"

  dimensions = {
    SourceBucket      = "myorg-terraform-state-primary"
    DestinationBucket = "myorg-terraform-state-dr"
    RuleId            = "replicate-all-state"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Best Practices

1. **Enable versioning on all state buckets.** Versioning is the first line of defense against accidental deletion and corruption.
2. **Set up cross-region replication.** Keep a copy of state in a different geographic region.
3. **Replicate lock tables too.** Use DynamoDB global tables or equivalent so locking works during failover.
4. **Test failover regularly.** Run DR drills weekly or monthly to verify your recovery procedure works.
5. **Document the failover procedure** and store it somewhere accessible during an outage (not just in your primary region).
6. **Monitor replication lag.** Stale replicas mean data loss during failover.
7. **Keep backend configs for both regions** ready to go so failover is a single command.

Disaster recovery for Terraform state is insurance you hope to never use. But when a regional outage hits at 3 AM, having automated replication and a tested failover procedure is the difference between a 10-minute recovery and a multi-day incident.

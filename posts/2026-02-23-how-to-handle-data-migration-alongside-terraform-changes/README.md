# How to Handle Data Migration Alongside Terraform Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Migration, Database, Infrastructure as Code, DevOps

Description: Learn how to coordinate data migrations with Terraform infrastructure changes to safely update databases, storage, and stateful services without data loss.

---

Infrastructure changes often need to accompany data migrations. When you use Terraform to modify databases, storage systems, or other stateful services, you must coordinate the infrastructure changes with the data that lives inside those resources. Mishandling this coordination can lead to data loss, downtime, or inconsistent states. This guide covers strategies for handling data migrations alongside Terraform changes.

## The Challenge

Terraform manages infrastructure but not the data within it. When you change a database instance type, modify a storage bucket, or restructure a database architecture, Terraform handles the infrastructure, but you need a separate process for the data. The key challenge is sequencing these operations correctly.

## Strategy 1: Blue-Green Database Migration

Create the new database alongside the old one, migrate data, then switch:

```hcl
# Step 1: Create the new database (Terraform manages both)
resource "aws_db_instance" "primary_v1" {
  identifier     = "app-db-v1"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.r5.large"
  # ... existing config
}

resource "aws_db_instance" "primary_v2" {
  identifier     = "app-db-v2"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = "db.r6g.large"

  # Use a snapshot of v1 as the starting point
  snapshot_identifier = aws_db_snapshot.migration.id
}

# Create a snapshot for migration
resource "aws_db_snapshot" "migration" {
  db_instance_identifier = aws_db_instance.primary_v1.identifier
  db_snapshot_identifier = "migration-snapshot"
}

# Step 2: Output both endpoints for the application
output "db_endpoint_v1" {
  value = aws_db_instance.primary_v1.endpoint
}

output "db_endpoint_v2" {
  value = aws_db_instance.primary_v2.endpoint
}
```

```bash
# Step 3: Migrate data (outside Terraform)
pg_dump -h old-db-endpoint -U admin app_db | \
  psql -h new-db-endpoint -U admin app_db

# Step 4: Switch application to new database
# Update the application configuration or DNS

# Step 5: After verification, remove old database from Terraform
# Remove aws_db_instance.primary_v1 from configuration
```

## Strategy 2: In-Place Migration with Lifecycle Rules

For changes that Terraform handles in-place:

```hcl
resource "aws_db_instance" "primary" {
  identifier     = "app-db"
  engine         = "postgres"
  engine_version = "16.1"         # Upgraded from 14.9
  instance_class = "db.r6g.large" # Upgraded from db.r5.large

  # Allow Terraform to apply the change without replacement
  apply_immediately = false  # Apply during maintenance window

  lifecycle {
    # Prevent accidental deletion
    prevent_destroy = true
  }
}
```

## Strategy 3: S3 Data Migration

When restructuring S3 buckets:

```hcl
# Create new bucket
resource "aws_s3_bucket" "data_v2" {
  bucket = "app-data-v2"
}

# Use a null_resource to trigger data migration
resource "null_resource" "migrate_s3_data" {
  depends_on = [aws_s3_bucket.data_v2]

  provisioner "local-exec" {
    command = "aws s3 sync s3://app-data-v1 s3://app-data-v2"
  }

  # Re-run if the bucket changes
  triggers = {
    bucket_id = aws_s3_bucket.data_v2.id
  }
}
```

## Strategy 4: DynamoDB Migration

For DynamoDB table changes that require recreation:

```hcl
# Use AWS DMS (Database Migration Service) managed by Terraform
resource "aws_dms_replication_instance" "migration" {
  replication_instance_id    = "dynamodb-migration"
  replication_instance_class = "dms.t3.medium"
  allocated_storage          = 50
}

resource "aws_dms_endpoint" "source" {
  endpoint_id   = "source-dynamodb"
  endpoint_type = "source"
  engine_name   = "dynamodb"

  dynamodb_settings {
    service_access_role_arn = aws_iam_role.dms.arn
  }
}

resource "aws_dms_endpoint" "target" {
  endpoint_id   = "target-dynamodb"
  endpoint_type = "target"
  engine_name   = "dynamodb"

  dynamodb_settings {
    service_access_role_arn = aws_iam_role.dms.arn
  }
}

resource "aws_dms_replication_task" "migration" {
  migration_type           = "full-load"
  replication_instance_arn = aws_dms_replication_instance.migration.replication_instance_arn
  replication_task_id      = "dynamodb-migration"
  source_endpoint_arn      = aws_dms_endpoint.source.endpoint_arn
  target_endpoint_arn      = aws_dms_endpoint.target.endpoint_arn

  table_mappings = jsonencode({
    rules = [{
      rule-type = "selection"
      rule-id   = "1"
      rule-name = "all-tables"
      object-locator = {
        schema-name = "%"
        table-name  = "%"
      }
      rule-action = "include"
    }]
  })
}
```

## Strategy 5: Preventing Accidental Data Loss

Use Terraform lifecycle rules to prevent destructive changes:

```hcl
resource "aws_db_instance" "primary" {
  # ... configuration

  lifecycle {
    prevent_destroy = true
  }

  # Enable deletion protection at the cloud level too
  deletion_protection = true

  # Take a final snapshot before any deletion
  final_snapshot_identifier = "final-snapshot-${formatdate("YYYYMMDD", timestamp())}"
  skip_final_snapshot       = false
}

resource "aws_s3_bucket" "data" {
  bucket = "critical-data"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "app" {
  name = "app-data"

  lifecycle {
    prevent_destroy = true
  }

  point_in_time_recovery {
    enabled = true
  }
}
```

## Sequencing Infrastructure and Data Changes

Create a step-by-step runbook:

```bash
#!/bin/bash
# migration-runbook.sh

echo "=== Phase 1: Pre-migration ==="
echo "1. Take database snapshot"
aws rds create-db-snapshot \
  --db-instance-identifier app-db \
  --db-snapshot-identifier pre-migration-$(date +%Y%m%d)

echo "2. Verify backup"
aws rds describe-db-snapshots \
  --db-snapshot-identifier pre-migration-$(date +%Y%m%d)

echo "=== Phase 2: Infrastructure Changes ==="
echo "3. Apply Terraform changes (create new resources)"
terraform apply -target=aws_db_instance.primary_v2

echo "4. Verify new infrastructure"
terraform plan

echo "=== Phase 3: Data Migration ==="
echo "5. Run data migration scripts"
./scripts/migrate-data.sh

echo "6. Verify data integrity"
./scripts/verify-data.sh

echo "=== Phase 4: Cutover ==="
echo "7. Switch application to new database"
terraform apply -target=aws_route53_record.db_cname

echo "8. Monitor for issues"
echo "   Watch CloudWatch dashboards for 30 minutes"

echo "=== Phase 5: Cleanup ==="
echo "9. Remove old infrastructure (after verification period)"
echo "   terraform apply (to remove old resources)"
```

## Handling Terraform Changes That Force Replacement

Some Terraform changes force resource replacement, which destroys data:

```hcl
# This change forces RDS replacement - DATA LOSS!
resource "aws_db_instance" "primary" {
  identifier = "app-db"
  engine     = "postgres"
  # Changing the storage type from gp2 to gp3 may force replacement
  storage_type = "gp3"  # Was "gp2"
}
```

To prevent this:

```bash
# Always check the plan for "must be replaced"
terraform plan | grep "must be replaced"

# If replacement is needed, use the blue-green strategy instead
```

## Best Practices

Never rely on Terraform alone for data migration. Always take backups before infrastructure changes affecting stateful resources. Use prevent_destroy lifecycle rules on critical data resources. Sequence operations carefully: infrastructure first, data migration second, cutover third. Test data migration procedures in non-production environments. Monitor data integrity during and after migration. Keep old resources available for rollback until the migration is fully verified.

## Conclusion

Data migration alongside Terraform changes requires careful coordination between infrastructure automation and data operations. Terraform handles the infrastructure, but you need separate tooling and procedures for the data itself. By using strategies like blue-green deployments, lifecycle protections, and structured runbooks, you can safely evolve your infrastructure without risking data loss. Always test data migrations thoroughly and maintain rollback capabilities throughout the process.

For related guides, see [How to Handle Rollback During Terraform Migration](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-rollback-during-terraform-migration/view) and [How to Plan Large-Scale Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-plan-large-scale-terraform-migrations/view).

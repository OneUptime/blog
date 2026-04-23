# How to Create RDS Snapshots with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Snapshot, Backup, Disaster Recovery, Infrastructure as Code

Description: Learn how to create manual RDS snapshots and manage snapshot copies across regions using OpenTofu for long-term backup retention and cross-region disaster recovery.

## Introduction

Manual RDS snapshots are user-initiated backups retained until explicitly deleted, unlike automated backups that expire after the retention window. They are used for long-term retention, pre-change backups, and cross-region copies for disaster recovery.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS permissions
- A stable value for `var.snapshot_suffix` (for example, `20260423`)

## Step 1: Create a Manual Snapshot

```hcl
# Manual snapshot of an RDS instance

resource "aws_db_snapshot" "pre_migration" {
  db_instance_identifier = aws_db_instance.main.identifier
  db_snapshot_identifier = "${var.project_name}-pre-migration-${var.snapshot_suffix}"

  tags = {
    Name    = "pre-migration-snapshot"
    Reason  = "PreMigration"
    Version = var.app_version
  }

  # Timeouts for snapshot creation
  timeouts {
    create = "30m"
  }
}
```

## Step 2: Copy Snapshot to Another Region

```hcl
# Copy the snapshot to a DR region for cross-region recovery
# aws.dr_region is an aliased AWS provider configured for the DR region
resource "aws_db_snapshot_copy" "dr_copy" {
  provider = aws.dr_region

  source_db_snapshot_identifier = aws_db_snapshot.pre_migration.db_snapshot_arn
  target_db_snapshot_identifier = "${var.project_name}-dr-${var.snapshot_suffix}"
  destination_region            = var.dr_region

  # Encrypt the copy with the DR region's KMS key
  kms_key_id = var.dr_kms_key_arn
  copy_tags  = true

  tags = {
    Name         = "dr-region-snapshot"
    SourceRegion = var.primary_region
  }
}
```

## Step 3: Share Snapshot with Another Account

For encrypted snapshots, use a customer-managed KMS key; snapshots encrypted with the default AWS managed key can't be shared across accounts.

```hcl
# Share a snapshot with a DR or audit account
resource "aws_db_snapshot" "shared" {
  db_instance_identifier = aws_db_instance.main.identifier
  db_snapshot_identifier = "${var.project_name}-shared-${var.snapshot_suffix}"
  shared_accounts        = [var.target_account_id]
}
```

## Step 4: Restore from a Snapshot

```hcl
# Restore a new database instance from a snapshot
resource "aws_db_instance" "restored" {
  identifier     = "${var.project_name}-restored"
  instance_class = "db.r6g.xlarge"

  # Specify the snapshot to restore from
  snapshot_identifier = aws_db_snapshot.pre_migration.db_snapshot_identifier

  # Override network settings for the restored instance
  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.security_group_id]

  # Optional: allow future teardown without taking another final snapshot
  skip_final_snapshot = true

  tags = {
    Name      = "restored-instance"
    Source    = "snapshot"
    SourceSnap = aws_db_snapshot.pre_migration.db_snapshot_identifier
  }
}
```

## Step 5: Create a Snapshot Before Terraform Destroy

```hcl
# Final snapshot created automatically when the instance is deleted
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"

  # Leave deletion protection disabled if you plan to destroy this instance with OpenTofu
  deletion_protection = false

  # Create a final snapshot before deletion
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-final-${var.snapshot_suffix}"

  # Other configuration...
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.t3.medium"
  db_name        = var.database_name
  username       = var.master_username
  password       = var.master_password
  storage_type      = "gp3"
  allocated_storage = 20
  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.security_group_id]
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Manual RDS snapshots provide a reliable mechanism for long-term backup retention beyond the automated backup window (max 35 days). Take manual snapshots before major changes like schema migrations or upgrades as a recovery safety net. Encrypt snapshots with customer-managed KMS keys for compliance, and copy snapshots to additional regions for geographic redundancy in your DR strategy.

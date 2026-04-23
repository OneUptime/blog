# How to Set Up RDS Encryption with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, RDS, Encryption, KMS, Security, Infrastructure as Code

Description: Learn how to configure RDS encryption at rest using customer-managed KMS keys with OpenTofu, including encrypting existing unencrypted databases by snapshot restore.

## Introduction

RDS encryption at rest uses AWS KMS to encrypt database storage volumes, automated backups, read replicas, and snapshots. Encryption must be enabled at database creation time-you cannot encrypt an existing unencrypted database directly, but can create an encrypted copy via snapshot.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS and KMS permissions

## Step 1: Create a KMS Key for RDS

```hcl
# Customer-managed KMS key for RDS encryption

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS database encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name    = "rds-encryption-key"
    Purpose = "RDS"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/rds-encryption"
  target_key_id = aws_kms_key.rds.key_id
}
```

## Step 2: Create an Encrypted RDS Instance

```hcl
resource "aws_db_instance" "encrypted" {
  identifier     = "${var.project_name}-encrypted-db"
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r6g.xlarge"

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  # Enable encryption with the CMK
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  # Snapshots, automated backups, and read replicas
  # are automatically encrypted with the same key
  backup_retention_period = 7

  storage_type          = "gp3"
  allocated_storage     = 100
  max_allocated_storage = 500

  multi_az              = true

  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.security_group_id]

  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn  # Encrypt PI data too

  tags = {
    Name        = "${var.project_name}-encrypted-db"
    Encrypted   = "true"
    KMSKey      = aws_kms_key.rds.key_id
  }
}
```

## Step 3: Encrypt an Existing Unencrypted Database

```bash
# Step 1: Create a snapshot of the unencrypted database
aws rds create-db-snapshot \
  --db-instance-identifier unencrypted-database \
  --db-snapshot-identifier unencrypted-snapshot

aws rds wait db-snapshot-available \
  --db-snapshot-identifier unencrypted-snapshot

# Step 2: Copy the snapshot and encrypt it
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier unencrypted-snapshot \
  --target-db-snapshot-identifier encrypted-snapshot \
  --kms-key-id alias/rds-encryption

aws rds wait db-snapshot-available \
  --db-snapshot-identifier encrypted-snapshot

# Step 3: Restore from the encrypted snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier encrypted-database \
  --db-snapshot-identifier encrypted-snapshot \
  --db-subnet-group-name my-subnet-group
```

```hcl
# OpenTofu to restore from encrypted snapshot
resource "aws_db_instance" "encrypted_restore" {
  identifier          = "${var.project_name}-encrypted-restored"
  instance_class      = "db.r6g.xlarge"
  snapshot_identifier = var.encrypted_snapshot_id

  # Encryption is inherited from the encrypted snapshot copy

  db_subnet_group_name   = var.subnet_group_name
  vpc_security_group_ids = [var.security_group_id]

  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-final"
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

RDS encryption with customer-managed KMS keys provides the strongest protection for database data at rest. All data written to disk, including backups and read replicas, is automatically encrypted. Regularly rotate your KMS key (enable automatic rotation) and monitor key usage via CloudTrail. For new databases, always enable encryption at creation-the snapshot-copy-restore process for encrypting existing databases requires downtime during the cutover.

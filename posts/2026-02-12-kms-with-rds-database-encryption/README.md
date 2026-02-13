# How to Use KMS with RDS for Database Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, KMS, RDS, Encryption, Database

Description: Learn how to encrypt RDS databases with KMS customer managed keys, manage encrypted snapshots, handle cross-region replication, and migrate unencrypted databases.

---

Database encryption is non-negotiable for any production workload handling sensitive data. AWS RDS makes this relatively painless with KMS integration - it encrypts data at rest, automated backups, snapshots, and read replicas using the same key. But there are some gotchas, especially around migrating existing unencrypted databases and cross-account snapshot sharing.

Let's walk through the setup, management, and edge cases of RDS encryption with KMS.

## How RDS Encryption Works

RDS encryption uses the same envelope encryption pattern as EBS. When you create an encrypted database:

1. RDS requests a data key from your KMS CMK
2. The data key encrypts all database storage: the DB instance, automated backups, snapshots, read replicas, and logs
3. Encryption is transparent to the database engine and applications
4. There's minimal performance impact (typically less than 5%)

One critical thing to know: **you can't encrypt an existing unencrypted RDS instance in place.** You have to create a new encrypted instance and migrate the data. We'll cover that process later.

## Creating an Encrypted RDS Instance

First, set up a KMS key with the right permissions for RDS.

```bash
# Create a KMS key for RDS
aws kms create-key \
  --description "RDS encryption key for production databases" \
  --tags '[
    {"TagKey": "Service", "TagValue": "rds"},
    {"TagKey": "Environment", "TagValue": "production"}
  ]'

aws kms create-alias \
  --alias-name alias/rds-production \
  --target-key-id "KEY_ID_HERE"
```

Now create an encrypted RDS instance.

```bash
# Create an encrypted RDS instance
aws rds create-db-instance \
  --db-instance-identifier production-db \
  --db-instance-class db.r6g.xlarge \
  --engine postgres \
  --engine-version 15.4 \
  --master-username admin \
  --master-user-password "YOUR_SECURE_PASSWORD" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --kms-key-id alias/rds-production \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --db-subnet-group-name production-subnet-group \
  --backup-retention-period 7 \
  --multi-az
```

The `--storage-encrypted` flag is the key part. If you don't specify a `--kms-key-id`, RDS uses the default `aws/rds` managed key.

## Terraform Configuration

Here's a complete Terraform setup with proper KMS key policies.

```hcl
# KMS key for RDS encryption
resource "aws_kms_key" "rds" {
  description         = "RDS encryption key for production"
  enable_key_rotation = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowRDSServiceUsage"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:CreateGrant",
          "kms:ListGrants",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
            "kms:ViaService"    = "rds.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Service = "rds"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/rds-production"
  target_key_id = aws_kms_key.rds.key_id
}

# Encrypted RDS instance
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  username = "admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.production.name
  vpc_security_group_ids = [aws_security_group.db.id]

  backup_retention_period = 7
  multi_az                = true
  deletion_protection     = true

  tags = {
    Environment = "production"
  }
}
```

## Encrypted Read Replicas

Read replicas of encrypted instances are automatically encrypted using the same KMS key. For cross-region read replicas, you need a KMS key in the destination region.

```bash
# Create a cross-region read replica with encryption
aws rds create-db-instance-read-replica \
  --db-instance-identifier production-db-replica-eu \
  --source-db-instance-identifier production-db \
  --source-region us-east-1 \
  --destination-region eu-west-1 \
  --kms-key-id alias/rds-eu \
  --db-instance-class db.r6g.xlarge
```

In Terraform, cross-region replicas look like this.

```hcl
# Replica in EU with its own KMS key
resource "aws_db_instance" "replica_eu" {
  provider = aws.eu

  identifier          = "production-db-replica-eu"
  replicate_source_db = aws_db_instance.production.arn
  instance_class      = "db.r6g.xlarge"
  kms_key_id          = aws_kms_key.rds_eu.arn

  # These are inherited from the source, but can be overridden
  storage_encrypted = true
  multi_az          = false

  tags = {
    Environment = "production"
    Role        = "read-replica"
  }
}
```

## Working with Encrypted Snapshots

Snapshots of encrypted databases are automatically encrypted. You can copy them with a different key or share them across accounts.

```bash
# Create a manual snapshot (inherits encryption from the DB)
aws rds create-db-snapshot \
  --db-instance-identifier production-db \
  --db-snapshot-identifier production-db-manual-2026-02-12

# Copy a snapshot with a different KMS key
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier production-db-manual-2026-02-12 \
  --target-db-snapshot-identifier production-db-copy \
  --kms-key-id alias/rds-backup-key

# Copy a snapshot to another region
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier production-db-manual-2026-02-12 \
  --target-db-snapshot-identifier production-db-dr-copy \
  --source-region us-east-1 \
  --kms-key-id alias/rds-dr-key
```

## Sharing Encrypted Snapshots

Sharing encrypted snapshots requires granting the target account access to the KMS key.

First, update the key policy to allow the target account.

```json
{
  "Sid": "AllowCrossAccountSnapshotAccess",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::987654321098:root"
  },
  "Action": [
    "kms:Decrypt",
    "kms:DescribeKey",
    "kms:CreateGrant",
    "kms:ReEncrypt*"
  ],
  "Resource": "*"
}
```

Then share the snapshot.

```bash
# Share the snapshot with the target account
aws rds modify-db-snapshot-attribute \
  --db-snapshot-identifier production-db-manual-2026-02-12 \
  --attribute-name restore \
  --values-to-add "987654321098"
```

In the target account, they should copy the snapshot with their own key.

```bash
# In the target account: copy the shared snapshot with a local key
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:production-db-manual-2026-02-12 \
  --target-db-snapshot-identifier my-copy-of-production \
  --kms-key-id alias/rds-local-key
```

## Migrating Unencrypted Databases

This is the most common headache. You've got a running unencrypted database and need to encrypt it. Here's the process.

```bash
# Step 1: Create a snapshot of the unencrypted DB
aws rds create-db-snapshot \
  --db-instance-identifier old-unencrypted-db \
  --db-snapshot-identifier migration-snapshot

# Step 2: Wait for snapshot completion
aws rds wait db-snapshot-available \
  --db-snapshot-identifier migration-snapshot

# Step 3: Copy the snapshot with encryption enabled
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier migration-snapshot \
  --target-db-snapshot-identifier migration-snapshot-encrypted \
  --kms-key-id alias/rds-production

# Step 4: Wait for the encrypted copy
aws rds wait db-snapshot-available \
  --db-snapshot-identifier migration-snapshot-encrypted

# Step 5: Restore the encrypted snapshot as a new DB instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier production-db-encrypted \
  --db-snapshot-identifier migration-snapshot-encrypted \
  --db-instance-class db.r6g.xlarge \
  --db-subnet-group-name production-subnet-group \
  --vpc-security-group-ids sg-0123456789abcdef0
```

After the new encrypted instance is running, you'll need to update your application's connection string. For zero-downtime migration, consider using DMS (Database Migration Service) for continuous replication during the cutover.

## Aurora Encryption

Aurora works the same way, but encryption is set at the cluster level. All instances in the cluster use the same encryption key.

```hcl
resource "aws_rds_cluster" "production" {
  cluster_identifier  = "production-aurora"
  engine              = "aurora-postgresql"
  engine_version      = "15.4"
  database_name       = "myapp"
  master_username     = "admin"
  master_password     = var.db_password
  storage_encrypted   = true
  kms_key_id          = aws_kms_key.rds.arn

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.production.name

  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  deletion_protection     = true
}

resource "aws_rds_cluster_instance" "production" {
  count              = 2
  identifier         = "production-aurora-${count.index}"
  cluster_identifier = aws_rds_cluster.production.id
  instance_class     = "db.r6g.xlarge"
  engine             = aws_rds_cluster.production.engine
}
```

## Monitoring Encryption Compliance

Use AWS Config to detect any unencrypted RDS instances.

```bash
# Config rule for RDS encryption
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "rds-storage-encrypted",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "RDS_STORAGE_ENCRYPTED"
    },
    "Scope": {
      "ComplianceResourceTypes": ["AWS::RDS::DBInstance"]
    }
  }'
```

## Wrapping Up

RDS encryption with KMS is a must-have for any database holding sensitive data. The main thing to plan for is encrypting at creation time, since adding encryption later requires a migration. Use customer managed keys for full control, enable key rotation, and set up Config rules to catch any unencrypted instances that slip through. For the broader picture on key management, see our guides on [KMS CMKs](https://oneuptime.com/blog/post/2026-02-12-create-manage-kms-customer-managed-keys/view) and [key rotation](https://oneuptime.com/blog/post/2026-02-12-enable-kms-key-rotation/view).

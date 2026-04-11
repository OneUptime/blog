# How to Set Up ElastiCache Redis Encryption at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, Encryption, AWS Security, KMS

Description: Learn how to enable encryption at rest for Amazon ElastiCache Redis using AWS KMS to protect persisted data and meet compliance requirements.

---

## What Encryption at Rest Covers

Encryption at rest for ElastiCache Redis protects data stored on disk - specifically:

- Redis RDB snapshots (point-in-time backups)
- AOF files (if persistence is enabled)
- Swap files written during memory pressure
- Backups stored in Amazon S3

Data in memory is not encrypted at rest (that would require encryption in RAM, which is a separate hardware security concern). The protection kicks in when data is persisted to storage.

## Enabling Encryption at Rest

Like TLS, encryption at rest must be enabled when creating the cluster.

### Via AWS CLI with Default KMS Key

```bash
aws elasticache create-replication-group \
  --replication-group-id my-encrypted-cluster \
  --replication-group-description "Redis with encryption at rest" \
  --num-cache-clusters 2 \
  --cache-node-type cache.r7g.large \
  --engine redis \
  --engine-version 7.1 \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "YourStrongToken123!" \
  --region us-east-1
```

When you don't specify a KMS key, ElastiCache uses an AWS-managed key (`aws/elasticache`).

### Via AWS CLI with Customer-Managed KMS Key

```bash
# First create a KMS key
aws kms create-key \
  --description "ElastiCache encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --query 'KeyMetadata.KeyId' \
  --output text

# Create cluster with customer-managed key
aws elasticache create-replication-group \
  --replication-group-id my-cmk-cluster \
  --replication-group-description "Redis with CMK encryption" \
  --num-cache-clusters 2 \
  --cache-node-type cache.r7g.large \
  --at-rest-encryption-enabled \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/mrk-abc123 \
  --transit-encryption-enabled \
  --auth-token "YourStrongToken123!"
```

## Terraform Configuration

```hcl
# Create customer-managed KMS key
resource "aws_kms_key" "elasticache" {
  description             = "ElastiCache Redis encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow ElastiCache to use the key"
        Effect = "Allow"
        Principal = {
          Service = "elasticache.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "elasticache" {
  name          = "alias/elasticache-redis"
  target_key_id = aws_kms_key.elasticache.key_id
}

# ElastiCache cluster with encryption at rest
resource "aws_elasticache_replication_group" "encrypted" {
  replication_group_id       = "encrypted-redis"
  description                = "Redis with at-rest encryption"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 2
  automatic_failover_enabled = true

  # Encryption settings
  at_rest_encryption_enabled = true
  kms_key_id                 = aws_kms_key.elasticache.arn
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  # Enable snapshots to test encryption
  snapshot_retention_limit = 7
  snapshot_window          = "03:00-04:00"
}
```

## Verifying Encryption Is Active

```bash
# Describe the replication group to confirm encryption settings
aws elasticache describe-replication-groups \
  --replication-group-id my-encrypted-cluster \
  --query 'ReplicationGroups[0].{AtRestEncrypted:AtRestEncryptionEnabled,TransitEncrypted:TransitEncryptionEnabled,KMSKey:KmsKeyId}'
```

Expected output:

```json
{
    "AtRestEncrypted": true,
    "TransitEncrypted": true,
    "KMSKey": "arn:aws:kms:us-east-1:123456789012:key/mrk-abc123"
}
```

## Verifying Snapshot Encryption

When you take a manual snapshot, it should inherit the cluster's encryption settings.

```bash
# Create a manual snapshot
aws elasticache create-snapshot \
  --replication-group-id my-encrypted-cluster \
  --snapshot-name my-encrypted-snapshot

# Verify snapshot encryption (KmsKeyId presence confirms encryption)
aws elasticache describe-snapshots \
  --snapshot-name my-encrypted-snapshot \
  --query 'Snapshots[0].KmsKeyId'
```

## KMS Key Policy Best Practices

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowElastiCache",
      "Effect": "Allow",
      "Principal": {
        "Service": "elasticache.amazonaws.com"
      },
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "123456789012"
        },
        "ArnLike": {
          "aws:SourceArn": "arn:aws:elasticache:us-east-1:123456789012:replicationgroup:*"
        }
      }
    },
    {
      "Sid": "AllowAdminManagement",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/SecurityAdminRole"
      },
      "Action": "kms:*",
      "Resource": "*"
    }
  ]
}
```

## Migrating to Encrypted Cluster

Since encryption cannot be enabled on an existing cluster, migration requires:

```bash
# Step 1: Create a snapshot of the unencrypted cluster
aws elasticache create-snapshot \
  --replication-group-id my-old-unencrypted-cluster \
  --snapshot-name migration-snapshot

# Step 2: Copy snapshot with encryption enabled
aws elasticache copy-snapshot \
  --source-snapshot-name migration-snapshot \
  --target-snapshot-name migration-snapshot-encrypted \
  --kms-key-id alias/elasticache-redis

# Step 3: Restore a new cluster from the encrypted snapshot
aws elasticache create-replication-group \
  --replication-group-id my-new-encrypted-cluster \
  --replication-group-description "Migrated encrypted cluster" \
  --snapshot-name migration-snapshot-encrypted \
  --at-rest-encryption-enabled \
  --kms-key-id alias/elasticache-redis \
  --transit-encryption-enabled \
  --auth-token "NewToken123!"

# Step 4: Update application to point to new cluster endpoint
# Step 5: Delete old unencrypted cluster
```

## CloudTrail Monitoring for KMS Key Usage

```bash
# Monitor KMS decrypt events for ElastiCache in CloudTrail
aws logs filter-log-events \
  --log-group-name aws-cloudtrail-logs \
  --filter-pattern '{ $.eventName = "Decrypt" && $.requestParameters.keyId = "alias/elasticache-redis" }'
```

## Compliance and Audit

For compliance frameworks:

```text
PCI-DSS Requirement 3.5:
  - At-rest encryption satisfies requirement to protect stored cardholder data
  - Use CMK for key management audit trail

HIPAA:
  - PHI stored in Redis must be encrypted at rest
  - Customer-managed keys provide audit capability via CloudTrail

SOC 2 Type II:
  - Encryption at rest demonstrates CC6.1 logical access controls
  - KMS key rotation (enable_key_rotation = true) satisfies key management controls
```

## Summary

ElastiCache Redis encryption at rest protects persisted data including snapshots and swap files using AES-256 encryption. Enable it at cluster creation time using the `at-rest-encryption-enabled` flag, and use customer-managed KMS keys for full control over key rotation and access auditing. Migrating existing unencrypted clusters requires copying snapshots with encryption enabled and restoring to a new cluster.

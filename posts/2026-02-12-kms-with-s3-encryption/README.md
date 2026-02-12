# How to Use KMS with S3 for Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, KMS, S3, Encryption, Security

Description: A practical guide to encrypting S3 objects with KMS customer managed keys, including bucket policies, default encryption, and performance considerations.

---

S3 encryption with KMS is one of the most common setups on AWS, and rightfully so. It gives you centralized key management, detailed audit trails through CloudTrail, and fine-grained access control that ties encryption to IAM policies. But there's more to it than just flipping the encryption switch - you need to think about performance, costs, and how KMS permissions interact with S3 access.

Let's go through the full setup from bucket configuration to handling edge cases.

## S3 Encryption Options

S3 offers several encryption methods. Here's the quick comparison:

- **SSE-S3** (AES-256): AWS manages everything. No KMS costs, no KMS throttling, minimal control.
- **SSE-KMS**: AWS managed KMS key or your own CMK. Full audit trail, key policy control, but adds KMS API costs and potential throttling.
- **DSSE-KMS**: Dual-layer encryption for compliance requirements. Double the KMS calls.
- **SSE-C**: You provide the key with every request. Maximum control, maximum operational burden.

For most teams, SSE-KMS with a customer managed key is the sweet spot - you get control and auditability without managing raw key material.

## Setting Up Default Bucket Encryption

First, create a KMS key for S3 encryption, then configure your bucket to use it by default.

```bash
# Create a KMS key for S3
aws kms create-key \
  --description "S3 encryption key for production data" \
  --tags '[{"TagKey": "Service", "TagValue": "s3"}]'

# Create an alias
aws kms create-alias \
  --alias-name alias/s3-production \
  --target-key-id "KEY_ID_HERE"

# Set default encryption on the bucket
aws s3api put-bucket-encryption \
  --bucket my-production-bucket \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "alias/s3-production"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
```

Notice `BucketKeyEnabled: true` - that's important for performance and cost. We'll cover why shortly.

## Terraform Configuration

Here's the full Terraform setup with a KMS key, bucket, and proper policies.

```hcl
# KMS key for S3 encryption
resource "aws_kms_key" "s3" {
  description         = "S3 encryption key for production"
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
        Sid    = "AllowS3ServiceUsage"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey",
          "kms:GenerateDataKeyWithoutPlaintext",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
            "kms:ViaService"    = "s3.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Service = "s3"
  }
}

resource "aws_kms_alias" "s3" {
  name          = "alias/s3-production"
  target_key_id = aws_kms_key.s3.key_id
}

# S3 bucket with KMS encryption
resource "aws_s3_bucket" "production" {
  bucket = "my-production-bucket"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "production" {
  bucket = aws_s3_bucket.production.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}
```

The `kms:ViaService` condition in the key policy is a best practice - it ensures the key can only be used through the S3 service, not directly.

## Bucket Key - Why It Matters

Without S3 Bucket Keys, every object operation makes a separate KMS API call. Upload 10,000 objects? That's 10,000 GenerateDataKey calls. Download them? 10,000 Decrypt calls. At scale, this hits KMS request quotas (default 5,500-30,000 requests/second depending on region) and racks up costs.

S3 Bucket Keys reduce KMS calls by generating a bucket-level key that's reused for objects within a time window. This can cut KMS costs by up to 99%.

```bash
# Verify bucket key is enabled
aws s3api get-bucket-encryption \
  --bucket my-production-bucket
```

The tradeoff: CloudTrail shows fewer KMS events since the bucket key handles most operations internally. If you need per-object audit trails, you'll want to rely on S3 data events instead.

## Enforcing Encryption with Bucket Policy

Default encryption handles uploads that don't specify encryption, but it doesn't prevent someone from uploading with a different encryption method. Use a bucket policy to enforce KMS encryption.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-production-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "DenyWrongKMSKey",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-production-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption-aws-kms-key-id": "arn:aws:kms:us-east-1:123456789012:key/KEY_ID"
        }
      }
    }
  ]
}
```

The second statement is often overlooked. Without it, someone could upload objects using a different KMS key that you don't control.

## IAM Permissions for KMS-Encrypted S3

Users need both S3 permissions and KMS permissions to work with encrypted objects.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-production-bucket",
        "arn:aws:s3:::my-production-bucket/*"
      ]
    },
    {
      "Sid": "KMSAccess",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/KEY_ID"
    }
  ]
}
```

If a user has S3 access but not KMS access, they'll get an AccessDenied error when trying to read objects. The error message won't mention KMS, which makes it confusing to debug. If you see unexpected access denied errors on S3 operations, check KMS permissions first.

## Uploading and Downloading with the CLI

The CLI handles encryption transparently when default encryption is configured.

```bash
# Upload - uses default bucket encryption automatically
aws s3 cp local-file.txt s3://my-production-bucket/data/file.txt

# Upload with explicit KMS key (overrides default)
aws s3 cp local-file.txt s3://my-production-bucket/data/file.txt \
  --sse aws:kms \
  --sse-kms-key-id alias/s3-production

# Download - decryption is automatic
aws s3 cp s3://my-production-bucket/data/file.txt ./downloaded-file.txt

# Check the encryption status of an object
aws s3api head-object \
  --bucket my-production-bucket \
  --key data/file.txt \
  --query '{SSE: ServerSideEncryption, KMSKey: SSEKMSKeyId}'
```

## Cross-Account Access to KMS-Encrypted Objects

When sharing encrypted S3 objects across accounts, you need to set up both the bucket policy and the KMS key policy.

```json
{
  "Sid": "AllowCrossAccountDecrypt",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::987654321098:role/DataConsumerRole"
  },
  "Action": [
    "kms:Decrypt",
    "kms:DescribeKey"
  ],
  "Resource": "*"
}
```

The consuming account also needs IAM policies granting access to both the S3 bucket and the KMS key.

## Re-encrypting Existing Objects

If you're migrating from SSE-S3 to SSE-KMS, you need to re-encrypt existing objects. S3 Batch Operations is the best way to do this at scale.

```bash
# Copy an object to itself with new encryption (small scale)
aws s3 cp s3://my-bucket/file.txt s3://my-bucket/file.txt \
  --sse aws:kms \
  --sse-kms-key-id alias/s3-production

# For large-scale migration, use S3 Batch Operations
# First, generate an inventory of objects to re-encrypt
aws s3api put-bucket-inventory-configuration \
  --bucket my-production-bucket \
  --id full-inventory \
  --inventory-configuration '{
    "Destination": {
      "S3BucketDestination": {
        "AccountId": "123456789012",
        "Bucket": "arn:aws:s3:::inventory-bucket",
        "Format": "CSV"
      }
    },
    "IsEnabled": true,
    "Id": "full-inventory",
    "IncludedObjectVersions": "Current",
    "Schedule": {"Frequency": "Daily"}
  }'
```

## Performance Considerations

A few things to keep in mind:

- **Enable Bucket Keys.** This is the single biggest performance optimization.
- **Watch KMS quotas.** Even with Bucket Keys, high-throughput workloads can hit limits. Request quota increases proactively.
- **Use regional keys.** If your bucket is in us-east-1, use a key in us-east-1. Cross-region KMS calls add latency.
- **Consider SSE-S3 for non-sensitive data.** Not everything needs KMS encryption. Use it where you need audit trails and access control.

For more on managing your KMS keys, see our guide on [creating and managing CMKs](https://oneuptime.com/blog/post/create-manage-kms-customer-managed-keys/view). And if you're looking at encryption for other services, check out [KMS with EBS](https://oneuptime.com/blog/post/kms-with-ebs-volume-encryption/view) and [KMS with RDS](https://oneuptime.com/blog/post/kms-with-rds-database-encryption/view).

## Wrapping Up

KMS encryption for S3 gives you the control and auditability that compliance frameworks demand. Enable Bucket Keys to keep costs manageable, enforce encryption through bucket policies (not just defaults), and make sure IAM policies cover both S3 and KMS permissions. It's a straightforward setup that pays dividends in security posture and peace of mind.

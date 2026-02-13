# How to Use KMS with EBS for Volume Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, KMS, EBS, EC2, Encryption

Description: A complete guide to encrypting EBS volumes with KMS customer managed keys, including default encryption, snapshot management, and migration strategies.

---

EBS encryption is one of those things that should be on by default for every AWS account. Unencrypted volumes are a compliance nightmare and a data breach waiting to happen. The good news is that EBS encryption with KMS is transparent to the operating system and applications - there's no performance penalty worth worrying about, and the setup is straightforward.

This guide covers enabling encryption at the account level, using customer managed keys, handling snapshots, and migrating existing unencrypted volumes.

## How EBS Encryption Works

When you create an encrypted EBS volume, here's what happens under the hood:

1. EBS requests a data key from KMS using your specified CMK
2. KMS returns a plaintext data key and an encrypted copy
3. EBS uses the plaintext key to encrypt data written to the volume
4. The encrypted data key is stored with the volume metadata
5. When the volume attaches to an instance, EBS decrypts the data key through KMS

All encryption happens on the EC2 host - your instance sees normal, unencrypted data. There's no software overhead and negligible latency impact. AWS handles everything at the infrastructure level.

## Enable Default EBS Encryption

The best approach is to enable encryption at the account level so every new volume is automatically encrypted. You can do this per region.

```bash
# Enable default EBS encryption in the current region
aws ec2 enable-ebs-encryption-by-default

# Verify it's enabled
aws ec2 get-ebs-encryption-by-default

# Set the default KMS key (optional - uses aws/ebs key if not set)
aws ec2 modify-ebs-default-kms-key-id \
  --kms-key-id alias/ebs-production
```

When default encryption is enabled, every new volume and snapshot copy in that region will be encrypted. Existing unencrypted volumes aren't affected - we'll cover migration later.

To enable this across all regions, loop through them.

```bash
# Enable default encryption in all regions
for region in $(aws ec2 describe-regions --query 'Regions[*].RegionName' --output text); do
  echo "Enabling encryption in $region..."
  aws ec2 enable-ebs-encryption-by-default --region "$region"
  aws ec2 modify-ebs-default-kms-key-id \
    --region "$region" \
    --kms-key-id alias/ebs-production 2>/dev/null || echo "  (no custom key in $region)"
done
```

## Creating a KMS Key for EBS

While the default `aws/ebs` key works, a customer managed key gives you control over the key policy and audit trail.

```hcl
resource "aws_kms_key" "ebs" {
  description         = "EBS volume encryption key"
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
        Sid    = "AllowEBSService"
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
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
            "kms:ViaService"    = "ec2.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Service = "ebs"
  }
}

resource "aws_kms_alias" "ebs" {
  name          = "alias/ebs-production"
  target_key_id = aws_kms_key.ebs.key_id
}

# Set as default EBS encryption key
resource "aws_ebs_default_kms_key" "main" {
  key_arn = aws_kms_key.ebs.arn
}

resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}
```

Notice the `CreateGrant` permission - EBS uses KMS grants internally to manage data key access for attached volumes. Without it, you'll get cryptic attachment failures.

## Creating Encrypted Volumes

With default encryption enabled, volumes are encrypted automatically. But you can also specify encryption explicitly.

```bash
# Create an encrypted volume with default key
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 100 \
  --volume-type gp3 \
  --encrypted

# Create an encrypted volume with a specific CMK
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 100 \
  --volume-type gp3 \
  --encrypted \
  --kms-key-id alias/ebs-production
```

In Terraform, it's part of the volume or instance configuration.

```hcl
# EC2 instance with encrypted root volume
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "m5.large"

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
    encrypted   = true
    kms_key_id  = aws_kms_key.ebs.arn
  }

  # Additional encrypted EBS volume
  ebs_block_device {
    device_name = "/dev/sdf"
    volume_size = 200
    volume_type = "gp3"
    encrypted   = true
    kms_key_id  = aws_kms_key.ebs.arn
    iops        = 3000
    throughput  = 125
  }

  tags = {
    Name = "web-server"
  }
}
```

## Working with Encrypted Snapshots

Snapshots of encrypted volumes are automatically encrypted with the same key. You can also change the key when copying a snapshot.

```bash
# Create a snapshot (inherits volume encryption)
aws ec2 create-snapshot \
  --volume-id vol-0123456789abcdef0 \
  --description "Daily backup - production database"

# Copy a snapshot with a different KMS key
aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id snap-0123456789abcdef0 \
  --destination-region us-west-2 \
  --kms-key-id alias/ebs-dr \
  --encrypted \
  --description "DR copy"
```

This is how you handle cross-region snapshot copies - the destination region needs its own KMS key (or you can use multi-region keys).

## Migrating Unencrypted Volumes

You can't encrypt an existing unencrypted volume in place. The migration path is: snapshot the volume, copy the snapshot with encryption, create a new volume from the encrypted snapshot.

Here's a script that automates this for a single volume.

```bash
#!/bin/bash
# Migrate an unencrypted EBS volume to encrypted

VOLUME_ID="vol-0123456789abcdef0"
KMS_KEY="alias/ebs-production"
AZ="us-east-1a"

# Step 1: Create a snapshot of the unencrypted volume
echo "Creating snapshot..."
SNAP_ID=$(aws ec2 create-snapshot \
  --volume-id "$VOLUME_ID" \
  --description "Migration snapshot for $VOLUME_ID" \
  --query 'SnapshotId' \
  --output text)

echo "Waiting for snapshot $SNAP_ID..."
aws ec2 wait snapshot-completed --snapshot-ids "$SNAP_ID"

# Step 2: Copy the snapshot with encryption
echo "Creating encrypted copy..."
ENC_SNAP_ID=$(aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id "$SNAP_ID" \
  --encrypted \
  --kms-key-id "$KMS_KEY" \
  --description "Encrypted copy of $VOLUME_ID" \
  --query 'SnapshotId' \
  --output text)

echo "Waiting for encrypted snapshot $ENC_SNAP_ID..."
aws ec2 wait snapshot-completed --snapshot-ids "$ENC_SNAP_ID"

# Step 3: Create new encrypted volume
echo "Creating encrypted volume..."
NEW_VOL_ID=$(aws ec2 create-volume \
  --availability-zone "$AZ" \
  --snapshot-id "$ENC_SNAP_ID" \
  --volume-type gp3 \
  --query 'VolumeId' \
  --output text)

echo "New encrypted volume: $NEW_VOL_ID"
echo "Next steps:"
echo "  1. Stop the instance"
echo "  2. Detach $VOLUME_ID"
echo "  3. Attach $NEW_VOL_ID with the same device name"
echo "  4. Start the instance"
echo "  5. Verify everything works"
echo "  6. Delete the old volume and intermediate snapshots"
```

## Cross-Account Encrypted Snapshots

Sharing encrypted snapshots across accounts requires the CMK key policy to allow the target account.

```json
{
  "Sid": "AllowCrossAccountSnapshotDecrypt",
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
# Share the encrypted snapshot
aws ec2 modify-snapshot-attribute \
  --snapshot-id snap-0123456789abcdef0 \
  --attribute createVolumePermission \
  --operation-type add \
  --user-ids 987654321098
```

The target account can then copy the snapshot with their own key.

```bash
# In the target account - copy with a local key
aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id snap-0123456789abcdef0 \
  --kms-key-id alias/ebs-production \
  --encrypted \
  --description "Copy from shared account"
```

## Monitoring and Compliance

Track unencrypted volumes with AWS Config.

```bash
# Config rule to detect unencrypted EBS volumes
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "encrypted-volumes",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ENCRYPTED_VOLUMES"
    },
    "Scope": {
      "ComplianceResourceTypes": ["AWS::EC2::Volume"]
    }
  }'
```

## Wrapping Up

EBS encryption with KMS should be a day-one configuration for every AWS account. Enable default encryption, use customer managed keys for control and auditability, and plan for migration of any existing unencrypted volumes. The zero-performance-impact nature of EBS encryption means there's really no excuse not to encrypt everything.

For more on managing your encryption keys, check out [creating KMS CMKs](https://oneuptime.com/blog/post/2026-02-12-create-manage-kms-customer-managed-keys/view) and [KMS with S3](https://oneuptime.com/blog/post/2026-02-12-kms-with-s3-encryption/view).

# How to Create Encrypted EBS Volumes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EBS, Encryption, KMS, Security, Infrastructure as Code

Description: Learn how to create encrypted EBS volumes using AWS KMS customer-managed keys with OpenTofu to protect data at rest on EC2 instances.

## Introduction

EBS encryption uses AWS KMS to encrypt data at rest, data in transit between the instance and the volume, snapshots, and volumes restored from snapshots. You can use the AWS managed key for EBS (`aws/ebs`) or a customer-managed KMS key for greater control over key policies and rotation.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with EC2, EBS, and KMS permissions

## Step 1: Create a Customer-Managed KMS Key

```hcl
# Customer-managed KMS key for EBS encryption

resource "aws_kms_key" "ebs" {
  description             = "KMS key for EBS volume encryption"
  deletion_window_in_days = 30

  # Enable automatic annual key rotation
  enable_key_rotation = true

  tags = {
    Name    = "ebs-encryption-key"
    Purpose = "EBS"
  }
}

resource "aws_kms_alias" "ebs" {
  name          = "alias/ebs-encryption"
  target_key_id = aws_kms_key.ebs.key_id
}
```

## Step 2: Enable Default EBS Encryption for the Region

```hcl
# Enable region-wide EBS encryption with the customer-managed KMS key
# All new EBS volumes will be encrypted automatically
resource "aws_ebs_encryption_by_default" "enabled" {
  enabled = true
}

# Set the customer-managed KMS key as the default encryption key for the region
resource "aws_ebs_default_kms_key" "default" {
  key_arn = aws_kms_key.ebs.arn
}
```

## Step 3: Create an Encrypted EBS Volume

```hcl
resource "aws_ebs_volume" "encrypted_data" {
  availability_zone = var.availability_zone
  type              = "gp3"
  size              = 100
  iops              = 3000

  # Explicitly specify encryption and KMS key
  encrypted  = true
  kms_key_id = aws_kms_key.ebs.arn

  tags = {
    Name        = "encrypted-data-volume"
    Encrypted   = "true"
    KMSKey      = "customer-managed"
    Environment = var.environment
  }
}
```

## Step 4: Create an Encrypted Root Volume via Launch Template

```hcl
resource "aws_launch_template" "encrypted" {
  name          = "encrypted-root-template"
  image_id      = "resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
  instance_type = "t3.medium"

  # Encrypted root volume using a customer-managed KMS key
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_type           = "gp3"
      volume_size           = 30
      encrypted             = true
      kms_key_id            = aws_kms_key.ebs.arn
      delete_on_termination = true
    }
  }

  # Additional encrypted data volume
  block_device_mappings {
    device_name = "/dev/sdb"
    ebs {
      volume_type = "gp3"
      volume_size = 100
      encrypted   = true
      kms_key_id  = aws_kms_key.ebs.arn
    }
  }
}
```

## Step 5: Create an Encrypted Snapshot Copy

```hcl
# Copy an unencrypted snapshot and encrypt it in the process
resource "aws_ebs_snapshot_copy" "encrypted_copy" {
  source_snapshot_id = var.unencrypted_snapshot_id
  source_region      = var.source_region
  encrypted          = true
  kms_key_id         = aws_kms_key.ebs.arn

  tags = {
    Name    = "encrypted-snapshot-copy"
    Migrated = "true"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EBS encryption with customer-managed KMS keys gives you full control over the encryption keys protecting your data. Enable Region-level default encryption to ensure all new volumes are encrypted without relying on developers to remember. Regularly rotate keys and monitor KMS API calls via CloudTrail to detect unauthorized access attempts.
